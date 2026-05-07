import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
const sa = JSON.parse(readFileSync('/Users/wical/topcut-sa.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
console.log('=== Hot tab simulation: status=active orderBy(lastEngagementAt desc) ===');
const snap = await db.collection('posts')
  .where('status', '==', 'active')
  .orderBy('lastEngagementAt', 'desc')
  .limit(10).get();
snap.forEach((d, i) => {
  const x = d.data();
  console.log(`  ${i + 1}. [${d.id}] ${x.postType} by @${x.authorHandle}`);
});
