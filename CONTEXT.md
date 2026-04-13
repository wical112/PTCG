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
