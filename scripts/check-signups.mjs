import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'ptcgstm' });
const db = admin.firestore();
const eid = process.argv[2] || '4GM8KH';
const snap = await db.collection(`events/${eid}/signups`).orderBy('joinedAt', 'desc').limit(10).get();
console.log(`Signups in events/${eid}/signups: ${snap.size}`);
snap.forEach(d => {
  const x = d.data();
  console.log(`  [${d.id}] ${x.name} (${x.trainerId}) ${x.species1}${x.species2 ? '/' + x.species2 : ''} src=${x.source}`);
});
