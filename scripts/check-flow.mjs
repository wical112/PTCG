import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const sa = JSON.parse(readFileSync('/Users/wical/topcut-sa.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) }, 'topcut');
const tdb = admin.firestore(admin.app('topcut'));

console.log('=== 3. TopCut: gameset_hk system user ===');
const playerSnap = await tdb.doc('players/fOhLOGS52QOUSMELkYD18Kn3X983').get();
if (!playerSnap.exists) {
  console.log('❌ players/fOhLOGS52QOUSMELkYD18Kn3X983 missing');
} else {
  const p = playerSnap.data();
  console.log('✅ Player exists:');
  console.log('   handle:', p.handle, '| displayName:', p.displayName);
  console.log('   isVerified:', p.isVerified, '| isSystem:', p.isSystem);
  console.log('   memberNumber:', p.memberNumber);
}

console.log('\n=== 4. TopCut: handle reservation ===');
const handleSnap = await tdb.doc('handles/gameset_hk').get();
console.log(handleSnap.exists ? `✅ handles/gameset_hk → ${handleSnap.data().playerId}` : '❌ handle not reserved');

console.log('\n=== 5. TopCut: posts authored by gameset_hk ===');
const posts = await tdb.collection('posts')
  .where('authorUid', '==', 'fOhLOGS52QOUSMELkYD18Kn3X983')
  .limit(10).get();
console.log(`Found ${posts.size} post(s).`);
posts.forEach(d => {
  const p = d.data();
  console.log(`  [${d.id}] postType=${p.postType} status=${p.status} created=${new Date(p.createdAt).toISOString()}`);
  console.log(`    body: "${(p.body || '').slice(0, 60)}..."`);
  if (p.gamesetEvent) console.log(`    eventId: ${p.gamesetEvent.eventId} phase: ${p.gamesetEvent.phase}`);
});

console.log('\n=== 6. TopCut: tournamentRecords sourced from gameset ===');
const recs = await tdb.collection('tournamentRecords')
  .where('source', '==', 'gameset')
  .limit(10).get();
console.log(`Found ${recs.size} record(s).`);
