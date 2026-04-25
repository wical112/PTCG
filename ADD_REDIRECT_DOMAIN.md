# How to add a new domain that redirects to gameset-hk.com

You can point **any owned domain** at GameSet HK's Firebase Hosting and it will automatically redirect visitors to `gameset-hk.com`. **Zero code changes needed.** The host guard in `app.js` is permissive — anything that isn't the canonical host gets bounced.

This guide assumes the new domain is registered in **Cloudflare** (same as gameset-hk.com). If it's at another registrar, the steps are the same but the DNS UI looks different.

---

## One-time per new domain (10–60 minutes)

### 1. Add the domain to Firebase Hosting

1. Open [Firebase Console → ptcgstm project → Hosting](https://console.firebase.google.com/project/ptcgstm/hosting)
2. Switch to **site: tcgtm** (the dropdown at the top)
3. Click **新增自訂網域 / Add custom domain**
4. Enter the new domain (e.g. `mydomain.com`) → **Continue**
5. Firebase shows two DNS records to add:
   - 1× **A** record → `199.36.158.100`
   - 1× **TXT** record → `hosting-site=tcgtm`

Keep this Firebase tab open — you'll come back to click **Verify** in step 3.

### 2. Add the DNS records in Cloudflare

1. Open [Cloudflare dashboard](https://dash.cloudflare.com/) → click on the new domain
2. **DNS → Records → Add record**
3. **Record 1 (A):**
   - Type: `A`
   - Name: `@` (means root domain)
   - IPv4 address: `199.36.158.100`
   - Proxy status: **DNS only** (gray cloud — NOT orange)
   - TTL: Auto
   - Save
4. **Record 2 (TXT):**
   - Type: `TXT`
   - Name: `@`
   - Content: `hosting-site=tcgtm`
   - TTL: Auto
   - Save

⚠️ **The orange "Proxied" toggle on the A record MUST be off.** Cloudflare's edge SSL conflicts with Firebase's managed cert provisioning. Leave it as DNS only.

If the domain isn't in Cloudflare yet:
- Add it to Cloudflare (free plan is fine)
- At the registrar, update nameservers to the two Cloudflare nameservers Cloudflare gives you
- Wait ~10 min for nameserver propagation
- Then add the DNS records above

### 3. Verify in Firebase

1. Back in the Firebase tab from step 1, click **驗證 / Verify**
2. Firebase confirms the records and starts SSL provisioning
3. The status badge shows **需要設定 (Needs setup)** → wait 15 minutes – 1 hour → flips to **已連結 (Connected)**

You can refresh the Firebase Hosting page periodically to see the status. Don't worry if it takes the full hour — SSL issuance is async.

### 4. Test

Once status = **已連結**, open the new domain in a fresh browser tab:

- `https://mydomain.com/` → should automatically redirect to `https://gameset-hk.com/`
- `https://mydomain.com/?t=ABC123` → should redirect to `https://gameset-hk.com/?t=ABC123` (path + query are preserved)

If you see a cert error, SSL hasn't finished yet — wait longer.

If you get a 404 or "Site Not Found", the DNS records aren't propagated yet — wait, then re-verify.

---

## Optional — handle the `www.` subdomain too

By default `www.mydomain.com` won't work. If you want it:

1. Repeat the whole flow above, entering `www.mydomain.com` as the custom domain in Firebase
2. Firebase gives you a CNAME record (NOT an A record this time) — usually pointing to `tcgtm.web.app` or similar
3. Add that CNAME to Cloudflare DNS for `www`

Or simpler — just don't bother with `www`. Modern users type root-domain.

---

## Why no code changes are needed

The host guard at the top of `app.js` (line ~10) was rewritten to be **permissive**:

```js
const CANONICAL = 'gameset-hk.com';
const ALLOWED = new Set([CANONICAL, 'www.' + CANONICAL, 'localhost', '127.0.0.1']);

if (ALLOWED.has(host)) return;        // canonical → let it run
// anything else → redirect
location.replace('https://' + CANONICAL + location.pathname + location.search + location.hash);
```

So **any hostname that isn't gameset-hk.com / www / localhost gets sent to gameset-hk.com automatically**, with the full URL preserved.

This means:
- ✅ `tcgtm.web.app` → redirects (already deployed)
- ✅ `tcgtm.firebaseapp.com` → redirects (already deployed)
- ✅ `ptcgstm.web.app` → redirects (already deployed)
- ✅ `mynewdomain.com` (after the steps above) → redirects automatically
- ✅ Any future domain you add → redirects automatically

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Browser shows "Not Secure" / cert error | SSL not provisioned yet | Wait up to 1 hour, refresh Firebase Hosting page; status should flip to 已連結 |
| 404 / "Site Not Found" | DNS records not propagated | Wait 5–15 min, run `dig mydomain.com A +short` — should return `199.36.158.100` |
| Loads but doesn't redirect | Browser cached old JS | Hard refresh (⌘⇧R / Ctrl+Shift+R) or test in private/incognito window |
| Cloudflare orange proxy is ON, can't fix | Edit the A record in Cloudflare, click the orange cloud to grey it out, save | |

---

## Reverting / removing a redirect domain

If you stop using a domain:

1. Firebase Console → Hosting → site: tcgtm → find the domain → menu → **Delete custom domain**
2. Cloudflare DNS → delete the A record + TXT record (or just leave them; Firebase will stop serving the domain regardless)
3. (Optional) Release the domain from Cloudflare or let it expire

No code changes needed on this end either.
