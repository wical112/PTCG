// One-shot: any event with topcutPostId set is considered already-published
// and gets `published: true`. Run once after the publish-gate is deployed
// to keep existing events syncing.
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

admin.initializeApp({ projectId: 'ptcgstm' });
const db = admin.firestore();

const snap = await db.collection('events').get();
let touched = 0;
for (const doc of snap.docs) {
  const d = doc.data();
  if (d.topcutPostId && d.published !== true) {
    await doc.ref.update({ published: true });
    console.log('  ✓ ' + doc.id + ' (was: ' + (d.meta?.name || '—') + ')');
    touched++;
  }
}
console.log('Backfilled ' + touched + ' event(s).');
