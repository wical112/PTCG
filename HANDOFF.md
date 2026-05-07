# GameSet HK — Project Handoff

> Snapshot as of **2026-05-07**. Pick this up to resume work without re-reading chat history. For pre-host-event session log see `CONTEXT.md`. The 2026-04-25 version of this file is preserved in git history.

---

## What it is

**GameSet HK** — a single-page, browser-based tournament manager for **Pokémon TCG** and **Beyblade X (Spin Battle)**. Free, no signup, runs entirely in the browser with optional Firebase Firestore for live spectator sync.

As of **2026-05-07** there are now **three product surfaces**:

1. **Tournament tool** (original) — `/`, `/view/?t=ID` — register players, run brackets, score matches, publish live to spectators.
2. **Hosted PTCG events** (NEW) — `/host/?e=ID&k=KEY`, `/event/?e=ID` — organizer-side event editor + public participant signup. Events feed the bracket tool when「開始比賽」 is hit.
3. **TopCut HK syndication** (NEW) — events + tournament results auto-post to <https://topcut-hk.com> feed under verified `@gameset_hk` system user; deck distribution credits TopCut's Meta page popularity counters.

## Live URLs

| Surface | URL |
|---|---|
| Owner home | <https://gameset-hk.com> |
| Tournament viewer | `https://gameset-hk.com/view/?t=ABC123` |
| Host event editor | `https://gameset-hk.com/host/?e=AAB123&k=K-XXXX-XXXX-XXXX-XXXX` |
| Public signup | `https://gameset-hk.com/event/?e=AAB123` |
| Walk-in QR mode | `https://gameset-hk.com/event/?e=AAB123&w=1` |
| TopCut feed | <https://topcut-hk.com/feed> (gameset posts surface here) |
| TopCut admin | <https://topcut-hk.com/admin> → Posts tab (moderate gameset posts) |
| TopCut user's events | <https://topcut-hk.com/account/events> |

Aliases `tcgtm.web.app` / `ptcgstm.web.app` / `tcgtm.firebaseapp.com` / `ptcgstm.firebaseapp.com` all redirect to `gameset-hk.com`.

- **Repo**: `https://github.com/wical112/PTCG`, working branch `feat/host-event` (off `income`)
- **Working dir**: `/Users/wical/gameset-hk`
- **TopCut counterpart**: `/Users/wical/topcut-hk`, branch `feat/player-only-pivot`

## Stack

| Layer | Tech |
|---|---|
| Frontend | Static HTML + vanilla JS (IIFE pattern) + CSS — no build step |
| Hosting | Firebase Hosting (project `ptcgstm`, sites `tcgtm` primary + `ptcgstm` legacy) |
| State (local) | `localStorage`: `ptcg_state`, `ptcg_round_N`, `ptcg_lang`, `ptcg_theme`, `ptcg_pwa_dismissed`, `ptcg_event_handoff` |
| State (cloud) | Firestore `tournaments/{id}` (live tournament publish, 30-day TTL) + `events/{eid}` (hosted events, 90-day TTL) |
| Storage | `event-images/{eid}/promo-*.{ext}` (≤2 MB, public read) |
| Functions | Node 20 TS — `onTournamentStarted` (TG alert), `onEventWritten` (TopCut sync), `publishEventResult` (callable, organizer trigger), `deleteEvent` (callable, organizer cascade-delete) |
| Cross-project | GameSet Functions write to TopCut Firestore via secondary Admin SDK app (`TOPCUT_SERVICE_ACCOUNT` secret). One-shot setup script at `scripts/setup-topcut-system-user.mjs`. |
| Analytics | GA4 `G-44W3GZTCS4` |
| Telegram | `@gameset_hk_bot` start-tournament alert chat |

## File / folder layout

```
/index.html              — Owner entry (home + all admin views)
/view/index.html         — Viewer entry (forces view-only mode)
/host/                   — Hosted-event organizer editor (NEW 2026-05-06)
  index.html             — 3-tab editor: 活動資料 / 推廣文本 / 報名清單
  host.js                — Editor logic + walk-in tools + result preview
/event/                  — Public participant signup page (NEW)
  index.html             — Event display + signup modal
  event.js               — Form + Pokémon picker glue + trainer-id validation
/data/pokemon-species.json — ~1300 species, Pokemon names + sprite URLs
                            (copied from TopCut HK; lazy-loaded by picker)
/pokemon-picker.js       — Vanilla-JS bottom-sheet picker, mirrors TopCut UX
/app.js                  — App logic (~6000 lines, single IIFE on `const app`)
/cloud.js                — Firestore wrapper (tournaments + events helpers)
/firebase-config.js      — Web SDK config for ptcgstm
/firestore.rules         — events + tournaments + signups (phase-aware locks)
/storage.rules           — event-images upload (2MB image-content guard)
/style.css               — ~6700 lines; host/event/picker styles appended
/manifest.webmanifest    — PWA install metadata
/firebase.json           — Hosting + Firestore + Storage + Functions config
/functions/src/
  index.ts               — Cloud Functions entry (4 callables + 2 triggers)
  topcutSync.ts          — Cross-project Admin SDK helpers (TopCut writes)
/scripts/                — One-shot ops scripts (setup, backfill, debug)
  setup-topcut-system-user.mjs — Bootstrap @gameset_hk identity on TopCut
  reverse-meta.mjs       — Backfill cleanup for orphan meta contributions
  ...                    — Various dump/check helpers
SETUP_TOPCUT_SYNC.md     — Operator runbook for TopCut sync setup
HANDOFF.md               — This file
CONTEXT.md               — Historical session log (deep detail, pre-host)
DEPLOY.md, README.md     — Public-facing docs
DOMAIN_MIGRATION.md, ADD_REDIRECT_DOMAIN.md — Domain ops
BEYBLADE_X_FEATURE_PLAN.md — Spin Battle v1 spec
```

## Hosted event lifecycle (NEW)

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
│  • 活動資料 — meta/prizes/image (auto-saves)               │
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
│  Players sign up via /event/?e=ID  OR  TopCut feed modal    │
│      │   submitSignup → events/{eid}/signups/{tid} (rule    │
│      │   uses trainerId as docId for per-event uniqueness)  │
│      ▼                                                     │
│  Organizer checks-in arrivals → 「▶ 開始比賽」              │
│      │   localStorage.ptcg_event_handoff written, redirect  │
│      │   to /?event=ID — app.js reads handoff, prefills     │
│      │   state.players (with deckSpecies1/2), navigates     │
│      │   to registration → tournament starts.               │
│      ▼                                                     │
│  Tournament runs (existing /round/standings flow)           │
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
- `posts/{id}.gamesetEvent` — { eventId, org, name, date, time, address, fee, paymentMethods, imageUrl, prizes, phase, signupOpen, signupCount }
- `posts/{id}.gamesetResult` — { eventId, eventName, format, totalPlayers, totalRounds, standings[], deckDistribution[] }

### Meta credit pipeline
1. `publishEventResult` calls `creditMetaCountersForEvent(card)` after writing posts.
2. Reads previous snapshot at `metaContributions/{eventId}` (TopCut firestore).
3. Diffs current standings' decks vs snapshot, applies atomic increment to `pokemonPopularity/{species}` and `deckPopularity/{sortedKey}`.
4. Writes new snapshot.
5. Re-publishes are idempotent (zero-delta = zero changes).
6. **Reverse paths**: organizer cancels event (`onEventWritten` detects phase→cancelled → reverseMetaForEvent), event self-deleted by organizer (`deleteEvent` callable cascade), admin hides/hard-deletes gamesetResult post (TopCut posts.ts `setPostStatus` / `hardDeletePost`).

## Walk-in 3 modes

1. Same public link `/event/?e=ID` (signup still open at event time).
2. Walk-in QR `/event/?e=ID&w=1` — organizer shows on screen, player scans on phone, signup auto-marks `source: 'walkin'`.
3. Manual entry — organizer fills form themselves on host page → 報名清單 tab → 「🎟 場內 Walk-in 工具」 panel.

## Deployment

```bash
# From /Users/wical/gameset-hk
firebase use ptcgstm
firebase deploy --only hosting              # both tcgtm + ptcgstm sites
firebase deploy --only functions            # all 4 callables + 2 triggers
firebase deploy --only firestore:rules,storage  # rules-only push
firebase deploy --only firestore:indexes    # composite index updates
```

Cache-bust pattern in HTML: `?v=YYYYMMDD<letter>` — bump letter on every JS/CSS change so phones reload immediately.

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

## Pending work

### 🔴 High value next session
- **Cross-device editKey claim** — `claimEvent({eid, editKey})` Cloud Function. Verifies SHA-256 hash, transfers ownerUid → enables organizer edit from a different device. Currently same-browser only.
- **trainerCards/tournamentLogs integration** — `publishEventResult` extension to write to `trainerCards/{tid}/tournamentLogs/{logId}` so a trainer's TopCut profile reflects GameSet tournament participation. Original spec line.
- **Player claim UI** — TopCut `/account/events` extension showing unclaimed `tournamentRecords` for the trainer ID linked to the user account; one-tap claim writes records into the trainerCard.

### 🟠 Important
- **Storage TTL cleanup** — scheduled Cloud Function scanning expired events to delete `event-images/{eid}/*` from storage (currently leaks).
- **TopCut notifications** — push when trainer ID gets a new bound record / event signup confirmation / etc.

### 🟢 Polish
- **Bilingual i18n on /host/ /event/** — currently zh-only direct strings (no language toggle).
- **Excel export** — host editor 「📥 下載活動 + 玩家清單」 button (xlsx.js).
- **Spam mitigation upgrade** — current trainerId-uniqueness gate is sufficient for low-traffic. If abuse grows, add CF gateway with IP rate-limit.

## Recent sessions

### 2026-05-07 — Phase A polish + admin moderation (current)
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
- Cache-bust JS/CSS on every change so phones reload immediately.
- Read `SETUP_TOPCUT_SYNC.md` before touching the TopCut sync pipeline.
