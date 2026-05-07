import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import {
  syncEventPost, syncResultPost, writeTournamentRecords, deleteEventPost,
  creditMetaCountersForEvent,
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

export const onTournamentStarted = onDocumentWritten(
  {
    document: 'tournaments/{tournamentId}',
    region: REGION,
    secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID],
  },
  async (event) => {
    const before = event.data?.before?.data() as TournamentDoc | undefined;
    const after = event.data?.after?.data() as TournamentDoc | undefined;
    if (!after) return; // deleted — no alert

    const wasStarted = Boolean(before?.state?.tournamentStarted);
    const isStarted = Boolean(after.state?.tournamentStarted);
    if (wasStarted || !isStarted) return; // only fire on false→true edge

    const id = event.params.tournamentId;
    const s = after.state || {};
    const name = escapeHtml(s.tournamentName || '(no name)');
    const isSpin = s.gameType === 'spin';
    const game = isSpin ? '🌀 Spin Battle' : '🃏 TCG';
    const format = s.tournamentType === 'knockout' ? 'Knockout' : 'Swiss';
    const playerCount = Array.isArray(s.players) ? s.players.length : 0;
    const rounds = Array.isArray(s.rounds) ? s.rounds.length : (s.totalRounds || 0);
    const date = escapeHtml(s.tournamentDate || '-');
    const viewUrl = `${VIEW_URL_BASE}?t=${encodeURIComponent(id)}`;

    // Sub-mode badges (only for the relevant game type)
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

    try {
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN.value(),
        TELEGRAM_ADMIN_CHAT_ID.value(),
        lines.join('\n'),
      );
      logger.info(`Sent start alert for tournament ${id}`);
    } catch (e) {
      logger.error(`Failed to send start alert for ${id}`, e);
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
    await eventRef.update({
      topcutResultPostId: postId,
      phase: 'ended',
    });

    return { ok: true, postId, recordsWritten, metaCredited };
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
