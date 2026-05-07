import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

// Use the gameset Firebase project's default credentials via gcloud
// (we are user yuwaiho112@gmail.com, project owner of ptcgstm).
// Falls back to a service account file if provided.
const args = process.argv.slice(2);
const eid = args[0];
if (!eid) { console.error('Usage: node trigger-sync.mjs <eventId>'); process.exit(1); }

admin.initializeApp({ projectId: 'ptcgstm' });
const db = admin.firestore();

const ref = db.doc(`events/${eid}`);
const snap = await ref.get();
if (!snap.exists) { console.error('Event not found:', eid); process.exit(1); }

console.log('Event found:', eid);
console.log('  meta.name:', snap.data().meta?.name);
console.log('  syncToTopCut:', snap.data().syncToTopCut);
console.log('  topcutPostId:', snap.data().topcutPostId);

// Bump updatedAt to force the trigger to re-evaluate
await ref.update({
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  // Touch a benign field to force a material-change re-sync
  _resyncNonce: Date.now()
});
console.log('✅ Touched. Watching logs...');
