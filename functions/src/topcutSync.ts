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
  // Mirror the primary app's tolerance: cards built from sparse hosts
  // legitimately carry undefined optional fields (desc, time, contact).
  // Without this the secondary Firestore client throws on the first
  // write and breaks every event broadcast.
  topcutApp.firestore().settings({ ignoreUndefinedProperties: true });
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

  // Deterministic doc id keyed on eventId so concurrent invocations of
  // syncEventPost for the same event converge on the SAME doc id.
  // Prevents the race where two onEventWritten triggers fire in parallel
  // before the first one has written topcutPostId back to the source
  // event doc. Length cap: Firestore doc IDs allow ≤1500 bytes; our
  // eventIds are ~6 chars so plenty of headroom for the «gse-» prefix.
  const ref = db.collection('posts').doc(`gse-${card.eventId}`);
  // If a prior call already created this deterministic-id doc (with the
  // event-doc's topcutPostId field still missing — happens on the
  // racing-second-write path), fall back to update instead of overwriting
  // engagement counters via .set().
  const existing = await ref.get();
  if (existing.exists) {
    await ref.update(baseUpdate);
    logger.info(`[topcutSync] updated existing event post ${ref.id} (deterministic path)`);
    return ref.id;
  }
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

  // Deterministic doc id keyed on eventId — same race-prevention story
  // as syncEventPost above. The bug that motivated this: client fires
  // publishEventResultIfNeeded from 3+ trigger points (wheel-end,
  // page-exit, manual button) and the «check existingResultId then
  // create» path raced, producing duplicate posts on TopCut.
  const ref = db.collection('posts').doc(`gsr-${card.eventId}`);
  const existing = await ref.get();
  if (existing.exists) {
    await ref.update(baseUpdate);
    logger.info(`[topcutSync] updated existing result post ${ref.id} (deterministic path)`);
    return ref.id;
  }
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

/* Reverse the meta-counter contribution for an event. Called when the
   organizer cancels the event or admin removes the result post — keeps
   TopCut's Meta page from reporting deck distribution from a tournament
   that is no longer publicly visible.

   Mirror of TopCut's `reverseMetaContributionsForEvent` (functions/src/posts.ts)
   but executed cross-project via Admin SDK so GameSet's onEventWritten
   trigger doesn't need an extra HTTP hop. */
export async function reverseMetaForEvent(
  serviceAccountJson: string,
  eventId: string,
): Promise<{ speciesReversed: number; decksReversed: number }> {
  const app = initTopCut(serviceAccountJson);
  const db = admin.firestore(app);
  if (!eventId) return { speciesReversed: 0, decksReversed: 0 };
  const ref = db.doc(`metaContributions/${eventId}`);
  const snap = await ref.get();
  if (!snap.exists) return { speciesReversed: 0, decksReversed: 0 };
  const data = snap.data() as { decks?: Array<{ species1?: string; species2?: string }> } | undefined;
  const decks = (data?.decks || []).filter(d => d && (d.species1 || d.species2));
  if (decks.length === 0) {
    await ref.delete().catch(() => { /* drained */ });
    return { speciesReversed: 0, decksReversed: 0 };
  }
  const speciesCounts = new Map<string, number>();
  const deckCounts = new Map<string, { species1: string; species2: string; count: number }>();
  for (const d of decks) {
    if (d.species1) speciesCounts.set(d.species1, (speciesCounts.get(d.species1) || 0) + 1);
    if (d.species2) speciesCounts.set(d.species2, (speciesCounts.get(d.species2) || 0) + 1);
    const arr = [(d.species1 || '').trim(), (d.species2 || '').trim()].filter(Boolean).sort();
    if (!arr.length) continue;
    const key = arr.join('__');
    const e = deckCounts.get(key);
    if (e) e.count++;
    else deckCounts.set(key, { species1: arr[0], species2: arr[1] || '', count: 1 });
  }
  const ts = admin.firestore.FieldValue.serverTimestamp();
  const writes: Promise<unknown>[] = [];
  for (const [s, n] of speciesCounts.entries()) {
    if (!s || !n) continue;
    writes.push(db.doc(`pokemonPopularity/${s}`).set({
      speciesId: s,
      count: admin.firestore.FieldValue.increment(-n),
      updatedAt: ts,
    }, { merge: true }));
  }
  for (const [k, m] of deckCounts.entries()) {
    if (!k || !m.count) continue;
    writes.push(db.doc(`deckPopularity/${k}`).set({
      species1: m.species1,
      species2: m.species2,
      count: admin.firestore.FieldValue.increment(-m.count),
      updatedAt: ts,
    }, { merge: true }));
  }
  await Promise.all(writes);
  await ref.delete().catch(() => { /* may not exist */ });
  logger.info(`[topcutSync] meta reversed for ${eventId}: speciesΔ=${speciesCounts.size} deckΔ=${deckCounts.size}`);
  return { speciesReversed: speciesCounts.size, decksReversed: deckCounts.size };
}

/* Mirror the GameSet result into each player's TopCut trainer card so the
   public trainer profile (`/players?handle=...`) reflects events run on
   GameSet. Two writes per player:
     1. trainerCards/{normalizedTrainerId} (parent) — stats roll-up
        (totalEvents / championships / topFour / topCutFinishes via the
        existing bucketize logic shared with TopCut's onResultsForTrainerCards
        trigger). Uses an event-marker subdoc for idempotent re-publish.
     2. trainerCards/{tid}/tournamentLogs/{logId} — full log entry shown in
        the trainer's tournament history. logId is deterministic
        (`gameset_${eventId}`) so re-sync overwrites in place.
   The log carries `source: 'gameset'` so TopCut's onTournamentLogPopularity
   trigger can skip it (popularity is already credited via
   creditMetaCountersForEvent — letting the trigger fire would double-count). */
function normalizeTrainerId(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '');
}

function bucketize(rank: number) {
  return {
    champ: rank === 1 ? 1 : 0,
    top4: rank > 0 && rank <= 4 ? 1 : 0,
    top8: rank > 0 && rank <= 8 ? 1 : 0,
  };
}

function parseRecord(record: string): { wins: number; losses: number; ties: number } {
  // Accepts "3-1-0" or "3-1" forms; bad input yields zeros.
  const parts = (record || '').split('-').map((p) => parseInt(p.trim(), 10));
  return {
    wins: Number.isFinite(parts[0]) ? parts[0] : 0,
    losses: Number.isFinite(parts[1]) ? parts[1] : 0,
    ties: Number.isFinite(parts[2]) ? parts[2] : 0,
  };
}

export async function writeTrainerCardEntries(
  serviceAccountJson: string,
  card: GamesetResultCardData,
): Promise<{ logsWritten: number; statsApplied: number }> {
  const app = initTopCut(serviceAccountJson);
  const db = admin.firestore(app);
  let logsWritten = 0;
  let statsApplied = 0;

  // GameSet event date is 'YYYY-MM-DD' string — convert to Timestamp at
  // local midnight HK time so the trainer card timeline sorts correctly.
  let eventDate: admin.firestore.Timestamp | null = null;
  if (card.date) {
    const d = new Date(card.date + 'T00:00:00+08:00');
    if (!Number.isNaN(d.getTime())) eventDate = admin.firestore.Timestamp.fromDate(d);
  }
  const logId = `gameset_${card.eventId}`;
  const ts = admin.firestore.FieldValue.serverTimestamp();

  const touchedTrainerIds: string[] = [];

  for (const s of card.standings) {
    const tid = normalizeTrainerId(s.trainerId || '');
    if (!tid) continue;
    touchedTrainerIds.push(tid);
    const rank = s.rank;

    const cardRef = db.collection('trainerCards').doc(tid);
    const markerRef = cardRef.collection('events').doc(card.eventId);
    const logRef = cardRef.collection('tournamentLogs').doc(logId);

    // ── Stats roll-up (idempotent via marker doc) ──
    try {
      await db.runTransaction(async (tx) => {
        const [markerSnap, cardSnap] = await Promise.all([tx.get(markerRef), tx.get(cardRef)]);
        const oldRank = markerSnap.exists ? Number(markerSnap.data()?.rank ?? 0) : 0;
        if (oldRank === rank && markerSnap.exists) return;

        const before = bucketize(oldRank);
        const after = bucketize(rank);

        const update: Record<string, unknown> = {
          trainerId: s.trainerId,
          normalizedTrainerId: tid,
          latestPlayerName: s.name || tid,
          updatedAt: ts,
        };
        if (eventDate) update.lastSeenAt = eventDate;
        const eventsDelta = oldRank === 0 ? 1 : 0;
        if (eventsDelta) update.totalEvents = admin.firestore.FieldValue.increment(eventsDelta);
        const champDelta = after.champ - before.champ;
        if (champDelta) update.championships = admin.firestore.FieldValue.increment(champDelta);
        const top4Delta = after.top4 - before.top4;
        if (top4Delta) update.topFour = admin.firestore.FieldValue.increment(top4Delta);
        const top8Delta = after.top8 - before.top8;
        if (top8Delta) update.topCutFinishes = admin.firestore.FieldValue.increment(top8Delta);
        if (!cardSnap.exists || !cardSnap.data()?.firstSeenAt) {
          if (eventDate) update.firstSeenAt = eventDate;
        }
        tx.set(cardRef, update, { merge: true });
        tx.set(markerRef, {
          rank,
          eventDate: eventDate ?? null,
          source: 'gameset',
          recordedAt: ts,
        });
      });
      statsApplied++;
    } catch (e) {
      logger.error(`[topcutSync] applyStanding failed for ${tid} on ${card.eventId}`, e);
    }

    // ── Tournament log entry ──
    const { wins, losses, ties } = parseRecord(s.record);
    try {
      await logRef.set({
        logId,
        name: card.eventName,
        date: eventDate,
        format: 'irl',
        game: 'ptcg',
        mode: 'bo1',
        myDeck: {
          species1: s.deckSpecies1 || '',
          species2: s.deckSpecies2 || '',
        },
        wins,
        losses,
        ties,
        roundsCount: card.totalRounds,
        linkedEventId: card.eventId,
        visibility: 'public',
        source: 'gameset',
        finalRank: s.rank,
        updatedAt: ts,
        createdAt: ts,
      }, { merge: true });
      logsWritten++;
    } catch (e) {
      logger.error(`[topcutSync] log write failed for ${tid} on ${card.eventId}`, e);
    }
  }

  // Sidecar index — records every trainerId touched for this eventId so
  // reverseTrainerCardEntries can avoid a collectionGroup query (which
  // would need a per-field exemption index on tournamet-platform). Always
  // overwrite with the union of prior + current trainerIds so a re-publish
  // after a player drop still allows their card to be reverted on cancel.
  const idxRef = db.doc(`gamesetEventIndex/${card.eventId}`);
  try {
    const prior = await idxRef.get();
    const priorIds = prior.exists
      ? ((prior.data()?.trainerIds || []) as string[])
      : [];
    const merged = Array.from(new Set([...priorIds, ...touchedTrainerIds]));
    await idxRef.set({
      eventId: card.eventId,
      trainerIds: merged,
      lastSyncAt: ts,
    }, { merge: true });
  } catch (e) {
    logger.error(`[topcutSync] gamesetEventIndex write failed for ${card.eventId}`, e);
  }

  logger.info(`[topcutSync] trainer cards updated for ${card.eventId}: stats=${statsApplied} logs=${logsWritten}`);
  return { logsWritten, statsApplied };
}

/* Reverse the trainer-card contributions made by writeTrainerCardEntries.
   Walks each per-event marker, decrements counters back to oldRank=0, and
   deletes the corresponding tournament log entry. Called when an event is
   cancelled / deleted or admin removes the result post. */
export async function reverseTrainerCardEntries(
  serviceAccountJson: string,
  eventId: string,
): Promise<{ logsRemoved: number; statsReverted: number }> {
  const app = initTopCut(serviceAccountJson);
  const db = admin.firestore(app);
  if (!eventId) return { logsRemoved: 0, statsReverted: 0 };

  // Look up which trainer cards we touched on the publish path. Old events
  // synced before the sidecar shipped won't have an index doc — fall back
  // to the legacy collectionGroup walk in that case (it still requires the
  // events-source index on tournamet-platform, but at least new events
  // reverse cleanly without it).
  const idxRef = db.doc(`gamesetEventIndex/${eventId}`);
  const idxSnap = await idxRef.get();
  let trainerIds: string[] = [];
  if (idxSnap.exists) {
    trainerIds = ((idxSnap.data()?.trainerIds || []) as string[])
      .map((t) => String(t || '').trim())
      .filter(Boolean);
  } else {
    try {
      const cgSnap = await db.collectionGroup('events')
        .where('source', '==', 'gameset')
        .get();
      trainerIds = cgSnap.docs
        .filter((d) => d.id === eventId)
        .map((d) => d.ref.parent.parent?.id || '')
        .filter(Boolean);
    } catch (e) {
      logger.warn(`[topcutSync] reverse fallback collectionGroup failed for ${eventId} — skipping. ${(e as Error).message}`);
      return { logsRemoved: 0, statsReverted: 0 };
    }
  }

  let logsRemoved = 0;
  let statsReverted = 0;
  const ts = admin.firestore.FieldValue.serverTimestamp();

  for (const tid of trainerIds) {
    const cardRef = db.collection('trainerCards').doc(tid);
    const markerRef = cardRef.collection('events').doc(eventId);
    const logRef = cardRef.collection('tournamentLogs').doc(`gameset_${eventId}`);

    try {
      await db.runTransaction(async (tx) => {
        const markerSnap = await tx.get(markerRef);
        if (!markerSnap.exists) return;
        const oldRank = Number(markerSnap.data()?.rank ?? 0);
        if (oldRank === 0) {
          tx.delete(markerRef);
          return;
        }
        const before = bucketize(oldRank);
        const update: Record<string, unknown> = { updatedAt: ts };
        update.totalEvents = admin.firestore.FieldValue.increment(-1);
        if (before.champ) update.championships = admin.firestore.FieldValue.increment(-before.champ);
        if (before.top4) update.topFour = admin.firestore.FieldValue.increment(-before.top4);
        if (before.top8) update.topCutFinishes = admin.firestore.FieldValue.increment(-before.top8);
        tx.set(cardRef, update, { merge: true });
        tx.delete(markerRef);
      });
      statsReverted++;
    } catch (e) {
      logger.error(`[topcutSync] reverse stats failed for ${tid} on ${eventId}`, e);
    }

    try {
      await logRef.delete();
      logsRemoved++;
    } catch (e) {
      logger.warn(`[topcutSync] log delete already missing for ${tid}`, e);
    }
  }

  // Drop the sidecar last — only after all per-trainer reverts attempted.
  // If anything above failed, leaving the index intact lets a retry pick
  // up the same trainer set.
  if (idxSnap.exists) {
    try { await idxRef.delete(); } catch (e) {
      logger.warn(`[topcutSync] gamesetEventIndex delete failed for ${eventId}`, e);
    }
  }

  logger.info(`[topcutSync] trainer cards reverted for ${eventId}: stats=${statsReverted} logs=${logsRemoved} (touched=${trainerIds.length})`);
  return { logsRemoved, statsReverted };
}

/* Wipe every tournamentRecords doc that came from a given event. Called on
   cancel / delete so the per-player history surfaces don't keep advertising
   a result that no longer exists. The doc-id schema is
   `${eventId}__${trainerId}__${rank}` but we query by the eventId field
   (more robust against schema drift). */
export async function deleteTournamentRecordsForEvent(
  serviceAccountJson: string,
  eventId: string,
): Promise<number> {
  const app = initTopCut(serviceAccountJson);
  const db = admin.firestore(app);
  if (!eventId) return 0;
  let deleted = 0;
  while (true) {
    const page = await db.collection('tournamentRecords')
      .where('eventId', '==', eventId).limit(400).get();
    if (page.empty) break;
    const batch = db.batch();
    page.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += page.size;
    if (page.size < 400) break;
  }
  if (deleted > 0) {
    logger.info(`[topcutSync] deleted ${deleted} tournamentRecords for ${eventId}`);
  }
  return deleted;
}

/* Wipe TopCut-side eventRegistrations mirrored from a given GameSet event.
   These are the rows powering /account/events "我報名嘅活動" — written by
   GamesetSignupModal when a signed-in TopCut user signs up. On cancel /
   delete the GameSet event we drop them so the user no longer sees a stale
   "報名已確認" card. */
export async function deleteEventRegistrationsForEvent(
  serviceAccountJson: string,
  eventId: string,
): Promise<number> {
  const app = initTopCut(serviceAccountJson);
  const db = admin.firestore(app);
  if (!eventId) return 0;
  let deleted = 0;
  while (true) {
    const page = await db.collection('eventRegistrations')
      .where('gamesetEventId', '==', eventId).limit(400).get();
    if (page.empty) break;
    const batch = db.batch();
    page.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += page.size;
    if (page.size < 400) break;
  }
  if (deleted > 0) {
    logger.info(`[topcutSync] deleted ${deleted} eventRegistrations for ${eventId}`);
  }
  return deleted;
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
