import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
const sa = JSON.parse(readFileSync('/Users/wical/topcut-sa.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const post = await db.doc('posts/YEAzA5EzuHLDgQvSqEUp').get();
if (!post.exists) { console.log('❌ Post not found'); process.exit(1); }
const p = post.data();
console.log('✅ Post exists');
console.log('   postType:', p.postType);
console.log('   status:', p.status);
console.log('   authorUid:', p.authorUid);
console.log('   authorHandle:', p.authorHandle);
console.log('   body:', p.body);
console.log('   gamesetEvent.eventId:', p.gamesetEvent?.eventId);
console.log('   gamesetEvent.name:', p.gamesetEvent?.name);
console.log('   gamesetEvent.phase:', p.gamesetEvent?.phase);
console.log('   gamesetEvent.imageUrl:', p.gamesetEvent?.imageUrl);

// Also list ALL posts to see why earlier query was empty
const all = await db.collection('posts').orderBy('createdAt', 'desc').limit(5).get();
console.log('\n=== Last 5 posts ===');
all.forEach(d => {
  const x = d.data();
  console.log(`  [${d.id}] ${x.postType} by ${x.authorHandle || x.authorUid} status=${x.status}`);
});
