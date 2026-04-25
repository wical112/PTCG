import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

admin.initializeApp();

const TELEGRAM_BOT_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN');
const TELEGRAM_ADMIN_CHAT_ID = defineSecret('TELEGRAM_ADMIN_CHAT_ID');

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
