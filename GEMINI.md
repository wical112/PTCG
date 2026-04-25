# TCG Tournament Manager — Gemini CLI Context

## What this is
Browser-based TCG tournament manager. Supports **Swiss** (round-robin with standings) and **Knockout** (single-elimination bracket) formats. No build step — plain HTML + CSS + vanilla JS served statically via Firebase Hosting.

Live at: **https://gameset-hk.com**
GitHub: https://github.com/wical112/PTCG (branch `income` is the working branch)

---

## File roles

| File | Purpose |
|---|---|
| `index.html` | Single-page app shell — all views are in here (home, registration, round, standings). Loads Firebase SDKs → `firebase-config.js` → `cloud.js` → `app.js`. |
| `app.js` | All app logic: state machine, pairings, i18n (EN + zh-Hant), persistence, GA4 events, exports. ~6,500 lines. |
| `cloud.js` | Firestore wrapper: `init`, `publish`, `syncState`, `subscribeView`, `unpublish`, `buildViewUrl`. |
| `firebase-config.js` | Live Firebase credentials for project `ptcgstm`. These are correct — do not change. |
| `style.css` | All styles, ~3,750 lines. Built by appending layers; do NOT rewrite, only append or surgically patch. |
| `style.tokens.backup.css` | Backup of the original orange token set. Reference only. |
| `firestore.rules` | Firestore security rules: public read, owner-only write/delete. |
| `firebase.json` | Firebase hosting config (target: `tcgtm`). |
| `landing.html` | Marketing homepage. |
| `about.html`, `faq.html`, `contact.html`, `privacy.html`, `terms.html`, `legal.html` | Static content/legal pages. All have the same footer structure. |
| `DEPLOY.md` | Step-by-step deploy guide (read this before shipping). |
| `CLOUD_SETUP.md` | Firebase setup guide for a fresh project. |
| `CONTEXT.md` | Deep session history and architecture notes (Claude-authored, kept for reference). |

---

## Architecture

- **State**: single `state` object in `localStorage`. Keys are prefixed `ptcg_*` (kept for backward compat even though the brand is now "TCG Tournament Manager").
- **Views**: pure DOM manipulation via `showView(name)`. Views: `home`, `registration`, `round`, `standings`.
- **i18n**: `T` object with `en` + `zh` keys. All user-visible strings must have both. Language stored in `localStorage.ptcg_lang`.
- **Cloud**: optional Firestore sync. Admin publishes → viewers subscribe via `?t=<tournamentId>` URL param. Viewer mode enforced by `body.view-only` CSS class.
- **Exports**: `app.js` exposes functions on `window.app.*` for use in `onclick` handlers in `index.html`.

---

## Editing conventions

### Always required when adding UI text
Add **both** `en` and `zh` entries to the `T` object in `app.js`, then use `t('key')` in templates. Never hardcode English-only strings in rendered HTML.

### CSS — surgical edits only
`style.css` is layered. Always **append** new rules at the bottom or patch existing selectors in-place. Never reformat or reorder the file. If you're not sure a selector exists, `grep` for it first.

### Adding a new export
If `index.html` calls `app.someFunction()` in an `onclick`, make sure `app.js` exports it:
```js
window.app = { ..., someFunction };
```

### Cache-bust on every deploy
All `<script>` and `<link>` tags in HTML files use `?v=YYYYMMDDx` query strings. Bump the version on every deploy that changes the referenced file (see `DEPLOY.md` Step 2).

### Changelog entry on every deploy
The in-app changelog lives in `app.js` as `const UPDATES = [...]` (newest first). Prepend a new bilingual entry before shipping (see `DEPLOY.md` Step 3).

---

## Local development

```bash
# Serve locally (file:// protocol will NOT work — Firebase SDK requires http://)
cd /path/to/PTCG
python3 -m http.server 8000
# Open http://localhost:8000

# Validate JS syntax (no test suite)
node -e "new Function(require('fs').readFileSync('app.js','utf8')); console.log('OK')"
```

---

## Deploy

See **`DEPLOY.md`** for the full checklist. Short version:

```bash
# Bump ?v= in index.html, prepend UPDATES entry in app.js, then:
git add <only changed files>
git commit -m "Feature: description"
firebase deploy --only hosting:tcgtm
git push origin income
```

---

## Key constraints / things to preserve

- **No build step** — keep it zero-dependency static HTML/JS/CSS. No npm, no bundler.
- **Both EN + zh-Hant** — every user-visible string needs both languages.
- **Proprietary license** — see `LICENSE`. Do not remove attribution or host-guard from `app.js`.
- **`localStorage` key prefix `ptcg_*`** — do not rename; existing users' data depends on it.
- **Firebase credentials in `firebase-config.js`** — these are intentionally public (standard for web Firebase); security is via Firestore rules + HTTP-referrer restriction on the API key in Google Cloud Console.
- **Branch `income`** is the active working branch. Branch `main` is the public open-source release (no cloud features).
