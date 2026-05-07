# GameSet HK ↔ TopCut HK syndication setup

One-time manual setup so that GameSet HK Cloud Functions can post events / results to TopCut HK's social feed under the verified `@gameset_hk` system identity.

## Prerequisites
- TopCut HK Firebase project (`tournamet-platform`) on **Blaze** plan (already done).
- GameSet HK Firebase project (`ptcgstm`) Functions deployment access.
- Firebase CLI logged in to both projects.

## Step 1 — Create the TopCut service account

1. Open the GCP IAM console for TopCut: <https://console.cloud.google.com/iam-admin/serviceaccounts?project=tournamet-platform>
2. **Create Service Account**
   - Name: `gameset-hk-syndication`
   - Description: `Cross-project writes from GameSet HK Cloud Functions to TopCut social feed`
3. Grant role: **Cloud Datastore User** (or **Editor** for simpler permissioning during first deploy).
4. Click **Done**, then on the service account row → **Keys → Add Key → Create new key → JSON**.
5. Download the JSON. Save it somewhere local (do NOT commit). Suggested path: `~/topcut-sa.json`.

## Step 2 — Create the gameset_hk system user on TopCut

From the GameSet repo root (`/Users/wical/gameset-hk`):

```bash
node scripts/setup-topcut-system-user.mjs ~/topcut-sa.json
```

The script creates:
- Firebase Auth user (`system+gameset@topcut-hk.com`) on `tournamet-platform`
- `handles/gameset_hk` reserved
- `players/{uid}` with `handle: gameset_hk`, `displayName: GameSet HK`, `isVerified: true`, `isSystem: true`
- Custom claims `{ system: true, verified: true }`

Output prints the **UID**. Copy it.

## Step 3 — Set GameSet Function secrets

```bash
# Pick the gameset (ptcgstm) project for these
firebase use ptcgstm

firebase functions:secrets:set TOPCUT_SYSTEM_UID
# paste the UID from Step 2 → enter

firebase functions:secrets:set TOPCUT_SYSTEM_HANDLE
# paste: gameset_hk → enter

firebase functions:secrets:set TOPCUT_SERVICE_ACCOUNT
# paste the entire contents of ~/topcut-sa.json (Cmd+A, Cmd+C from your editor) → enter
```

## Step 4 — Deploy

```bash
# From the gameset-hk root
firebase deploy --only functions
```

This deploys:
- `onTournamentStarted` (existing — Telegram alert)
- `onEventWritten` (NEW — Firestore trigger that syncs `events/{eid}` to TopCut feed)
- `publishEventResult` (NEW — HTTPS callable, organizer-triggered after the bracket ends)

## Step 5 — Verify

1. Open <https://gameset-hk.com/host/> → create a test event with at least name + date.
2. Check TopCut feed: <https://topcut-hk.com/feed> — a post by `@gameset_hk` should appear within a few seconds.
3. The post should include the event card (title, date, address, prize tiers, image, "Register on GameSet" button).
4. Toggle the "📣 同步去 TopCut HK 社群" off in the host editor → confirm the post is left in place but no further updates flow until re-enabled.
5. Run a tournament from the event → end it → click `📣 預覽 + 發送結果到 TopCut HK` → confirm the result post appears with deck pie chart and standings.

## Troubleshooting

- **"secrets not set — skipping sync"** in `onEventWritten` logs → Step 3 missed.
- **"PERMISSION_DENIED: Cloud Datastore"** when invoking `publishEventResult` → service account is missing the **Cloud Datastore User** role, or the JSON is for the wrong project.
- **The post appears but with handle `anonymous`** → `TOPCUT_SYSTEM_HANDLE` is unset; runtime fall-back used. Re-run Step 3.
- **Need to rotate the service-account key** → Generate a new key, update `TOPCUT_SERVICE_ACCOUNT`, redeploy. Old key can then be deleted in GCP IAM.

## Rollback

If you need to disable the syndication temporarily:

```bash
firebase functions:secrets:destroy TOPCUT_SERVICE_ACCOUNT
firebase deploy --only functions
```

The Functions will deploy but `onEventWritten` will log "secrets not set — skipping sync" and no posts will be made. Existing posts on TopCut remain visible.
