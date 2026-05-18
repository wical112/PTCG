import admin from 'firebase-admin';

// Uses ADC (gcloud auth application-default login) — works for whichever
// project is set via GOOGLE_CLOUD_PROJECT or admin.initializeApp({ projectId })
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'ptcgstm',
});
const db = admin.firestore();

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.log('usage: node inspect-suspicious-tournaments.mjs <tid> [<tid> ...]');
  process.exit(1);
}

for (const tid of ids) {
  console.log(`\n=== tournaments/${tid} ===`);
  const snap = await db.doc(`tournaments/${tid}`).get();
  if (!snap.exists) { console.log('  ❌ missing'); continue; }
  const t = snap.data();
  console.log('  keys:', Object.keys(t).sort().join(', '));
  console.log('  name:', JSON.stringify(t.name));
  console.log('  game:', t.game, '| format:', t.format);
  console.log('  createdAt:', t.createdAt, t.createdAt ? new Date(t.createdAt).toISOString() : '');
  console.log('  updatedAt:', t.updatedAt, t.updatedAt ? new Date(t.updatedAt).toISOString() : '');
  console.log('  startedAt:', t.startedAt, t.startedAt ? new Date(t.startedAt).toISOString() : '');
  console.log('  endedAt:', t.endedAt, t.endedAt ? new Date(t.endedAt).toISOString() : '');
  console.log('  expiresAt:', t.expiresAt, t.expiresAt ? new Date(t.expiresAt).toISOString() : '');
  console.log('  ownerUid:', t.ownerUid);
  console.log('  ownerKey:', t.ownerKey ? '(present)' : '(none)');
  console.log('  status / phase:', t.status, '/', t.phase);
  console.log('  viewOnly:', t.viewOnly);
  console.log('  players len:', Array.isArray(t.players) ? t.players.length : '(no array)');
  if (Array.isArray(t.players)) {
    console.log('  first 3 players:', JSON.stringify(t.players.slice(0, 3), null, 2));
  }
  console.log('  rounds len:', Array.isArray(t.rounds) ? t.rounds.length : '(no array)');
  if (Array.isArray(t.rounds)) {
    t.rounds.forEach((r, i) => {
      console.log(`    round ${i}: pairings=${r?.pairings?.length ?? '?'} completed=${r?.completed}`);
    });
  }
  if (t.wheelSpin) console.log('  wheelSpin:', JSON.stringify(t.wheelSpin).slice(0, 200));
  if (t.eventId) console.log('  eventId:', t.eventId);
}

process.exit(0);
