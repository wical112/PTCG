// One-shot: backfill lastEngagementAt on already-syndicated gameset posts so
// they show up on the "Hot" feed tab. Future syncs include the field natively.
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
const sa = JSON.parse(readFileSync('/Users/wical/topcut-sa.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const snap = await db.collection('posts')
  .where('authorUid', '==', 'fOhLOGS52QOUSMELkYD18Kn3X983').get();
let touched = 0;
for (const d of snap.docs) {
  const x = d.data();
  if (x.lastEngagementAt) continue;
  await d.ref.update({ lastEngagementAt: x.createdAt || Date.now() });
  console.log('  ✓ patched', d.id);
  touched++;
}
console.log(`Patched ${touched} post(s).`);
