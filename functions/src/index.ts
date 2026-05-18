import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import {
  syncEventPost, syncResultPost, writeTournamentRecords, deleteEventPost,
  creditMetaCountersForEvent, reverseMetaForEvent,
  writeTrainerCardEntries, reverseTrainerCardEntries,
  deleteTournamentRecordsForEvent, deleteEventRegistrationsForEvent,
  type GamesetEventCardData, type GamesetResultCardData, type PrizeTier,
} from './topcutSync';

admin.initializeApp();

const TELEGRAM_BOT_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN');
const TELEGRAM_ADMIN_CHAT_ID = defineSecret('TELEGRAM_ADMIN_CHAT_ID');

// Cross-project credentials for posting to TopCut HK (tournamet-platform).
//   TOPCUT_SERVICE_ACCOUNT — full JSON of a service account on tournamet-platform
//                            with role "Cloud Datastore User".
//   TOPCUT_SYSTEM_UID      — Firebase Auth UID of the gameset_hk system player.
//   TOPCUT_SYSTEM_HANDLE   — usually "gameset_hk"; broken out as a secret so
//                            we can rebrand without redeploying.
const TOPCUT_SERVICE_ACCOUNT = defineSecret('TOPCUT_SERVICE_ACCOUNT');
const TOPCUT_SYSTEM_UID = defineSecret('TOPCUT_SYSTEM_UID');
const TOPCUT_SYSTEM_HANDLE = defineSecret('TOPCUT_SYSTEM_HANDLE');

const REGION = 'asia-east1';
const VIEW_URL_BASE = 'https://gameset-hk.com';

interface TournamentState {
  tournamentName?: string;
  tournamentType?: 'swiss' | 'knockout';
  gameType?: 'tcg' | 'spin';
  tournamentDate?: string;
  tournamentStarted?: boolean;
  tournamentEnded?: boolean;
  players?: unknown[];
  rounds?: unknown[];
  totalRounds?: number;
  matchTargetPoints?: number;
  threeOnThreeMode?: boolean;
  stadiumOutEnabled?: boolean;
  bestOfThree?: boolean;
}

interface TournamentDoc {
  state?: TournamentState;
  ownerUid?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  });
  const json = await res.json() as { ok: boolean; description?: string };
  if (!json.ok) {
    throw new Error(`sendMessage failed: ${json.description}`);
  }
}

/* Start-alert pipeline.

   Originally the Telegram alert fired synchronously from a Firestore
   trigger on `tournaments/{tid}` the moment `state.tournamentStarted`
   flipped false→true. In practice many owners would Publish (creating
   the doc with started=true) and seconds later hit «Stop Sharing»,
   which deletes the doc — leaving a Telegram message whose link goes
   to «此賽事已不再開放».

   Fix: defer the send by 60s. The trigger now enqueues a job in
   `alertQueue/{tid}`; a cron sweep re-reads the tournament 60s+ later
   and only sends if the doc still exists and isn't ended. Using `tid`
   as the queue doc id naturally collapses rapid re-publishes into a
   single eventual send. */
const ALERT_DELAY_MS = 60 * 1000;

function buildStartAlertMessage(id: string, s: TournamentState): string {
  const name = escapeHtml(s.tournamentName || '(no name)');
  const isSpin = s.gameType === 'spin';
  const game = isSpin ? '🌀 Spin Battle' : '🃏 TCG';
  const format = s.tournamentType === 'knockout' ? 'Knockout' : 'Swiss';
  const playerCount = Array.isArray(s.players) ? s.players.length : 0;
  const rounds = Array.isArray(s.rounds) ? s.rounds.length : (s.totalRounds || 0);
  const date = escapeHtml(s.tournamentDate || '-');
  const viewUrl = `${VIEW_URL_BASE}?t=${encodeURIComponent(id)}`;

  const modes: string[] = [];
  if (isSpin) {
    modes.push(`first-to-${s.matchTargetPoints ?? 4}`);
    if (s.threeOnThreeMode !== false) modes.push('3-on-3');
    if (s.stadiumOutEnabled) modes.push('Stadium Out');
  } else {
    if (s.bestOfThree) modes.push('Best of 3');
  }
  const modesLine = modes.length ? `<b>Mode:</b> ${escapeHtml(modes.join(' · '))}` : '';

  const lines = [
    '🎮 <b>GameSet HK tournament started</b>',
    '',
    `<b>Name:</b> ${name}`,
    `<b>Game:</b> ${game} · ${format}`,
    `<b>Players:</b> ${playerCount}${rounds ? ` · ${rounds} round${rounds > 1 ? 's' : ''}` : ''}`,
    ...(modesLine ? [modesLine] : []),
    `<b>Date:</b> ${date}`,
    '',
    `🔗 ${viewUrl}`,
  ];
  return lines.join('\n');
}

export const onTournamentStarted = onDocumentWritten(
  {
    document: 'tournaments/{tournamentId}',
    region: REGION,
  },
  async (event) => {
    const before = event.data?.before?.data() as TournamentDoc | undefined;
    const after = event.data?.after?.data() as TournamentDoc | undefined;
    if (!after) return; // deleted — no alert

    const wasStarted = Boolean(before?.state?.tournamentStarted);
    const isStarted = Boolean(after.state?.tournamentStarted);
    if (wasStarted || !isStarted) return; // only fire on false→true edge

    const id = event.params.tournamentId;
    const sendAfter = admin.firestore.Timestamp.fromMillis(Date.now() + ALERT_DELAY_MS);
    await admin.firestore().doc(`alertQueue/${id}`).set({
      tournamentId: id,
      sendAfter,
      status: 'pending',
      enqueuedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    logger.info(`Queued start alert for ${id} (sendAfter=${sendAfter.toDate().toISOString()})`);
  }
);

/* processAlertQueue — every minute, look for due alerts and send if
   the underlying tournament is still alive. Each job carries the
   tournament id so we re-read fresh state at send time. */
const ALERT_BATCH = 20;

export const processAlertQueue = onSchedule(
  {
    schedule: 'every 1 minutes',
    region: REGION,
    timeoutSeconds: 120,
    secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID],
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const snap = await admin.firestore().collection('alertQueue')
      .where('status', '==', 'pending')
      .where('sendAfter', '<=', now)
      .limit(ALERT_BATCH)
      .get();
    if (snap.empty) return;

    logger.info(`[alertQueue] processing ${snap.size} due job(s)`);
    const token = TELEGRAM_BOT_TOKEN.value();
    const chatId = TELEGRAM_ADMIN_CHAT_ID.value();

    for (const job of snap.docs) {
      const tid = (job.data().tournamentId as string) || job.id;
      const tDoc = await admin.firestore().doc(`tournaments/${tid}`).get();
      if (!tDoc.exists) {
        logger.info(`[alertQueue] skip ${tid}: tournament deleted before alert window`);
        await job.ref.delete();
        continue;
      }
      const t = tDoc.data() as TournamentDoc;
      const s = t.state || {};
      if (!s.tournamentStarted) {
        logger.info(`[alertQueue] skip ${tid}: tournamentStarted=false at send time`);
        await job.ref.delete();
        continue;
      }
      if (s.tournamentEnded) {
        logger.info(`[alertQueue] skip ${tid}: tournament already ended at send time`);
        await job.ref.delete();
        continue;
      }
      try {
        await sendTelegramMessage(token, chatId, buildStartAlertMessage(tid, s));
        logger.info(`[alertQueue] sent start alert for ${tid}`);
        await job.ref.delete();
      } catch (e) {
        logger.error(`[alertQueue] send failed for ${tid}`, e);
        // leave the job in place; next cron run will retry.
      }
    }
  }
);

/* ────────────────────────────────────────────────────────────────────────────
   Hosted-event syndication to TopCut HK feed.
   ──────────────────────────────────────────────────────────────────────────── */

interface EventDoc {
  eventId?: string;
  ownerUid?: string;
  phase?: 'signup' | 'live' | 'ended' | 'cancelled';
  syncToTopCut?: boolean;          // default true; organizer can opt out
  published?: boolean;             // explicit publish gate — false = TopCut sync paused
  topcutPostId?: string | null;
  meta?: {
    org?: string; name?: string; date?: string; time?: string;
    address?: string; desc?: string; contact?: string;
    fee?: number; currency?: string; paymentMethods?: string[];
  };
  prizes?: { tiers?: PrizeTier[]; lucky?: string };
  imageUrl?: string | null;
  capacity?: number | null;
  signupOpen?: boolean;
  signupCount?: number;
}

function buildEventCard(eid: string, doc: EventDoc): GamesetEventCardData | null {
  const m = doc.meta || {};
  if (!m.name || !m.date) return null;     // need at least name + date to publish
  return {
    eventId: doc.eventId || eid,
    org: m.org || '',
    name: m.name,
    date: m.date,
    time: m.time || undefined,
    address: m.address || '',
    desc: m.desc || undefined,
    contact: m.contact || undefined,
    fee: typeof m.fee === 'number' ? m.fee : 0,
    currency: m.currency || 'HKD',
    paymentMethods: Array.isArray(m.paymentMethods) ? m.paymentMethods : ['cash'],
    imageUrl: doc.imageUrl || null,
    prizes: {
      tiers: Array.isArray(doc.prizes?.tiers) ? doc.prizes!.tiers : [],
      lucky: doc.prizes?.lucky || undefined,
    },
    capacity: doc.capacity ?? null,
    signupOpen: doc.signupOpen !== false,
    phase: doc.phase || 'signup',
    signupCount: typeof doc.signupCount === 'number' ? doc.signupCount : 0,
  };
}

// Material-change detector — skip the round-trip if only ephemeral fields
// (signupCount, updatedAt, expiresAt) changed. Saves quota and avoids edit
// timestamp churn on the TopCut post.
function isMaterialChange(before: EventDoc | undefined, after: EventDoc): boolean {
  if (!before) return true;                // first write
  // The publish edge (published false → true) MUST count as material — that's
  // the moment a post is created. Without this short-circuit, the very first
  // publish-only update (no other field change) wouldn't sync.
  if (before.published !== after.published) return true;
  const b = JSON.stringify({
    phase: before.phase, syncToTopCut: before.syncToTopCut,
    meta: before.meta, prizes: before.prizes,
    imageUrl: before.imageUrl, capacity: before.capacity,
    signupOpen: before.signupOpen,
  });
  const a = JSON.stringify({
    phase: after.phase, syncToTopCut: after.syncToTopCut,
    meta: after.meta, prizes: after.prizes,
    imageUrl: after.imageUrl, capacity: after.capacity,
    signupOpen: after.signupOpen,
  });
  return a !== b;
}

export const onEventWritten = onDocumentWritten(
  {
    document: 'events/{eventId}',
    region: REGION,
    secrets: [TOPCUT_SERVICE_ACCOUNT, TOPCUT_SYSTEM_UID, TOPCUT_SYSTEM_HANDLE],
  },
  async (event) => {
    const before = event.data?.before?.data() as EventDoc | undefined;
    const after = event.data?.after?.data() as EventDoc | undefined;
    const eid = event.params.eventId;
    if (!after) return;                     // deleted — leave the historical post in place
    if (after.syncToTopCut === false) return;

    let serviceAccount: string;
    let systemUid: string;
    let systemHandle: string;
    try {
      serviceAccount = TOPCUT_SERVICE_ACCOUNT.value();
      systemUid = TOPCUT_SYSTEM_UID.value();
      systemHandle = TOPCUT_SYSTEM_HANDLE.value();
    } catch (e) {
      logger.warn(`[onEventWritten] ${eid} secrets not set — skipping. ${(e as Error).message}`);
      return;
    }

    // Cancel edge: phase signup/live → cancelled. Reverse any meta credit
    // (so the canceled event stops contributing to deck-distribution stats)
    // + flag the post as cancelled (handled by syncEventPost via card.phase).
    const wasCancelled = before?.phase === 'cancelled';
    const isCancelled = after.phase === 'cancelled';
    if (!wasCancelled && isCancelled) {
      try {
        const reversed = await reverseMetaForEvent(serviceAccount, eid);
        logger.info(`[onEventWritten] ${eid} cancelled — meta reversed`, reversed);
      } catch (e) {
        logger.error(`[onEventWritten] ${eid} cancel meta reverse failed`, e);
      }
      try {
        const reverted = await reverseTrainerCardEntries(serviceAccount, eid);
        logger.info(`[onEventWritten] ${eid} cancelled — trainerCards reverted`, reverted);
      } catch (e) {
        logger.error(`[onEventWritten] ${eid} cancel trainerCard revert failed`, e);
      }
      try {
        const recsDeleted = await deleteTournamentRecordsForEvent(serviceAccount, eid);
        logger.info(`[onEventWritten] ${eid} cancelled — ${recsDeleted} tournamentRecords removed`);
      } catch (e) {
        logger.error(`[onEventWritten] ${eid} cancel tournamentRecords cleanup failed`, e);
      }
      try {
        const regsDeleted = await deleteEventRegistrationsForEvent(serviceAccount, eid);
        logger.info(`[onEventWritten] ${eid} cancelled — ${regsDeleted} eventRegistrations removed`);
      } catch (e) {
        logger.error(`[onEventWritten] ${eid} cancel eventRegistrations cleanup failed`, e);
      }
      // fall through so the gamesetEvent post status flips to 'cancelled'
    }

    // Unpublish edge: published true → false. Delete the post on TopCut and
    // clear the post-id back-reference so a future re-publish creates fresh.
    const wasPublished = before?.published === true;
    const isPublished = after.published === true;
    if (wasPublished && !isPublished) {
      if (after.topcutPostId) {
        try {
          await deleteEventPost(serviceAccount, after.topcutPostId);
        } catch (e) {
          logger.error(`[onEventWritten] ${eid} unpublish delete failed`, e);
        }
        await admin.firestore().doc(`events/${eid}`).update({ topcutPostId: null });
      }
      logger.info(`[onEventWritten] ${eid} unpublished — TopCut post removed`);
      return;
    }

    // Pre-publish: skip until the organizer hits "📣 發佈活動".
    if (!isPublished) {
      logger.info(`[onEventWritten] ${eid} skipped — not published yet`);
      return;
    }

    if (!isMaterialChange(before, after)) return;

    const card = buildEventCard(eid, after);
    if (!card) {
      logger.info(`[onEventWritten] ${eid} skipped — meta.name/date missing`);
      return;
    }

    try {
      const newPostId = await syncEventPost(
        serviceAccount, systemUid, systemHandle, card, after.topcutPostId || null,
      );
      if (newPostId !== after.topcutPostId) {
        await admin.firestore().doc(`events/${eid}`).update({ topcutPostId: newPostId });
      }
    } catch (e) {
      logger.error(`[onEventWritten] sync failed for ${eid}`, e);
    }
  }
);

/* onSignupWritten — keep events/{eid}.signupCount accurate so the capacity
   gate in firestore.rules + the public /event page count display stay in
   sync. Fires on create/delete of any signup row; +1 / -1 the parent doc
   atomically via FieldValue.increment. Updates only — won't recreate the
   parent if it has been removed. */
export const onSignupWritten = onDocumentWritten(
  {
    document: 'events/{eventId}/signups/{signupId}',
    region: REGION,
  },
  async (event) => {
    const had = !!event.data?.before?.exists;
    const has = !!event.data?.after?.exists;
    if (had === has) return;                      // pure update — no count change
    const delta = has ? 1 : -1;
    const eid = event.params.eventId;
    try {
      await admin.firestore().doc(`events/${eid}`).update({
        signupCount: admin.firestore.FieldValue.increment(delta),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      // Parent may have been deleted between trigger fire + this write.
      logger.warn(`[onSignupWritten] ${eid} count update failed`, e);
    }
  },
);

/* submitMatchReport — Phase 1 self-report flow. Called from the viewer page
   when a player taps a result on their own pairing AND the opponent has
   confirmed (pass-the-phone) or disputed. Verifies the reporter is actually
   one of the two players on the pairing, then appends a matchReports doc.
   The owner's app subscribes to that subcollection and applies confirmed
   reports to local state, which then re-syncs to cloud.

   Identity model: reporter is identified by `reporterPlayerId` (the unique
   in-tournament player.id, always present). Trainer ID is optional bonus
   metadata — when both are provided they must agree (catches spoofing via
   ID collisions) but trainer ID is NOT required for self-report to work.
   This lets non-hosted tournaments use the feature too. The signature on
   confirm + organizer override remain the real auth boundary. */
const TRAINER_ID_REGEX_FN = /^hk\d{8}$/;
const SIG_MAX_BYTES = 64 * 1024;        // ~64KB cap on the signature dataURL

interface SubmitMatchReportRequest {
  tournamentId: string;
  roundIndex: number;
  pairingIndex: number;
  reporterPlayerId?: string;            // preferred — unique player.id within tournament
  reporterTrainerId?: string;           // optional bonus / legacy / cross-check
  result: 'a' | 'b' | 'draw';
  confirmedByOpponent: boolean;
  confirmSig?: string;                  // base64 dataURL of opponent's signature
}
interface SubmitMatchReportResponse {
  ok: boolean;
  reportId?: string;
  status?: 'confirmed' | 'disputed';
  reason?: string;
}

interface PairingShape {
  playerA?: string;
  playerB?: string;
  isBye?: boolean;
  result?: 'a' | 'b' | 'draw' | null;
}
interface PlayerShape {
  id?: string;
  name?: string;
  trainerId?: string;
}

export const submitMatchReport = onCall<SubmitMatchReportRequest, Promise<SubmitMatchReportResponse>>(
  { region: REGION },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const data = req.data || ({} as SubmitMatchReportRequest);
    const {
      tournamentId, roundIndex, pairingIndex,
      reporterPlayerId, reporterTrainerId,
      result, confirmedByOpponent, confirmSig,
    } = data;

    // Shape validation.
    if (typeof tournamentId !== 'string' || !tournamentId) {
      throw new HttpsError('invalid-argument', 'tournamentId required');
    }
    if (!Number.isInteger(roundIndex) || roundIndex < 0) {
      throw new HttpsError('invalid-argument', 'roundIndex must be non-negative int');
    }
    if (!Number.isInteger(pairingIndex) || pairingIndex < 0) {
      throw new HttpsError('invalid-argument', 'pairingIndex must be non-negative int');
    }
    if (!['a', 'b', 'draw'].includes(result)) {
      throw new HttpsError('invalid-argument', 'result must be a / b / draw');
    }
    // At least one identity required.
    if ((typeof reporterPlayerId !== 'string' || !reporterPlayerId)
        && (typeof reporterTrainerId !== 'string' || !reporterTrainerId)) {
      throw new HttpsError('invalid-argument', 'reporterPlayerId or reporterTrainerId required');
    }
    // If trainerId provided, must be in canonical format.
    if (reporterTrainerId && !TRAINER_ID_REGEX_FN.test(reporterTrainerId)) {
      throw new HttpsError('invalid-argument', 'reporterTrainerId must match hk\\d{8}');
    }
    const sig = typeof confirmSig === 'string' ? confirmSig : '';
    if (sig.length > SIG_MAX_BYTES) {
      throw new HttpsError('invalid-argument', 'confirmSig too large');
    }
    if (confirmedByOpponent && sig.length < 100) {
      throw new HttpsError('invalid-argument', 'confirmSig required when confirming');
    }

    const db = admin.firestore();
    const tRef = db.collection('tournaments').doc(tournamentId);
    const tSnap = await tRef.get();
    if (!tSnap.exists) throw new HttpsError('not-found', 'tournament not found');
    const tDoc = tSnap.data() as TournamentDoc;
    const state = tDoc.state || {};
    const rounds = (state.rounds || []) as Array<{ pairings?: PairingShape[]; resultsSubmitted?: boolean }>;
    const round = rounds[roundIndex];
    if (!round) throw new HttpsError('not-found', 'round not found');
    if (round.resultsSubmitted) {
      throw new HttpsError('failed-precondition', 'round already finalized — ask organizer');
    }
    const pairing = (round.pairings || [])[pairingIndex];
    if (!pairing) throw new HttpsError('not-found', 'pairing not found');
    if (pairing.isBye) throw new HttpsError('failed-precondition', 'cannot self-report a bye');
    if (pairing.result) {
      throw new HttpsError('failed-precondition', 'pairing already has a result — ask organizer');
    }

    // Resolve reporter — prefer reporterPlayerId, fall back to trainerId.
    const players = ((state.players as PlayerShape[]) || []);
    const findByPid = (pid?: string) => players.find((p) => p && p.id === pid);
    const pa = findByPid(pairing.playerA);
    const pb = findByPid(pairing.playerB);
    const tidLc = (reporterTrainerId || '').toLowerCase();
    let reporter: PlayerShape | null = null;
    let reporterSide: 'a' | 'b' | null = null;

    if (reporterPlayerId) {
      if (pa?.id === reporterPlayerId)      { reporter = pa; reporterSide = 'a'; }
      else if (pb?.id === reporterPlayerId) { reporter = pb; reporterSide = 'b'; }
    } else if (tidLc) {
      if (pa?.trainerId && pa.trainerId.toLowerCase() === tidLc)      { reporter = pa; reporterSide = 'a'; }
      else if (pb?.trainerId && pb.trainerId.toLowerCase() === tidLc) { reporter = pb; reporterSide = 'b'; }
    }
    if (!reporter || !reporterSide) {
      throw new HttpsError('permission-denied', 'reporter not on this pairing');
    }
    // Cross-check: when both ids supplied, the player.trainerId must match.
    if (reporterPlayerId && tidLc && (reporter.trainerId || '').toLowerCase() !== tidLc) {
      throw new HttpsError('permission-denied', 'reporter trainerId mismatch');
    }

    // One report per pairing — block double-submit. Organizer override goes
    // through the local round view (setResult) instead of this callable.
    const existing = await tRef
      .collection('matchReports')
      .where('roundIndex', '==', roundIndex)
      .where('pairingIndex', '==', pairingIndex)
      .limit(1)
      .get();
    if (!existing.empty) {
      throw new HttpsError('already-exists', 'a report already exists for this pairing');
    }

    const status: 'confirmed' | 'disputed' = confirmedByOpponent ? 'confirmed' : 'disputed';
    const reportRef = tRef.collection('matchReports').doc();
    await reportRef.set({
      reportId: reportRef.id,
      roundIndex,
      pairingIndex,
      reporterPlayerId: reporter.id || '',
      reporterPlayerName: reporter.name || '',
      reporterTrainerId: (reporter.trainerId || tidLc || '').toLowerCase(),
      reporterSide,
      result,
      status,
      confirmSig: confirmedByOpponent ? sig : '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(
      `[submitMatchReport] ${tournamentId} R${roundIndex}.${pairingIndex} ${status} ` +
      `by ${reporter.id} (${reporter.name || ''})`,
    );
    return { ok: true, reportId: reportRef.id, status };
  },
);

/* publishEventResult — called by organizer from the host UI after they preview
   and approve the standings. Pulls signups + tournament state, computes deck
   distribution + ranked standings, then writes ONE gamesetResult post + per-
   player tournamentRecords on TopCut for trainer-ID binding. */
interface PublishResultRequest {
  eventId: string;
  editorOverrides?: { hideName?: boolean; rename?: Record<string, string> };
}
interface PublishResultResponse {
  ok: boolean;
  postId?: string;
  recordsWritten?: number;
}

export const publishEventResult = onCall<PublishResultRequest, Promise<PublishResultResponse>>(
  {
    region: REGION,
    secrets: [TOPCUT_SERVICE_ACCOUNT, TOPCUT_SYSTEM_UID, TOPCUT_SYSTEM_HANDLE],
  },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const { eventId, editorOverrides } = req.data || {};
    if (!eventId) throw new HttpsError('invalid-argument', 'eventId required');

    const eventRef = admin.firestore().doc(`events/${eventId}`);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) throw new HttpsError('not-found', 'event not found');
    const eventData = eventSnap.data() as EventDoc & { tournamentResultSnapshot?: ResultSnapshot };

    if (eventData.ownerUid !== req.auth.uid) {
      throw new HttpsError('permission-denied', 'Only the event owner can publish results');
    }

    const snapshot = eventData.tournamentResultSnapshot;
    if (!snapshot || !Array.isArray(snapshot.standings) || snapshot.standings.length === 0) {
      throw new HttpsError(
        'failed-precondition',
        'No tournament result snapshot — finish the bracket and seed it from the host UI first.'
      );
    }

    const standings = snapshot.standings.map((s) => ({
      ...s,
      name: editorOverrides?.rename?.[s.name] || s.name,
    }));

    const card: GamesetResultCardData = {
      eventId,
      eventName: snapshot.eventName ||
        ((eventData.meta?.org ? eventData.meta.org + ' — ' : '') + (eventData.meta?.name || '')),
      date: snapshot.date || eventData.meta?.date || '',
      format: snapshot.format || 'swiss',
      totalPlayers: snapshot.totalPlayers || standings.length,
      totalRounds: snapshot.totalRounds || 0,
      standings,
      deckDistribution: snapshot.deckDistribution || [],
    };

    let serviceAccount: string;
    let systemUid: string;
    let systemHandle: string;
    try {
      serviceAccount = TOPCUT_SERVICE_ACCOUNT.value();
      systemUid = TOPCUT_SYSTEM_UID.value();
      systemHandle = TOPCUT_SYSTEM_HANDLE.value();
    } catch (e) {
      throw new HttpsError('failed-precondition', 'TopCut sync secrets not configured');
    }

    const existingResultId = (eventData as { topcutResultPostId?: string | null }).topcutResultPostId || null;
    const postId = await syncResultPost(serviceAccount, systemUid, systemHandle, card, existingResultId);
    const recordsWritten = await writeTournamentRecords(serviceAccount, card);
    // Feed TopCut Meta page popularity counters with this event's deck
    // distribution. Idempotent — re-runs apply the diff so re-publish after
    // a rename / drop doesn't double-count.
    let metaCredited = { speciesDelta: 0, deckDelta: 0 };
    try {
      metaCredited = await creditMetaCountersForEvent(serviceAccount, card);
    } catch (e) {
      logger.error(`[publishEventResult] meta credit failed for ${eventId}`, e);
    }
    // Mirror standings into each player's trainer card so the public trainer
    // profile reflects GameSet event participation. Idempotent — re-publish
    // overwrites the deterministic per-event log + diffs the rank stats.
    let trainerCardsUpdated = { logsWritten: 0, statsApplied: 0 };
    try {
      trainerCardsUpdated = await writeTrainerCardEntries(serviceAccount, card);
    } catch (e) {
      logger.error(`[publishEventResult] trainerCard write failed for ${eventId}`, e);
    }
    await eventRef.update({
      topcutResultPostId: postId,
      phase: 'ended',
    });

    return { ok: true, postId, recordsWritten, metaCredited, trainerCardsUpdated };
  }
);

/* deleteEvent — organizer-only, signup-phase-only cascade cleanup.
   Wipes signups subcoll, storage promo image, TopCut feed post, and any
   meta credit, then deletes the event doc. Once a tournament has gone
   live or ended, the rule blocks delete (admin tooling on TopCut handles
   takedowns of historical events to keep the audit trail intact). */
interface DeleteEventRequest { eventId: string }
interface DeleteEventResponse {
  ok: boolean;
  signupsDeleted: number;
  imagesDeleted: number;
  topcutPostRemoved: boolean;
  metaReversed: boolean;
}

export const deleteEvent = onCall<DeleteEventRequest, Promise<DeleteEventResponse>>(
  {
    region: REGION,
    secrets: [TOPCUT_SERVICE_ACCOUNT, TOPCUT_SYSTEM_UID, TOPCUT_SYSTEM_HANDLE],
  },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const eventId = req.data?.eventId;
    if (!eventId) throw new HttpsError('invalid-argument', 'eventId required');

    const ref = admin.firestore().doc(`events/${eventId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'event not found');
    const data = snap.data() as EventDoc & {
      ownerUid?: string;
      topcutPostId?: string | null;
      imageStoragePath?: string | null;
    };
    if (data.ownerUid !== req.auth.uid) {
      throw new HttpsError('permission-denied', 'Only the event owner can delete');
    }
    if (data.phase !== 'signup') {
      throw new HttpsError('failed-precondition',
        'Cannot delete an event that has started, ended, or been cancelled. Use admin tools.');
    }

    // Wipe signups subcoll in pages of 400 (under the 500-batch limit).
    let signupsDeleted = 0;
    while (true) {
      const page = await admin.firestore()
        .collection(`events/${eventId}/signups`).limit(400).get();
      if (page.empty) break;
      const batch = admin.firestore().batch();
      page.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      signupsDeleted += page.size;
      if (page.size < 400) break;
    }

    // Wipe storage promo image(s) under event-images/{eid}/.
    let imagesDeleted = 0;
    try {
      const bucket = admin.storage().bucket();
      const [files] = await bucket.getFiles({ prefix: `event-images/${eventId}/` });
      await Promise.all(files.map((f) => f.delete().catch((e) => {
        logger.warn(`[deleteEvent] failed to delete ${f.name}`, e);
      })));
      imagesDeleted = files.length;
    } catch (e) {
      logger.error(`[deleteEvent] image cleanup failed for ${eventId}`, e);
    }

    // Cross-project: remove the TopCut feed post (if syndicated) + reverse
    // any meta credit. Pre-publish events typically have neither set.
    let topcutPostRemoved = false;
    let metaReversed = false;
    try {
      const sa = TOPCUT_SERVICE_ACCOUNT.value();
      if (data.topcutPostId) {
        await deleteEventPost(sa, data.topcutPostId);
        topcutPostRemoved = true;
      }
      const r = await reverseMetaForEvent(sa, eventId);
      metaReversed = (r.speciesReversed + r.decksReversed) > 0;
      try {
        await reverseTrainerCardEntries(sa, eventId);
      } catch (e) {
        logger.error(`[deleteEvent] trainerCard revert failed for ${eventId}`, e);
      }
      try {
        await deleteTournamentRecordsForEvent(sa, eventId);
      } catch (e) {
        logger.error(`[deleteEvent] tournamentRecords cleanup failed for ${eventId}`, e);
      }
      try {
        await deleteEventRegistrationsForEvent(sa, eventId);
      } catch (e) {
        logger.error(`[deleteEvent] eventRegistrations cleanup failed for ${eventId}`, e);
      }
    } catch (e) {
      logger.error(`[deleteEvent] cross-project cleanup failed for ${eventId}`, e);
    }

    await ref.delete();
    logger.info(`[deleteEvent] ${eventId} deleted by ${req.auth.uid}`,
      { signupsDeleted, imagesDeleted, topcutPostRemoved, metaReversed });
    return { ok: true, signupsDeleted, imagesDeleted, topcutPostRemoved, metaReversed };
  }
);

/* cleanupExpiredEvents — nightly scheduled sweep.

   Each event doc carries `expiresAt` (90 days from last update). When that
   timestamp is in the past the doc + signups subcollection + Storage
   promo image become dead weight. We delete them here so Storage costs
   stay bounded.

   We deliberately DON'T reverse meta credit: the historical Meta page
   should keep reflecting events that ran successfully — only the raw
   organizer-side data is purged. Same logic for TopCut posts: the
   feed post stays as a historical artifact unless an admin removes it.

   Idempotent: re-runs find no expired docs. Safe to run more often than
   needed. */
const CLEANUP_BATCH = 25;          // events per cron invocation; keeps each
                                    // run under the 9-min function ceiling
                                    // even with large signup subcolls.

export const cleanupExpiredEvents = onSchedule(
  {
    schedule: 'every day 04:00',     // HK 12:00 — quiet hours either way
    timeZone: 'Asia/Hong_Kong',
    region: REGION,
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const snap = await admin.firestore().collection('events')
      .where('expiresAt', '<', now)
      .limit(CLEANUP_BATCH)
      .get();
    if (snap.empty) {
      logger.info('[cleanup] no expired events');
      return;
    }
    logger.info(`[cleanup] purging ${snap.size} expired event(s)`);
    const bucket = admin.storage().bucket();

    for (const evDoc of snap.docs) {
      const eid = evDoc.id;
      try {
        // Wipe signups subcoll in pages.
        let signupsDeleted = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const page = await admin.firestore()
            .collection(`events/${eid}/signups`).limit(400).get();
          if (page.empty) break;
          const batch = admin.firestore().batch();
          page.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          signupsDeleted += page.size;
          if (page.size < 400) break;
        }

        // Wipe storage promo images under event-images/{eid}/.
        let imagesDeleted = 0;
        try {
          const [files] = await bucket.getFiles({ prefix: `event-images/${eid}/` });
          await Promise.all(files.map((f) => f.delete().catch((e) => {
            logger.warn(`[cleanup] failed delete ${f.name}`, e);
          })));
          imagesDeleted = files.length;
        } catch (e) {
          logger.error(`[cleanup] storage list/delete failed for ${eid}`, e);
        }

        // Drop the event doc itself last — if anything above failed we want
        // a retry on the next cron run rather than an orphaned cleanup.
        await evDoc.ref.delete();
        logger.info(`[cleanup] purged ${eid}: signups=${signupsDeleted} images=${imagesDeleted}`);
      } catch (e) {
        logger.error(`[cleanup] event ${eid} failed`, e);
        // Keep going — one bad event shouldn't stall the whole batch.
      }
    }
  }
);

/* claimEvent — cross-device editor handoff.

   The host URL `/host/?e=<id>&k=<editKey>` contains the editKey but
   Firestore rules require ownerUid == auth.uid to update the event doc.
   When an organizer clears cookies / opens the link on a different device
   their anonymous UID no longer matches the recorded ownerUid, so they
   can't edit.

   This callable verifies the supplied editKey against the stored
   `editKeyHash` (SHA-256, computed client-side at create time) and
   transfers ownerUid to the caller via the Admin SDK (bypassing rules).

   Idempotent — already-owner callers get { ok: true, alreadyOwner: true }
   without rewriting the doc. */
import { createHash } from 'node:crypto';

interface ClaimEventRequest { eventId: string; editKey: string }
interface ClaimEventResponse { ok: boolean; alreadyOwner?: boolean; claimed?: boolean }

export const claimEvent = onCall<ClaimEventRequest, Promise<ClaimEventResponse>>(
  {
    region: REGION,
  },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const eventId = req.data?.eventId;
    const editKey = req.data?.editKey;
    if (!eventId || !editKey) throw new HttpsError('invalid-argument', 'eventId + editKey required');

    const ref = admin.firestore().doc(`events/${eventId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'event not found');
    const data = snap.data() as { ownerUid?: string; editKeyHash?: string };

    if (data.ownerUid === req.auth.uid) {
      return { ok: true, alreadyOwner: true };
    }
    const storedHash = (data.editKeyHash || '').trim().toLowerCase();
    const incomingHash = createHash('sha256').update(editKey).digest('hex');
    if (!storedHash || storedHash !== incomingHash) {
      throw new HttpsError('permission-denied', 'edit key invalid');
    }
    await ref.update({ ownerUid: req.auth.uid });
    logger.info(`[claimEvent] ${eventId} ownerUid → ${req.auth.uid}`);
    return { ok: true, claimed: true };
  }
);

interface ResultSnapshot {
  eventName?: string;
  date?: string;
  format?: 'swiss' | 'knockout';
  totalPlayers?: number;
  totalRounds?: number;
  standings: Array<{
    rank: number; name: string; trainerId?: string;
    record: string; points: number;
    deckSpecies1?: string; deckSpecies2?: string;
  }>;
  deckDistribution?: Array<{ species1: string; species2?: string; count: number; percent: number }>;
}
