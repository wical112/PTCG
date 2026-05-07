import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
const sa = JSON.parse(readFileSync('/Users/wical/topcut-sa.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const snap = await db.collection('posts').orderBy('lastEngagementAt', 'desc').limit(8).get();
snap.forEach(d => {
  const x = d.data();
  const t = x.lastEngagementAt;
  const isTs = t && t.toDate ? 'Timestamp' : typeof t;
  const millis = t && t.toMillis ? t.toMillis() : (typeof t === 'number' ? t : null);
  console.log(`  [${d.id}] ${x.postType} type=${isTs} time=${millis ? new Date(millis).toISOString() : t}`);
});
