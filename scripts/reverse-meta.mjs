import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
const sa = JSON.parse(readFileSync('/Users/wical/topcut-sa.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// List all metaContributions whose source post is gone (orphaned).
const all = await db.collection('metaContributions').get();
console.log(`Found ${all.size} metaContributions total.`);

// Heuristic: check each event's gamesetResult post existence by querying
// posts where postType==gamesetResult and gamesetResult.eventId == eid.
const orphans = [];
for (const d of all.docs) {
  const eid = d.id;
  const data = d.data();
  const decks = data.decks || [];
  // Find gamesetResult post for this event
  const q = await db.collection('posts')
    .where('postType', '==', 'gamesetResult')
    .where('gamesetResult.eventId', '==', eid)
    .limit(1).get();
  const hasPost = !q.empty && q.docs[0].data().status === 'active';
  if (!hasPost) {
    orphans.push({ eid, decks: decks.length, postState: q.empty ? 'missing' : q.docs[0].data().status });
  }
}
console.log(`\nOrphan contributions:`, orphans);

if (orphans.length === 0) { console.log('No cleanup needed.'); process.exit(0); }

console.log('\nReversing...');
for (const { eid } of orphans) {
  const ref = db.doc(`metaContributions/${eid}`);
  const snap = await ref.get();
  const decks = (snap.data()?.decks || []).filter(d => d?.species1 || d?.species2);
  const speciesCounts = new Map();
  const deckCounts = new Map();
  for (const d of decks) {
    if (d.species1) speciesCounts.set(d.species1, (speciesCounts.get(d.species1) || 0) + 1);
    if (d.species2) speciesCounts.set(d.species2, (speciesCounts.get(d.species2) || 0) + 1);
    const arr = [(d.species1 || '').trim(), (d.species2 || '').trim()].filter(Boolean).sort();
    if (!arr.length) continue;
    const key = arr.join('__');
    const e = deckCounts.get(key);
    if (e) e.count++; else deckCounts.set(key, { species1: arr[0], species2: arr[1] || '', count: 1 });
  }
  const ts = admin.firestore.FieldValue.serverTimestamp();
  const writes = [];
  for (const [s, n] of speciesCounts) {
    writes.push(db.doc(`pokemonPopularity/${s}`).set({
      speciesId: s, count: admin.firestore.FieldValue.increment(-n), updatedAt: ts,
    }, { merge: true }));
  }
  for (const [k, m] of deckCounts) {
    writes.push(db.doc(`deckPopularity/${k}`).set({
      species1: m.species1, species2: m.species2,
      count: admin.firestore.FieldValue.increment(-m.count), updatedAt: ts,
    }, { merge: true }));
  }
  await Promise.all(writes);
  await ref.delete();
  console.log(`  ✓ ${eid}: -${speciesCounts.size} species / -${deckCounts.size} decks`);
}
console.log('\nDone.');
