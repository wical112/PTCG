import admin from 'firebase-admin';

// Use ADC (gcloud user yuwaiho112) — owner of ptcgstm.
admin.initializeApp({ projectId: 'ptcgstm' });
const db = admin.firestore();

const eid = process.argv[2];
if (!eid) { console.error('Usage: node touch-event.mjs <eventId>'); process.exit(1); }

const ref = db.doc(`events/${eid}`);
const snap = await ref.get();
if (!snap.exists) { console.error('Event not found:', eid); process.exit(1); }

const d = snap.data();
console.log('Event before:');
console.log('  meta.name:', d.meta?.name, '| date:', d.meta?.date);
console.log('  syncToTopCut:', d.syncToTopCut, '| topcutPostId:', d.topcutPostId);
console.log('  phase:', d.phase, '| signupOpen:', d.signupOpen);

// Bump a benign field. Material-change detector ignores updatedAt/expiresAt
// + signupCount, so we touch a real field — bump capacity from null to null
// (no-op visible) but the meta object will appear in the diff.
await ref.update({
  _resyncNonce: Date.now(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
});
console.log('\n✅ Touched event with _resyncNonce. Trigger should fire within ~3s.');
