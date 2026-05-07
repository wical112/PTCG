// Manual revert of a stale GameSet trainerCard contribution after the
// Cloud Function reverse failed (e.g. missing collectionGroup index).
//
// Usage:
//   node scripts/revert-trainercard-event.mjs <eventId>
//
// Walks every trainerCard whose `events/{eventId}` marker has source='gameset',
// decrements the parent counters per the stored rank, and deletes the marker
// + the gameset_<eventId> tournamentLog. Idempotent — re-running on a clean
// state is a no-op (no markers found).

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

const eventId = process.argv[2];
if (!eventId) {
  console.error('usage: node revert-trainercard-event.mjs <eventId>');
  process.exit(1);
}

const sa = JSON.parse(readFileSync('/Users/wical/topcut-sa.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function bucketize(rank) {
  return {
    champ: rank === 1 ? 1 : 0,
    top4: rank > 0 && rank <= 4 ? 1 : 0,
    top8: rank > 0 && rank <= 8 ? 1 : 0,
  };
}

// First try the new sidecar — if writeTrainerCardEntries has been redeployed
// before the bad event was published, the index will be present.
const idxRef = db.doc(`gamesetEventIndex/${eventId}`);
const idxSnap = await idxRef.get();
let trainerIds = [];
if (idxSnap.exists) {
  trainerIds = (idxSnap.data()?.trainerIds || []).map((s) => String(s).trim()).filter(Boolean);
  console.log(`Sidecar found: ${trainerIds.length} trainerIds`);
} else {
  // Fallback: collectionGroup walk. This is exactly the path the deployed
  // Function failed on due to missing index, but the running script can
  // accept the FAILED_PRECONDITION and prompt the user.
  console.log('No sidecar — walking collectionGroup events...');
  try {
    const cg = await db.collectionGroup('events').where('source', '==', 'gameset').get();
    trainerIds = cg.docs
      .filter((d) => d.id === eventId)
      .map((d) => d.ref.parent.parent?.id)
      .filter(Boolean);
    console.log(`Collection group hit: ${trainerIds.length} trainerIds`);
  } catch (e) {
    console.error(`Collection group failed (likely missing index). Listing trainerCards manually.`);
    console.error(e.message);
    // Manual fallback — scan all trainerCards. Slow but works without an index.
    const cards = await db.collection('trainerCards').get();
    for (const c of cards.docs) {
      const m = await c.ref.collection('events').doc(eventId).get();
      if (m.exists && m.data()?.source === 'gameset') trainerIds.push(c.id);
    }
    console.log(`Manual scan: ${trainerIds.length} trainerIds`);
  }
}

if (trainerIds.length === 0) {
  console.log('Nothing to revert.');
  process.exit(0);
}

const ts = admin.firestore.FieldValue.serverTimestamp();
let statsReverted = 0;
let logsRemoved = 0;
for (const tid of trainerIds) {
  const cardRef = db.collection('trainerCards').doc(tid);
  const markerRef = cardRef.collection('events').doc(eventId);
  const logRef = cardRef.collection('tournamentLogs').doc(`gameset_${eventId}`);

  await db.runTransaction(async (tx) => {
    const m = await tx.get(markerRef);
    if (!m.exists) return;
    const oldRank = Number(m.data()?.rank ?? 0);
    if (oldRank === 0) {
      tx.delete(markerRef);
      return;
    }
    const before = bucketize(oldRank);
    const update = {
      updatedAt: ts,
      totalEvents: admin.firestore.FieldValue.increment(-1),
    };
    if (before.champ) update.championships = admin.firestore.FieldValue.increment(-before.champ);
    if (before.top4) update.topFour = admin.firestore.FieldValue.increment(-before.top4);
    if (before.top8) update.topCutFinishes = admin.firestore.FieldValue.increment(-before.top8);
    tx.set(cardRef, update, { merge: true });
    tx.delete(markerRef);
  });
  statsReverted++;

  try {
    await logRef.delete();
    logsRemoved++;
  } catch {
    // already gone
  }
  console.log(`  ✓ reverted ${tid}`);
}

if (idxSnap.exists) {
  await idxRef.delete();
}
console.log(`\nDone: stats reverted=${statsReverted}, logs removed=${logsRemoved}`);
