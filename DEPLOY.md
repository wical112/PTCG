# TCGTM — Deploy Guide

Static site served by Firebase Hosting. No build step — files are served directly from the repo root.

- **Firebase project:** `ptcgstm`
- **Hosting target:** `tcgtm` → site `tcgtm`
- **Live URL:** https://gameset-hk.com
- **Git remote:** `origin` → https://github.com/wical112/PTCG.git
- **Default branch:** `income`

---

## Step 1 — Sanity-check the working tree

```bash
cd /Users/wical/gameset-hk
git status
git diff
```

Confirm only the files you intend to ship are modified. If there is unrelated work-in-progress, stash it first:

```bash
git stash push -m "wip before release"
```

## Step 2 — Bump the cache-bust version

TCGTM forces browsers to reload changed assets via `?v=YYYYMMDDx` query strings on `<script>` and `<link>` tags in `index.html`. Every deploy that changes `app.js`, `cloud.js`, or `style.css` must increment the matching query string.

Pattern: today's date + lowercase letter (a, b, c, ...). If today's deploy is the second of the day, use `b`; third is `c`; etc.

Open `index.html` and update only the files you changed:

```html
<link rel="stylesheet" href="style.css?v=20260422a">
<script src="cloud.js?v=20260422a" defer></script>
<script src="app.js?v=20260422a"></script>
```

If you touched `about.html`, `contact.html`, `faq.html`, `landing.html`, `legal.html`, `privacy.html`, or `terms.html`, grep for the same version string inside those files and update it there too so every page loads the fresh asset.

```bash
grep -n "\?v=" index.html about.html contact.html faq.html landing.html legal.html privacy.html terms.html
```

## Step 3 — Write the update log entry

TCGTM's changelog is an **in-code array**, not a markdown file. It lives at `app.js:976` as `const UPDATES = [ ... ]` and renders inside the app's Updates view. Prepend a new object at the top of the array (newest-first) matching the existing bilingual shape:

```js
const UPDATES = [
    {
        date: '2026-04-22',
        title: {
            en: 'Short title of the change',
            zh: '中文標題'
        },
        body: {
            en: 'One or two sentences describing the user-visible change.',
            zh: '一兩句描述用戶可見的變更。'
        }
    },
    // ... previous entries stay below
];
```

Both `en` and `zh` are required — the app switches based on the language toggle.

## Step 4 — Commit

Match the existing commit style: plain sentence, often with a feature-area prefix and a colon (see `git log --oneline -5` for examples like `Registration: add owner-configurable round count`).

Stage only the files you meant to change — never `git add -A` — to avoid sweeping in `firebase-debug.log`, `.env`, or scratch files.

```bash
git add index.html app.js cloud.js style.css
git commit -m "$(cat <<'EOF'
Feature-area: short sentence describing the change

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Step 5 — Deploy to Firebase Hosting

```bash
firebase deploy --only hosting:tcgtm
```

The `--only hosting:tcgtm` flag targets just the `tcgtm` site (defined in `.firebaserc`). Firestore rules are NOT deployed by this command — if you changed `firestore.rules`, run `firebase deploy --only firestore:rules` separately.

When it finishes, Firebase prints the hosting URL. Open it in an incognito window to bypass any cached asset and verify the new version loaded (check DevTools → Network → `app.js?v=...` matches the value you bumped).

## Step 6 — Push to GitHub

```bash
git push origin income
```

---

## Common pitfalls

- **Forgot to bump `?v=`:** users will run stale JS from their browser cache and report ghost bugs. If you realize after deploying, bump again (e.g., `20260422a` → `20260422b`) and redeploy.
- **Multiple deploys in one day:** increment the letter suffix (`a` → `b` → `c`). Do not reuse the same string twice — the cache won't bust.
- **Firestore rules changed but not deployed:** the rules file is listed in `firebase.json` but `--only hosting:tcgtm` skips it. Run `firebase deploy --only firestore:rules` explicitly.
- **Firebase login expired:** if `firebase deploy` prompts you to re-auth, run `firebase login --reauth` in a normal terminal (interactive) and retry.
- **Wrong Firebase project selected:** `firebase use ptcgstm` to select, or `firebase projects:list` to verify.
