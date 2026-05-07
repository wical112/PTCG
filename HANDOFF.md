# GameSet HK — Project Handoff

> Snapshot of the project as of **2026-04-25**. Pick this up to resume work without re-reading the chat history. For deep history of earlier sessions, see `CONTEXT.md`.

---

## What it is

**GameSet HK** (formerly TCGTM / Pokémon TCG Tournament Manager) — a single-page, browser-based tournament manager for **Pokémon TCG** and **Beyblade X (Spin Battle)**. Free, no signup, runs entirely in the browser with optional Firebase Firestore for live spectator sync.

- **Owner side**: register players, run Swiss / knockout brackets, score matches, manage timer + projector, publish a live spectator link.
- **Viewer side**: spectators open a tournament link, see live pairings + standings synced in real time.

## Live URLs

- **Canonical**: <https://gameset-hk.com> (owner)
- **Viewer**: <https://gameset-hk.com/view/?t=ABC123>
- **Aliases that auto-redirect**: `tcgtm.web.app`, `tcgtm.firebaseapp.com`, `ptcgstm.web.app`, `ptcgstm.firebaseapp.com` — anything non-canonical bounces to `gameset-hk.com`
- **Repo**: `https://github.com/wical112/PTCG`, branch `income`
- **Working dir**: `/Users/wical/gameset-hk`

## Stack

| Layer | Tech |
|---|---|
| Frontend | Static HTML + vanilla JS (IIFE pattern) + CSS — no build step |
| Hosting | Firebase Hosting (project `ptcgstm`, two sites: `tcgtm` primary + `ptcgstm` legacy redirect) |
| State (local) | `localStorage` keys `ptcg_state`, `ptcg_round_N`, `ptcg_lang`, `ptcg_theme`, `ptcg_advanced_staging` |
| State (cloud) | Firestore `tournaments/{id}` (anonymous auth, 30-day TTL on `expiresAt`) |
| Functions | Firebase Functions v2 (Node 20, TypeScript) — `onTournamentStarted` Telegram alert |
| Analytics | GA4 property `G-44W3GZTCS4` |
| Telegram bot | `@develop_sup` admin chat for tournament-started alerts |

## File / folder layout

```
/index.html              — Owner entry (home + all admin views)
/view/index.html         — Viewer entry (forces view-only mode)
/app.js                  — App logic (~5400 lines, single IIFE on `const app`)
/cloud.js                — Firestore wrapper (publish / subscribe / sync)
/firebase-config.js      — Web SDK config (API key safe to expose)
/firestore.rules         — Read-anyone, write-owner-only
/style.css               — Base + appended polish layers (~5200 lines)
/manifest.webmanifest    — PWA install metadata
/firebase.json           — Hosting (multi-site) + Functions config
/functions/src/index.ts  — Cloud Functions (TG alert on publish)
/landing.html            — Marketing home
/about.html, faq.html, contact.html, legal.html, privacy.html, terms.html
                         — Standalone marketing/legal pages (do NOT load app.js)
HANDOFF.md               — This file
CONTEXT.md               — Historical session log (deep detail)
DEPLOY.md, README.md     — Public-facing docs
DOMAIN_MIGRATION.md      — One-time rebrand record (TCGTM → GameSet HK)
ADD_REDIRECT_DOMAIN.md   — Step-by-step for pointing a new domain → gameset-hk.com
BEYBLADE_X_FEATURE_PLAN.md — Beyblade X v1 plan + answers locked in
```

## Architecture — owner vs viewer page

There are **two HTML entry points** sharing the same `app.js`:

| URL | Loads | Mode | Bug class |
|---|---|---|---|
| `/` | `app.js` | Owner — full editing | All handlers callable |
| `/view/?t=ABC` | `app.js` | Viewer — `body.view-only` baked in | Mutation handlers gate on `viewOnly` |

**URL routing rules**:
- `/?t=ABC` (legacy QR codes) → inline-script bounces to `/view/?t=ABC`
- `/view/` (no `?t`) → bounces back to `/`
- `cloud.buildViewUrl(tid)` always generates `/view/?t=ABC` for new shares

**Phase 1 done. Phase 2+ pending** — viewer still loads the full `app.js`. Future work: extract shared `core.js`, slim viewer bundle by ~43%. See "Pending work" below.

## Game modes

| Game | Format | Key state |
|---|---|---|
| TCG (default) | Swiss / Knockout / Best-of-3 (opt-in) | `gameType: 'tcg'`, `bestOfThree` |
| Beyblade X "Spin Battle" | Swiss / Knockout, 1-on-1 or 3-on-3 | `gameType: 'spin-battle'`, `matchTargetPoints` (4 default), `threeOnThreeMode`, `stadiumOutEnabled` |

**Beyblade X specifics**:
- Cross popup with motion-based finish picker (Xtreme up, Knock Out right, Survivor down, Burst left)
- Penalty system: launch errors (2 in same battle → +1 opp), match warnings (3 → DQ), malfunctions (3 → opp wins)
- 3-on-3 deck registration with QR generate + scan + paste-code (BarcodeDetector API)
- Tournaments can start without full Bey registration — missing players get a ⚠ badge in round view
- Standings show **BattlePts** (sum of finish points) instead of WOScore
- Home tiles for Spin Battle Swiss/Knockout still carry **TESTING** yellow diagonal badges (drop when ready — task is parked)

## Standings / tiebreakers

Sort order: **Match Points → OWP → OOMW → BattlePts (or WOScore for TCG) → Byes**

- **OWP**: Pokémon TCG official formula `(opp.wins + 0.5*opp.draws) / opp.totalGames` with 0.25 floor per opponent
- **OOMW**: Average of opponents' OWPs
- **WOScore**: Win-out score (TCG only, secondary tiebreaker reference column)
- **BattlePts**: Sum of finish points across all matches (Spin Battle only)
- Top 3 get gold / silver / bronze medal emoji 🥇🥈🥉

## Recent session (2026-04-25) — what landed

### Critical bug fixes
1. **View-mode editability** — 10 mutation handlers were missing `viewOnly` guards (`setResult`, `bulkAddPlayers`, `deletePlayer`, `editPlayerName`, `setRoundCount`, `startTournament`, `startNewTournament`, `startKnockoutTournament`, `endTournament`, `resetTournament`). Added guards + CSS to disable spin/Bo3/penalty/deck UI in view mode.
2. **Bo3 re-edit** — Once a TCG Best-of-3 match auto-locked at 2 game wins, all game buttons disabled. Now any game re-tappable; recompute match result on each change.
3. **Spin locked-card UX** — When match auto-locks at target points, prominent ↶ Undo CTA replaces the small undo button.
4. **`?t=ABC&import=XYZ` race** — Viewers with combined params accidentally ran SHOWDOWN import. Fixed by checking `?t=` first in `init()`.

### Viewer improvements
5. **Phase 1 view/owner split** — `/view/index.html` separate page, `cloud.buildViewUrl` points there, root inline-script redirects `?t=*` legacy URLs.
6. **Viewer Round/Standings tabs** — `<nav id="viewer-tabs">` under header, lets viewers flip between live pairings and full standings without breadcrumb.
7. **Mobile header fix** — GAMESET HK title was clipped on phone. Hidden "Original" theme-name label on ≤480px (chevron only), reduced lang-toggle padding, freed ~64px for the logo.
8. **No flash on viewer load** — `<body class="view-only">` baked into `view/index.html` so admin-hide CSS applies frame 1.

### Polish
9. **Share panel hint** mentions Beys ("配對、結果、排名同陀螺資料都會即時同步")
10. **Telegram start alert** — refreshed to GameSet HK + game type (🃏 TCG / 🌀 Spin Battle) + sub-modes (first-to-N, 3-on-3, Stadium Out, Best of 3) + Swiss/Knockout
11. **iOS download → Photos** — `downloadStandings()` now uses `navigator.share({files})` so iOS opens the native share sheet ("Save Image" → Photos). Falls back to `<a download>` on desktop.
12. **Standings PNG full-width capture** — temporarily expand wrapper to `max-content` + read scrollWidth + 24px buffer so every tiebreaker column lands in the saved image regardless of viewport.

### Telegram bot (already shipped earlier in week)
- Bot: `@gameset_hk_bot` (admin chat in env, secret stored in Firebase Functions Secret Manager)
- Fires on `tournaments/{id}` `tournamentStarted` flipping false → true
- Posts: name, game type, format, player count, round count, sub-modes, view URL

## Deployment

```bash
# From /Users/wical/gameset-hk
firebase deploy --only hosting              # both tcgtm + ptcgstm sites
firebase deploy --only functions            # TG alert function
firebase deploy --only hosting,functions    # both at once

# Cache-bust pattern in index.html / view/index.html:
#   <script src="app.js?v=20260425e">      ← bump letter on every JS change
#   <link  href="style.css?v=20260425c">   ← bump letter on every CSS change
```

**Branch model**: working on `income` (paid/commercial track). `main` is the public/free release line — much older, no cloud features. **Don't push `income` → `main`.**

## Common commands

```bash
node -c app.js                              # syntax check
python3 -m http.server 8000                 # serve locally (Firebase needs http://, not file://)
ipconfig getifaddr en0                      # phone testing IP
cd functions && npm run build               # TS → JS for Functions
git status / git log --oneline -10
```

## Pending work (next priorities)

### Immediate / quick
- **Drop TESTING badges on Spin Battle home tiles** — user has been waiting to confirm v1 stable. Just remove `home-tile-testing` class + `<span class="testing-badge">` from index.html.
- **Update `README.md` and `DEPLOY.md`** — still reference TCGTM project naming (cosmetic, not broken).

### View/owner split — Phase 2+ (if pursuing)
Phase 1 (URL split) shipped this session. Remaining phases:
1. **Phase 2**: extract `core.js` with shared modules (i18n table ~620 lines, theme/lang init, helpers) — ~half day, medium risk (refactor).
2. **Phase 3**: extract `getStandings`, `calculateOWP/OOMW`, `validateDeck`, `cleanState` to core.
3. **Phase 4**: move render functions (`renderRound`, `renderStandings`, `renderPlayerList`, `showTrainerCard`) to core, parameterised so admin/viewer pass appropriate handlers — ~1 day, **medium-high risk** (easy to break round view).
4. **Phase 5**: slim `view.js` to subscribe + tabs + pin + share. Drop registration/editor/wheel/etc. from viewer bundle. ~43% viewer bundle reduction.
5. **Phase 6**: rename `app.js` → `owner.js`.

Total ~3 sessions. **Cheaper alternative if only the bug class matters**: wrap every owner handler in a `requireOwner(fn)` helper that checks `viewOnly` once at registration. ~50 LOC change, eliminates missed-guard bugs without the refactor.

### Known low-priority
- PWA `start_url` is hardcoded to `/`. Viewers installing PWA from `/view/?t=ABC` land on owner page when tapping home-screen icon. Acceptable for v1.
- ~100 EN i18n keys without ZH counterparts (older keys, EN fallback works).
- Per-Bey win count in trainer card (v1.5 deferred).
- "Best Bey" aggregate panel after standings (v1.5 deferred).

### v1.5 / future
- Cross-device admin via transferable key.
- Premium gating: free = 1 active published tournament, paid = unlimited + history.
- Code splitting / esbuild build step (when JS exceeds ~10K lines).
- Player profile page on TopCut HK (`/player/[id]`) — already shipped at `~/SHOWDOWN/`.

## Known gotchas

1. **Firebase API key has HTTP-referrer restrictions** in Google Cloud Console. Adding a new domain → must add `https://newdomain.com/*` to the referrer allowlist or anonymous auth fails with `auth/requests-from-referer-...are-blocked`. (Set to `Browser key (auto created by Firebase)`, ends in `...PSpICCAHk`.)
2. **Firebase Auth Authorized domains** also has its own allowlist — must include `gameset-hk.com` (already done).
3. **Cloudflare DNS for redirect domains**: A record must be **DNS only** (gray cloud), not orange-proxied. Firebase manages SSL; Cloudflare's edge SSL conflicts with Firebase's cert provisioning.
4. **`Cloud sync `cleanState()`** strips per-device fields (`projectorMode`, `compactMode`, `currentView`, `timerMuted`) only. All other state syncs to viewers — be careful adding new fields.
5. **`view/index.html` uses absolute paths** (`/style.css`, `/app.js`, `/firebase-config.js`) since it lives in a subfolder. Root `index.html` uses relative paths (works because root IS `/`).
6. **`localStorage` keys still prefixed `ptcg_`** for backward compatibility — don't rename (would lose all existing users' tournaments).
7. **`onclick="app.foo()"` inline handlers** work because `const app = (() => {...})()` at script-level scope is accessible to inline event handlers in classic (non-module) scripts. Don't move to ES modules without rewiring.

## Memory anchors (auto-memory)

The user's auto-memory at `~/.claude/projects/-Users-wical/memory/` already tracks:
- TopCut HK platform context (sister project at `~/SHOWDOWN/`)
- TopCut HK ↔ TCGTM URL-based base64 JSON integration

This session adds:
- GameSet HK (this project) — should be saved as a separate project memory (see below).

## Etiquette

- User prefers tight responses; long explanations only when needed.
- Bilingual EN + 繁體中文 everywhere — add i18n keys when adding UI.
- Confirm before destructive git ops (push/force/reset).
- Surgical CSS overlays preferred over full rewrites.
- Cache-bust JS/CSS on every change so phones reload immediately.
