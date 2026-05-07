import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
const sa = JSON.parse(readFileSync('/Users/wical/topcut-sa.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
console.log('=== TopCut: gamesetEvent posts ===');
const ps = await db.collection('posts').where('postType', '==', 'gamesetEvent').get();
ps.forEach(d => {
  const x = d.data();
  console.log(`  [${d.id}] event=${x.gamesetEvent?.eventId} status=${x.status} authorHandle=${x.authorHandle}`);
});
console.log(`Total: ${ps.size}`);
