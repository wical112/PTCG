/* ============================================================================
   topcutSync.ts — Cross-project Admin SDK writes from GameSet HK (ptcgstm)
   to TopCut HK (tournamet-platform).

   How this works:
   1. A service account JSON is stored as the GameSet Function secret
      `TOPCUT_SERVICE_ACCOUNT`. This service account is created on the
      tournamet-platform GCP project with role "Cloud Datastore User".
   2. We init a SECOND firebase-admin App named "topcut" pointing at that
      project. It bypasses Firestore rules (admin SDK).
   3. Every post we write claims authorUid = TOPCUT_SYSTEM_UID — the dedicated
      `gameset_hk` system player account on TopCut. Existing FeedCard reads
      authorHandle = "gameset_hk" from players/{uid} so the verified GameSet
      avatar shows up automatically.

   Idempotency:
   - First-time sync of an event creates a NEW post and stores the postId
     back to events/{eid}.topcutPostId on GameSet.
   - Subsequent edits update the existing post.
   - Cancellation flips post.gamesetEvent.phase = 'cancelled' (post stays
     visible with a red banner so historical share links still resolve).
   ============================================================================ */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';

let topcutApp: admin.app.App | null = null;

function initTopCut(serviceAccountJson: string): admin.app.App {
  if (topcutApp) return topcutApp;
  let parsed: admin.ServiceAccount;
  try {
    parsed = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
  } catch (e) {
    throw new Error('TOPCUT_SERVICE_ACCOUNT is not valid JSON: ' + (e as Error).message);
  }
  topcutApp = admin.initializeApp(
    {
      credential: admin.credential.cert(parsed),
      projectId: (parsed as { project_id?: string }).project_id || 'tournamet-platform',
    },
    'topcut',
  );
  return topcutApp;
}

export interface PrizeTier {
  threshold: number;
  first?: string;
  second?: string;
  third?: string;
  notes?: string;
}

export interface GamesetEventCardData {
  eventId: string;
  org: string;
  name: string;
  date: string;
  time?: string;
  address: string;
  desc?: string;
  contact?: string;
  fee: number;
  currency: string;
  paymentMethods: string[];
  imageUrl?: string | null;
  prizes: { tiers: PrizeTier[]; lucky?: string };
  capacity?: number | null;
  signupOpen: boolean;
  phase: 'signup' | 'live' | 'ended' | 'cancelled';
  signupCount?: number;
}

export interface ResultStandingRow {
  rank: number;
  name: string;
  trainerId?: string;
  record: string;
  points: number;
  deckSpecies1?: string;
  deckSpecies2?: string;
}

export interface DeckSliceRow {
  species1: string;
  species2?: string;
  count: number;
  percent: number;
}

export interface GamesetResultCardData {
  eventId: string;
  eventName: string;
  date: string;
  format: 'swiss' | 'knockout';
  totalPlayers: number;
  totalRounds: number;
  standings: ResultStandingRow[];
  deckDistribution: DeckSliceRow[];
}

interface PostDoc {
  postId: string;
  authorUid: string;
  authorHandle: string;
  postType: 'gamesetEvent' | 'gamesetResult';
  body: string;
  images: { url: string; w?: number; h?: number }[];
  tags: string[];
  replyCount: number;
  likeCount: number;
  linkedLogId: null;
  linkedLogSnapshot: null;
  linkedDeckCombo: null;
  status: 'active' | 'cancelled' | 'removed';
  createdAt: FirebaseFirestore.Timestamp;
  // Mirrors TopCut native posts — feed "Hot" tab orderBy filters posts that
  // miss this field, so we MUST seed it on create. Bumped on like / reply by
  // existing TopCut Cloud Functions; we do NOT bump on edit (a content tweak
  // shouldn't pop the post back to the top of the feed).
  lastEngagementAt: FirebaseFirestore.Timestamp;
  editedAt: FirebaseFirestore.Timestamp | null;
  gamesetEvent?: GamesetEventCardData;
  gamesetResult?: GamesetResultCardData;
}

function buildPostBody(card: GamesetEventCardData): string {
  // Body shows a short text summary so the post still renders meaningfully
  // even before the FeedCard has loaded our custom GamesetEventStrip layout.
  const lines: string[] = [];
  lines.push(`🎴 ${card.org ? card.org + ' — ' : ''}${card.name}`);
  if (card.date) lines.push(`📅 ${card.date}${card.time ? ' ' + card.time : ''}`);
  if (card.address) lines.push(`📍 ${card.address}`);
  if (card.fee > 0) lines.push(`💰 HK$${card.fee}`);
  if (card.contact) lines.push(`📧 ${card.contact}`);
  return lines.join('\n');
}

function buildResultBody(card: GamesetResultCardData): string {
  const lines: string[] = [];
  lines.push(`🏆 ${card.eventName} — Final standings`);
  lines.push(`${card.totalPlayers} players · ${card.totalRounds} rounds (${card.format})`);
  if (card.standings && card.standings.length > 0) {
    const top3 = card.standings.slice(0, 3);
    top3.forEach((s) => {
      const medal = s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : '🥉';
      lines.push(`${medal} ${s.name} (${s.record})`);
    });
  }
  return lines.join('\n');
}

/* Create or update a `gamesetEvent` post on TopCut. Returns the postId.
   Pass `existingPostId` to update in place (idempotent re-sync). */
export async function syncEventPost(
  serviceAccountJson: string,
  systemUid: string,
  systemHandle: string,
  card: GamesetEventCardData,
  existingPostId: string | null,
): Promise<string> {
  const app = initTopCut(serviceAccountJson);
  const db = admin.firestore(app);
  // Use Firestore Timestamp (not raw millis) so the post sorts correctly
  // alongside TopCut's native posts in the feed's orderBy('createdAt'/'lastEngagementAt')
  // query. Mixed Timestamp/number across docs would land all numbers in a
  // separate type bucket, hiding the syndicated post in the feed.
  const now = admin.firestore.Timestamp.now();

  const status: PostDoc['status'] = card.phase === 'cancelled' ? 'cancelled' : 'active';

  const baseUpdate = {
    gamesetEvent: card,
    body: buildPostBody(card),
    images: card.imageUrl ? [{ url: card.imageUrl }] : [],
    status,
    editedAt: existingPostId ? now : null,
  };

  if (existingPostId) {
    const ref = db.collection('posts').doc(existingPostId);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.update(baseUpdate);
      logger.info(`[topcutSync] updated event post ${existingPostId}`);
      return existingPostId;
    }
    logger.warn(`[topcutSync] existing postId ${existingPostId} missing — recreating`);
  }

  const ref = db.collection('posts').doc();
  const doc: PostDoc = {
    postId: ref.id,
    authorUid: systemUid,
    authorHandle: systemHandle,
    postType: 'gamesetEvent',
    body: baseUpdate.body,
    images: baseUpdate.images,
    tags: ['gameset', 'event', 'ptcg'],
    replyCount: 0,
    likeCount: 0,
    linkedLogId: null,
    linkedLogSnapshot: null,
    linkedDeckCombo: null,
    status: baseUpdate.status,
    createdAt: now,
    lastEngagementAt: now,
    editedAt: null,
    gamesetEvent: card,
  };
  await ref.set(doc);
  logger.info(`[topcutSync] created event post ${ref.id} for event ${card.eventId}`);
  return ref.id;
}

export async function syncResultPost(
  serviceAccountJson: string,
  systemUid: string,
  systemHandle: string,
  card: GamesetResultCardData,
  existingPostId: string | null,
): Promise<string> {
  const app = initTopCut(serviceAccountJson);
  const db = admin.firestore(app);
  // Use Firestore Timestamp (not raw millis) so the post sorts correctly
  // alongside TopCut's native posts in the feed's orderBy('createdAt'/'lastEngagementAt')
  // query. Mixed Timestamp/number across docs would land all numbers in a
  // separate type bucket, hiding the syndicated post in the feed.
  const now = admin.firestore.Timestamp.now();

  const baseUpdate = {
    gamesetResult: card,
    body: buildResultBody(card),
    status: 'active' as const,
    editedAt: existingPostId ? now : null,
  };

  if (existingPostId) {
    const ref = db.collection('posts').doc(existingPostId);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.update(baseUpdate);
      logger.info(`[topcutSync] updated result post ${existingPostId}`);
      return existingPostId;
    }
  }

  const ref = db.collection('posts').doc();
  const doc: PostDoc = {
    postId: ref.id,
    authorUid: systemUid,
    authorHandle: systemHandle,
    postType: 'gamesetResult',
    body: baseUpdate.body,
    images: [],
    tags: ['gameset', 'result', 'ptcg'],
    replyCount: 0,
    likeCount: 0,
    linkedLogId: null,
    linkedLogSnapshot: null,
    linkedDeckCombo: null,
    status: 'active',
    createdAt: now,
    lastEngagementAt: now,
    editedAt: null,
    gamesetResult: card,
  };
  await ref.set(doc);
  logger.info(`[topcutSync] created result post ${ref.id} for event ${card.eventId}`);
  return ref.id;
}

/* Delete (or mark cancelled) a previously-syndicated post when the organizer
   un-publishes the event. Sets status='removed' so it's hidden from the feed
   without losing the doc (we still want to detect re-publish without dupes). */
export async function deleteEventPost(
  serviceAccountJson: string,
  postId: string,
): Promise<void> {
  const app = initTopCut(serviceAccountJson);
  const db = admin.firestore(app);
  const ref = db.collection('posts').doc(postId);
  const snap = await ref.get();
  if (!snap.exists) return;
  await ref.delete();
  logger.info(`[topcutSync] deleted post ${postId} (unpublished)`);
}

/* ── Meta-counter contribution ───────────────────────────────────────────────
   GameSet results feed TopCut's `pokemonPopularity` + `deckPopularity`
   counters so the Meta page reflects real-world deck usage from organiser-
   run events, not just user-logged trainerCards.

   Schema (TopCut, public read / admin write):
     pokemonPopularity/{speciesId}: { speciesId, count, updatedAt }
     deckPopularity/{sortedKey}:    { species1, species2, count, updatedAt }
       key = the two species names sorted alphabetically and joined by '__'
       so (A,B) and (B,A) collapse to one bucket — matches TopCut's logic.

   Idempotency:
     metaContributions/{eventId} stores a snapshot of the decks last
     contributed by THIS event. Each publish diffs current vs snapshot,
     decrements removed entries and increments added ones, then overwrites
     the snapshot. Re-running publishEventResult any number of times
     converges on a single accurate contribution.
   ──────────────────────────────────────────────────────────────────────────── */

interface DeckEntry { species1: string; species2: string }

function deckKeyOf(s1: string, s2: string): string {
  const arr = [s1.trim(), s2.trim()].filter(Boolean).sort();
  return arr.join('__');
}

function speciesListFromCard(card: GamesetResultCardData): DeckEntry[] {
  return (card.standings || [])
    .map(s => ({ species1: (s.deckSpecies1 || '').trim(), species2: (s.deckSpecies2 || '').trim() }))
    .filter(d => d.species1);             // skip players who never picked a deck
}

function tallyBuckets(entries: DeckEntry[]): { speciesCounts: Map<string, number>; deckCounts: Map<string, { species1: string; species2: string; count: number }> } {
  const speciesCounts = new Map<string, number>();
  const deckCounts = new Map<string, { species1: string; species2: string; count: number }>();
  for (const d of entries) {
    if (d.species1) speciesCounts.set(d.species1, (speciesCounts.get(d.species1) || 0) + 1);
    if (d.species2) speciesCounts.set(d.species2, (speciesCounts.get(d.species2) || 0) + 1);
    const key = deckKeyOf(d.species1, d.species2);
    if (key) {
      const existing = deckCounts.get(key);
      const [a, b] = key.split('__');
      if (existing) existing.count += 1;
      else deckCounts.set(key, { species1: a || '', species2: b || '', count: 1 });
    }
  }
  return { speciesCounts, deckCounts };
}

function diffCounts<V>(
  prev: Map<string, number | { count: number } | V>,
  next: Map<string, number | { count: number } | V>,
  getCount: (v: number | { count: number } | V) => number,
): Map<string, number> {
  const delta = new Map<string, number>();
  const keys = new Set<string>([...prev.keys(), ...next.keys()]);
  for (const k of keys) {
    const p = prev.has(k) ? getCount(prev.get(k) as number | { count: number } | V) : 0;
    const n = next.has(k) ? getCount(next.get(k) as number | { count: number } | V) : 0;
    if (n - p !== 0) delta.set(k, n - p);
  }
  return delta;
}

export async function creditMetaCountersForEvent(
  serviceAccountJson: string,
  card: GamesetResultCardData,
): Promise<{ speciesDelta: number; deckDelta: number }> {
  const app = initTopCut(serviceAccountJson);
  const db = admin.firestore(app);

  // Load previous contribution snapshot (if any).
  const snapRef = db.doc(`metaContributions/${card.eventId}`);
  const snap = await snapRef.get();
  const prevDecks: DeckEntry[] = snap.exists
    ? (((snap.data()?.decks) || []) as DeckEntry[])
    : [];

  const nextDecks = speciesListFromCard(card);

  const prev = tallyBuckets(prevDecks);
  const next = tallyBuckets(nextDecks);

  const speciesDelta = diffCounts<number>(
    prev.speciesCounts as unknown as Map<string, number>,
    next.speciesCounts as unknown as Map<string, number>,
    (v) => typeof v === 'number' ? v : 0,
  );
  const deckDelta = diffCounts<{ count: number }>(
    prev.deckCounts as unknown as Map<string, { count: number }>,
    next.deckCounts as unknown as Map<string, { count: number }>,
    (v) => (typeof v === 'object' && v !== null && 'count' in v) ? (v as { count: number }).count : 0,
  );

  // Apply atomically — `FieldValue.increment` so concurrent contributors
  // never clobber each other.
  const ts = admin.firestore.FieldValue.serverTimestamp();
  const writes: Promise<unknown>[] = [];
  for (const [speciesId, delta] of speciesDelta.entries()) {
    if (!speciesId || !delta) continue;
    writes.push(db.doc(`pokemonPopularity/${speciesId}`).set({
      speciesId,
      count: admin.firestore.FieldValue.increment(delta),
      updatedAt: ts,
    }, { merge: true }));
  }
  for (const [key, delta] of deckDelta.entries()) {
    if (!key || !delta) continue;
    const meta = next.deckCounts.get(key) || prev.deckCounts.get(key);
    if (!meta) continue;
    writes.push(db.doc(`deckPopularity/${key}`).set({
      species1: meta.species1,
      species2: meta.species2,
      count: admin.firestore.FieldValue.increment(delta),
      updatedAt: ts,
    }, { merge: true }));
  }
  // Persist the snapshot so the next publish has the correct prev to diff
  // from. Always write so re-publish with no count change still updates
  // lastSyncAt.
  writes.push(snapRef.set({
    eventId: card.eventId,
    eventName: card.eventName,
    date: card.date,
    decks: nextDecks,
    lastSyncAt: ts,
  }, { merge: true }));

  await Promise.all(writes);
  logger.info(`[topcutSync] meta credited for ${card.eventId}: speciesΔ=${speciesDelta.size} deckΔ=${deckDelta.size}`);
  return { speciesDelta: speciesDelta.size, deckDelta: deckDelta.size };
}

/* Per-player tournament record — written to TopCut so a trainer can later
   claim their historical results when they sign up there. We use a known
   doc id pattern so re-syncs of the same event are idempotent.

   Doc path: tournamentRecords/{eventId}__{trainerId}__{rank} */
export async function writeTournamentRecords(
  serviceAccountJson: string,
  card: GamesetResultCardData,
): Promise<number> {
  const app = initTopCut(serviceAccountJson);
  const db = admin.firestore(app);
  const batch = db.batch();
  let count = 0;

  for (const s of card.standings) {
    if (!s.trainerId) continue;            // can't bind without an ID
    const docId = `${card.eventId}__${s.trainerId}__${s.rank}`;
    const ref = db.collection('tournamentRecords').doc(docId);
    batch.set(ref, {
      recordId: docId,
      eventId: card.eventId,
      eventName: card.eventName,
      date: card.date,
      trainerId: s.trainerId,
      claimedByUid: null,         // null until the trainer ID owner signs up
      rank: s.rank,
      record: s.record,
      points: s.points,
      deckSpecies1: s.deckSpecies1 || '',
      deckSpecies2: s.deckSpecies2 || '',
      totalPlayers: card.totalPlayers,
      totalRounds: card.totalRounds,
      format: card.format,
      source: 'gameset',
      createdAt: Date.now(),
    }, { merge: true });
    count++;
  }
  if (count > 0) {
    await batch.commit();
    logger.info(`[topcutSync] wrote ${count} tournamentRecords for event ${card.eventId}`);
  }
  return count;
}
