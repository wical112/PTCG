# TCG Tournament Manager — Continuation Context

> Snapshot for resuming work. Update as state evolves.

## Project at a glance
- **What**: Browser-based TCG tournament manager. Supports **Swiss** and **Knockout (single-elim)** formats.
- **Stack**: Static HTML / CSS / vanilla JS. Optional Firebase Firestore backend for live view-only sharing.
- **State**: `localStorage` (per-device). Optionally mirrored to Firestore when a tournament is published.
- **Repo**: `https://github.com/wical112/PTCG` (origin).
- **Working dir**: `/Users/wical/PTCG`.
- **Live URLs**: `https://tcgtm.web.app` (current, multi-site under same Firebase project) + `https://ptcgstm.web.app` (legacy, still serving).

## Branches
| Branch | Purpose | Status |
|---|---|---|
| `main` | Public / free / open-source release | Pushed (last commit `1781840` — UI polish). No cloud feature. |
| `income` | Paid / commercial-feature track | **Currently checked out.** Cloud Publish shipped. Lots uncommitted. |

## Files
Code:
- `index.html` — the app (single-page, view router in JS). Loads Firebase compat SDKs + `firebase-config.js` + `cloud.js` + `app.js`.
- `app.js` — all app logic + i18n (EN + zh-Hant) + persistence + cloud hooks.
- `cloud.js` — Firestore wrapper (`init`, `publish`, `syncState`, `subscribeView`, `unpublish`, `buildViewUrl`).
- `firebase-config.js` — **LIVE credentials** for Firebase project `ptcgstm`. Not a placeholder.
- `firestore.rules` — security rules (public read, owner-only writes).
- `style.css` — base styles + appended polish layers (see "CSS layering").

Static content (all on `income`, uncommitted):
- `landing.html` — marketing homepage (hero + feature grid + CTA).
- `about.html`, `faq.html`, `privacy.html`, `terms.html` — legal/content pages for AdSense readiness.

Docs:
- `CLOUD_SETUP.md` — Firebase setup steps.
- `CONTEXT.md` — this file.
- `firebase-debug.log` — leftover, ignore.

## Branding / trademark hygiene
All user-visible PTCG / Pokémon / Nintendo / Game Freak / Creatures Inc. / The Pokémon Company references have been **removed** (title, logo, footer disclaimers, FAQ, terms, about, hero copy, download filenames). The app presents as **"TCG Tournament Manager"** (renamed from "Swiss Tournament Manager" on 2026-04-14 to make room for the Knockout format).

Still named `PTCG` internally but invisible to users:
- Folder `/Users/wical/PTCG/` and GitHub repo name.
- `localStorage` keys (`ptcg_state`, `ptcg_round_N`, `ptcg_lang`, `ptcg_advanced_staging`) — kept to preserve existing users' saved data.
- Comment/internal references in `CONTEXT.md`.

## Feature inventory

### Shipped on `main`
- Swiss pairings (rematch-avoidance, auto-bye, MP → OWP standings).
- Round timer (start/pause/reset/±60s/mute).
- Trainer-card modal with match history.
- Lucky Wheel + participant picker (sorted by standings, "Exclude Top 3" shortcut).
- Advanced Recovery (rebuild a tournament from past results).
- Compact mode (2-col grid, fits 16 tables fullscreen).
- Projector mode (giant timer).
- i18n: EN / 繁體中文 toggle (persists as `ptcg_lang`).
- Persistence safety: `pagehide` + `visibilitychange` flush, `beforeunload` warn during active tournament.
- Bug fixes:
  - Player IDs sanitized so apostrophes / non-alphanumeric chars don't break inline `onclick`.
  - `reverseResults` only clears `hadBye` if no other still-applied round granted that player a bye.
- UI v2 "Modern Esports / Professional Dark" polish (see below).

### Added on `income` (NOT yet on `main`)
- Static pages: landing, about, faq, privacy, terms — with footer links in the app.
- Trademark-safe copy sweep (removed all Pokémon / Nintendo etc.).
- Easter-egg placeholder player names replaced with generic `Player 1/2/3` / `玩家 1/2/3`.
- **Cloud Publish / QR / view-only** — see next section.

## Cloud Publish / QR view-only (on `income`)

### Mechanics
- **Admin side**: Round view has inline "Publish" button. Clicking it:
  1. Anonymously signs into Firebase (`auth.signInAnonymously()`).
  2. Creates a doc `tournaments/<6-char-ID>` with `{ownerUid, state, publishedAt, updatedAt}`.
  3. Stores `state.publishedTournamentId` in local state so reloads re-attach.
  4. Shows an **inline collapsible share panel** (not a modal) with QR + tournament ID + copy-link + Stop Sharing.
- **Sync**: `saveState()` is hooked to `cloud.syncState(state)` with ~800ms debounce. Every local change mirrors to Firestore.
- **QR**: rendered via `https://api.qrserver.com/v1/create-qr-code/` image URL — no library needed, always works. White background for maximum scanner compatibility.

### Inline share panel UX
- Appears on the round view between round-header and pairings.
- **Collapsed**: single slim bar `🔴 LIVE · Tournament ID: K7M3PQ · ▼`.
- **Expanded**: QR (220×220) + link input + Copy Link + Stop Sharing, in a 2-col grid (1-col on mobile).
- Clicking the panel header (or the Publish button again) toggles expand/collapse. Chevron rotates.
- Hidden entirely for viewers.

### Viewer side (`?t=<id>` URL)
- URL param detected in `init()` → if we don't own that ID, enter **view-only mode**.
- `body.view-only` class hides ALL editing controls: Publish, timer controls (whole bar — Start/Pause/Reset/±1m/Mute/Compact/Projector), result buttons, submit, language toggle, registration/advanced tiles, etc.
- Viewer state is locked on every remote snapshot: `projectorMode: false`, `compactMode: false`, `timerMuted: true`, `timerRunning: false` — no audio ever plays; no projector/compact noise.
- Viewer status overlay shows "Connecting…" → "Available" (doc loads) or clear error ("This tournament is no longer available.", "Cloud sharing is not set up.", "Firebase init failed — check console.").
- Top-of-page LIVE banner pinned while in view mode.

### Firebase setup (complete on your machine)
- Project: `ptcgstm` (config committed in `firebase-config.js`; API key for web apps is safe to expose).
- Firestore enabled (Singapore region).
- Anonymous Auth enabled.
- Security rules deployed from `firestore.rules`:
  - `read: true` (anyone)
  - `create`: signed-in caller must stamp `ownerUid = request.auth.uid`
  - `update/delete`: only the owner, ownership can't be transferred.

### Known limitations
- **Cross-device admin not supported**: admin identity = anonymous UID on that browser. Clearing browser data → you can no longer update your own published tournament. Could be solved with a transferable admin key later.
- **No viewer count / presence** — would be a nice paid-tier extension.
- **Privacy policy not yet updated** to disclose Firebase when published. `privacy.html` should mention it before making Publish broadly available.

## UI design language (current)
- **Modern Esports / Professional Dark** aesthetic.
- Palette: `#141414` header / `#1A1A1A` base / `#262626` surface / `#2F2F2F` surface-2 / `#333` border.
- Single accent: **`#FF7324`** (hover `#E56720`).
- Fonts: Inter (UI, italic-uppercase for hero/logo) + JetBrains Mono (timer, scores, ranks, tournament IDs).
- Elevated cards: top highlight `rgba(255,255,255,0.08)` + shadow `0 12px 24px -8px rgba(0,0,0,0.8)`.
- Standings top-3 get gold/silver/bronze dots via pure CSS `:nth-child`.

## CSS layering
`style.css` originally ~1820 lines of base styles; overrides appended in this order:
1. (removed) v1 cyan/purple neon polish.
2. v2 esports/orange polish — **active**.
3. Elevated card overlay — **active**.
4. Static-page styles (landing/legal, hero, feature grid, footer) — **active**.
5. Cloud feature styles: view-mode banner, view-only hiding rules, inline share panel, viewer status overlay — **active**.

Current total: ~2,900 lines. To revert to pre-polish base: truncate at line 1822.

## Backend choice — decided
**Firestore** picked for:
- 2–3 day implementation vs 5–7 for Cloudflare Workers+DO.
- Free tier covers ~3–5 tournaments/day comfortably.
- Real-time listener is one SDK call.
- Trade-off: Singapore region (~30–60 ms RTT from HK) vs Cloudflare HK PoPs (5–15 ms). Acceptable.

Migration path to Cloudflare if usage explodes later: one doc per tournament maps 1:1 to a Durable Object.

## Revenue plan (discussed, HK target)
- **Costs**: domain ~HKD 10/mo. Hosting free (Cloudflare Pages / Netlify / Vercel). Firebase free tier initially.
- **Realistic revenue**:
  - Months 1–3: ~HKD 0–50/mo (audience building).
  - Months 4–12 (with active promotion in HK FB/Discord + 2–3 shops using it): **HKD 150–800/mo** (ads + tips).
  - Year 2 (de-facto local tool): **HKD 2,000–6,000/mo** (ads + affiliate + shop sponsorships).
  - Year 3+ (cloud sync paid tier): potentially **HKD 5,000–15,000/mo**.
- **Path**: white-label / shop sponsorships > ads > affiliate (sleeves/binders) > tips > premium cloud tier.

## Session 2026-04-13 changes (on `income`, uncommitted)

### Live deployment
- **Hosted on Firebase Hosting**: <https://ptcgstm.web.app> (also `https://ptcgstm.firebaseapp.com`).
- `firebase.json` + `.firebaserc` committed at repo root. Re-deploy with `firebase deploy --only hosting`.

### Player (viewer) mode UX cleanup
- Hidden in view-only via CSS (`style.css` view-only block):
  `.lang-toggle` (kept — Chinese allowed), `.timer-controls`, `#timer-display`, `#breadcrumb`, `.site-footer`, `#view-mode-banner`, `#view-standings .standings-footer`.
- Round header collapses to flex (title left, share button right) in viewer mode.

### Viewer features added
- **Pin-your-match** (`#viewer-pin` block above pairings): name input with autocomplete from player datalist + Reset button. Pinned card shows table #, both names, current result. Persists in `localStorage.ptcg_viewer_pin`. Re-renders inside `renderRound()` when `viewOnly`.
- **Share QR icon** (`#btn-viewer-share`, square 36×36 with inline QR SVG): opens `#viewer-share-overlay` modal with QR of `window.location.href` (qrserver.com) + copyable link. Visible only in view-only.
- **Ad slot** (`#viewer-ad-slot`): full-width up to 1200px, 250px min-height. Visible in **both admin and player** modes; drop ad markup into `.ad-slot-inner`.

### Synced timer
- Switched to deadline model: new `state.timerEndsAt` (epoch ms) pushed at start; viewer ticks locally from deadline. Drift-free, no per-second writes. Currently the viewer **timer display is hidden** (per user request) but the sync logic still runs harmlessly.

### Admin-controlled noAds
- New `state.noAds` (synced). Footer `#btn-no-ads` toggles → `saveState()` → mirrors via cloud → viewer `applyNoAds()` re-runs on each snapshot and inside `renderRound()`. Hides `#viewer-ad-slot` on both sides.
- Note: footer is hidden in viewer mode, so only the admin can toggle.

### Tournament metadata
- New `state.tournamentName` + `state.tournamentDate` (ISO `YYYY-MM-DD`). Inputs on registration view; locked once tournament starts.
- Standings title prefixes with `<name> <YYYYMonD>` (e.g. `AAB Shop Gym Battle 2026Apr13 Final Standings (After 2 Rounds)`). Date formatter: `formatTournamentDate()`.

### Firestore TTL (24h auto-cleanup)
- `cloud.js`: `expiresAt = now + 24h` written on `publish()` and on every `flush()`. While admin keeps syncing, the TTL keeps rolling forward; once they stop, doc auto-deletes within ~24–48h.
- **Pending in console**: enable TTL policy on `tournaments.expiresAt` (Firestore → TTL → Create policy).

### Other pending console actions
- **Authorized domains**: confirm `ptcgstm.web.app` + `ptcgstm.firebaseapp.com` listed under Authentication → Settings → Authorized domains.

### New i18n keys (EN + zh-Hant)
`reg.tournamentName`, `reg.tournamentNamePlaceholder`, `reg.tournamentDate`, `viewer.placeholder`, `viewer.yourMatch`, `viewer.notFound`, `viewer.noPairing`, `viewer.bye`, `viewer.share`, `viewer.shareTitle`, `viewer.shareHint`, `viewer.linkCopied`.

### New `app.*` exports
`viewerPinSearch`, `viewerPinClear`, `viewerShareOpen`, `viewerShareClose`, `viewerShareCopy`, `updateTournamentMeta`, `toggleNoAds`.

## Session 2026-04-14 changes (on `income`, uncommitted before this session)

### App rename
- "Swiss Tournament Manager" → **"TCG Tournament Manager"** across all user-visible surfaces (header `header.title` EN+zh, page `<title>` tags, logos, footers in `index.html`, `landing.html`, `about.html`, `faq.html`, `privacy.html`, `terms.html`, file header comment in `app.js`).
- zh-Hant: `TCG 賽事管理`.

### Pairing-card UI overhaul (admin + viewer)
- Removed redundant A/B badges; each side now has a colored border + tinted background.
- **Side A = blue (`#3B82F6`), Side B = orange (`#FF7324`, theme accent)**.
- Win buttons inherit side colors (blue / orange), filled solid when selected. Draw stays neutral yellow.
- Button labels: `A Wins` / `B Wins` → just **`Wins`** / **`勝`** (the side color makes ownership obvious).
- CSS lives at the bottom of `style.css` (search `--side-a`).

### Drop player
- `player.dropped: bool` (defaults false on `createPlayer`).
- **Trainer-card modal** shows red **Drop Player** button (admin only, mid-tournament). Confirm → marks dropped. Re-open shows **Undo Drop**.
- `generatePairings` filters out dropped players before building the round.
- Standings: dropped row faded + line-through, with red `DROPPED` / `已退賽` tag.
- Knockout-aware: dropping a player in a not-yet-submitted bracket round auto-awards their match to the opponent (so the bracket can advance).
- New i18n keys: `trainer.drop`, `trainer.undoDrop`, `trainer.confirmDrop`, `trainer.droppedTag`.
- New export: `app.toggleDrop(playerId)`.

### Strict no-rematch pairing (Swiss)
- Replaced the old greedy single-swap with `pairUpNoRematch(players)` — backtracking that guarantees no repeat matchups when mathematically possible.
- Falls back to allowed rematches with `console.warn` only when pairing without repeats is impossible (e.g. round 4 with 4 players).
- Players are visited in input order (sorted by MP for round > 0), so the first valid pairing kept is the closest-ranked rematch-free option — preserves Swiss spirit.

### Knockout tournament (NEW format alongside Swiss)
- New `state.tournamentType: 'swiss' | 'knockout'`.
- **Home screen**: split `Tournament` button → `Swiss Tournament` + `Knockout Tournament`, each calls `app.startNewTournament(type)`.
- **Registration is shared**; Start button text adapts (`Start Tournament` vs `Start Knockout` / `開始淘汰賽`).
- **`buildKnockoutFirstRound(players)`**: random shuffle → standard seed order via `bracketSeedOrder(size)` (1v8, 4v5, 2v7, 3v6 …). Bracket size = next power of 2; non-power-of-2 player counts give R1 byes to top seeds.
- **`buildKnockoutNextRound(prevRound)`**: pairs adjacent winners — preserves bracket structure.
- **Reuses the existing round view** entirely (same A/B colored cards, timer, drop modal, cloud sync) — no new view added. `renderRound()` switches the title to `Knockout — FINAL / SEMIFINAL / QUARTERFINAL / Round of N` (`ko.*` keys) when `tournamentType === 'knockout'`.
- **`submitResults`** branches: knockout path counts winners; if `≤ 1` → champion confirm → end; else builds + pushes next bracket round.
- New i18n keys: `home.swiss`, `home.knockout`, `ko.final`, `ko.semi`, `ko.quarter`, `ko.roundN`, `ko.title`, `ko.bye`, `ko.byeAdvance`, `ko.tbd`, `ko.next`, `ko.champion`, `ko.champConfirm`, `reg.startKO`.
- New exports: `app.startNewTournament`.
- **Caveats / v2 candidates**: Draw button still renders in knockout (should be hidden); no manual seeding / drag; no Bo3; standings page still uses Swiss W/L/OWP layout (works but not bracket-shaped); no proper bracket-tree visualization (mobile-first list-of-matches view chosen for v1).

### Standings table mobile readability
- All cells `white-space: nowrap` so `3-0-0` / `47.2%` no longer wrap character-by-character.
- Numeric columns (Record / Points / OWP) → JetBrains Mono + `tabular-nums` + right-aligned.
- Player-name column is the **only** column allowed to wrap.
- Wrapper (`#standings-table-wrapper`) gets `overflow-x: auto` for tiny screens.
- Mobile (<600px) shrinks font + padding.

### Firebase multi-site deployment
- Created **second hosting site `tcgtm`** in the same `ptcgstm` project (Firebase project IDs are immutable; multi-site is the rename workaround).
- `firebase.json` now has `"target": "tcgtm"`. `.firebaserc` has the `tcgtm → tcgtm` target mapping.
- Deploy: `firebase deploy --only hosting:tcgtm`.
- **Done in console**: added `tcgtm.web.app` + `tcgtm.firebaseapp.com` to Authentication → Authorized domains. Old `ptcgstm.*` domains kept (for old QR code links).
- Old `https://ptcgstm.web.app` still serves the previously-deployed version (no auto-update). Take down or redirect later if desired.

### `.gitignore` added
- Excludes `.firebase/`, `firebase-debug.log`, `*.log`, `.DS_Store`, `node_modules/`.

### Anti-rehost / brand-protection layer
- **Host guard** at top of `app.js`: refuses to boot if `location.hostname` is not in the allow-list (`tcgtm.web.app`, `tcgtm.firebaseapp.com`, `ptcgstm.*`, `localhost`, `127.0.0.1`, `*.local`). Replaces `<html>` with an "Unauthorized host" page pointing back to the official URL. Easily bypassed by anyone who edits the source, but stops casual right-click-and-rehost.
- **Security headers** in `firebase.json` `hosting.headers`: `X-Frame-Options: SAMEORIGIN` (anti-clickjack / anti-iframe-reskin), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying geo/mic/camera, `Strict-Transport-Security` 1-year HSTS. Plus 1h cache-control for static assets.
- **Brand watermark** baked into the standings PNG download via `downloadStandings()` — appends a 56px strip below the captured table with `tcgtm.web.app` (orange JetBrains Mono) on the left and "Generated by TCG Tournament Manager" on the right. Free advertising on every screenshot share.
- **`LICENSE`** file (proprietary): permits use at official URLs; forbids rehosting, sublicensing, brand reuse, removal of attribution. Includes contact email for licensing inquiries.
- **`<meta name="author">` + `<meta name="copyright">`** on `index.html`.
- **Footer copyright** tightened to "© 2026 TCG Tournament Manager — All rights reserved." across all 7 pages.
- **Still pending (user must do)**: restrict the Firebase Web API key in Google Cloud Console → APIs & Services → Credentials → HTTP-referrer restrictions to only the official domains. Without this, a copycat could use the key from anywhere and burn quota even with all the above guards bypassed. This is the single highest-impact security step.

### AdSense readiness — privacy + contact
- **`privacy.html` rewritten** for AdSense compliance: now discloses Firebase Authentication + Firestore (Section 3), hosting-provider request logs (4), Google AdSense + opt-out links (6), EEA/UK/CH consent + DPA rights (7), CCPA/CPRA (8), COPPA (9), retention (10). Date stamp 14 April 2026.
- **`contact.html` created** — Telegram contact channel ([@develop_sup](https://t.me/develop_sup)) + privacy-request guidance + feature-request invitation + shop-owner CTA. (Originally drafted with a placeholder email; user opted for Telegram instead.)
- **Footer updated across all 7 pages** (`index, landing, about, faq, contact, privacy, terms`) to include `Contact` link between FAQ and Privacy.
- **About page** "Contact" section now points to `contact.html` instead of "project repository".
- **Still blocking AdSense application**:
  1. Custom domain (cannot apply with `*.web.app`).
  2. Google-certified Consent Management Platform banner for EEA/UK traffic (e.g. Funding Choices).
  3. Optional but recommended: 3–5 substantive blog/help articles to thicken content.

## Session 2026-04-14 changes (v1.0 polish — analytics, round-view UX, home redesign, in-app docs)

### Google Analytics 4 (GA4) wired up
- Property `G-44W3GZTCS4`. `gtag.js` snippet added to all 8 HTML pages (`index, landing, about, faq, contact, privacy, terms`) right before `</head>` — async, non-blocking.
- `app.js` adds a `track(event, params)` helper that no-ops in viewer mode and when `gtag` is missing. Wired events:
  - `tournament_started` (`format`, `player_count`) — Swiss + Knockout start paths
  - `round_submitted` (`format`, `round_number`, `player_count`)
  - `tournament_ended` (`format`, `total_rounds`, `player_count`) — knockout champion + Swiss endTournament + Swiss final-round merged-submit
  - `tournament_published` (`format`, `player_count`)
  - `pairings_reshuffled` (`format`)
- `privacy.html` Section 4a discloses GA4 + opt-out link.
- View counts/session breakdowns live in GA4 → Reports → Engagement → Events. For per-day/week/month custom event totals, use Explore → Free-form (dimension `Event name`, metric `Event count`, set date granularity in the report header).

### Re-shuffle round 1 pairings
- New round-action button (visible on round 1, pre-submit, admin only) — re-runs `generatePairings(0)` (Swiss) or `buildKnockoutFirstRound(state.players)` (knockout) and replaces `state.rounds[0]`. Saves snapshot, syncs to cloud.
- i18n: `round.reshuffle`, `round.confirmReshuffle`. New export `app.reshufflePairings`. GA4 event `pairings_reshuffled`.

### Round-view toolbar overhaul (top of round panel)
- Pulled Compact / Projector / Publish / Re-shuffle out of the legacy `.timer-controls` bar into a new `.round-actions` toolbar at the top of the round panel.
- Each button is now icon + label: Compact (4-grid), Projector (monitor), Publish (QR-code), Re-shuffle (shuffle arrows), End Tournament (red circle-X).
- Generic `.btn-action` CSS system + `.btn-action-primary` (Publish, orange filled) + `.btn-action-danger` (End, red outline).
- Layout: **End Tournament top-left** (close-this-tournament feel), other actions top-right. Footer: **Previous Round bottom-left**, **Submit Results bottom-right** — natural back/forward axis.
- `applyCompactMode()` / `updateProjectorMode()` / `updatePublishButton()` now write to inner `.btn-label` so the SVG icon is preserved across toggles.
- `.timer-controls` retains only timer affordances (-1m / Start / Reset / +1m / Mute).

### Submit Results merged with End Tournament on the final round
- `isFinalRound()` helper: Swiss = `currentRound + 1 >= getRecommendedRounds()`; Knockout = exactly one non-bye pairing in the current round.
- On the final round the submit button label flips to **"Submit Results & End Tournament"** / **"提交結果並結束賽事"**, the confirm dialog uses `round.confirmSubmitEnd`, the standalone End Tournament button auto-hides (no duplication).
- Swiss final-round path now calls `tournamentEnded = true` + navigate to standings instead of generating another round. Knockout final still uses the existing champion-confirm flow.
- New i18n keys `round.submitEnd`, `round.confirmSubmitEnd`.

### Home view redesign — 2×2 glass tiles
- `.home-buttons` switched from 3-column (3+1 orphan row) to **2×2 grid**, max-width 720px, single column under 560px.
- Each tile = `.home-tile` with absolute-positioned `.home-tile-glow` (radial bloom on hover) + top accent bar + lift-on-hover transform.
- Primary tiles (Swiss / Knockout) — orange linear-gradient with white sheen, orange-tinted shadow halo.
- Secondary tiles (Lucky Wheel / Advanced) — dark glass with orange accent on icon.
- Replaced unicode glyph icons with inline SVG (crossed swords, bracket lines, wheel-spokes, gear) inside a rounded-rect `.btn-icon` badge.
- Selectors all prefixed with `.home-buttons` to outrank the older `.home-buttons .btn-large.btn-primary` cascades.

### Updates / announcements feature (home view)
- New panel pinned above the welcome heading on home: title pill, top-3 update items (date + title), bottom-right `…` chip → opens **All Updates** modal; clicking any title opens **Detail** modal.
- Detail close-from-list reopens the list automatically (tracked via `updatesDetailFromList` flag); detail close-from-panel returns to home.
- `UPDATES` is a JS array of `{date, title:{en,zh}, body:{en,zh}}`. Newest-first. Body uses `\n` line breaks rendered via `white-space: pre-wrap`. Re-renders on language toggle.
- v1.0 launch: array trimmed to **two entries** — (1) *Welcome — TCG Tournament Manager v1.0* (mission, future ad model, gratitude) and (2) *User guide & recommended workflow* (7-section walkthrough). Both bilingual.
- New i18n: `updates.title`, `updates.allTitle`, `updates.more`. Exports: `openUpdatesList`, `closeUpdatesList`, `openUpdateDetail`, `closeUpdatesDetail`.

### Pairing-rules in-app docs (`?` badge on home tiles)
- Small circular `?` badge in the top-right corner of each primary home tile. Clicking it stops propagation and opens the pairing-help modal pre-filled for that format.
- `PAIRING_HELP[swiss|knockout]` data: format label + title + multi-section body (generation, no-rematch backtracking / standard seed order, byes, tiebreakers, drop-player handling, draws policy, when-to-use). Bilingual. Reuses `.updates-detail-body` styling.
- `openPairingHelp(format)` — explicit format arg from the home tiles; falls back to `state.tournamentType` if called without args (reserved for any future round-view trigger).
- Keyboard accessible (Enter / Space on the badge); hidden in projector mode.

### CSS surface area
- New blocks appended to `style.css`: `.btn-action` toolbar system, Updates panel + modal, pairing-help button + modal, `.home-tile` glass-tile system. Total CSS now ~3,750 lines (was 3,403).

### Files touched (this session)
- `app.js` — analytics helper + event firings, reshuffle handler, `isFinalRound`, button-label refactor, UPDATES array + render/modal handlers, PAIRING_HELP + handlers, exports, i18n additions.
- `index.html` — round-actions toolbar restructure, home tiles rewrite with SVG icons + `?` badges, Updates panel + 2 modals, pairing-help modal, gtag snippet.
- `style.css` — `.btn-action*`, `.round-actions*`, `.updates-*`, `.pairing-help-*`, `.home-tile*` blocks.
- `style.css`, `about.html`, `contact.html`, `faq.html`, `index.html`, `landing.html`, `privacy.html`, `terms.html` — gtag snippet inserted before `</head>`.
- `privacy.html` — Section 4a (GA4 disclosure).

### Pending console actions (carried forward)
- Still pending: enable Firestore TTL on `tournaments.expiresAt`; restrict the Firebase Web API key in Google Cloud Console by HTTP-referrer.

### Cyber-Amber theme swap (post-v1.0 patch, same day)
- Brand accent shifted from energetic orange `#FF7324` to premium amber `#F59E0B` (hover `#D97706`).
- Surfaces unchanged (`#1A1A1A` family) — only the warm accent shifts.
- Side-A repainted to softer light-blue `#60A5FA` (was `#3B82F6`); side-B follows the new amber.
- `--color-draw` desaturated to beige `#E8D9A8` so it doesn't fight the amber brand.
- `--color-win` upgraded to emerald `#10B981`; `--color-loss` to `#EF4444` for clearer semantic contrast on dark.
- All hardcoded `rgba(255,115,36,…)` glow/tint values replaced with `rgba(245,158,11,…)`.
- Original orange/dark-neutral tokens preserved at `style.tokens.backup.css` (paste back over the two `:root` blocks in `style.css` to restore).

### Theme picker — 6 palettes (post-v1.0 patch, same day)
- New dropdown in the top-right header (between the logo and the language toggle) lets the user pick a theme live. Choice persists in `localStorage.ptcg_theme`.
- Six themes ship (renamed 2026-04-15 to neutral colour names for IP safety):
  - **Original** (default) — orange `#FF7324` on dark-neutral (`#1A1A1A` / `#262626`). Class: `.theme-original`. Key: `original`.
  - **Deep Purple** — `#6E32A8` on purple-toned neutrals (`#1B172B` / `#251F3A`). The base `:root` cascade *is* this palette, so no `.theme-deeppurple` class exists; selecting it strips all theme classes from `<html>`.
  - **Ethereal Magenta** — `#FF52D9` on cool blue-grey. Class: `.theme-magenta`. Key: `magenta`.
  - **Psychedelic Cyan** — `#22D3EE` on deep purple-black. Class: `.theme-cyan`. Key: `cyan`.
  - **Electric Yellow** — `#FFD700` on deep slate. Class: `.theme-yellow`. Key: `yellow`.
  - **Ninja Coral** — `#FF7F50` on deep navy. Class: `.theme-coral`. Key: `coral`.
- Implemented via `.theme-<name>` classes on `<html>` that override CSS custom properties. The base `:root` block carries the Deep Purple tokens; each non-default theme is one override block.
- Default for new users is `original` (per April-15 update). Existing users' picks are migrated via `THEME_MIGRATE` (`crobat→deeppurple`, `gardevoir→magenta`, `gengar→cyan`, `pikachu→yellow`, `greninja→coral`) — applied both in `app.js` and the pre-paint `<head>` script, and the migrated key is written back to `localStorage` so the migration runs once.
- Hardcoded brand-color rgbas refactored to `rgba(var(--color-primary-rgb), α)` so every theme's alpha-blended glows/tints swap cleanly. Same pattern for `var(--side-a-rgb)`.
- Inline `<head>` script reads `localStorage.ptcg_theme` and adds the class before first paint — no flash-of-wrong-theme on reload.
- Exports: `app.toggleThemeMenu`, `app.selectTheme`. UI strings are English-only (no i18n keys for theme names).
- Adding a new theme = one `.theme-<name>` block in `style.css`, one entry in `THEME_LABELS` + classList branch in `app.js`, one `<li>` in `index.html`, and one branch in the pre-paint `<head>` script.

### Configurable Swiss scoring (post-v1.0 patch, same day)
- New `state.scoringDrawBonus` (boolean, default `false`).
  - `false` (default) → **Win 3, Loss 1, Draw 0** — house rule: showing up earns a point, draws score nothing.
  - `true` → **Win 3, Draw 1, Loss 0** — traditional Swiss.
- New helper `pointsFor(result)` is the single source of truth; `applyResults()` and Advanced Recovery's replay both consume it.
- Bye always awards 3 points (unchanged).
- Knockout bracket advancement is unaffected (decided by result, not points).
- Registration view gets a checkbox row (`#scoring-draw-bonus`) under the name/date inputs. Locked the moment `tournamentStarted` flips true, just like the meta inputs. New i18n keys `reg.scoringDrawBonus` + `reg.scoringHint` (EN + zh-Hant). New export `app.toggleScoringDrawBonus`.
- Pairing-help modal Swiss body updated to describe both modes + bye behavior, both languages.
- New Updates entry seeded for users (newest first in `UPDATES` array).

## Next candidate tasks
- Update `privacy.html` to disclose Firebase storage when published (required before broad launch).
- Knockout v2: hide Draw button, manual/drag seeding, Bo3 mode, proper bracket-tree visualization for desktop.
- Knockout standings: show bracket placement (Champion / Runner-up / Semifinalist / etc.) instead of Swiss-style W/L/OWP.
- Take down or redirect the legacy `ptcgstm.web.app` site once usage migrates to `tcgtm.web.app`.
- Add Ko-fi / Buy-Me-a-Coffee button to landing.
- Rebrand folder/repo from `PTCG` → `tcgtm` (low priority; internal only — `localStorage` keys still use `ptcg_*` for backward compat).
- Premium gating: free = 1 active published tournament, paid = unlimited + history.
- Cross-device admin via transferable key.

## Common commands
```bash
# Branch
git branch --show-current        # confirm on income
git checkout income              # or main

# Validate JS syntax (no test suite)
node -e "new Function(require('fs').readFileSync('app.js','utf8')); console.log('OK')"

# Serve locally (Firebase needs http://, not file://)
cd /Users/wical/PTCG && python3 -m http.server 8000

# LAN access (for phone testing)
ipconfig getifaddr en0
# then open http://<that-ip>:8000 on the phone
```

## Session etiquette reminders
- Keep responses tight (≤100 words for normal turns; longer only when genuinely needed).
- Confirm before destructive git ops (push/force/reset).
- User prefers surgical CSS overlays over full rewrites (easy to revert).
- User wants both EN + 繁體中文 everywhere; add i18n keys when adding UI.
