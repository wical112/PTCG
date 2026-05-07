# GameSet HK — Project Handoff

> Snapshot as of **2026-05-08**. Pick this up to resume work without re-reading chat history. For pre-host-event session log see `CONTEXT.md`. The 2026-05-07 and 2026-04-25 versions of this file are preserved in git history.

---

## What it is

**GameSet HK** — a single-page, browser-based tournament manager for **Pokémon TCG** and **Beyblade X (Spin Battle)**. Free, no signup, runs entirely in the browser with optional Firebase Firestore for live spectator sync.

Three product surfaces:

1. **Tournament tool** (original) — `/`, `/view/?t=ID` — register players, run brackets, score matches, publish live to spectators. **NEW (2026-05-08)**: spectator pin can self-report match results with pass-the-phone signature confirm; lucky-draw wheel spin animation broadcasts live to every viewer.
2. **Hosted PTCG events** — `/host/?e=ID&k=KEY`, `/event/?e=ID` — organizer-side event editor + public participant signup. Events feed the bracket tool when「開始比賽」 is hit. **NEW (2026-05-07/08)**: registration cap (with «no cap» option); organizer always bypasses cap for walk-ins; HK-shop autocomplete on org / event-name / address.
3. **TopCut HK syndication** — events + tournament results auto-post to <https://topcut-hk.com> feed under verified `@gameset_hk` system user; deck distribution credits TopCut's Meta page popularity counters.

## Live URLs

| Surface | URL |
|---|---|
| Owner home | <https://gameset-hk.com> |
| Tournament viewer | `https://gameset-hk.com/view/?t=ABC123` |
| Tournament viewer + self-report | `https://gameset-hk.com/view/?t=ABC123&me=hk12345678` (or `&me=PlayerName`) |
| Host event editor | `https://gameset-hk.com/host/?e=AAB123&k=K-XXXX-XXXX-XXXX-XXXX` |
| Public signup (canonical) | `https://topcut-hk.com/event/?e=AAB123` (legacy `gameset-hk.com/event/?e=ID` redirects) |
| Walk-in QR mode | `https://topcut-hk.com/event/?e=AAB123&w=1` |
| TopCut feed | <https://topcut-hk.com/feed> (gameset posts surface here) |
| TopCut admin | <https://topcut-hk.com/admin> → Posts tab (moderate gameset posts) |
| TopCut user's events | <https://topcut-hk.com/account/events> |

Aliases `tcgtm.web.app` / `ptcgstm.web.app` / `tcgtm.firebaseapp.com` / `ptcgstm.firebaseapp.com` all redirect to `gameset-hk.com`.

- **Repo**: `https://github.com/wical112/PTCG`, working branch `feat/host-event` (off `income`)
- **Working dir**: `/Users/wical/gameset-hk`
- **TopCut counterpart**: `/Users/wical/topcut-hk`, branch `feat/player-only-pivot` (capacity UI + SEO refresh shipped to branch 2026-05-08, **not yet merged to main**)

## Stack

| Layer | Tech |
|---|---|
| Frontend | Static HTML + vanilla JS (IIFE pattern) + CSS — no build step |
| Hosting | Firebase Hosting (project `ptcgstm`, sites `tcgtm` primary + `ptcgstm` legacy) |
| State (local) | `localStorage`: `ptcg_state`, `ptcg_round_N`, `ptcg_lang`, `ptcg_theme`, `ptcg_pwa_dismissed`, `ptcg_event_handoff`, `ptcg_viewer_pin` |
| State (cloud) | Firestore `tournaments/{id}` (live tournament publish, 30-day TTL) + `events/{eid}` (hosted events, 90-day TTL) + `tournaments/{id}/matchReports/{rid}` (self-report audit log, **NEW 2026-05-08**) |
| Storage | `event-images/{eid}/promo-*.{ext}` (≤2 MB, public read) |
| Functions | Node 20 TS — `onTournamentStarted` (TG alert), `onEventWritten` (TopCut sync), `onSignupWritten` (signupCount maintenance, **NEW 2026-05-07**), `publishEventResult` (organizer trigger), `submitMatchReport` (player self-report, **NEW 2026-05-08**), `deleteEvent` (organizer cascade-delete), `claimEvent` (cross-device editKey claim), `cleanupExpiredEvents` (scheduled) |
| Cross-project | GameSet Functions write to TopCut Firestore via secondary Admin SDK app (`TOPCUT_SERVICE_ACCOUNT` secret). One-shot setup script at `scripts/setup-topcut-system-user.mjs`. |
| Analytics | GA4 `G-44W3GZTCS4` |
| Telegram | `@gameset_hk_bot` start-tournament alert chat |

## File / folder layout

```
/index.html              — Owner entry (home + all admin views)
/view/index.html         — Viewer entry (forces view-only mode); supports
                           &me= URL param to enter self-report mode
/host/                   — Hosted-event organizer editor
  index.html             — 3-tab editor: 活動資料 / 推廣文本 / 報名清單
  host.js                — Editor logic + walk-in tools + result preview +
                           HK-shop autocomplete (org / event-name / address)
/event/                  — Public participant signup page (legacy; redirects
                           to topcut-hk.com/event in normal traffic)
  index.html             — Event display + signup modal + capacity gate
  event.js               — Form + Pokémon picker glue + trainer-id validation
/data/pokemon-species.json — ~1300 species, Pokemon names + sprite URLs
/data/hk-shops.json      — 81 PTCG-registered HK + Macau shops with full
                           registered addresses (NEW 2026-05-08, sourced
                           from official PTCG HK directory via goga.jp API)
/pokemon-picker.js       — Vanilla-JS bottom-sheet picker, mirrors TopCut UX
/i18n-host.js            — Shared i18n helper for /host/ and /event/ pages
/app.js                  — App logic (~6300 lines, single IIFE on `const app`)
                           Now includes self-report sheet + signature canvas
                           + matchReports listener + wheel-broadcast logic.
/cloud.js                — Firestore wrapper (tournaments + events + matchReports
                           helpers; submitMatchReport callable wrapper)
/firebase-config.js      — Web SDK config for ptcgstm
/firestore.rules         — events + tournaments + signups + matchReports
                           (phase-aware locks, withinCapacity, callable-only
                           matchReports writes)
/storage.rules           — event-images upload (2MB image-content guard)
/style.css               — ~7300 lines; host/event/picker/self-report/
                           autocomplete/wheel-pulse styles appended
/manifest.webmanifest    — PWA install metadata
/firebase.json           — Hosting + Firestore + Storage + Functions config
/functions/src/
  index.ts               — Cloud Functions entry (5 callables + 3 triggers)
  topcutSync.ts          — Cross-project Admin SDK helpers (TopCut writes;
                           gamesetEvent payload includes capacity)
/scripts/                — One-shot ops scripts (setup, backfill, debug)
  setup-topcut-system-user.mjs — Bootstrap @gameset_hk identity on TopCut
  reverse-meta.mjs       — Backfill cleanup for orphan meta contributions
  revert-trainercard-event.mjs — Clean trainerCard tournamentLogs on cancel
  ...                    — Various dump/check helpers
SETUP_TOPCUT_SYNC.md     — Operator runbook for TopCut sync setup
HANDOFF.md               — This file
CONTEXT.md               — Historical session log (deep detail, pre-host)
DEPLOY.md, README.md     — Public-facing docs
DOMAIN_MIGRATION.md, ADD_REDIRECT_DOMAIN.md — Domain ops
BEYBLADE_X_FEATURE_PLAN.md — Spin Battle v1 spec
```

## Phase 1 — Player self-report (NEW 2026-05-08)

```
Reporter (one of the two players on a pairing)
   │
   ▼
/view/?t=TID&me=hk12345678  (or pin by name in viewer search box)
   │
   ▼
即時對戰 tab pins their own match — buttons (勝 / 平手 / 勝)
go from greyed-out read-only to interactive.
   │
   ▼
Tap a result → pass-the-phone sheet:
  • Match summary («Alice 勝 — Bob 輸» / «平手»)
  • <canvas> signature pad for the OPPONENT
  • Buttons: «✓ 同意並確定»  «❌ 唔同意（標紅旗）»
   │
   ▼
submitMatchReport callable
  • verifies reporterPlayerId / reporterTrainerId matches one of the
    two players on the pairing
  • verifies pairing not already resolved + round not yet locked
  • appends a single matchReports doc (status='confirmed' or 'disputed')
  • signature stored as base64 dataURL audit trail
   │
   ▼
Owner's app subscribes to tournaments/{tid}/matchReports
  • applies confirmed reports to local state.rounds[r].pairings[p].result
  • flags disputed reports with pairing.disputed=true
  • saveState + cloud.syncState — viewers update via existing pipeline
  • idempotent via session-local _appliedReportIds Set
   │
   ▼
Round view shows
  • ✓ 玩家自報 chip (green) on auto-applied rows
  • ⚠ 玩家自報分歧 chip (red, full-row outline) on disputed rows
  • Organizer's setResult tap clears any dispute flag (override path).
```

**Identity model** — primary key is `player.id` (always unique within a
tournament). `trainerId` is bonus metadata that gets cross-checked when
both are supplied. This keeps self-report usable for tournaments NOT
started from a hosted event (no trainer IDs).

**Rules** — `match /matchReports/{rid}` allows public read, `create: if false`
(callable-only via Admin SDK), update/delete owner-only. Direct client
writes are blocked even in test environments.

**Cache** — `/data/hk-shops.json` is fetched with `?v=YYYYMMDDX` cache-bust
since `cache: 'force-cache'` previously served stale data to returning
phones. Bump `HK_SHOPS_VERSION` in `host.js` when editing the dataset.

## Live wheel broadcast (NEW 2026-05-08)

Owner spins → app sets `state.wheelSpin = { startAngle, totalRotation, durationMs, startedAt }` and force-flushes to cloud. Viewer apps subscribed to the tournament doc receive the envelope, kick off the same `easeOutCubic` animation locally, and land on the same final angle. ~2 cloud writes per spin (start + end). Mid-spin viewers fast-forward to the correct angle from `Date.now() - startedAt`.

Viewer page gains a 「抽獎」 / «Wheel» tab (auto-shows once names are set up) with a pulsing red dot during a spin. Viewer's `apply()` callback now respects the chosen tab on snapshot updates instead of yanking back to round (also fixes a pre-existing standings-tab issue).

## Hosted event lifecycle

```
┌────────────────────────────────────────────────────────────┐
│ Organizer (no login)                                       │
│                                                            │
│  /host/?e=NEW                                              │
│      │                                                     │
│      ▼                                                     │
│  Create event → 6-char eventId + 16-char editKey            │
│      │   Owner saves "主辦人專用連結" /host/?e=ID&k=KEY     │
│      ▼                                                     │
│  /host/?e=ID&k=KEY  (3 tabs)                                │
│  • 活動資料 — meta/prizes/image/CAPACITY (auto-saves)      │
│        ↳ org / event-name / address inputs autocomplete    │
│          against /data/hk-shops.json (81 PTCG-registered    │
│          shops with full addresses)                         │
│  • 推廣文本 — multi-lang generated promo text + copy        │
│  • 報名清單 — walk-in QR + manual entry + signup table      │
│              filter chips, check-in / payment chips,        │
│              「開始比賽」 button (≥2 checked-in)            │
│      │                                                     │
│      ▼                                                     │
│  「📣 發佈活動」 toggle → events/{eid}.published = true     │
│      │   onEventWritten Cloud Function fires:               │
│      │     • syncEventPost → posts/{newId} on TopCut       │
│      │     • events doc.topcutPostId = newId                │
│      ▼                                                     │
│  Players sign up via /event/?e=ID OR TopCut feed modal     │
│      │   submitSignup → events/{eid}/signups/{tid}         │
│      │   • withinCapacity rule rejects past cap            │
│      │     (organizer always bypasses)                     │
│      │   onSignupWritten trigger → events/{eid}.signupCount│
│      │     atomic +1 / -1 (NEW 2026-05-07)                 │
│      ▼                                                     │
│  Organizer checks-in arrivals → 「▶ 開始比賽」              │
│      │   localStorage.ptcg_event_handoff written, redirect  │
│      │   to /?event=ID — app.js reads handoff, prefills     │
│      │   state.players (with deckSpecies1/2 + trainerId),   │
│      │   navigates to registration → tournament starts.     │
│      ▼                                                     │
│  Tournament runs (existing /round/standings flow)           │
│      │   Players can self-report via /view + signature      │
│      │   confirm; auto-applies to organizer's local state.  │
│      │   On tournament end app.js calls                     │
│      │   pushEventResultSnapshot() → events/{eid}.          │
│      │   tournamentResultSnapshot                           │
│      ▼                                                     │
│  Standings page                                             │
│      │   Inline player rename · 5-layer auto-publish:       │
│      │     1. wheel banner click                            │
│      │     2. 「📣 確定賽果並發送」 button                   │
│      │     3. navigateTo() leaving standings                │
│      │     4. pagehide                                      │
│      │     5. next-init retry                               │
│      ▼                                                     │
│  publishEventResult Cloud Function:                         │
│  • syncResultPost — posts/{newId} on TopCut (gamesetResult) │
│  • writeTournamentRecords — claimable records by trainer ID │
│  • creditMetaCountersForEvent — diff-based contribution to  │
│    pokemonPopularity / deckPopularity                      │
└────────────────────────────────────────────────────────────┘

Phase transitions:
  signup → live    (organizer hits 「開始比賽」)
  signup → cancelled (organizer 「取消活動」)
  live → ended     (auto on bracket end)
  ended → ended    (re-publish on rename)
  cancelled → signup (organizer 「還原活動」)
  any → cancelled  (cancel triggers cross-project meta reverse)
```

## Phase-aware locks (Firestore rules)

`events/{eid}.update` rules enforce:

| Phase | Editable fields |
|---|---|
| `signup` | Everything (full owner edit) |
| `live` / `ended` | Only allowlist: phase, tournamentResultSnapshot, tournamentId, topcutPostId, topcutResultPostId, published, syncToTopCut, signupCount, updatedAt, expiresAt, _resyncNonce. Meta / prizes / image / capacity / signupOpen are FROZEN. |
| `cancelled` | Same allowlist; phase can flip back to `signup` to un-cancel. |

`events/{eid}.delete` allowed only when `phase=='signup'`. Started / completed / cancelled events stay in DB; admin removal happens via TopCut admin Posts tab (`hardDeletePost` callable).

`events/{eid}/signups/{sid}.create` enforces `withinCapacity()`: organizer always bypasses; public callers blocked when `signupCount >= capacity`. Best-effort under concurrent writes (~200ms trigger lag = up to 1-2 person race).

`tournaments/{tid}/matchReports/{rid}` — public read; `create: if false` (callable-only); update/delete owner-only. Append-only audit trail.

## TopCut HK syndication

### System user
- Email: `system+gameset@topcut-hk.com`
- UID: `fOhLOGS52QOUSMELkYD18Kn3X983`
- Handle: `@gameset_hk` (in `RESERVED_HANDLES` allowlist exception, isVerified, isSystem)
- Setup script: `scripts/setup-topcut-system-user.mjs <topcut-sa.json>`

### Cloud Functions secrets (on `ptcgstm`)
- `TOPCUT_SERVICE_ACCOUNT` — JSON of service account on `tournamet-platform` with Cloud Datastore User + Firebase Authentication Admin roles
- `TOPCUT_SYSTEM_UID` = `fOhLOGS52QOUSMELkYD18Kn3X983`
- `TOPCUT_SYSTEM_HANDLE` = `gameset_hk`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` — for legacy onTournamentStarted

### TopCut posts schema additions
- `posts/{id}.postType` extended with `'gamesetEvent' | 'gamesetResult'`
- `posts/{id}.gamesetEvent` — { eventId, org, name, date, time, address, fee, paymentMethods, imageUrl, prizes, **capacity**, phase, signupOpen, signupCount }
- `posts/{id}.gamesetResult` — { eventId, eventName, format, totalPlayers, totalRounds, standings[], deckDistribution[] }

### Meta credit pipeline
1. `publishEventResult` calls `creditMetaCountersForEvent(card)` after writing posts.
2. Reads previous snapshot at `metaContributions/{eventId}` (TopCut firestore).
3. Diffs current standings' decks vs snapshot, applies atomic increment to `pokemonPopularity/{species}` and `deckPopularity/{sortedKey}`.
4. Writes new snapshot.
5. Re-publishes are idempotent (zero-delta = zero changes).
6. **Reverse paths**: organizer cancels event (`onEventWritten` detects phase→cancelled → reverseMetaForEvent), event self-deleted by organizer (`deleteEvent` callable cascade), admin hides/hard-deletes gamesetResult post (TopCut posts.ts `setPostStatus` / `hardDeletePost`).

### TopCut-side capacity UI status
- **Branch only**: capacity chip + race-aware «已滿額» error in `GamesetSignupModal.tsx`, `FeedCard.tsx` (`GamesetEventStrip`), `event/_client.tsx`
- Sits on `feat/player-only-pivot` branch — needs PR + merge to main for prod Vercel deploy
- GameSet rules already enforce capacity server-side, so prod-TopCut signups already get rejected when full — but the modal currently shows a duplicate-trainerId message instead of «已滿額» until merge

## Walk-in 3 modes

1. Same public link `/event/?e=ID` (signup still open at event time).
2. Walk-in QR `/event/?e=ID&w=1` — organizer shows on screen, player scans on phone, signup auto-marks `source: 'walkin'`.
3. Manual entry — organizer fills form themselves on host page → 報名清單 tab → 「🎟 場內 Walk-in 工具」 panel.

## HK shops dataset (NEW 2026-05-08)

`/data/hk-shops.json` — 81 PTCG-registered shops with full addresses, sourced from the official PTCG HK directory:

```bash
# Refresh source (Pokemon HK shop directory uses goga.jp under the hood)
curl "https://sl.goga.jp/pokemon_hk/api/poi?bounds=21.8,113.5,22.8,114.7&zoom=10" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin);
                gym=[p for p in d if p["marker_index"]==1];
                print(json.dumps(gym, ensure_ascii=False, indent=2))' \
  > /tmp/poi-hk-zh.json
```

`marker_index=1` filters to the official Gym-tier (tournament-organizer) shops. The previous source `topcut-hk/src/lib/conquestTargets.ts` only had area-level labels (e.g. «觀塘»); the goga.jp data has full registered street addresses (e.g. «觀塘 巧明街105號 好運工業大廈 3樓D室»).

Schema:
```json
{
  "name": "KaBoom TCG Store",
  "district": "kwun_tong",
  "region": "kowloon",
  "aliases": ["KaBoom TCG", "KaBoom"],
  "area": "觀塘",
  "address": "觀塘 巧明街105號 好運工業大廈 3樓D室",
  "officialKey": "GYM092"
}
```

Used by `host.js` autocomplete on three inputs:
- 主辦機構 — fuzzy match by name + aliases
- 活動名稱 — `COMMON_EVENT_NAMES` array (Gym Battle, League Cup, 月例賽, ...)
- 地址 — picks the matched shop's full `address` (auto-fill on org pick), or substring match across address/area/name

When you edit the dataset, bump `HK_SHOPS_VERSION` in `host.js` so phones drop their cached copy.

## Deployment

```bash
# From /Users/wical/gameset-hk
firebase use ptcgstm
firebase deploy --only hosting              # both tcgtm + ptcgstm sites
firebase deploy --only functions            # all 5 callables + 3 triggers
firebase deploy --only firestore:rules,storage  # rules-only push
firebase deploy --only firestore:indexes    # composite index updates

# Subset for fast iteration on a single function
firebase deploy --only functions:submitMatchReport
firebase deploy --only functions:onSignupWritten
```

Cache-bust pattern in HTML: `?v=YYYYMMDD<letter>` — bump letter on every JS/CSS change so phones reload immediately. Same pattern in JS for `/data/*.json` fetches via dedicated version constants.

## Common commands

```bash
node -c app.js                              # syntax check
cd functions && npm run build               # TS → JS for Functions
python3 -m http.server 8000                 # serve locally
firebase functions:log -n 30                # tail Cloud Function logs
firebase functions:secrets:get TOPCUT_SYSTEM_UID  # inspect secret state
node scripts/setup-topcut-system-user.mjs ~/topcut-sa.json  # one-shot
git status / git log --oneline -10
```

## Test infrastructure

End-to-end tests for the callable + rules pipeline live in `/tmp/gameset-test/`:

- `test-via-rest.mjs` — 9 validation cases (bad inputs reject)
- `test-happy-path.mjs` — 9 happy-path + state-dependent cases
- `test-rules.mjs` — 7 rules enforcement (matchReports lock, owner-only update)
- `test-player-id.mjs` — 7 player-id-only path (no trainerId required)
- `test-capacity-e2e.mjs` — 10 capacity flow (signup, trigger, owner bypass, decrement)

Bypasses the API-key referer block by setting `Referer: https://gameset-hk.com` header explicitly. Run from `/tmp/gameset-test/` after `npm install firebase firebase-admin`.

```bash
cd /tmp/gameset-test
node test-via-rest.mjs
node test-happy-path.mjs
node test-rules.mjs
node test-player-id.mjs
node test-capacity-e2e.mjs
```

## Pending work

### 🔴 High value next session
- **trainerCards/tournamentLogs integration** — `publishEventResult` extension to write to `trainerCards/{tid}/tournamentLogs/{logId}` so a trainer's TopCut profile reflects GameSet tournament participation. Original spec line.
- **Player claim UI** — TopCut `/account/events` extension showing unclaimed `tournamentRecords` for the trainer ID linked to the user account; one-tap claim writes records into the trainerCard.
- **Merge feat/player-only-pivot → main on TopCut** — capacity UI + SEO refresh sit on the branch; need PR + merge for Vercel prod deploy.

### 🟠 Important
- **Storage TTL cleanup** — scheduled Cloud Function scanning expired events to delete `event-images/{eid}/*` from storage (currently leaks).
- **TopCut notifications** — push when trainer ID gets a new bound record / event signup confirmation / etc.
- **Self-report Phase 2** — public 3-min dispute window, organizer dispute-resolution modal showing the matchReports doc + signature image.
- **Self-report for Spin Battle / Bo3** — current MVP only supports plain TCG single-game.

### 🟢 Polish
- **Bilingual i18n on /host/ /event/** — `i18n-host.js` started; many strings still zh-only.
- **Excel export** — host editor 「📥 下載活動 + 玩家清單」 button (xlsx.js).
- **Spam mitigation upgrade** — current trainerId-uniqueness gate is sufficient for low-traffic. If abuse grows, add CF gateway with IP rate-limit.
- **Self-report Phase 3+** — random-witness selection, trust score across events, witness accountability.
- **Wheel broadcast tab-blur fix** — owner closing the wheel tab mid-spin freezes the local RAF loop. Server-side auto-expire `wheelSpin` envelope after `durationMs + 5s` would fix viewers waiting on a stalled owner.

## Recent sessions

### 2026-05-08 — Capacity + self-report + wheel broadcast + HK-shop autocomplete + SEO
1. **Hosted-event registration cap** (Phase 0) — host editor input + «不設上限» checkbox; `withinCapacity` rule + `onSignupWritten` trigger; race-aware modal error on TopCut.
2. **Player self-report scoring** (Phase 1) — submitMatchReport callable, matchReports subcollection, viewer pin self-report buttons, pass-the-phone signature, owner auto-apply listener, dispute red flag.
3. **Live lucky-wheel broadcast** — wheelSpin envelope synced via cloud, viewer wheel tab with pulsing dot, deterministic animation; viewer apply() now respects chosen tab.
4. **HK shops directory + autocomplete** — `/data/hk-shops.json` with 81 PTCG-registered shops + full addresses (sourced from goga.jp PTCG HK API); host editor org / event-name / address autocomplete; cache-busted via `HK_SHOPS_VERSION`.
5. **TopCut SEO refresh** — root + locale meta rewritten («market» → «tournaments + community»), per-page metadata for /feed /event /players /leaderboard /articles /conquest, sitemap expanded 6→22 URLs, robots.txt blocks auth-only paths + allowlists 4 LLM scrapers, manifest description rewritten.
6. **Updates entries** — 3 new bilingual entries at top of UPDATES array (capacity / self-report / wheel broadcast).
7. **Description text refresh** — about.html / landing.html / index.html meta + landing hero subtitle updated.

### 2026-05-07 — Phase A polish + admin moderation
1. Post-event lockdown: rule-level field freeze when phase ≠ signup.
2. Organizer self-delete event (signup phase only) — cascade clean signups + storage + TopCut post + meta reverse.
3. Trainer ID uniqueness via doc-id (no duplicate signups per event).
4. PWA install floating chip on home (Chrome / Edge prompt + iOS instructions).
5. Admin Posts tab on TopCut: filter / hide / hard-delete with auto meta reverse on gamesetResult removal.

### 2026-05-06 → 2026-05-07 — Host event flow + TopCut sync
- Hosted event surface (host/ + event/), Pokémon picker port from TopCut, trainer ID chip.
- TopCut feed cards (event + result), in-place signup modal, /account/events.
- Cross-project Admin SDK pipeline, meta credit, 5-layer publish guarantee.
- Standings inline rename + 「📣 確定賽果」 manual + auto trigger on wheel / leave / unload / init-retry.

### 2026-04-25 — Beyblade X v1 + viewer/owner Phase 1
- Spin Battle Swiss/KO with 3v3 deck registration, finish picker, penalty system.
- View-only mode hardening (10 mutation handlers gated on viewOnly).
- Bo3 re-edit, viewer Round/Standings tabs, mobile header fix.

## Etiquette
- User prefers tight, action-oriented responses; long explanations only when asked.
- Bilingual EN + 繁體中文 everywhere — add i18n keys when adding UI (host/event still pending).
- Confirm before destructive git ops (push/force/reset).
- Cache-bust JS/CSS on every change so phones reload immediately. Same goes for `/data/*.json` (use a JS-side version constant, not just `cache: 'force-cache'` — that one bit us 2026-05-08).
- Read `SETUP_TOPCUT_SYNC.md` before touching the TopCut sync pipeline.
