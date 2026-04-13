# Cloud Setup (Firebase Firestore)

The "Publish" feature uses Firebase Firestore so players can scan a QR code and watch the tournament live. It is **optional** — without configuration, the app continues to work fully offline.

## 1. Create a Firebase project

1. Go to <https://console.firebase.google.com> and click **Add project**.
2. Name it (e.g. `swiss-tournament-mgr`). Disable Google Analytics if you don't need it.
3. Once the project is ready, from the project home click the **Web** icon (`</>`) to add a Web App.
4. Register it (any nickname). **Copy the `firebaseConfig` object** Firebase shows you.

## 2. Enable services

In the Firebase console for your project:

- **Build → Firestore Database → Create database** → start in **Production mode** → choose a region (Singapore `asia-southeast1` is the closest free region for HK).
- **Build → Authentication → Get started → Sign-in method → Anonymous → Enable**.

## 3. Paste your config

Open `firebase-config.js` in the project root and replace the `YOUR_*` placeholders with the values from step 1. Example:

```js
window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyA...",
    authDomain: "swiss-tournament-mgr.firebaseapp.com",
    projectId: "swiss-tournament-mgr",
    storageBucket: "swiss-tournament-mgr.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef..."
};
```

## 4. Deploy security rules

In the Firestore console → **Rules** tab, paste the contents of `firestore.rules` and **Publish**. These rules:

- allow anyone to **read** a published tournament (so QR viewers work without sign-in);
- only allow the **owner** (the anonymous UID that created the doc) to update or delete;
- prevent ownership transfer.

## 5. Allowed domains

In **Authentication → Settings → Authorized domains**, add the domain you'll host the app on (`localhost` is added by default, so local testing works out of the box).

## 6. Test

1. Open `index.html`. Start a tournament.
2. On the round view, click **Publish to Cloud**. A QR modal appears with a view URL.
3. Scan the QR (or open the link in a private window) — you should see a read-only mirror that updates as you change results.
4. Click **Stop Sharing** to delete the cloud doc.

## Free-tier sizing

Firestore Spark (free) tier:
- 50,000 reads / 20,000 writes / 1 GiB storage per day.
- One typical tournament uses ~200 writes and a few thousand reads (depending on viewer count).
- Comfortable for 3–5 published tournaments per day.

If you outgrow the free tier, enable **Blaze** (pay-as-you-go). Costs are typically <$5/month for hundreds of tournaments.

## Cost-control tips

- **Stop sharing** after the tournament ends to delete the doc.
- The app debounces writes to ~1 per second; you don't need to throttle further.
- For large viewer counts, consider Cloudflare Workers + Durable Objects (cheaper at scale, no free egress limit).

## Privacy note

Once published, the tournament's player names, pairings, and results are stored on Firebase servers and readable by anyone with the QR link. Do not publish tournaments containing data you consider private. Update your Privacy Policy to disclose this if you make Publish broadly available.
