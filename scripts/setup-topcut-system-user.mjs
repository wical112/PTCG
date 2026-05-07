#!/usr/bin/env node
/* ============================================================================
   setup-topcut-system-user.mjs

   One-shot bootstrap that creates the `gameset_hk` system user on TopCut HK
   so GameSet can write feed posts under that identity. Run ONCE after
   downloading a service-account JSON for the `tournamet-platform` project.

   What it does (using Admin SDK against TopCut, NOT GameSet):
     1. Creates a Firebase Auth user (or reuses an existing UID).
     2. Reserves `handles/gameset_hk` so nobody else can claim the handle.
     3. Creates `players/{uid}` with handle, display name, system flag,
        verified=true, etc.
     4. Prints the UID — paste it into:
          firebase functions:secrets:set TOPCUT_SYSTEM_UID  (on GameSet)

   Usage:
     cd /Users/wical/gameset-hk
     node scripts/setup-topcut-system-user.mjs <service-account.json>

   Example:
     node scripts/setup-topcut-system-user.mjs ./topcut-sa.json

   Re-running is safe — already-existing user / handle / player are
   detected and the existing UID is printed.
   ============================================================================ */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Lazy-import firebase-admin so the script doesn't crash if it isn't
// installed in the user's environment — we tell them what to do.
let admin;
try {
  admin = (await import('firebase-admin')).default;
} catch (e) {
  console.error('❌ firebase-admin is not installed.');
  console.error('   Run from this dir:');
  console.error('   cd ' + dirname(fileURLToPath(import.meta.url)) + '/../functions && npm install');
  console.error('   Then run this script again from the project root.');
  process.exit(1);
}

const HANDLE = 'gameset_hk';
const DISPLAY_NAME = 'GameSet HK';
const EMAIL = 'system+gameset@topcut-hk.com';
const BIO = '🎴 PTCG event automation · Auto-syndicated from gameset-hk.com';

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/setup-topcut-system-user.mjs <service-account.json>');
  process.exit(1);
}

const saPath = resolve(process.cwd(), arg);
let sa;
try {
  sa = JSON.parse(readFileSync(saPath, 'utf8'));
} catch (e) {
  console.error('❌ Could not read / parse service account JSON at ' + saPath);
  console.error('   ' + e.message);
  process.exit(1);
}

if (sa.project_id !== 'tournamet-platform') {
  console.error('❌ Service account project_id is "' + sa.project_id + '"');
  console.error('   Expected "tournamet-platform". Use the JSON for the TopCut HK project.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(sa),
  projectId: sa.project_id,
});
const auth = admin.auth();
const db = admin.firestore();

function ts() { return admin.firestore.FieldValue.serverTimestamp(); }

async function ensureAuthUser() {
  // Try by email first — re-runs of this script land on the same user.
  try {
    const u = await auth.getUserByEmail(EMAIL);
    console.log('✅ Auth user exists. uid = ' + u.uid);
    return u.uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }
  const created = await auth.createUser({
    email: EMAIL,
    emailVerified: true,
    displayName: DISPLAY_NAME,
    disabled: false,
  });
  // Mark as system so admin checks have a hook later if needed.
  await auth.setCustomUserClaims(created.uid, { system: true, verified: true });
  console.log('✅ Created Auth user. uid = ' + created.uid);
  return created.uid;
}

async function ensureHandleReserved(uid) {
  const handleRef = db.doc(`handles/${HANDLE}`);
  const snap = await handleRef.get();
  if (snap.exists) {
    const owner = snap.data()?.playerId;
    if (owner && owner !== uid) {
      throw new Error(`handles/${HANDLE} already owned by another uid: ${owner}`);
    }
    console.log('✅ Handle already reserved. handles/' + HANDLE + ' → ' + uid);
    return;
  }
  await handleRef.set({
    playerId: uid,
    handle: HANDLE,
    claimedAt: ts(),
  });
  console.log('✅ Reserved handle: handles/' + HANDLE);
}

async function ensurePlayerDoc(uid) {
  const ref = db.doc(`players/${uid}`);
  const snap = await ref.get();
  const baseFields = {
    uid,
    handle: HANDLE,
    displayName: DISPLAY_NAME,
    ownerEmail: EMAIL,
    bio: BIO,
    avatarUrl: '',
    linkedTrainerIds: {},
    status: 'active',
    isVerified: true,
    isSystem: true,
    updatedAt: ts(),
  };
  if (snap.exists) {
    await ref.update(baseFields);
    console.log('✅ Player doc updated. players/' + uid);
    return;
  }
  // Bump member counter atomically to keep parity with claimHandle.
  const counterRef = db.doc('meta/playerCounter');
  await db.runTransaction(async (tx) => {
    const c = await tx.get(counterRef);
    const next = ((c.data()?.count) || 0) + 1;
    tx.set(counterRef, { count: next }, { merge: true });
    tx.set(ref, {
      ...baseFields,
      memberNumber: next,
      createdAt: ts(),
    });
  });
  console.log('✅ Player doc created. players/' + uid);
}

(async () => {
  try {
    console.log('🚀 Setting up gameset_hk system user on tournamet-platform…\n');
    const uid = await ensureAuthUser();
    await ensureHandleReserved(uid);
    await ensurePlayerDoc(uid);

    console.log('\n────────────────────────────────────────────────────');
    console.log('🎉 Setup complete.');
    console.log('────────────────────────────────────────────────────');
    console.log('UID:    ' + uid);
    console.log('Handle: @' + HANDLE);
    console.log('\nNext step — set the GameSet Function secrets:');
    console.log('');
    console.log('  cd ' + dirname(fileURLToPath(import.meta.url)) + '/..');
    console.log('  firebase functions:secrets:set TOPCUT_SYSTEM_UID');
    console.log('       (paste: ' + uid + ')');
    console.log('  firebase functions:secrets:set TOPCUT_SYSTEM_HANDLE');
    console.log('       (paste: ' + HANDLE + ')');
    console.log('  firebase functions:secrets:set TOPCUT_SERVICE_ACCOUNT');
    console.log('       (paste: ENTIRE service-account JSON content)');
    console.log('');
    console.log('Then deploy GameSet functions:');
    console.log('  firebase deploy --only functions');
    console.log('');
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Setup failed:');
    console.error('  ' + (e.stack || e.message || e));
    process.exit(1);
  }
})();
