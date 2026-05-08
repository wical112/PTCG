/* ============================================================
   GameSet HK — TCG Tournament Manager
   © 2026 GameSet HK. All rights reserved.
   Unauthorised redistribution or rehosting is prohibited.
   Official site: https://gameset-hk.com
   ============================================================ */

// ---- HOST GUARD + canonical-domain redirect ----
// Permissive redirect: any host that isn't gameset-hk.com / www / local-dev is treated as
// an "old" or alias domain and immediately redirected to the canonical site. Adding new
// owned domains (e.g. tcgtm.web.app, ptcgstm.web.app, foo.com) needs ZERO code changes —
// just point them at the same Firebase Hosting site (or any DNS that lands here).
// The unauthorised-rehost branch only fires for non-Firebase hosts that somehow end up
// serving this file (e.g. someone copies the bundle to their own domain) — which still
// gets a redirect, not an error page, so old QR codes / shared links always survive.
(() => {
    const CANONICAL = 'gameset-hk.com';
    const ALLOWED = new Set([
        CANONICAL,
        'www.' + CANONICAL,
        'localhost',
        '127.0.0.1'
    ]);
    const host = location.hostname;
    if (host === '' || host === 'null') return;          // file:// or similar — let it run
    if (host.endsWith('.local')) return;                 // mDNS LAN dev — let it run
    if (ALLOWED.has(host)) return;                       // canonical or local — let it run
    // Anything else → redirect to canonical, preserve full URL (path + query + hash)
    location.replace('https://' + CANONICAL + location.pathname + location.search + location.hash);
})();

const app = (() => {
    // ---- I18N ----
    const I18N = {
        en: {
            'header.title': 'GameSet HK',
            'footer.disclaimer': 'Fan-made tool. Not affiliated with, endorsed by, or sponsored by Nintendo, The Pokémon Company, Game Freak, or Creatures Inc. All trademarks belong to their respective owners.',
            'footer.legal': 'Legal Notice',
            'common.back': 'Back',
            'common.home': 'Home',
            'common.reset': 'Reset',
            'common.ok': 'OK',
            'updates.title': 'Updates',
            'updates.allTitle': 'All Updates',
            'updates.more': 'See all',
            'home.welcome': 'Maybe the best GameSet in Hong Kong.',
            'home.subtitle': 'Run tournaments. Spin battles. Pull a winner. Pick your battlefield below.',
            'home.tournament': 'Tournament',
            'home.wheel': 'Lucky Wheel',
            'home.advanced': 'Advanced',
            'home.hostEvent': 'Host PTCG Event',
            'home.hostEventHint': 'Open registration · Promo · Sign-ups',
            'home.inProgress': 'You have a tournament in progress.',
            'home.resume': 'Resume Tournament',
            'reg.title': 'Player Registration',
            'reg.tournamentName': 'Tournament Name',
            'reg.tournamentNamePlaceholder': 'e.g. AAB Shop Gym Battle',
            'reg.tournamentDate': 'Tournament Date',
            'reg.scoringDrawBonus': 'Standard Swiss scoring (Draw 1 pt, Loss 0 pt)',
            'reg.scoringHint': 'Default: Win 3 \u00b7 Loss 1 \u00b7 Draw 0. Tick to use the more common Win 3 \u00b7 Draw 1 \u00b7 Loss 0 instead. Locked once the tournament starts.',
            'reg.tournamentNameHint': 'Shown at the top of the standings page and on the downloaded PNG. Preview \u2192 <em>AAB Shop Gym Battle \u2014 Final Standings</em>',
            'reg.tournamentDateHint': 'Printed next to the name. Preview \u2192 <em>AAB Shop Gym Battle 2026Apr25</em>',
            'reg.bulkHint': 'Each line = one player. Append <code>| HK-XXXXX</code> to link TopCut HK trainer stats. Duplicate names get a numeric suffix automatically.',
            'reg.roundCountHint': 'Swiss standard: \u2308log\u2082(players)\u2309. Fewer rounds \u2192 more ties on points; more rounds \u2192 clearer top cut. Locked once the tournament starts.',
            'viewer.pinHint': 'Type your registered name. Your current match will be pinned to the top so you can track it quickly. Tap any name to see trainer stats.',
            'wheel.namesHint': 'Each line = one wheel slot. Use <strong>Sync from Tournament</strong> to auto-fill with registered players, or <strong>Exclude Top 3</strong> for podium prizes.',
            'adv.resume.hint': '6-character code from the publisher\u2019s Share panel. Pulls the live roster, rounds and results into this browser \u2014 the original publisher keeps editing theirs untouched.',
            'adv.rosterHint': 'Enter the FULL roster in exactly the original join order. Order matters \u2014 used for reproducible tiebreaker fallback.',
            'reg.bulkLabel': 'Add players (one name per line):',
            'reg.bulkPlaceholder': 'Enter one player name per line…\nPlayer 1\nPlayer 2\nPlayer 3',
            'reg.addBtn': 'Add Players',
            'reg.registered': 'Registered Players',
            'reg.start': 'Start Tournament',
            'reg.inProgress': 'Tournament In Progress',
            'reg.players': '{n} player',
            'reg.players_plural': '{n} players',
            'reg.recommended': 'Recommended rounds: {n}',
            'reg.recommendedHint': '(recommended: {n})',
            'reg.roundCountLabel': 'Rounds:',
            'reg.useRecommended': 'Use recommended',
            'reg.needTwo': 'Need at least 2 players',
            'reg.added': 'Added {n} player',
            'reg.added_plural': 'Added {n} players',
            'reg.editPrompt': 'Edit player name:',
            'reg.dupName': 'A player with that name already exists.',
            'reg.confirmStart': 'Start tournament with {n} players?',
            'round.title': 'Round {n}',
            'round.titleOf': 'Round {n} of {m}',
            'round.bye': 'BYE',
            'round.byeWin': ' - Automatic Win (3 pts)',
            'round.aWins': 'Wins',
            'round.bWins': 'Wins',
            'round.draw': 'Draw',
            'round.submitNext': 'Submit Results & Next Round',
            'round.submitted': 'Results Submitted',
            'round.submitEnd': 'Submit Results & End Tournament',
            'round.confirmSubmitEnd': 'Submit final-round results and end the tournament? This cannot be undone.',
            'round.prev': 'Previous Round',
            'round.end': 'End Tournament',
            'round.confirmSubmit': 'Submit results and proceed to next round? This cannot be undone.',
            'round.confirmSubmitBeforeEnd': 'Submit current round results before ending?',
            'round.confirmDiscardEnd': 'Current round has incomplete results. Discard this round and end tournament?',
            'round.confirmGoBack': 'Go back to previous round to edit results?',
            'round.reshuffle': 'Re-shuffle Pairings',
            'round.confirmReshuffle': 'Re-shuffle the round 1 pairings? Any results selected for this round will be cleared.',
            'round.editResubmit': 'Edit results and re-submit',
            'timer.start': 'Start',
            'timer.pause': 'Pause',
            'timer.mute': 'Mute',
            'timer.unmute': 'Unmute',
            'timer.projector': 'Projector Mode',
            'timer.exitProjector': 'Exit Projector',
            'timer.up': 'Time is up!',
            'timer.compact': 'Compact',
            'timer.expand': 'Expand',
            'standings.final': 'Final Standings (After {n} Round)',
            'standings.final_plural': 'Final Standings (After {n} Rounds)',
            'standings.afterRound': 'Standings After Round {n}',
            'standings.download': 'Download as Image',
            'standings.toWheel': '🎡 Lucky Wheel',
            'standings.wheelTitle': 'Lucky Wheel',
            'standings.wheelSub': 'Hand out bonus prizes — players auto-loaded',
            'standings.confirmTitle': '📣 Confirm result + send to TopCut HK',
            'standings.confirmSub': 'Locks the post on TopCut feed. Safe to re-send after rename.',
            'standings.confirmDone': '✅ Sent to TopCut HK',
            'standings.confirmResend': '↻ Re-send updated result',
            'standings.tapToRename': 'Tap to rename',
            'standings.editHint': '💡 Tap any player name to rename — the latest name is what gets sent to TopCut.',
            'standings.rank': 'Rank',
            'standings.player': 'Player',
            'standings.record': 'Record',
            'standings.points': 'Points',
            'standings.owp': 'OWP%',
            'standings.oomw': 'OOMW%',
            'standings.woscore': 'WOScore',
            'standings.byes': 'Byes',
            'standings.backRound': 'Back to Round',
            'standings.htmlMissing': 'html2canvas not loaded yet. Please try again.',
            'standings.snapFail': 'Failed to capture standings. Try again.',
            'trainer.points': 'Points',
            'trainer.owp': 'OWP',
            'trainer.oomw': 'OOMW',
            'trainer.woscore': 'WOScore',
            'trainer.byes': 'Byes',
            'trainer.record': 'Record',
            'trainer.games': 'Games',
            'trainer.history': 'Match History',
            'trainer.none': 'No matches played yet.',
            'trainer.win': 'Win',
            'trainer.loss': 'Loss',
            'trainer.draw': 'Draw',
            'trainer.byeWin': 'BYE (Win)',
            'trainer.vs': 'vs',
            'trainer.round': 'Round {n}:',
            'trainer.drop': 'Drop Player',
            'trainer.undoDrop': 'Undo Drop',
            'trainer.confirmDrop': 'Drop {name} from the tournament? They will be removed from future pairings. Past results are kept.',
            'trainer.droppedTag': 'DROPPED',
            'home.swiss': 'Swiss Tournament',
            'home.spinSwiss': 'Spin Battle Swiss',
            'home.spinKO': 'Spin Battle Knockout',
            'reg.spinBattleMode': 'Spin Battle Tournament — Beyblade-X-style scoring (TESTING)',
            'reg.targetPoints': 'Target Points (first to win):',
            'reg.targetPointsHint': 'Default 4 (Swiss). Top-cut events usually use 7.',
            'reg.spinBattleNote': 'Tap a player to score. Cross popup gives you Survivor / Burst / Knock Out / Xtreme. Auto-locks at the target. Penalty rules, malfunctions and 3-on-3 Beys registration are <em>all live</em> — register Beys via the per-player button below or scan a QR.',
            'battle.survivor': 'Survivor +1',
            'battle.burst': 'Burst +2',
            'battle.knockout': 'Knock Out +2',
            'battle.xtreme': 'Xtreme +3',
            'battle.stadium_out': 'Stadium Out +3',
            'battle.stadiumOut': 'Stadium Out +3',
            'reg.stadiumOut': 'Allow Stadium Out (+3, community variant)',
            'reg.stadiumOutHint': 'Not in official Hasbro / Takara Tomy rules. Enable only if your venue counts knocking the Bey over the top of the stadium as a +3 finish.',
            'battle.firstTo': 'First to {n} pts',
            'battle.matchComplete': 'Match complete',
            'battle.undo': 'Undo',
            'battle.tapToScore': 'Tap a battler to score · tap ⓘ for info',
            'battle.lockedHint': 'Match auto-locked. Tap ↶ Undo below to fix the last finish.',
            'battle.whichBey': 'Which Bey scored?',
            'penalty.title': 'Penalties / Malfunctions',
            'penalty.launchError': 'Launch error',
            'penalty.launchErrorHint': '2 launch errors in same battle → +1 to opponent, battle replays',
            'penalty.matchWarn': 'Warning',
            'penalty.matchWarnHint': '1st: warning · 2nd: +1 to opponent · 3rd: DQ (opponent wins match)',
            'penalty.malfunction': 'Malfunction',
            'penalty.malfunctionHint': '3 malfunctions in same match → opponent wins',
            'reg.bestOfThree': 'Best of 3 — track per-game wins (TCG)',
            'reg.bestOfThreeHint': 'Off (default): one tap per match. On: each match shows Game 1 / 2 / 3 buttons; match auto-locks when one side wins 2 games. Adds GW-GL column to standings.',
            'bo3.game': 'Game {n}',
            'bo3.firstTo2': 'First to 2 games',
            'bo3.matchScore': 'Match {a} – {b}',
            'standings.gw': 'GW-GL',
            'bracket.title': 'Bracket overview',
            'bracket.tbd': 'TBD',
            'trainer.viewCard': 'View battler info',
            'trainer.finishBreakdown': 'Finish breakdown',
            'trainer.deck': 'Registered Beys',
            'deck.title': '{name}\'s Beys',
            'deck.short': 'Beys',
            'deck.edit': 'Edit Beys',
            'deck.blade': 'Blade',
            'deck.ratchet': 'Ratchet',
            'deck.bit': 'Bit',
            'deck.bladePh': 'e.g. Phoenix Wing',
            'deck.ratchetPh': 'e.g. 9-60',
            'deck.bitPh': 'e.g. Point',
            'deck.rulesHint': 'Each battler brings 3 different Beys. No Blade, Ratchet or Bit may repeat between your Beys.',
            'deck.valid': 'Valid — all 9 parts unique',
            'deck.incomplete': 'Fill in all 3 parts of all 3 Beys',
            'deck.duplicate': 'Duplicate {part}: "{value}"',
            'deck.save': 'Save Beys',
            'deck.missing': 'Beys not registered',
            'common.cancel': 'Cancel',
            'qr.show': 'Show QR',
            'qr.scan': 'Scan QR',
            'qr.scanUnsupported': 'Camera scan not supported on this browser — use Paste code instead.',
            'qr.scanInstr': 'Hold the QR code in front of your camera.',
            'qr.scanFail': 'No Beys QR detected. Try better lighting.',
            'qr.invalidCode': 'Code is not a valid Beys QR.',
            'qr.pasteCode': 'Or paste a code:',
            'qr.imported': 'Beys imported! Save to confirm.',
            'qr.codeLabel': 'Beys code (copy this or scan the QR):',
            'qr.import': 'Import code',
            'reg.threeOnThree': '3-on-3 Beys mode (each battler brings 3 Beys)',
            'reg.threeOnThreeHint': 'After tapping a finish, choose which Bey scored. Untick for 1-on-1 matches.',
            'standings.battlePts': 'BattlePts',
            'trainer.battlePts': 'Battle Pts',
            'home.knockout': 'Knockout Tournament',
            'ko.final': 'FINAL',
            'ko.semi': 'SEMIFINAL',
            'ko.quarter': 'QUARTERFINAL',
            'ko.roundN': 'Round of {n}',
            'ko.title': 'Knockout — {label}',
            'ko.bye': 'BYE',
            'ko.byeAdvance': 'Auto-advance',
            'ko.tbd': 'TBD',
            'ko.next': 'Submit Results & Next Round',
            'ko.champion': 'Champion',
            'ko.champConfirm': '{name} is the champion! End tournament?',
            'reg.startKO': 'Start Knockout',
            'wheel.title': 'Lucky Wheel',
            'wheel.namesLabel': 'Names (one per line):',
            'wheel.placeholder': 'Enter names...',
            'wheel.setNames': 'Set Names',
            'wheel.sync': 'Sync from Tournament',
            'wheel.pickTitle': 'Select Participants for the Wheel',
            'wheel.pickHint': 'Uncheck the players you want to exclude (e.g. champion, 2nd, 3rd).',
            'wheel.pickAll': 'Select All',
            'wheel.pickNone': 'Clear All',
            'wheel.pickExcludeTop3': 'Exclude Top 3',
            'wheel.pickApply': 'Add to Wheel',
            'wheel.pickCancel': 'Cancel',
            'wheel.pickRank': '#{n}',
            'wheel.pickAdded': 'Added {n} to the wheel',
            'wheel.remove': 'Remove Winner After Spin',
            'wheel.spin': 'SPIN!',
            'wheel.winners': 'Winners',
            'wheel.resetBtn': 'Reset Wheel',
            'wheel.empty': 'Add names to spin!',
            'wheel.winner': 'Winner!',
            'wheel.noPlayers': 'No tournament players registered.',
            'event.publishing': '📣 Sending result to TopCut HK…',
            'event.published': '✅ Result posted to TopCut HK',
            'event.publishFail': '⚠️ Result not sent — tap "Confirm result" to retry',
            'pwa.install': 'Install as App',
            'pwa.iosTitle': 'Install GameSet HK on iPhone',
            'pwa.iosBody': 'Tap the share icon in Safari, then "Add to Home Screen". The app opens fullscreen with no browser bar.',
            'pwa.installed': '✅ Installed — find it on your home screen',
            'wheel.confirmReset': 'Clear all winners and reset the wheel?',
            'reset.confirm': 'Are you sure you want to reset everything? This cannot be undone.',
            'adv.title': 'Advanced — Recover Tournament',
            'adv.tag': 'Rebuild from past results',
            'adv.intro': 'Lost your tournament data? Enter the roster and every completed round\'s results here, then generate the next round\'s pairings to continue playing.',
            'adv.step1': 'Player Roster',
            'adv.rosterLabel': 'Enter all players (one name per line):',
            'adv.rosterPlaceholder': 'Player 1\nPlayer 2\nPlayer 3',
            'adv.saveRoster': 'Save Roster',
            'adv.rosterCount': '{n} player in roster',
            'adv.rosterCount_plural': '{n} players in roster',
            'adv.step2': 'Past Rounds',
            'adv.addRound': '+ Add Round',
            'adv.roundsInfo': '{n} round entered',
            'adv.roundsInfo_plural': '{n} rounds entered',
            'adv.step3': 'Preview Reconstructed Standings',
            'adv.refreshPreview': 'Refresh Preview',
            'adv.previewHint': 'Click "Refresh Preview" after entering roster and round results.',
            'adv.previewRosterFirst': 'Save a roster first.',
            'adv.step4': 'Generate Next Round & Continue',
            'adv.commit': 'Reconstruct & Continue Tournament',
            'adv.discard': 'Discard Recovery',
            'adv.backHome': 'Back to Home',
            'adv.bye': 'BYE',
            'adv.autoWin': 'Auto Win',
            'adv.addPairing': '+ Add Pairing',
            'adv.addBye': '+ Add Bye',
            'adv.removeRound': 'Remove Round',
            'adv.removeRoundConfirm': 'Remove Round {n} and all its pairings?',
            'adv.select': '-- select --',
            'adv.noRounds': 'No rounds added yet. Click "+ Add Round" to begin entering past round results.',
            'adv.noPairings': 'No pairings yet.',
            'adv.roundLabel': 'Round {n}',
            'adv.rosterSet': 'Roster set: {n} player',
            'adv.rosterSet_plural': 'Roster set: {n} players',
            'adv.commitFail': 'Cannot commit — please fix the errors listed in Step 4.',
            'adv.commitConfirm': 'Reconstruct tournament from entered results and generate next round pairings?',
            'adv.replaceConfirm': 'This will REPLACE your current tournament state. Continue?',
            'adv.reconstructed': 'Reconstructed — Round {n} pairings ready!',
            'adv.discardConfirm': 'Discard all recovery data entered so far?',
            'adv.errors': 'Errors (must fix):',
            'adv.warnings': 'Warnings (allowed):',
            'adv.ok': 'No issues detected. Ready to commit.',
            'adv.needRoster': 'Save a roster of at least 2 players first.',
            'adv.resume.title': 'Resume Tournament from Cloud ID',
            'adv.resume.tag': 'Pull live state by ID',
            'adv.resume.intro': 'Have a published Tournament ID? Enter it below to pull the full tournament state from the cloud and continue editing on this device.',
            'adv.resume.placeholder': 'ABC123',
            'adv.resume.btn': 'Resume',
            'adv.resume.fetching': 'Fetching…',
            'adv.resume.invalidId': 'Tournament ID must be 6 characters (letters and digits).',
            'adv.resume.notConfigured': 'Cloud sharing is not set up on this build.',
            'adv.resume.initFailed': 'Could not reach the cloud. Check your internet connection.',
            'adv.resume.notFound': 'No tournament found with that ID. Double-check the code and try again.',
            'adv.resume.fetchFailed': 'Could not load that tournament. Please try again.',
            'adv.resume.replaceConfirm': 'This will REPLACE your current tournament state with the cloud copy. Continue?',
            'adv.resume.success': 'Tournament loaded — resuming where it left off.',
            'adv.resume.note': 'Note: you are now the local owner. To keep sharing live, click Publish again on the round view.',
            'val.minRoster': 'Roster needs at least 2 players.',
            'val.duplicate': 'Duplicate player name: "{name}"',
            'val.byeNotSelected': '{tag}: bye player not selected.',
            'val.dupInRound': '{tag}: player appears more than once in this round.',
            'val.bothNeeded': '{tag}: both players must be selected.',
            'val.sameAB': '{tag}: player A and B must be different.',
            'val.dupInRound2': '{tag}: a player appears more than once in this round.',
            'val.resultNotSet': '{tag}: result not set.',
            'val.rematch': '{tag}: rematch of {a} vs {b}.',
            'val.oddBye': '{label}: odd roster ({n}) needs exactly 1 bye, found {found}.',
            'val.evenBye': '{label}: even roster should have no byes, found {found}.',
            'val.notAccounted': '{label}: only {used} of {total} players accounted for.',
            'val.tooManyByes': '{name} was given a bye {n} times.',
            'val.noPairings': '{label}: no pairings entered.',
            'bc.home': 'Home',
            'bc.reg': 'Registration',
            'bc.standings': 'Standings',
            'bc.wheel': 'Lucky Wheel',
            'bc.advRecovery': 'Advanced Recovery',
            'cloud.publish': 'Publish',
            'cloud.published': 'Published',
            'cloud.unpublish': 'Stop Sharing',
            'cloud.live': 'LIVE',
            'cloud.viewMode': 'View Mode',
            'cloud.viewBanner': 'You are viewing this tournament live. Updates appear automatically.',
            'cloud.shareTitle': 'Share Tournament',
            'cloud.shareHint': 'Players can scan this QR code or open the link to follow the tournament live — pairings, results, standings, and Beys all sync in real time.',
            'cloud.copyLink': 'Copy Link',
            'cloud.copied': 'Link copied!',
            'cloud.tournamentId': 'Tournament ID',
            'cloud.unpublishConfirm': 'Stop sharing this tournament? Viewers will lose access.',
            'cloud.publishFail': 'Could not publish — check your Firebase setup or internet connection.',
            'cloud.notConfigured': 'Cloud sharing is not set up. See CLOUD_SETUP.md.',
            'cloud.viewNotFound': 'This tournament is no longer available.',
            'cloud.viewLoading': 'Connecting…',
            'cloud.close': 'Close',
            'cloud.publishing': 'Publishing…',
            'viewer.placeholder': 'Enter your name to pin your match',
            'viewer.yourMatch': 'Your match',
            'viewer.notFound': 'No player matches that name.',
            'viewer.noPairing': 'You have no pairing in this round.',
            'viewer.bye': 'You have a BYE this round.',
            'viewer.share': 'Share',
            'viewer.shareTitle': 'Share this view',
            'viewer.shareHint': 'Scan the QR code or copy the link to share with other players.',
            'viewer.linkCopied': 'Link copied!',
            'viewer.tabRound': 'Live Round',
            'viewer.tabStandings': 'Standings',
            'viewer.tabWheel': 'Wheel'
        },
        zh: {
            'header.title': 'GameSet HK',
            'footer.disclaimer': '本工具為粉絲製作，與任天堂（Nintendo）、寶可夢公司（The Pokémon Company）、Game Freak 及 Creatures Inc. 均無關聯，亦未獲其背書或贊助。所有商標均屬其各自所有者所有。',
            'footer.legal': '法律聲明',
            'common.back': '返回',
            'common.home': '首頁',
            'common.reset': '重設',
            'common.ok': '確定',
            'updates.title': '更新公告',
            'updates.allTitle': '全部更新',
            'updates.more': '查看全部',
            'home.welcome': '可能係香港最好用既GameSet',
            'home.subtitle': '打卡、陀螺、抽獎 — 伴你所想',
            'home.tournament': '賽事',
            'home.wheel': '幸運轉盤',
            'home.advanced': '進階',
            'home.hostEvent': '舉辦 PTCG 活動',
            'home.hostEventHint': '開放報名 · 推廣 · 簽到',
            'home.inProgress': '你有一場進行中的賽事。',
            'home.resume': '繼續賽事',
            'reg.title': '玩家登記',
            'reg.tournamentName': '賽事名稱',
            'reg.tournamentNamePlaceholder': '例:AAB 店舖道館戰',
            'reg.tournamentDate': '賽事日期',
            'reg.scoringDrawBonus': '使用標準瑞士制計分（和 1 分、負 0 分）',
            'reg.scoringHint': '預設為 勝 3 \u00b7 負 1 \u00b7 和 0；勾選後改為更常見的 勝 3 \u00b7 和 1 \u00b7 負 0。賽事開始後將鎖定不可更改。',
            'reg.tournamentNameHint': '會顯示在排名頁面頂部與下載的 PNG 圖片上。預覽 → <em>AAB Shop Gym Battle — 最終排名</em>',
            'reg.tournamentDateHint': '與名稱並列顯示。預覽 → <em>AAB Shop Gym Battle 2026Apr25</em>',
            'reg.bulkHint': '每行一位玩家。可加 <code>| HK-XXXXX</code> 連結 TopCut HK 訓練家戰績。重複名字會自動加編號。',
            'reg.roundCountHint': '瑞士制建議：⌈log₂(人數)⌉。輪數少 → 同分較多；輪數多 → 前排更清晰。賽事開始後鎖定。',
            'viewer.pinHint': '輸入你已登記的名字，你當前對局會置頂方便追蹤。點擊任何玩家名字可查看訓練家卡片。',
            'wheel.namesHint': '每行一個獎名。可用「<strong>從賽事同步</strong>」自動帶入參賽者，或用「<strong>排除前三名</strong>」做頒獎抽獎。',
            'adv.resume.hint': '發佈者分享面板上的 6 碼代號。會把雲端最新的名單、輪次與結果拉到本瀏覽器 — 原發佈者的賽事不受影響。',
            'adv.rosterHint': '請依原報名順序輸入完整名單。順序影響決勝小分的預設回退 — 請保持一致。',
            'reg.bulkLabel': '新增玩家(每行一個名字):',
            'reg.bulkPlaceholder': '每行輸入一位玩家名稱⋯\n玩家 1\n玩家 2\n玩家 3',
            'reg.addBtn': '新增玩家',
            'reg.registered': '已登記玩家',
            'reg.start': '開始賽事',
            'reg.inProgress': '賽事進行中',
            'reg.players': '{n} 位玩家',
            'reg.players_plural': '{n} 位玩家',
            'reg.recommended': '建議輪數:{n}',
            'reg.recommendedHint': '(建議:{n})',
            'reg.roundCountLabel': '輪數:',
            'reg.useRecommended': '採用建議',
            'reg.needTwo': '至少需要 2 位玩家',
            'reg.added': '已新增 {n} 位玩家',
            'reg.added_plural': '已新增 {n} 位玩家',
            'reg.editPrompt': '編輯玩家名稱:',
            'reg.dupName': '已有同名玩家。',
            'reg.confirmStart': '以 {n} 位玩家開始賽事?',
            'round.title': '第 {n} 輪',
            'round.titleOf': '第 {n} / {m} 輪',
            'round.bye': '輪空',
            'round.byeWin': ' - 自動勝利(3 分)',
            'round.aWins': '勝',
            'round.bWins': '勝',
            'round.draw': '平手',
            'round.submitNext': '提交結果並進入下一輪',
            'round.submitted': '結果已提交',
            'round.submitEnd': '提交結果並結束賽事',
            'round.confirmSubmitEnd': '提交最後一輪結果並結束賽事?此操作無法復原。',
            'round.prev': '上一輪',
            'round.end': '結束賽事',
            'round.confirmSubmit': '提交結果並進入下一輪?此操作無法復原。',
            'round.confirmSubmitBeforeEnd': '結束前是否提交本輪結果?',
            'round.confirmDiscardEnd': '本輪結果尚未完成。捨棄本輪並結束賽事?',
            'round.confirmGoBack': '返回上一輪以修改結果?',
            'round.reshuffle': '重新配對',
            'round.confirmReshuffle': '重新產生第 1 輪配對嗎?此輪已選擇的結果將會清除。',
            'round.editResubmit': '修改結果後重新提交',
            'timer.start': '開始',
            'timer.pause': '暫停',
            'timer.mute': '靜音',
            'timer.unmute': '取消靜音',
            'timer.projector': '投影模式',
            'timer.exitProjector': '退出投影',
            'timer.up': '時間到!',
            'timer.compact': '精簡',
            'timer.expand': '放大',
            'standings.final': '最終排名(共 {n} 輪)',
            'standings.final_plural': '最終排名(共 {n} 輪)',
            'standings.afterRound': '第 {n} 輪後排名',
            'standings.download': '下載為圖片',
            'standings.toWheel': '🎡 抽獎',
            'standings.wheelTitle': '完賽抽獎環節',
            'standings.wheelSub': '頒完獎之後加碼派禮物，自動帶入今日玩家',
            'standings.confirmTitle': '📣 確定賽果並發送到 TopCut HK',
            'standings.confirmSub': '結果會以 @gameset_hk 出 post。改名後可隨時重新發送。',
            'standings.confirmDone': '✅ 已發送到 TopCut HK',
            'standings.confirmResend': '↻ 重新發送（已更新嘅排名）',
            'standings.tapToRename': '撳一下改名',
            'standings.editHint': '💡 撳玩家名可以即時改 — 改完發送結果嘅時候會用最新名落 TopCut。',
            'standings.rank': '名次',
            'standings.player': '玩家',
            'standings.record': '戰績',
            'standings.points': '積分',
            'standings.owp': '對手勝率%',
            'standings.oomw': '對手的對手勝率%',
            'standings.woscore': '對手總積分',
            'standings.byes': '輪空',
            'standings.backRound': '返回對戰',
            'standings.htmlMissing': 'html2canvas 尚未載入,請稍後再試。',
            'standings.snapFail': '截圖失敗,請再試一次。',
            'trainer.points': '積分',
            'trainer.owp': '對手勝率',
            'trainer.oomw': '對手的對手勝率',
            'trainer.woscore': '對手總積分',
            'trainer.byes': '輪空',
            'trainer.record': '戰績',
            'trainer.games': '場數',
            'trainer.history': '對戰紀錄',
            'trainer.none': '尚未開始對戰。',
            'trainer.win': '勝',
            'trainer.loss': '負',
            'trainer.draw': '平',
            'trainer.byeWin': '輪空(勝)',
            'trainer.vs': '對',
            'trainer.round': '第 {n} 輪:',
            'trainer.drop': '退賽',
            'trainer.undoDrop': '取消退賽',
            'trainer.confirmDrop': '確定讓 {name} 退賽？該玩家將不再參與後續配對，過往成績保留。',
            'trainer.droppedTag': '已退賽',
            'home.swiss': '瑞士制賽事',
            'home.spinSwiss': '陀螺對戰瑞士制',
            'home.spinKO': '陀螺對戰淘汰賽',
            'reg.spinBattleMode': '陀螺對戰賽事 — Beyblade X 系統（測試版）',
            'reg.targetPoints': '勝利目標分數（先取到即勝）：',
            'reg.targetPointsHint': '預設 4 分（瑞士制）。最終 8 強建議改為 7 分。',
            'reg.spinBattleNote': '點擊玩家加分，十字面板提供存活／爆裂／擊出／中央，達到目標分數自動鎖定。罰則、器材故障、3-on-3 陀螺登記<em>已全部上線</em> — 點下方陀螺按鈕登記，亦可掃 QR 一鍵匯入。',
            'battle.survivor': '存活 +1',
            'battle.burst': '爆裂 +2',
            'battle.knockout': '擊出 +2',
            'battle.xtreme': '中央 +3',
            'battle.stadium_out': '台外 +3',
            'battle.stadiumOut': '台外 +3',
            'reg.stadiumOut': '允許台外 (+3，社群規則)',
            'reg.stadiumOutHint': '非 Hasbro / Takara Tomy 官方規則。如場館將陀螺擊出台頂視為 +3 才開啟。',
            'battle.firstTo': '先取 {n} 分',
            'battle.matchComplete': '對局結束',
            'battle.undo': '返回',
            'battle.tapToScore': '點擊勝方加分 · 點擊 ⓘ 查看玩家資料',
            'battle.lockedHint': '對局已自動鎖定，按下方 ↶ 撤銷可修改上一個結果。',
            'battle.whichBey': '邊隻陀螺贏？',
            'penalty.title': '判罰／故障',
            'penalty.launchError': '發射失誤',
            'penalty.launchErrorHint': '同一回合 2 次發射失誤 → 對手 +1 分，本回合重打',
            'penalty.matchWarn': '警告',
            'penalty.matchWarnHint': '第 1 次：警告 · 第 2 次：對手 +1 · 第 3 次：判負（對手贏對局）',
            'penalty.malfunction': '器材故障',
            'penalty.malfunctionHint': '同一對局 3 次故障 → 對手贏對局',
            'reg.bestOfThree': '三局二勝 — 逐局記錄勝負（TCG）',
            'reg.bestOfThreeHint': '關閉（預設）：每場一點即決。開啟：每場顯示第 1 / 2 / 3 局按鈕，先贏 2 局即取得整場。排名加上 GW-GL 欄。',
            'bo3.game': '第 {n} 局',
            'bo3.firstTo2': '先取 2 局獲勝',
            'bo3.matchScore': '比分 {a} – {b}',
            'standings.gw': 'GW-GL',
            'bracket.title': '括號賽程一覽',
            'bracket.tbd': '待定',
            'trainer.viewCard': '查看玩家資料',
            'trainer.finishBreakdown': '勝法分佈',
            'trainer.deck': '登記陀螺',
            'deck.title': '{name} 的陀螺',
            'deck.short': '陀螺',
            'deck.edit': '編輯陀螺',
            'deck.blade': 'Blade（旋輪）',
            'deck.ratchet': 'Ratchet（齒輪）',
            'deck.bit': 'Bit（軸尖）',
            'deck.bladePh': '例：Phoenix Wing',
            'deck.ratchetPh': '例：9-60',
            'deck.bitPh': '例：Point',
            'deck.rulesHint': '每位選手帶 3 顆陀螺。3 顆陀螺之間，Blade、Ratchet、Bit 三類零件均不可重複。',
            'deck.valid': '通過 — 9 件零件全部唯一',
            'deck.incomplete': '請填寫 3 顆陀螺的全部零件',
            'deck.duplicate': '{part} 重複：「{value}」',
            'deck.save': '儲存陀螺',
            'deck.missing': '尚未登記陀螺',
            'common.cancel': '取消',
            'qr.show': '顯示 QR',
            'qr.scan': '掃描 QR',
            'qr.scanUnsupported': '此瀏覽器不支援相機掃描 — 改用「貼上代碼」。',
            'qr.scanInstr': '把 QR 碼對準相機。',
            'qr.scanFail': '未偵測到陀螺 QR。請改善光線後再試。',
            'qr.invalidCode': '代碼不是有效的陀螺 QR。',
            'qr.pasteCode': '或貼上代碼：',
            'qr.imported': '已匯入陀螺！按儲存確認。',
            'qr.codeLabel': '陀螺代碼（複製或掃描 QR）：',
            'qr.import': '匯入代碼',
            'reg.threeOnThree': '3 陀螺對戰 3 陀螺（每位選手帶 3 顆陀螺）',
            'reg.threeOnThreeHint': '點選勝法後，再選擇邊隻陀螺（1 / 2 / 3）取勝。取消勾選即為 1 陀螺對戰 1 陀螺。',
            'standings.battlePts': '對戰得分',
            'trainer.battlePts': '對戰得分',
            'home.knockout': '淘汰制賽事',
            'ko.final': '決賽',
            'ko.semi': '準決賽',
            'ko.quarter': '半準決賽',
            'ko.roundN': '{n} 強',
            'ko.title': '淘汰賽 — {label}',
            'ko.bye': '輪空',
            'ko.byeAdvance': '自動晉級',
            'ko.tbd': '待定',
            'ko.next': '提交結果並進入下一輪',
            'ko.champion': '冠軍',
            'ko.champConfirm': '{name} 為冠軍！結束賽事？',
            'reg.startKO': '開始淘汰賽',
            'wheel.title': '幸運轉盤',
            'wheel.namesLabel': '名單(每行一個):',
            'wheel.placeholder': '請輸入名字...',
            'wheel.setNames': '設定名單',
            'wheel.sync': '從賽事同步',
            'wheel.pickTitle': '選擇參與抽獎的玩家',
            'wheel.pickHint': '取消勾選想要排除的玩家(例如冠、亞、季軍)。',
            'wheel.pickAll': '全選',
            'wheel.pickNone': '全部取消',
            'wheel.pickExcludeTop3': '排除前三名',
            'wheel.pickApply': '加入轉盤',
            'wheel.pickCancel': '取消',
            'wheel.pickRank': '第 {n} 名',
            'wheel.pickAdded': '已加入 {n} 位玩家到轉盤',
            'wheel.remove': '抽中後移除',
            'wheel.spin': '開始抽!',
            'wheel.winners': '得獎者',
            'wheel.resetBtn': '重設轉盤',
            'wheel.empty': '請新增名單以開始抽獎!',
            'wheel.winner': '得獎者!',
            'wheel.noPlayers': '尚未登記任何賽事玩家。',
            'event.publishing': '📣 將比賽結果發送到 TopCut HK…',
            'event.published': '✅ 結果已 post 上 TopCut HK',
            'event.publishFail': '⚠️ 發送失敗 — 撳一下「確定賽果」再試',
            'pwa.install': '📱 安裝為 App',
            'pwa.iosTitle': '安裝 GameSet HK 到 iPhone',
            'pwa.iosBody': '喺 Safari 撳分享掣（中間方框向上箭咀），再揀「加至主畫面」。打開後全屏顯示，似 native app 一樣。',
            'pwa.installed': '✅ 已安裝 — 主畫面有個 GameSet HK icon',
            'wheel.confirmReset': '清除所有得獎者並重設轉盤?',
            'reset.confirm': '確定要重設所有資料?此操作無法復原。',
            'adv.title': '進階 — 還原賽事',
            'adv.tag': '由過往結果重建',
            'adv.intro': '遺失了賽事資料?在此輸入名單與每一輪已完成的結果,然後重新產生下一輪對戰繼續比賽。',
            'adv.step1': '玩家名單',
            'adv.rosterLabel': '輸入所有玩家(每行一個名字):',
            'adv.rosterPlaceholder': '玩家 1\n玩家 2\n玩家 3',
            'adv.saveRoster': '儲存名單',
            'adv.rosterCount': '名單中有 {n} 位玩家',
            'adv.rosterCount_plural': '名單中有 {n} 位玩家',
            'adv.step2': '過往輪次',
            'adv.addRound': '+ 新增輪次',
            'adv.roundsInfo': '已輸入 {n} 輪',
            'adv.roundsInfo_plural': '已輸入 {n} 輪',
            'adv.step3': '預覽重建排名',
            'adv.refreshPreview': '更新預覽',
            'adv.previewHint': '輸入名單與輪次結果後,點擊「更新預覽」。',
            'adv.previewRosterFirst': '請先儲存名單。',
            'adv.step4': '產生下一輪並繼續',
            'adv.commit': '重建並繼續賽事',
            'adv.discard': '捨棄還原',
            'adv.backHome': '返回首頁',
            'adv.bye': '輪空',
            'adv.autoWin': '自動勝',
            'adv.addPairing': '+ 新增對戰',
            'adv.addBye': '+ 新增輪空',
            'adv.removeRound': '移除本輪',
            'adv.removeRoundConfirm': '移除第 {n} 輪及其所有對戰?',
            'adv.select': '-- 請選擇 --',
            'adv.noRounds': '尚未新增輪次。請點擊「+ 新增輪次」開始輸入過往結果。',
            'adv.noPairings': '尚未有對戰。',
            'adv.roundLabel': '第 {n} 輪',
            'adv.rosterSet': '名單已設定:{n} 位玩家',
            'adv.rosterSet_plural': '名單已設定:{n} 位玩家',
            'adv.commitFail': '無法重建 — 請先修正第 4 步顯示的錯誤。',
            'adv.commitConfirm': '由輸入的結果重建賽事並產生下一輪對戰?',
            'adv.replaceConfirm': '此操作將取代目前的賽事狀態,是否繼續?',
            'adv.reconstructed': '已重建 — 第 {n} 輪對戰已就緒!',
            'adv.discardConfirm': '捨棄目前所有已輸入的還原資料?',
            'adv.errors': '錯誤(必須修正):',
            'adv.warnings': '警告(可允許):',
            'adv.ok': '未發現問題,可以重建。',
            'adv.needRoster': '請先儲存至少 2 位玩家的名單。',
            'adv.resume.title': '以雲端編號續辦賽事',
            'adv.resume.tag': '以編號載入直播狀態',
            'adv.resume.intro': '已有一個已發佈的賽事編號?在此輸入即可把完整賽事狀態從雲端取回,並於本裝置繼續編輯。',
            'adv.resume.placeholder': 'ABC123',
            'adv.resume.btn': '續辦',
            'adv.resume.fetching': '載入中⋯',
            'adv.resume.invalidId': '賽事編號必須為 6 個字元(英文字母與數字)。',
            'adv.resume.notConfigured': '此版本尚未設定雲端分享功能。',
            'adv.resume.initFailed': '無法連線到雲端,請檢查網路連線。',
            'adv.resume.notFound': '找不到此編號的賽事,請再次確認編號。',
            'adv.resume.fetchFailed': '載入賽事失敗,請稍後再試。',
            'adv.resume.replaceConfirm': '此操作將以雲端副本取代目前的賽事狀態,是否繼續?',
            'adv.resume.success': '已載入賽事 — 從中斷之處繼續。',
            'adv.resume.note': '注意:本裝置現為本地擁有者。若仍要即時分享,請於對戰畫面再次點選「發佈」。',
            'val.minRoster': '名單至少需要 2 位玩家。',
            'val.duplicate': '玩家名稱重複:「{name}」',
            'val.byeNotSelected': '{tag}:未選擇輪空玩家。',
            'val.dupInRound': '{tag}:該玩家在本輪出現多次。',
            'val.bothNeeded': '{tag}:必須選擇雙方玩家。',
            'val.sameAB': '{tag}:A 與 B 不可為同一玩家。',
            'val.dupInRound2': '{tag}:有玩家在本輪出現多次。',
            'val.resultNotSet': '{tag}:尚未設定結果。',
            'val.rematch': '{tag}:{a} 與 {b} 為再戰。',
            'val.oddBye': '{label}:奇數人數({n})需正好 1 個輪空,實際 {found} 個。',
            'val.evenBye': '{label}:偶數人數不應有輪空,實際 {found} 個。',
            'val.notAccounted': '{label}:僅 {used} / {total} 位玩家被列入。',
            'val.tooManyByes': '{name} 共獲得 {n} 次輪空。',
            'val.noPairings': '{label}:尚未輸入任何對戰。',
            'bc.home': '首頁',
            'bc.reg': '登記',
            'bc.standings': '排名',
            'bc.wheel': '幸運轉盤',
            'bc.advRecovery': '進階還原',
            'cloud.publish': '發佈',
            'cloud.published': '已發佈',
            'cloud.unpublish': '停止分享',
            'cloud.live': '直播中',
            'cloud.viewMode': '觀看模式',
            'cloud.viewBanner': '你正在即時觀看此賽事,更新會自動顯示。',
            'cloud.shareTitle': '分享賽事',
            'cloud.shareHint': '玩家可掃描此 QR Code 或開啟連結即時觀看賽事 — 配對、結果、排名同陀螺資料都會即時同步。',
            'cloud.copyLink': '複製連結',
            'cloud.copied': '已複製連結!',
            'cloud.tournamentId': '賽事編號',
            'cloud.unpublishConfirm': '停止分享此賽事?觀看者將失去存取權限。',
            'cloud.publishFail': '發佈失敗 — 請檢查 Firebase 設定或網路連線。',
            'cloud.notConfigured': '尚未設定雲端分享功能(請參閱 CLOUD_SETUP.md)。',
            'cloud.viewNotFound': '此賽事已不再開放。',
            'cloud.viewLoading': '連線中⋯',
            'cloud.close': '關閉',
            'cloud.publishing': '發佈中⋯',
            'viewer.placeholder': '輸入你的名字以置頂你的對戰',
            'viewer.yourMatch': '你的對戰',
            'viewer.notFound': '找不到符合的玩家。',
            'viewer.noPairing': '本輪沒有你的對戰。',
            'viewer.bye': '你本輪輪空。',
            'viewer.share': '分享',
            'viewer.shareTitle': '分享此頁面',
            'viewer.shareHint': '掃描 QR Code 或複製連結與其他玩家分享。',
            'viewer.linkCopied': '已複製連結!',
            'viewer.tabRound': '即時對戰',
            'viewer.tabStandings': '排名榜',
            'viewer.tabWheel': '抽獎'
        }
    };

    // Default to Traditional Chinese (Hong Kong audience). Returning users keep their saved choice.
    let currentLang = localStorage.getItem('ptcg_lang') || 'zh';

    function t(key, params) {
        let str = (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
        if (params) {
            if (params.n !== undefined && params.n !== 1) {
                const pluralKey = key + '_plural';
                const pluralStr = (I18N[currentLang] && I18N[currentLang][pluralKey]) || I18N.en[pluralKey];
                if (pluralStr) str = pluralStr;
            }
            Object.keys(params).forEach(k => {
                str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
            });
        }
        return str;
    }

    function applyI18n() {
        document.documentElement.lang = currentLang === 'zh' ? 'zh-Hant' : 'en';
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        // Opt-in: strings that need to render limited inline markup (e.g. <em>, <code>, <strong>)
        // Only trusted strings in app.js bundle are whitelisted with data-i18n-html.
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            el.innerHTML = t(el.getAttribute('data-i18n-html'));
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
        });
        const langBtn = document.getElementById('lang-toggle');
        if (langBtn) langBtn.textContent = currentLang === 'en' ? '中文' : 'EN';
    }

    // ---- Theme selector ----
    const THEME_LABELS = { original: 'Original', deeppurple: 'Deep Purple', magenta: 'Ethereal Magenta', cyan: 'Psychedelic Cyan', yellow: 'Electric Yellow', coral: 'Ninja Coral' };
    const THEME_MIGRATE = { crobat: 'deeppurple', gardevoir: 'magenta', gengar: 'cyan', pikachu: 'yellow', greninja: 'coral' };
    let storedTheme = localStorage.getItem('ptcg_theme');
    if (storedTheme && THEME_MIGRATE[storedTheme]) {
        storedTheme = THEME_MIGRATE[storedTheme];
        localStorage.setItem('ptcg_theme', storedTheme);
    }
    let currentTheme = storedTheme || 'original';
    if (!THEME_LABELS[currentTheme]) currentTheme = 'original';
    function applyTheme() {
        const root = document.documentElement;
        root.classList.remove('theme-original', 'theme-magenta', 'theme-cyan', 'theme-yellow', 'theme-coral');
        if (currentTheme === 'original') root.classList.add('theme-original');
        else if (currentTheme === 'magenta') root.classList.add('theme-magenta');
        else if (currentTheme === 'cyan') root.classList.add('theme-cyan');
        else if (currentTheme === 'yellow') root.classList.add('theme-yellow');
        else if (currentTheme === 'coral') root.classList.add('theme-coral');
        const label = document.getElementById('theme-toggle-label');
        if (label) label.textContent = THEME_LABELS[currentTheme];
        document.querySelectorAll('#theme-menu li').forEach(li => {
            li.classList.toggle('is-active', li.getAttribute('data-theme') === currentTheme);
        });
    }
    function toggleThemeMenu(e) {
        if (e) e.stopPropagation();
        const menu = document.getElementById('theme-menu');
        const btn = document.getElementById('theme-toggle');
        if (!menu || !btn) return;
        const open = !menu.hasAttribute('hidden');
        if (open) {
            menu.setAttribute('hidden', '');
            btn.setAttribute('aria-expanded', 'false');
        } else {
            menu.removeAttribute('hidden');
            btn.setAttribute('aria-expanded', 'true');
        }
    }
    function closeThemeMenu() {
        const menu = document.getElementById('theme-menu');
        const btn = document.getElementById('theme-toggle');
        if (menu) menu.setAttribute('hidden', '');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }
    function selectTheme(theme) {
        if (!THEME_LABELS[theme]) return;
        currentTheme = theme;
        localStorage.setItem('ptcg_theme', currentTheme);
        applyTheme();
        closeThemeMenu();
    }
    document.addEventListener('click', (e) => {
        const wrap = document.querySelector('.theme-dropdown');
        if (wrap && !wrap.contains(e.target)) closeThemeMenu();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeThemeMenu();
    });

    function toggleLang() {
        currentLang = currentLang === 'en' ? 'zh' : 'en';
        localStorage.setItem('ptcg_lang', currentLang);
        applyI18n();
        renderUpdates();
        // Re-render dynamic views so JS-generated text picks up new language
        if (state.currentView) navigateTo(state.currentView);
        updateBreadcrumb(state.currentView);
        renderTimer();
        updateMuteButton();
        updateProjectorMode();
        applyCompactMode();
        updatePublishButton();
        renderSharePanel();
    }

    // ---- CLOUD / VIEW MODE ----
    let viewOnly = false;            // true when this tab is a read-only viewer
    let viewTournamentId = null;     // tid from ?t=... when in view mode

    function getUrlTournamentId() {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('t');
        } catch (_) { return null; }
    }

    // ---- STATE ----
    const DEFAULT_STATE = {
        tournamentName: '',
        tournamentDate: '',
        scoringDrawBonus: false, // false = Win 3 / Loss 1 / Draw 0 (default); true = Win 3 / Draw 1 / Loss 0
        noAds: true,
        players: [],
        rounds: [],
        currentRound: 0,
        timerSeconds: 1500,
        timerRunning: false,
        timerEndsAt: null,
        timerDefault: 1500,
        timerMuted: false,
        wheelNames: [],
        wheelHistory: [],
        // Synced spin parameters — when non-null, the wheel is mid-spin.
        // Both owner and viewer animate locally from these params so the
        // network only carries 1 write per spin start + 1 write at end.
        // Schema: { startAngle, totalRotation, durationMs, startedAt }
        wheelSpin: null,
        // Final wheel angle after the most recent spin — drives the static
        // render on viewers who land on the wheel tab between spins.
        wheelAngle: 0,
        currentView: 'home',
        tournamentType: 'swiss',
        gameType: 'tcg',                  // 'tcg' | 'spin-battle' — spin-battle is Beyblade-X-style scoring
        matchTargetPoints: 4,             // spin-battle: first to N battle points wins the match
        threeOnThreeMode: true,           // spin-battle: each battler brings 3 Beyblades, can swap between battles
        stadiumOutEnabled: false,         // spin-battle: enables 5th finish "Stadium Out" (+3, community variant)
        bestOfThree: false,               // tcg: track per-game wins (Bo3); auto-locks match when one side wins 2 games
        tournamentStarted: false,
        tournamentEnded: false,
        projectorMode: false,
        compactMode: false,
        publishedTournamentId: null,
        roundCountOverride: null
    };

    let state = { ...DEFAULT_STATE };
    let timerInterval = null;
    let wheelAngle = 0;
    let wheelSpinning = false;
    let timerSaveCounter = 0;

    // ---- PERSISTENCE ----
    function saveState() {
        if (viewOnly) return; // viewers never write
        localStorage.setItem('ptcg_state', JSON.stringify(state));
        // Mirror to cloud if this tournament is published
        if (state.publishedTournamentId && window.cloud && window.cloud.isReady()) {
            window.cloud.syncState(state);
        }
    }

    function loadState() {
        const saved = localStorage.getItem('ptcg_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                state = { ...DEFAULT_STATE, ...parsed, noAds: true };
            } catch (e) {
                console.warn('Failed to load state', e);
            }
        }
    }

    function saveRoundSnapshot(roundIndex) {
        const snapshot = {
            players: JSON.parse(JSON.stringify(state.players)),
            rounds: JSON.parse(JSON.stringify(state.rounds.slice(0, roundIndex + 1))),
            currentRound: roundIndex
        };
        localStorage.setItem(`ptcg_round_${roundIndex}`, JSON.stringify(snapshot));
    }

    function loadRoundSnapshot(roundIndex) {
        const saved = localStorage.getItem(`ptcg_round_${roundIndex}`);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    // ---- VIEW ROUTER ----
    function showView(viewName) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const target = document.getElementById(`view-${viewName}`);
        if (target) {
            target.classList.add('active');
            target.style.animation = 'none';
            target.offsetHeight;
            target.style.animation = '';
        }
        state.currentView = viewName;
        updateBreadcrumb(viewName);
        saveState();
    }

    function updateBreadcrumb(viewName) {
        const bc = document.getElementById('breadcrumb');
        const crumbs = [];

        if (viewName === 'home') {
            bc.innerHTML = '';
            return;
        }

        crumbs.push(`<span class="bc-link" onclick="app.navigateTo('home')">${t('bc.home')}</span>`);

        if (viewName === 'registration') {
            crumbs.push(`<span class="bc-active">${t('bc.reg')}</span>`);
        } else if (viewName === 'round') {
            crumbs.push(`<span class="bc-link" onclick="app.navigateTo('registration')">${t('bc.reg')}</span>`);
            const recRounds = getPlannedRounds();
            const roundLabel = recRounds
                ? t('round.titleOf', { n: state.currentRound + 1, m: recRounds })
                : t('round.title', { n: state.currentRound + 1 });
            crumbs.push(`<span class="bc-active">${roundLabel}</span>`);
        } else if (viewName === 'standings') {
            crumbs.push(`<span class="bc-active">${t('bc.standings')}</span>`);
        } else if (viewName === 'wheel') {
            crumbs.push(`<span class="bc-active">${t('bc.wheel')}</span>`);
        } else if (viewName === 'advanced') {
            crumbs.push(`<span class="bc-active">${t('bc.advRecovery')}</span>`);
        }

        bc.innerHTML = crumbs.join(' <span>&rsaquo;</span> ');
    }

    function getRecommendedRounds() {
        const n = state.players.length;
        return n >= 2 ? Math.ceil(Math.log2(n)) : 0;
    }

    function setRoundCount(value) {
        if (viewOnly || state.tournamentStarted) return;
        const n = parseInt(value, 10);
        if (Number.isFinite(n) && n > 0 && n <= 20) {
            state.roundCountOverride = n;
        } else {
            state.roundCountOverride = null;
        }
        saveState();
        renderPlayerList();
    }

    function getPlannedRounds() {
        const override = parseInt(state.roundCountOverride, 10);
        if (Number.isFinite(override) && override > 0) return override;
        return getRecommendedRounds();
    }

    // ---- NAVIGATION ----
    function navigateTo(view) {
        // Leaving the standings page is a strong "I'm done with this
        // tournament" signal — fire publish if we still owe TopCut a result.
        // Wheel page already triggers via standingsToWheel(), but a user who
        // hits Home / Back to Round wouldn't otherwise.
        if (state.currentView === 'standings' && view !== 'standings'
            && state.hostEventId && !state.hostEventResultPublished) {
            publishEventResultIfNeeded();
        }
        if (view === 'home') checkResumeState();
        if (view === 'registration') { renderPlayerList(); syncRegistrationGameType(); }
        if (view === 'round') renderRound();
        if (view === 'standings') renderStandings();
        if (view === 'wheel') renderWheel();
        if (view === 'advanced') renderAdvanced();
        showView(view);
        updateViewerTabs();
    }

    function resumeTournament() {
        if (state.tournamentEnded) {
            navigateTo('standings');
        } else if (state.tournamentStarted && state.rounds.length > 0) {
            navigateTo('round');
        } else if (state.players.length > 0) {
            navigateTo('registration');
        }
    }

    function checkResumeState() {
        const section = document.getElementById('resume-section');
        if (state.tournamentStarted || state.players.length > 0) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    }

    function resetTournament() {
        if (viewOnly) return;
        if (!confirm(t('reset.confirm'))) return;
        championCelebrationFired = false;
        for (let i = 0; i < 50; i++) {
            localStorage.removeItem(`ptcg_round_${i}`);
        }
        state = {
            ...DEFAULT_STATE,
            players: [],
            rounds: [],
            wheelNames: [],
            wheelHistory: []
        };
        stopTimer();
        saveState();
        navigateTo('home');
    }

    // ---- PLAYER REGISTRATION ----
    function bulkAddPlayers() {
        if (viewOnly || state.tournamentStarted) return;
        const textarea = document.getElementById('bulk-input');
        const lines = textarea.value.split('\n');
        let added = 0;
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            let name, trainerId = '';
            if (trimmed.includes('|')) {
                const parts = trimmed.split('|');
                name = parts[0].trim();
                trainerId = parts[1].trim();
            } else {
                name = trimmed;
            }
            if (name && !state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
                state.players.push(createPlayer(name, trainerId));
                added++;
            }
        });
        textarea.value = '';
        saveState();
        renderPlayerList();
        if (added > 0) {
            showToast(t('reg.added', { n: added }));
        }
    }

    function createPlayer(name, trainerId, extras) {
        const e = extras || {};
        return {
            name,
            trainerId: trainerId || '',
            // Optional event-handoff fields. Empty for tournaments started directly
            // from registration (no host event). Used by P5 result post (deck %).
            deckSpecies1: e.deckSpecies1 || '',
            deckSpecies2: e.deckSpecies2 || '',
            id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            matchPoints: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            opponents: [],
            hadBye: false,
            dropped: false
        };
    }

    function deletePlayer(index) {
        if (viewOnly || state.tournamentStarted) return;
        state.players.splice(index, 1);
        saveState();
        renderPlayerList();
    }

    function editPlayerName(index) {
        if (viewOnly || state.tournamentStarted) return;
        const player = state.players[index];
        const currentValue = player.trainerId ? `${player.name} | ${player.trainerId}` : player.name;
        const newName = prompt(t('reg.editPrompt'), currentValue);
        if (newName && newName.trim()) {
            let trimmed = newName.trim();
            let trainerId = player.trainerId || '';
            if (trimmed.includes('|')) {
                const parts = trimmed.split('|');
                trimmed = parts[0].trim();
                trainerId = parts[1].trim();
            }
            // Check for duplicate
            if (state.players.some((p, i) => i !== index && p.name.toLowerCase() === trimmed.toLowerCase())) {
                alert(t('reg.dupName'));
                return;
            }
            player.name = trimmed;
            player.trainerId = trainerId;
            saveState();
            renderPlayerList();
        }
    }

    function renderPlayerList() {
        const list = document.getElementById('player-list');
        const countEl = document.getElementById('player-count');
        const recEl = document.getElementById('recommended-rounds');
        const startBtn = document.getElementById('btn-start-tournament');
        const locked = state.tournamentStarted;

        // Hide entire input area during tournament
        const inputArea = document.querySelector('.reg-input-area');
        if (inputArea) inputArea.style.display = locked ? 'none' : '';

        // Sync tournament meta inputs from state, and lock them once started
        const nameInput = document.getElementById('tournament-name');
        const dateInput = document.getElementById('tournament-date');
        if (nameInput) {
            if (nameInput.value !== (state.tournamentName || '')) nameInput.value = state.tournamentName || '';
            nameInput.disabled = locked;
        }
        if (dateInput) {
            if (dateInput.value !== (state.tournamentDate || '')) dateInput.value = state.tournamentDate || '';
            dateInput.disabled = locked;
        }
        const scoringInput = document.getElementById('scoring-draw-bonus');
        if (scoringInput) {
            scoringInput.checked = !!state.scoringDrawBonus;
            scoringInput.disabled = locked;
        }

        const showDeck = !locked && state.gameType === 'spin-battle' && state.threeOnThreeMode !== false;
        list.innerHTML = '';
        state.players.forEach((p, i) => {
            const li = document.createElement('li');
            const trainerTag = p.trainerId ? `<span class="trainer-id-tag">${escapeHtml(p.trainerId)}</span>` : '';
            let deckBtn = '';
            if (showDeck) {
                const v = validateDeck(p.deck);
                const cls = v.ok ? 'deck-btn-ok' : 'deck-btn-warn';
                const icon = v.ok ? '✓' : '⚠';
                deckBtn = `<button class="deck-btn ${cls}" onclick="app.openDeckEditor('${p.id}')" title="${t('deck.edit')}">${icon} ${t('deck.short')}</button>`;
            }
            li.innerHTML = `
                <span class="player-name" ${!locked ? `ondblclick="app.editPlayerName(${i})" title="Double-click to edit"` : ''}>${escapeHtml(p.name)}${trainerTag}</span>
                ${deckBtn}
                ${!locked ? `<button class="btn-delete" onclick="app.deletePlayer(${i})" title="Remove">&times;</button>` : ''}
            `;
            list.appendChild(li);
        });

        const n = state.players.length;
        countEl.textContent = t('reg.players', { n });

        const roundCtl = document.getElementById('reg-round-control');
        const roundInput = document.getElementById('reg-round-count');
        const showRoundCtl = state.tournamentType !== 'knockout' && n >= 2;
        if (roundCtl) roundCtl.style.display = showRoundCtl ? '' : 'none';

        if (n >= 2) {
            const rec = getRecommendedRounds();
            const planned = getPlannedRounds();
            if (state.tournamentType === 'knockout') {
                recEl.textContent = '';
            } else {
                const isCustom = Number.isFinite(parseInt(state.roundCountOverride, 10)) && state.roundCountOverride > 0;
                recEl.textContent = isCustom
                    ? t('reg.recommendedHint', { n: rec })
                    : t('reg.recommended', { n: rec });
            }
            if (roundInput) {
                if (document.activeElement !== roundInput) {
                    roundInput.value = String(planned || rec || '');
                }
                roundInput.disabled = locked;
            }
            startBtn.disabled = false;
        } else {
            recEl.textContent = n === 1 ? t('reg.needTwo') : '';
            if (roundInput) roundInput.disabled = true;
            startBtn.disabled = true;
        }

        if (locked) {
            startBtn.disabled = true;
            startBtn.textContent = t('reg.inProgress');
        } else {
            startBtn.textContent = state.tournamentType === 'knockout'
                ? t('reg.startKO')
                : t('reg.start');
        }
    }

    // ---- UPDATES / ANNOUNCEMENTS ----
    // Newest first. Title and body are bilingual; date is YYYY-MM-DD.
    const UPDATES = [
        {
            date: '2026-05-08',
            title: {
                en: 'Lucky Wheel goes live — spin animation broadcasts to every viewer',
                zh: '幸運轉盤直播 — 抽獎旋轉動畫實時同步到每位觀戰玩家',
            },
            body: {
                en: 'When you spin the lucky wheel on the owner device, every connected viewer on the spectator link sees the same wheel turning in real time on their phone. The viewer page gains a new 「Wheel」 tab (auto-shows once you set up names) with a pulsing red dot while a spin is in flight. The animation is broadcast as a single ~1KB cloud write per spin envelope (start angle + total rotation + duration + start time) — bandwidth-efficient, network-latency tolerant. Both ends ease to the same final angle and the same winner; confetti fires on everyone\'s screen. A viewer who joins mid-spin lands on the correct in-progress angle instead of restarting from zero. As a side benefit, viewers who tap into the standings or wheel tab no longer get yanked back to the live round view on every state update — the spectator page now respects whichever tab you chose.',
                zh: '主辦端按「開始抽」嗰一刻，所有連住觀戰連結嘅玩家部機，會同時見到同一個轉盤實時旋轉。觀戰頁面新增「抽獎」分頁（owner 設咗名單之後自動出現），spin 進行中嗰個 tab 會閃紅 dot 提示。每次 spin 只係一次 ~1KB cloud 寫入（廣播動畫嘅 envelope：起始角度／總旋轉／時長／起始時間），唔會 spam Firestore，亦容忍網絡延遲 — 兩端最終旋到同一個角度、同一個贏家，confetti 全場都會放。中途加入觀戰嘅玩家會從當前進度切入動畫，唔會由零重新轉。順手解決一個舊問題：觀眾喺「排名榜」或「抽獎」tab 不會再因為每次 state update 被自動切返「即時對戰」 — 觀戰頁面而家會記住你揀緊嘅 tab。',
            },
        },
        {
            date: '2026-05-08',
            title: {
                en: 'Players can self-report match results — pass-the-phone confirmation flow',
                zh: '玩家可自行報賽果 — 對家簽名確認流程',
            },
            body: {
                en: 'Players who pin themselves on the spectator page (by name, trainer ID, or with `?me=hk12345678` in the URL) get interactive Win / Draw / Loss buttons on their own pinned match. Tapping a result opens a pass-the-phone confirmation sheet: the reporter hands the device to their opponent, who reviews the outcome, signs on the canvas, and taps 「Agree」 to commit. The result lands on the organizer\'s round view within a second or two, marked with a green ✓「Self-reported」 chip. If the opponent picks 「Disagree」, the match flags red and the organizer can override with a single tap. The opponent\'s signature is stored as audit evidence. Hosted-event tournaments enable this automatically (every signup carries a trainer ID); non-hosted tournaments work too — just pin your name and the next player you hand the phone to becomes the witness. Cuts ~95% of organizer score-entry workload when adoption is high; the existing manual entry remains a complete fallback when adoption is low.',
                zh: '玩家喺觀戰頁面 pin 自己之後（用名、trainer ID，或者連結加 `?me=hk12345678`），自己嗰場對戰嘅勝／和／負三個按鈕會由唯讀變成可互動。Tap 結果即彈出「對家確認」頁面：玩家將部機交俾對家，由對家睇清楚結果、喺手寫板簽名、按「同意並確定」確認，結果一兩秒內出現喺主辦個 round view 並打上綠色 ✓「玩家自報」 chip。對家揀「唔同意」嘅話會打紅旗，主辦再用一個 tap override 即可。對家簽名會留底作為事後核對證據。Hosted event 開出嚟嘅賽事自動啟用（每位 signup 已經有 trainer ID）；非 hosted 賽事亦支援 — pin 名再交部機俾對家簽就成。當普及率高，可以慳近 95% 主辦記分工夫；普及率低時，原本嘅手動入分流程完全唔受影響。',
            },
        },
        {
            date: '2026-05-07',
            title: {
                en: 'Hosted events: registration cap with «no cap» option',
                zh: 'Hosted 活動：可設報名上限，亦可剔「不設上限」',
            },
            body: {
                en: 'Creating or editing a hosted PTCG event now offers a 「Registration cap」 number field plus a 「No cap」 checkbox for unlimited events. Public signup pages and TopCut feed cards both display 「23 / 40」 progress; once the count hits the cap the signup button switches to 「🔒 Event full」 and an «Almost full» banner appears at 80%. Enforcement is server-side — the Firestore rule rejects any signup that would push the count past the cap. Organizers always bypass this gate, so 「Event full」 online doesn\'t stop you from manually adding walk-ins on the host page. A new `onSignupWritten` Cloud Function keeps the signup counter accurate atomically (the field was previously stuck at 0). Tight caps still leave a 1–2 person race window during simultaneous signups; for community events this is acceptable, and the organizer can monitor the live count from the host editor.',
                zh: '建立或編輯 hosted PTCG 活動時，編輯器新增「報名上限」數字欄位，並可剔「不設上限」做開放報名。公開報名頁同 TopCut feed card 都會顯示「23 / 40」即時進度；達到上限後報名按鈕變「🔒 已滿額」，到 80% 仲會出現「快滿」橙色提示。執行端在 server side — Firestore rule 直接拒絕超出上限嘅報名。主辦永遠 bypass 呢條 rule，所以網上「已滿額」並唔會阻你喺 host page 手動加 walk-in。新增嘅 `onSignupWritten` Cloud Function 確保人數 counter 原子性同步（之前根本冇 trigger 維護，counter 永遠係 0）。極緊嘅上限同並發報名仍可能 race 1–2 個位；對 community 活動係可接受，主辦可以喺編輯器度即時監察人數。',
            },
        },
        {
            date: '2026-04-25',
            title: {
                en: 'Beys: QR generate + scan + paste-code · soft-start with ⚠ badge · wording cleanup',
                zh: '陀螺：QR 產生／掃描／貼碼 · 未登記也可開賽（顯示 ⚠ 標記）· 用詞統一'
            },
            body: {
                en: 'Three improvements to 3-on-3 Beys: (1) QR support — every Beys editor has a "⊞ QR" toggle that shows a QR code encoding the player\'s 3 Beys plus a copyable text code (gshk-bey:b|r|t;b|r|t;b|r|t). Re-attendees can scan this QR at the next event to import their saved Beys instantly. Cameras with BarcodeDetector (modern Chrome / Safari iOS 17+) get a live "Scan QR" button; everyone else can paste the code into a text box. (2) Tournament start no longer blocks on missing Beys — battlers without registered Beys get a small ⚠ badge next to their name in the round view, but the event runs normally (Bey picker falls back to "1/2/3" buttons for them). (3) Wording cleaned up — "Beys" everywhere instead of mixing "deck" / "Spin" / "Beys". Spin Battle help popup updated to reflect the now-shipped penalty rules and 3-on-3 features.',
                zh: '3-on-3 陀螺新增三項改進：(1) QR 支援 — 陀螺編輯器加入「⊞ QR」按鈕，可生成包含 3 顆陀螺資料的 QR 碼，並提供可複製的文字代碼（gshk-bey:b|r|t;b|r|t;b|r|t）。下次參賽時掃描即可一鍵匯入已儲存的陀螺。支援 BarcodeDetector 的瀏覽器（最新版 Chrome 與 iOS 17+ 的 Safari）有即時相機掃描；其他瀏覽器可貼上文字代碼。(2) 賽事開始不再因為陀螺未登記而被阻擋 — 未登記陀螺的選手會在對戰畫面名字旁顯示小 ⚠ 標記，賽事正常進行（陀螺選擇器會回退至「1/2/3」按鈕）。(3) 用詞統一 — 全面使用「陀螺／Beys」，不再混用「deck／套牌／spin」。陀螺對戰規則說明已更新，反映罰則與 3-on-3 功能均已上線。'
            }
        },
        {
            date: '2026-04-25',
            title: {
                en: 'Spin Battle: proper deck registration with parts uniqueness (3-on-3 v1)',
                zh: '陀螺對戰：3-on-3 套牌登記（v1，含零件唯一性檢查）'
            },
            body: {
                en: 'Each battler now registers their 3 Beys (Blade + Ratchet + Bit each) on the registration page via a per-player Deck button. Validation ensures no part repeats within a deck — official Beyblade X tournament rule. The tournament refuses to start until every battler has a valid deck (or 3-on-3 is turned off). Once registered, the in-match Bey picker shows the actual Blade names instead of "Bey 1 / 2 / 3", the battle log records which Bey scored each finish, and the trainer card shows the registered deck. This closes the last big rule-compliance gap. (TESTING badge stays on for now while the new flow is exercised — let me know when to drop it.)',
                zh: '報名頁面每位選手卡片旁新增「陀螺」按鈕，可登記 3 顆陀螺的完整零件（Blade 旋輪 / Ratchet 齒輪 / Bit 軸尖）。系統會檢查同一套牌內不可有重複零件 — 完全依照 Beyblade X 官方規則。任一選手未完成登記，賽事將無法開始（除非關閉 3-on-3 選項）。登記完成後，對戰中按勝法後彈出的陀螺選擇器會直接顯示真實的 Blade 名稱（不再是「1 / 2 / 3」），對戰紀錄會保留是哪一顆陀螺取勝，訓練家卡片亦會顯示完整的登記套牌。這是 Beyblade X 規則合規性的最後一塊拼圖。（測試版標記暫時保留以便試用，準備好可隨時通知移除。）'
            }
        },
        {
            date: '2026-04-25',
            title: {
                en: 'Knockout bracket tree · trainer-card battle history · print-friendly standings · Stadium Out',
                zh: '淘汰賽括號圖／訓練家卡片完整對戰紀錄／可列印排名／台外勝法'
            },
            body: {
                en: 'Knockout tournaments now show a collapsible bracket-tree overview at the top of the round view — see the whole bracket at a glance, past winners highlighted in green, current round glowing orange, future rounds shown as TBD. Trainer/Battler cards now include per-battle (spin) and per-game (TCG Bo3) sub-entries under each match in the timeline, plus a "Finish breakdown" stat box showing how many Xtreme / Knock Out / Burst / Survivor finishes the player scored. Standings page is now print-friendly — hit Cmd/Ctrl+P and you get a clean black-on-white standings table ready for the shop wall, with the gameset-hk.com watermark at the bottom. NEW Spin Battle option: "Allow Stadium Out (+3, community variant)" toggle on the registration page — when enabled, a 5th violet finish button appears below the cross. Defaults OFF (not in official Hasbro/Takara Tomy rules).',
                zh: '淘汰賽現於對戰畫面頂部新增可摺合的「括號賽程一覽」 — 一眼睇曬全部對局，已完成的勝方高亮綠色，當前輪次橙色發光，未來輪次以 TBD 顯示。訓練家卡片現於每場對局下方加入逐回合（陀螺對戰）／逐局（TCG 三局二勝）的細節記錄，並新增「勝法分佈」統計欄位顯示玩家累積的中央／擊出／爆裂／存活勝法數。排名頁面現支援列印 — 按 Cmd/Ctrl+P 即得整潔的黑白排名表（含 gameset-hk.com 水印），可直接貼上店內告示板。陀螺對戰新增選項：「允許台外 (+3，社群規則)」可於報名頁勾選，啟用後十字面板下方會出現第 5 個紫色勝法按鈕。預設關閉（非 Hasbro／Takara Tomy 官方規則）。'
            }
        },
        {
            date: '2026-04-25',
            title: {
                en: 'Spin Battle (TESTING): penalty rules + spectator pin + Best-of-3 for TCG',
                zh: '陀螺對戰（測試版）：判罰規則／觀眾置頂／TCG Best-of-3 模式'
            },
            body: {
                en: 'Three additions in one drop: (1) Spin Battle now has a collapsible Penalty / Malfunction panel under each match — covers the official Beyblade X rules: 2 launch errors → +1 to opponent + battle replays; warning ladder (1→2 +1 to opponent → 3 = DQ); 3 malfunctions → opponent wins match. Counter shows current state, auto-awards points, auto-locks the match on DQ/3rd malfunction. (2) Spectator pinned-match for spin tournaments now shows a clean read-only scoreboard instead of the old TCG win/draw/win buttons. (3) NEW: TCG mode has an optional "Best of 3" toggle on the registration page (default OFF). When enabled, each match shows Game 1 / Game 2 / Game 3 buttons; match auto-locks when one side wins 2 games. Standings get a GW-GL column showing per-game record. Per-game tracking unlocks the data needed for official Pokémon TCG PGW% / OGW% tiebreakers in a future release.',
                zh: '一次推出三項更新：(1) 陀螺對戰每場比賽下方新增可摺合的「判罰／故障」面板 — 完整支援 Beyblade X 官方規則：同一回合 2 次發射失誤 → 對手 +1 分並重打本回合；警告階梯（第 1 次警告 → 第 2 次對手 +1 → 第 3 次直接判負）；同一對局 3 次器材故障 → 對手贏對局。即時計數，達到門檻自動加分／鎖定。(2) 觀眾置頂的對局介面在陀螺對戰模式下改為只讀記分版，取代原本的 TCG 勝／和／勝按鈕。(3) 全新：TCG 模式報名頁面新增「Best of 3」可選項（預設關閉）。開啟後每場顯示 Game 1 / 2 / 3 按鈕，先贏 2 局即取得整場。排名加上 GW-GL 欄位顯示逐局戰績。逐局追蹤亦為未來加入官方 Pokémon TCG PGW% / OGW% 決勝順位鋪路。'
            }
        },
        {
            date: '2026-04-25',
            title: {
                en: 'Spin Battle (TESTING): 3-on-3 deck mode + cross-popup scoring',
                zh: '陀螺對戰（測試版）：3-on-3 套牌模式與十字記分介面'
            },
            body: {
                en: 'Tap a player card → spring-animated cross popup appears with 4 finish buttons positioned by motion (Xtreme up, Knock Out right, Survivor down, Burst left). Each player card has a small ⓘ button in the corner that opens the trainer card popup with full stats. The round timer is hidden (Beyblade matches are point-target, not time-bound). NEW: 3-on-3 deck mode is enabled by default — after tapping a finish, a Bey 1/2/3 picker appears so the battle log records which Bey scored. Untick the toggle on the registration page for 1-on-1 matches.',
                zh: '點擊玩家卡片 → 即彈出十字記分面板，4 種勝法按運動方向擺放（中央在上、擊出在右、存活在下、爆裂在左）。每張玩家卡角落有小 ⓘ 按鈕，點擊可開啟訓練家卡片查看完整資料。陀螺對戰模式下計時器自動隱藏（Beyblade 比賽以分數為勝負，無時限）。新增：3-on-3 套牌模式預設開啟 — 點選勝法後再選擇是邊隻陀螺（1 / 2 / 3）取勝，記錄會保留陀螺編號。報名頁面可取消勾選改為 1-on-1。'
            }
        },
        {
            date: '2026-04-25',
            title: {
                en: 'NEW (TESTING): Spin Battle Tournament — Beyblade-X-style scoring',
                zh: '全新功能（測試版）：陀螺對戰賽事 — Beyblade X 計分制度'
            },
            body: {
                en: 'Two new home-screen tiles — "Spin Battle Swiss" and "Spin Battle Knockout" — let you run Beyblade-X-style spin battle tournaments. Each match uses points-target scoring (default first-to-4 in Swiss; organizers can change it). Per-match UI shows live cumulative points and four finish buttons per side: Survivor +1, Burst +2, Knock Out +2, Xtreme +3. Match auto-locks when a side hits the target, with an Undo for the most recent battle. Standings swap the WOScore column for BattlePts (sum scored across the event). The pairing engine, byes, OWP / OOMW tiebreakers all work the same as TCG mode. Marked as TESTING because penalty rules (two-launch-error, three-warning DQ, three-malfunction match-loss) and 3-on-3 deck registration are not yet implemented — coming in v1.',
                zh: '主畫面新增兩個按鈕 — 「陀螺對戰瑞士制」與「陀螺對戰淘汰賽」 — 支援 Beyblade X 風格的陀螺對戰賽事。每場對局採用目標分數制（瑞士制預設先取 4 分；主辦方可自訂）。對局介面提供四種勝法按鈕（存活 +1、爆裂 +2、擊出 +2、中央 +3）與即時累計分數，達標後自動鎖定，支援撤銷上一回合。排名表將 WOScore 欄位換成 BattlePts（整個賽事中累積的回合得分）。配對引擎、輪空、OWP／OOMW 決勝順位與 TCG 模式完全相同。標記為「測試版」因罰則（兩次發射失誤、三次警告判負、三次器材故障）與 3-on-3 套牌登記尚未實作 — 將於 v1 加入。'
            }
        },
        {
            date: '2026-04-25',
            title: {
                en: 'Home page redesigned · Cantonese-first by default',
                zh: '主頁重新設計 · 預設廣東話介面'
            },
            body: {
                en: 'New visitors now land on the Cantonese (zh-Hant) interface by default — easier for our Hong Kong audience. Returning users keep whatever language they previously chose. The home screen got a new gradient headline ("Maybe the best GameSet in Hong Kong") and a tighter tagline. Switch to English any time with the 中文 / EN button at the top right.',
                zh: '新訪客現預設以繁體中文（廣東話）介面開啟 — 對香港用戶更直覺。回訪用戶會沿用之前選擇的語言。主頁新增漸變標題「可能係香港最好用既GameSet」與精簡副標題。隨時可在右上角「中文 / EN」按鈕切換英文。'
            }
        },
        {
            date: '2026-04-25',
            title: {
                en: 'Rebrand: TCG Tournament Manager is now GameSet HK',
                zh: '品牌更新：TCG Tournament Manager 正式更名為 GameSet HK'
            },
            body: {
                en: 'New official domain: gameset-hk.com. Old links (tcgtm.web.app, ptcgstm.web.app, tcgtm.firebaseapp.com) automatically redirect to the new home, so existing QR codes, share links and bookmarks keep working. The brand and watermark on downloaded standings now read "GameSet HK". The app, features, data, and account sign-ins are unchanged.',
                zh: '正式網址更新為 gameset-hk.com。原有連結（tcgtm.web.app、ptcgstm.web.app、tcgtm.firebaseapp.com）將自動轉址至新網址，舊有的 QR 碼、分享連結與書籤仍可正常使用。下載的排名圖片浮水印改為「GameSet HK」。功能、資料與登入帳號完全不變。'
            }
        },
        {
            date: '2026-04-25',
            title: {
                en: 'Standings: full tiebreaker ladder + trainer card upgrade',
                zh: '排名：完整決勝順位 + 訓練家卡片升級'
            },
            body: {
                en: 'Standings now show the full Pokémon-TCG tiebreaker ladder: Match Points → OWP → OOMW, with WOScore (opponents\' total points) and Byes as reference columns. The OWP formula was corrected to the official (wins + 0.5·draws) / games — scoring-mode independent, fair when draws occur. Byes are never counted as opponents. The trainer card popup now shows all tiebreakers (Points · OWP · OOMW · WOScore · Byes · Record · Games). Top 3 get gold/silver/bronze medals 🥇🥈🥉 and the champion is crowned with confetti. Swiss rules popup and in-app walkthrough updated in both languages.',
                zh: '排名頁面現已顯示完整的 Pokémon TCG 決勝順位階梯：勝點 → OWP → OOMW，並加上 WOScore（對手總積分）與 Byes（輪空次數）作為參考欄。OWP 公式已修正為官方版本 (勝 + 0.5·和) / 場數 — 不受計分模式影響，和局存在時更公平。輪空不計為對手。點擊玩家名字顯示的訓練家卡片現已列出全部決勝指標（勝點 · OWP · OOMW · WOScore · Byes · 戰績 · 場數）。前三名顯示金/銀/銅獎牌 🥇🥈🥉，冠軍誕生時自動撒下彩帶。瑞士制規則說明與新手導覽的中英文版本均已同步更新。'
            }
        },
        {
            date: '2026-04-25',
            title: {
                en: 'Mobile polish: sticky header, input hints, shorter logo on phone',
                zh: '手機優化：排名表頭固定、輸入欄提示、縮短手機版標題'
            },
            body: {
                en: 'Standings table header now stays pinned while you scroll long lists. Every input on the registration, wheel and advanced pages shows a helpful description below it — including a preview of how the value will look on the final standings. The header title scales fluidly so it never collides with the theme/language buttons on phones. In view mode, the Download-as-Image button now correctly shows for spectators, and tapping a player in the pinned "your match" card opens their trainer stats (works on both sides, and on bye pairings).',
                zh: '排名表的表頭在滾動時固定顯示，方便長名單對照。報名、轉盤、進階三個頁面所有輸入欄下方均加上說明文字，並以預覽方式告訴你最終排名會長什麼樣。頁首標題會依螢幕大小自動縮放，避免在手機上與主題／語言按鈕重疊。觀看模式下「下載為圖片」按鈕現已正常顯示；點擊自己置頂對局中的任一玩家名字，即可開啟該玩家的訓練家卡片（適用於 A 方、B 方及輪空對局）。'
            }
        },
        {
            date: '2026-04-25',
            title: {
                en: 'Shareability: favicon, social previews, PWA install',
                zh: '分享性：加入網站圖示、社群分享預覽、PWA 安裝'
            },
            body: {
                en: 'GameSet HK now has a trophy favicon in the browser tab, and pasting the link into Discord / WhatsApp / Telegram shows a proper preview card with title, description and image. On mobile, "Add to Home Screen" works like a real app thanks to the new Web App Manifest. No backend changes — pure polish.',
                zh: 'GameSet HK 瀏覽器分頁現已顯示獎盃網站圖示；在 Discord／WhatsApp／Telegram 貼上連結會自動生成標題、描述與圖片的分享預覽。行動裝置可透過「加到主畫面」以 App 形式安裝（PWA），跟原生應用一樣打開即用。純 UI 優化，後端無變動。'
            }
        },
        {
            date: '2026-04-22',
            title: {
                en: 'UI: Clearer table numbering',
                zh: '介面：桌號顯示更清晰'
            },
            body: {
                en: 'Table numbers in the pairings view now use a neutral grey box instead of the player color, reducing visual confusion.',
                zh: '對戰表中的桌號改為中性的灰色背景，不再與玩家顏色混淆，以提升辨識度。'
            }
        },
        {
            date: '2026-04-22',
            title: {
                en: 'New: set your own round count on registration',
                zh: '新功能：報名頁可自訂賽事輪數'
            },
            body: {
                en: 'The registration page now shows a "Rounds" input so the tournament owner can decide how many Swiss rounds to play. The app still recommends a count based on the roster size (e.g. 14 players → 4 rounds), and that value is used by default. Type a different number (1–20) to override it, or press "Use recommended" to snap back to the suggestion. The choice is locked once the tournament starts. Knockout brackets are unaffected — they always run until a single champion remains.',
                zh: '報名頁面新增「輪數」輸入欄位，主辦方可自行決定瑞士制要打多少輪。系統仍會依人數提供建議（例如 14 人 → 4 輪）並作為預設值；輸入其他數字（1–20）即可覆寫設定，或按「採用建議」回到系統建議值。賽事一旦開始即鎖定不可更改。淘汰賽不受影響 — 仍會持續對戰直到決出單一冠軍。'
            }
        },
        {
            date: '2026-04-21',
            title: {
                en: 'New: resume a tournament by Cloud ID',
                zh: '新功能：以雲端編號續辦賽事'
            },
            body: {
                en: 'A new sub-feature on the Advanced page lets you resume a published tournament on a different device. Enter the 6-character Tournament ID shown on the publisher\'s share panel, press Resume, and the full state — roster, rounds, standings, timer — is pulled from the cloud into this browser so you can keep running the event. The resumed copy becomes a fresh local tournament; click Publish again on the round view if you want to keep sharing live.',
                zh: '「進階」頁面新增子功能：以雲端編號續辦賽事。在發佈方的分享面板中取得 6 碼賽事編號，於新裝置輸入後按下「續辦」，即可將完整狀態（名單、輪次、排名、計時器）從雲端載入此瀏覽器繼續進行。載入後為本機獨立賽事；若仍需即時分享，請於對戰畫面再次點選「發佈」。'
            }
        },
        {
            date: '2026-04-15',
            title: {
                en: 'Legal Notice added; clearer fan-made disclaimer',
                zh: '新增法律聲明；明確標示粉絲製作'
            },
            body: {
                en: 'A new Legal Notice page is linked from every footer, and a one-line disclaimer now sits at the bottom of every page. The wording explicitly states that this site is a fan-made tool, not affiliated with Nintendo, The Pokémon Company, Game Freak, or Creatures Inc., and that all trademarks belong to their respective owners. The About, Terms, and FAQ pages have been tightened to match.',
                zh: '頁尾新增「法律聲明」連結，並於每頁底部加上免責聲明：本站為粉絲製作，與任天堂、寶可夢公司、Game Freak、Creatures Inc. 等公司均無關聯，所有商標均屬其各自所有者所有。About、Terms、FAQ 頁面同步更新。'
            }
        },
        {
            date: '2026-04-15',
            title: {
                en: 'Theme names refreshed; Original is now the default',
                zh: '主題名稱更新；預設改回 Original'
            },
            body: {
                en: 'Theme palettes have been renamed to neutral colour names: Original, Deep Purple, Ethereal Magenta, Psychedelic Cyan, Electric Yellow, and Ninja Coral. New visitors now open the app in the Original orange theme. If you previously picked a theme, your choice is preserved automatically.',
                zh: '配色名稱已改為通用色彩命名：Original、Deep Purple、Ethereal Magenta、Psychedelic Cyan、Electric Yellow、Ninja Coral。新使用者預設為 Original 橙色。若你之前已選過主題，系統會自動沿用你的設定。'
            }
        },
        {
            date: '2026-04-14',
            title: {
                en: 'New: theme picker (6 colour palettes)',
                zh: '新功能：主題切換（6 種配色）'
            },
            body: {
                en: 'A new theme dropdown sits next to the language toggle in the top-right. Six palettes are available: Original orange, Deep Purple, Ethereal Magenta, Psychedelic Cyan, Electric Yellow, and Ninja Coral. Your choice is remembered on this device. Pick whichever matches your shop\'s vibe.',
                zh: '右上角語言按鈕旁新增主題切換下拉選單，共提供 6 種配色：Original（橙）、Deep Purple（深紫）、Ethereal Magenta（洋紅）、Psychedelic Cyan（致幻青綠）、Electric Yellow（閃亮金）、Ninja Coral（珊瑚）。你的選擇會保留在此裝置上，可隨時切換符合店舖氛圍的色系。'
            }
        },
        {
            date: '2026-04-14',
            title: {
                en: 'Configurable Swiss scoring (default Win 3 / Loss 1 / Draw 0)',
                zh: '可調整的瑞士制計分（預設 勝 3 / 負 1 / 和 0）'
            },
            body: {
                en: 'Swiss scoring now defaults to Win 3 / Loss 1 / Draw 0 — losing still awards 1 point so showing up to play is rewarded, while a draw scores nothing. A new checkbox on the Registration page lets organisers switch back to the more traditional Win 3 / Draw 1 / Loss 0 if their event prefers it. Bye is always counted as an automatic win (3 points). The choice is locked once the tournament starts. Knockout brackets are unaffected — only the result decides advancement.',
                zh: '瑞士制計分預設改為 勝 3 分、負 1 分、和 0 分 — 出席比賽即可獲 1 分，和局則不計分。報名頁面新增勾選方塊，主辦方可隨時切換回較傳統的 勝 3、和 1、負 0 計分方式。輪空一律視為自動勝場（3 分）。賽事一旦開始，計分模式即鎖定不可更改。淘汰賽不受影響 — 晉級僅依比賽結果判定。'
            }
        },
        {
            date: '2026-04-14',
            title: {
                en: 'Welcome — TCG Tournament Manager v1.0',
                zh: '歡迎使用 — TCG 賽事管理 v1.0'
            },
            body: {
                en: 'This application aims to provide the most useful features for trading card game (TCG) players and event / tournament organizers, striving for an improved user experience for both players and organizers. We are open and happy to accept advice from everyone, and it is our pleasure to see every TCG player enjoy the joy of the TCG game.\n\nAs the creator of this application, I aim to provide free use for users. In the future, as our user base grows, we will introduce an advertising feature to maintain free usage, offsetting the higher costs of hosting services. We would welcome the opportunity to rent our ad blocks for placing your ads, with a primary focus on TCG-related content.\n\nFor publishing this app and for those who have helped test it, I would like to express my sincere gratitude for your support. Please join us in our efforts to create an even better TCG experience. Thank you.',
                zh: '本應用程式致力於為集換式卡牌遊戲（TCG）玩家及賽事主辦方提供最實用的功能，努力為玩家與主辦方雙方帶來更優質的使用體驗。我們樂意聆聽並接受各方建議，能見到每位 TCG 玩家享受遊戲的樂趣，是我們的榮幸。\n\n身為此應用程式的開發者，我希望讓使用者免費使用本服務。未來隨著用戶基礎成長，我們將引入廣告功能以維持免費使用，並用以抵銷日益增加的主機代管成本。我們也歡迎與您合作，租用廣告版位刊登貴方廣告，並以 TCG 相關內容為主。\n\n對於支持本應用程式上線，以及協助測試的每一位，我誠摯感謝您們的支持。請與我們一同努力，共同打造更棒的 TCG 體驗。謝謝。'
            }
        },
        {
            date: '2026-04-14',
            title: {
                en: 'User guide & recommended workflow',
                zh: '使用指南與建議流程'
            },
            body: {
                en: 'A quick walkthrough of every feature and the suggested flow for running a smooth event.\n\n1. PICK A FORMAT (home screen)\n   • Swiss Tournament — every player plays the same number of rounds; best for 4–32 players.\n   • Knockout Tournament — single-elimination bracket; the loser of each match is out.\n\n2. REGISTRATION\n   • Enter the tournament name and date — both appear on the standings header and the downloadable screenshot.\n   • Paste or type one player name per line, then press Add Players. Tap any name to edit or delete.\n   • The recommended round count appears below the list (e.g. 8 players → 3 rounds).\n\n3. THE ROUND VIEW\n   • Each pairing is a coloured card: Side A (blue) vs Side B (orange). Tap "Wins" on the winning side, or "Draw".\n   • Re-shuffle Pairings (round 1 only, before submit) — randomise pairings again if players want a do-over.\n   • End Tournament (top-left, red) — close the event early at any point.\n   • Compact — fits more tables on screen, ideal for store displays.\n   • Projector — full-screen giant timer for a hall projector.\n   • Publish (QR icon) — generate a tournament ID + QR code so spectators can watch live in their own browser. Stop Sharing any time to delete the cloud copy.\n\n4. TIMER & PLAYER ACTIONS\n   • Start / Pause / Reset / ±1m on the timer bar. Mute disables the end-of-round beep.\n   • Tap any player name to open their trainer card with full match history. From here you can drop a player mid-tournament; in knockout mode their pending match auto-awards to the opponent.\n\n5. SUBMITTING & ENDING\n   • Submit Results & Next Round generates the next round automatically.\n   • On the final round the button becomes Submit Results & End Tournament — one click ends the event.\n   • Previous Round (bottom-left) re-opens the prior round if you need to fix a result.\n\n6. STANDINGS & SHARING\n   • Sorted by Match Points → OWP → OOMW (full tiebreaker ladder, details on the Swiss rules popup). Top 3 get gold / silver / bronze medals 🥇🥈🥉. WOScore and Byes shown as reference columns.\n   • Download as PNG — captures the standings table with a watermark, ready to post on social.\n\n7. BONUS TOOLS\n   • Lucky Wheel — random draw / prize giveaway with player import; "Exclude Top 3" shortcut for podium prizes.\n   • Advanced Recovery — rebuild a tournament from past round results if a device is lost.\n\nTIPS\n   • Switch language any time with the 中文 / EN button at the top-right.\n   • Spectators viewing a published tournament can pin their own match to the top with the Pin-your-match search box.',
                zh: '以下為各功能簡介與建議的活動流程。\n\n1. 選擇賽制（主畫面）\n   • 瑞士制（Swiss）— 每位玩家打相同輪數，適合 4–32 人。\n   • 淘汰賽（Knockout）— 單敗淘汰，輸掉一場即出局。\n\n2. 報名登記\n   • 輸入賽事名稱與日期，會顯示於排名頁面與下載圖片上。\n   • 一行貼上一位玩家姓名，按「加入玩家」。點擊名字可編輯或刪除。\n   • 列表下方會顯示建議輪數（例如 8 人 → 3 輪）。\n\n3. 輪次畫面\n   • 每組對局以彩色卡片呈現：A 方（藍）對 B 方（橘）。點擊獲勝方的「勝」鈕，或「和」。\n   • 重新配對（僅第 1 輪、提交結果前）— 一鍵重新隨機配對。\n   • 結束賽事（左上角紅色按鈕）— 任何時候提前結束賽事。\n   • 緊湊模式（Compact）— 一頁顯示更多桌次，適合店內展示。\n   • 投影模式（Projector）— 全螢幕巨型計時器，適合會場投影機。\n   • 發佈（QR 圖示）— 產生賽事 ID 與 QR 碼，觀眾可在自己的瀏覽器即時觀看。可隨時停止分享以刪除雲端副本。\n\n4. 計時器與玩家操作\n   • 計時器列：開始 / 暫停 / 重置 / ±1 分；靜音可關閉結束提示音。\n   • 點擊玩家名字可開啟訓練家卡片，查看完整對戰紀錄；亦可在賽事中將該玩家標記為退賽。淘汰賽模式下，其未進行的對局會自動判給對手。\n\n5. 提交與結束\n   • 「提交結果並進入下一輪」會自動產生下一輪配對。\n   • 最後一輪的按鈕會變為「提交結果並結束賽事」，一鍵結束賽事。\n   • 「上一輪」（左下角）可回到前一輪修改結果。\n\n6. 排名與分享\n   • 依勝點 → OWP → OOMW 排序（完整決勝順位，詳見瑞士制規則說明）。前三名顯示金 / 銀 / 銅獎牌 🥇🥈🥉。另提供 WOScore 與 Byes 作參考欄。\n   • 下載為圖片（PNG）— 含浮水印，可直接分享到社群媒體。\n\n7. 進階工具\n   • 幸運轉盤（Lucky Wheel）— 隨機抽獎，可匯入玩家名單；「排除前三名」快速鈕適合頒獎場合。\n   • 進階回復（Advanced Recovery）— 若裝置遺失，可由過去輪次結果重建賽事。\n\n小提醒\n   • 右上角「中文 / EN」按鈕可隨時切換語言。\n   • 觀看已發佈賽事的觀眾，可在「鎖定我的對局」搜尋框輸入名字，將自己的對局置頂。'
            }
        }
    ];

    function localizedUpdate(u) {
        const lang = currentLang === 'zh' ? 'zh' : 'en';
        return { date: u.date, title: u.title[lang] || u.title.en, body: u.body[lang] || u.body.en };
    }

    function renderUpdates() {
        const list = document.getElementById('updates-list');
        if (!list) return;
        const top = UPDATES.slice(0, 3);
        list.innerHTML = top.map((u, i) => {
            const lu = localizedUpdate(u);
            return `<li class="updates-item" onclick="app.openUpdateDetail(${i})">
                <span class="updates-date">${lu.date}</span>
                <span class="updates-title">${escapeHtml(lu.title)}</span>
            </li>`;
        }).join('');
    }

    let updatesDetailFromList = false;

    function openUpdatesList() {
        const list = document.getElementById('updates-full-list');
        if (list) {
            list.innerHTML = UPDATES.map((u, i) => {
                const lu = localizedUpdate(u);
                return `<li class="updates-item" onclick="app.openUpdateDetail(${i}, true)">
                    <span class="updates-date">${lu.date}</span>
                    <span class="updates-title">${escapeHtml(lu.title)}</span>
                </li>`;
            }).join('');
        }
        const overlay = document.getElementById('updates-list-overlay');
        if (overlay) overlay.classList.add('open');
    }

    function closeUpdatesList() {
        const overlay = document.getElementById('updates-list-overlay');
        if (overlay) overlay.classList.remove('open');
    }

    function openUpdateDetail(idx, fromList) {
        const u = UPDATES[idx];
        if (!u) return;
        const lu = localizedUpdate(u);
        const dateEl = document.getElementById('updates-detail-date');
        const titleEl = document.getElementById('updates-detail-title');
        const bodyEl = document.getElementById('updates-detail-body');
        if (dateEl) dateEl.textContent = lu.date;
        if (titleEl) titleEl.textContent = lu.title;
        if (bodyEl) bodyEl.textContent = lu.body;
        updatesDetailFromList = !!fromList;
        // Hide the list modal while the detail is open, but remember to restore on close.
        closeUpdatesList();
        const overlay = document.getElementById('updates-detail-overlay');
        if (overlay) overlay.classList.add('open');
    }

    function closeUpdatesDetail() {
        const overlay = document.getElementById('updates-detail-overlay');
        if (overlay) overlay.classList.remove('open');
        if (updatesDetailFromList) {
            updatesDetailFromList = false;
            openUpdatesList();
        }
    }

    // ---- PAIRING HELP (rules per format) ----
    const PAIRING_HELP = {
        swiss: {
            label: { en: 'SWISS FORMAT', zh: '瑞士制' },
            title: { en: 'Swiss pairing rules', zh: '瑞士制配對規則' },
            body: {
                en: 'Swiss pairings group players with similar match records together each round, without eliminating anyone.\n\nHOW PAIRINGS ARE GENERATED\n   • Round 1: players are randomly shuffled, then paired top-to-bottom.\n   • Round 2 onwards: players are sorted by match points. Highest scorers are paired first.\n\nSCORING (TWO MODES, PICKED ON THE REGISTRATION PAGE)\n   • Default — Win 3, Loss 1, Draw 0 (rewards showing up; draws score nothing).\n   • Standard Swiss — Win 3, Draw 1, Loss 0. Tick the "Standard Swiss scoring" checkbox on the registration page to switch.\n   • Bye is always counted as an automatic Win (3 points).\n   • Scoring is locked once the tournament starts.\n\nAVOIDING REMATCHES\n   • The app uses a backtracking algorithm to find a pairing where no two players have already faced each other this tournament.\n   • If a no-rematch pairing is mathematically impossible (e.g. round 4 with only 4 players left), the closest-ranked rematch is allowed and a warning is logged to the browser console.\n\nBYE (ODD PLAYER COUNT)\n   • If the player count is odd, the lowest-ranked player who has not yet had a bye receives one.\n   • A bye counts as a win and is worth 3 match points; the player skips that round.\n   • The same player will not get a bye twice unless every other player has already had one.\n\nTIEBREAKERS (STANDINGS)\n   • Match Points (MP) first — the primary ranking.\n   • Then OWP (Opponents\' Match-Win %) — average match-win rate of every opponent you faced. Each opponent has a floor of 0.25 so a single zero-win opponent can\'t sink your score. Rewards beating tough fields.\n   • Then OOMW (Opponents\' Opponents\' Match-Win %) — the average OWP of your opponents. Used when OWP is still tied.\n   • WOScore (sum of your opponents\' match points) and Byes (count of byes received) are shown for transparency; they are NOT used for sorting.\n   • Byes are never counted as opponents — if you had a bye, that round does not contribute to OWP/OOMW/WOScore.\n   • Players still tied after all three tiebreakers are listed in registration order.\n\nRECOMMENDED ROUND COUNT\n   • The app suggests ⌈log₂(N)⌉ rounds for N players (e.g. 8 → 3, 16 → 4, 32 → 5). You can always end early or run extra rounds.\n\nDROP PLAYER\n   • Open a player\'s trainer card and tap Drop Player to remove them from future pairings. Their existing results stay on record. Tap Undo Drop to reinstate.',
                zh: '瑞士制將戰績相近的玩家配對在一起，整個過程不淘汰任何人。\n\n配對方式\n   • 第 1 輪：隨機洗牌後依序配對。\n   • 第 2 輪起：依勝點排序，高分者優先配對。\n\n計分（兩種模式，於報名頁面選擇）\n   • 預設 — 勝 3 分、負 1 分、和 0 分（鼓勵到場參賽，和局不計分）。\n   • 標準瑞士制 — 勝 3 分、和 1 分、負 0 分。在報名頁面勾選「標準瑞士制計分」即可切換。\n   • 輪空一律視為自動勝場（3 分）。\n   • 賽事開始後，計分模式將鎖定。\n\n避免重複對局\n   • 系統使用回溯演算法，盡可能讓本次賽事中沒有任何兩位玩家再次相遇。\n   • 若數學上無法避免（例如第 4 輪只剩 4 人），則允許戰績最相近的重複對局，並在瀏覽器主控台記錄警告。\n\n輪空（玩家人數為奇數時）\n   • 由尚未獲得輪空、戰績最低者獲得輪空。\n   • 輪空計為勝場，獲得 3 勝點，該輪不需出戰。\n   • 同一位玩家不會獲得兩次輪空，除非全員都已輪空過。\n\n排名分小（決勝順位）\n   • 先比勝點（MP）— 主排序。\n   • 再比 OWP（對手勝率）— 你所有對手的平均勝率。每位對手最低以 0.25 計算，避免因一位全敗對手拉低分數。獎勵擊敗強敵者。\n   • 再比 OOMW（對手的對手勝率）— 你所有對手的 OWP 平均值；在 OWP 同分時使用。\n   • 另顯示 WOScore（對手總積分）與 Byes（輪空次數）作透明度參考，不參與排序。\n   • 輪空不計為對手 — 輪空那一輪不會影響 OWP／OOMW／WOScore。\n   • 三項皆同分者依報名順序排列。\n\n建議輪數\n   • 系統依 ⌈log₂(N)⌉ 推薦輪數（例如 8 人 → 3 輪、16 人 → 4 輪、32 人 → 5 輪）。可自行提前結束或加打額外輪次。\n\n退賽\n   • 開啟玩家訓練家卡片並點擊「玩家退賽」，即可從後續配對中移除該玩家；既有對戰結果仍會保留。再點「取消退賽」可恢復。'
            }
        },
        knockout: {
            label: { en: 'KNOCKOUT FORMAT', zh: '淘汰賽' },
            title: { en: 'Knockout pairing rules', zh: '淘汰賽配對規則' },
            body: {
                en: 'Knockout (single-elimination) pairings build a bracket where the loser of each match is out.\n\nBRACKET CONSTRUCTION (ROUND 1)\n   • All registered players are randomly shuffled into a seed list.\n   • Bracket size = the next power of 2 greater than or equal to the player count. Example: 11 players → 16-slot bracket.\n   • Empty slots become byes for the top seeds, who advance automatically without playing.\n\nSTANDARD SEED ORDER\n   • Pairings follow the conventional knockout order: 1 vs N, 4 vs N-3, 5 vs N-4, … 2 vs N-1, 3 vs N-2, …\n   • This guarantees the strongest seeds only meet in later rounds.\n   • Example for 8 players: 1v8, 4v5, 2v7, 3v6.\n\nSUBSEQUENT ROUNDS\n   • The winner of each match is paired with the winner of the adjacent match, preserving bracket structure.\n   • Round names follow the remaining player count: Round of 16 → Quarterfinal → Semifinal → Final.\n\nFINAL ROUND\n   • When only one match remains, the Submit button becomes Submit Results & End Tournament. One click crowns the champion.\n\nDROP PLAYER (KNOCKOUT-AWARE)\n   • If a player drops mid-bracket BEFORE their pending round is submitted, their match auto-awards to their opponent so the bracket can advance.\n   • If their match is already complete, dropping them only updates the standings tag.\n\nDRAWS\n   • Knockout has no draws by design — each match must produce a winner. The Draw button still appears today; we plan to hide it in a future update.\n\nWHEN TO USE\n   • Best for 4–32 players when you want a quick champion rather than full Swiss-style ranking.\n   • For Best-of-3 or manual seeding, use Swiss + a custom round count instead — bracket-tree visualisation and manual seeding are on the roadmap.',
                zh: '淘汰賽（單敗）採用標準括號賽制，每場比賽輸方即出局。\n\n第 1 輪括號建立\n   • 所有報名玩家隨機洗牌後排入種子列表。\n   • 括號大小 = 大於或等於玩家數的最小 2 的次方。例如：11 人 → 16 籤位。\n   • 空缺籤位由高種子玩家獲得輪空，自動晉級無需出賽。\n\n標準種子順序\n   • 採用傳統淘汰賽順序：1 對 N、4 對 N-3、5 對 N-4⋯ 2 對 N-1、3 對 N-2⋯\n   • 這能確保最強的種子要到後期才會碰頭。\n   • 8 人範例：1對8、4對5、2對7、3對6。\n\n後續輪次\n   • 每場勝者與相鄰場次的勝者配對，保留括號結構。\n   • 輪次名稱依剩餘人數命名：16 強 → 8 強 → 準決賽 → 決賽。\n\n決賽\n   • 僅剩一場比賽時，提交按鈕會變為「提交結果並結束賽事」。一鍵決出冠軍。\n\n退賽（淘汰賽特殊處理）\n   • 若玩家在所屬輪次提交結果前退賽，該對局會自動判給對手，使賽程繼續。\n   • 若該場已完成，退賽只會在排名加註標記。\n\n和局\n   • 淘汰賽本質上不允許和局，每場必須分出勝負。目前畫面仍會顯示「和」鈕，未來版本將予以隱藏。\n\n適用情境\n   • 適合 4–32 人快速分出冠軍，不需完整的瑞士制小分。\n   • 若需 BO3 或手動種子，目前可改用瑞士制並調整輪數；括號樹視圖與手動種子已在規劃中。'
            }
        },
        spinBattle: {
            label: { en: 'SPIN BATTLE (TESTING)', zh: '陀螺對戰（測試版）' },
            title: { en: 'Spin Battle rules (Beyblade-X-style)', zh: '陀螺對戰規則（Beyblade X 系統）' },
            body: {
                en: 'Spin Battle Tournament uses Beyblade-X-style points scoring on top of the existing Swiss / Knockout pairing engine.\n\nMATCH FORMAT\n   • Each match consists of multiple battles. First battler to reach the target points (default 4 in Swiss, organizers may set 7 for top-cut) wins the match.\n   • The match auto-locks the moment a side hits the target.\n\nBATTLE FINISHES (POINTS PER BATTLE)\n   • Survivor Finish (+1) — opponent\'s Bey stops spinning before yours.\n   • Burst Finish (+2) — opponent\'s Bey bursts apart (Blade / Ratchet / Bit detaches).\n   • Knock Out Finish (+2) — opponent\'s Bey knocked into the side knockout zone.\n   • Xtreme Finish (+3) — opponent\'s Bey lands in the central Xtreme zone (Beyblade X exclusive).\n   • Stadium Out (+3, optional) — opt-in on the registration page; not in the official Hasbro / Takara Tomy ruleset.\n\n3-on-3 BEYS\n   • Each battler brings 3 different Beys. No Blade, Ratchet or Bit may repeat between your 3 Beys.\n   • Register Beys via the per-player button on the registration page, or scan a QR you saved from a previous event.\n   • Tournament can start with missing registrations — those battlers get a ⚠ badge in the round view.\n\nHOW TO ENTER RESULTS\n   • Tap a player card → cross popup with 4 finish buttons (motion-based: Xtreme up, Knock Out right, Survivor down, Burst left).\n   • Tap a finish → in 3-on-3 mode, choose which Bey scored (shows real Blade names if Beys are registered).\n   • Live points update; once a side hits the target, match locks. Tap "Undo" to roll back the most recent entry.\n\nPENALTIES & MALFUNCTIONS (per official rules)\n   • Open the ⚠ panel under each match for three counters:\n     – Launch error: 2 in same battle → opponent +1, battle replays\n     – Warning: 1st = warn, 2nd = +1 to opponent, 3rd = DQ (opponent wins match)\n     – Malfunction: 3 in same match → opponent wins\n\nMATCH WIN → STANDINGS\n   • The winner gets the standard match-win (3 points by default scoring) just like TCG matches.\n   • Tiebreakers: Match Points → OWP → OOMW → BattlePts (sum of points scored across all matches).\n   • Standings 7th column shows BattlePts instead of WOScore.\n\nThe pairing engine itself (Swiss buckets, Knockout brackets, byes, OWP/OOMW) works exactly the same as TCG mode — only the per-match result entry and tiebreaker column change.',
                zh: '陀螺對戰賽事採用 Beyblade X 風格的逐回合計分制度，配對引擎沿用既有的瑞士制／淘汰賽。\n\n對局形式\n   • 每場對局由多回合組成。先達到目標分數（瑞士制預設 4 分；最終 8 強建議改為 7 分）的一方贏得整場對局。\n   • 一方達標後，本場對局自動鎖定。\n\n回合勝法（每回合得分）\n   • 存活擊倒（+1） — 對手的陀螺先你停止旋轉。\n   • 爆裂（+2） — 對手的陀螺解體（Blade／Ratchet／Bit 分離）。\n   • 擊出（+2） — 對手的陀螺被擊入側邊擊倒區。\n   • 中央擊倒（+3） — 對手的陀螺落入中央 Xtreme 凹槽（Beyblade X 限定）。\n   • 台外（+3，可選） — 在報名頁可選擇開啟；非 Hasbro／Takara Tomy 官方規則。\n\n3-on-3 陀螺\n   • 每位選手帶 3 顆陀螺。3 顆陀螺之間，Blade、Ratchet、Bit 三類零件均不可重複。\n   • 報名頁面每位選手卡片旁有「陀螺」按鈕可登記，亦可掃描之前活動儲存的 QR。\n   • 即使未登記陀螺，賽事仍可開始 — 該選手在對局畫面會顯示 ⚠ 標記。\n\n如何輸入結果\n   • 點擊玩家卡片 → 十字面板彈出 4 種勝法（按運動方向擺放：中央在上、擊出在右、存活在下、爆裂在左）。\n   • 點擊勝法 → 3-on-3 模式下再選擇是哪一顆陀螺取勝（已登記時顯示真實 Blade 名稱）。\n   • 分數即時更新；任一方達標後對局自動鎖定。「返回」按鈕可撤銷最近一筆紀錄。\n\n判罰／故障（依官方規則）\n   • 每場對局下方「⚠ 判罰／故障」面板含 3 個計數器：\n     – 發射失誤：同一回合 2 次 → 對手 +1，本回合重打\n     – 警告：第 1 次警告，第 2 次對手 +1，第 3 次直接判負\n     – 器材故障：同一對局 3 次 → 對手贏\n\n對局勝負 → 排名\n   • 整場對局勝者依預設計分獲得勝點（3 分），與 TCG 模式相同。\n   • 決勝順位：勝點 → OWP → OOMW → BattlePts（整個賽事中累積的回合得分）。\n   • 陀螺對戰模式下，排名表第 7 欄顯示 BattlePts 而非 WOScore。\n\n配對引擎本身（瑞士制分組、淘汰賽框架、輪空、OWP／OOMW）與 TCG 模式完全相同，僅有對局結果輸入方式與排名第 7 欄的決勝指標有所不同。'
            }
        }
    };

    function openPairingHelp(format) {
        let type;
        if (format && PAIRING_HELP[format]) {
            type = format;
        } else if (state.gameType === 'spin-battle') {
            type = 'spinBattle';
        } else if (state.tournamentType === 'knockout') {
            type = 'knockout';
        } else {
            type = 'swiss';
        }
        const help = PAIRING_HELP[type];
        if (!help) return;
        const lang = currentLang === 'zh' ? 'zh' : 'en';
        const labelEl = document.getElementById('pairing-help-format');
        const titleEl = document.getElementById('pairing-help-title');
        const bodyEl = document.getElementById('pairing-help-body');
        if (labelEl) labelEl.textContent = help.label[lang] || help.label.en;
        if (titleEl) titleEl.textContent = help.title[lang] || help.title.en;
        if (bodyEl) bodyEl.textContent = help.body[lang] || help.body.en;
        const overlay = document.getElementById('pairing-help-overlay');
        if (overlay) overlay.classList.add('open');
    }

    function closePairingHelp() {
        const overlay = document.getElementById('pairing-help-overlay');
        if (overlay) overlay.classList.remove('open');
    }

    // ---- ANALYTICS (GA4) ----
    function track(event, params) {
        if (viewOnly) return;
        if (typeof window.gtag !== 'function') return;
        try { window.gtag('event', event, params || {}); } catch (_) {}
    }

    // ---- TOURNAMENT MODE PICKER ----
    function startNewTournament(type) {
        if (viewOnly) return;
        // Coming from home: clear any prior tournament state and go to registration
        // tagged with the chosen type. Don't clear players if user just picked a type
        // change while the registration list already has entries — instead confirm.
        if (state.tournamentStarted) {
            if (!confirm(t('reset.confirm'))) return;
            for (let i = 0; i < 50; i++) {
                localStorage.removeItem(`ptcg_round_${i}`);
            }
            state = {
                ...DEFAULT_STATE,
                players: [],
                rounds: [],
                wheelNames: state.wheelNames,
                wheelHistory: state.wheelHistory
            };
            stopTimer();
        }
        // The home tiles pass either a TCG type ('swiss' / 'knockout') or a spin-battle
        // type ('spin-swiss' / 'spin-knockout'). Split into (gameType, tournamentType).
        if (type === 'spin-swiss') {
            state.gameType = 'spin-battle';
            state.tournamentType = 'swiss';
        } else if (type === 'spin-knockout') {
            state.gameType = 'spin-battle';
            state.tournamentType = 'knockout';
        } else {
            state.gameType = 'tcg';
            state.tournamentType = type;
        }
        saveState();
        navigateTo('registration');
    }

    // ---- SWISS TOURNAMENT ----
    function startTournament() {
        if (viewOnly) return;
        if (state.players.length < 2) return;
        if (state.tournamentType === 'knockout') {
            return startKnockoutTournament();
        }
        if (!confirm(t('reg.confirmStart', { n: state.players.length }))) return;

        state.players.forEach(p => {
            p.matchPoints = 0;
            p.wins = 0;
            p.losses = 0;
            p.draws = 0;
            p.opponents = [];
            p.hadBye = false;
        });

        state.tournamentStarted = true;
        state.tournamentEnded = false;
        state.rounds = [];
        state.currentRound = 0;

        const pairings = generatePairings(0);
        state.rounds.push({ pairings, resultsSubmitted: false });
        saveRoundSnapshot(0);
        saveState();
        resetTimerValue();
        track('tournament_started', { format: 'swiss', player_count: state.players.length });
        navigateTo('round');
    }

    // ---- KNOCKOUT TOURNAMENT ----
    function startKnockoutTournament() {
        if (viewOnly) return;
        if (state.players.length < 2) return;
        if (!confirm(t('reg.confirmStart', { n: state.players.length }))) return;

        state.players.forEach(p => {
            p.matchPoints = 0;
            p.wins = 0;
            p.losses = 0;
            p.draws = 0;
            p.opponents = [];
            p.hadBye = false;
        });

        state.tournamentStarted = true;
        state.tournamentEnded = false;
        state.currentRound = 0;
        state.rounds = [buildKnockoutFirstRound(state.players)];
        saveRoundSnapshot(0);
        saveState();
        resetTimerValue();
        track('tournament_started', { format: 'knockout', player_count: state.players.length });
        navigateTo('round');
    }

    // Standard seed order for a bracket of size N: 1 vs N, 8 vs 9, 5 vs 12, ...
    function bracketSeedOrder(size) {
        let order = [1, 2];
        while (order.length < size) {
            const next = [];
            const sum = order.length * 2 + 1;
            for (const seed of order) {
                next.push(seed);
                next.push(sum - seed);
            }
            order = next;
        }
        return order; // 1-indexed seed numbers in slot order
    }

    function buildKnockoutFirstRound(players) {
        const active = players.filter(p => !p.dropped);
        const n = active.length;
        const seeds = [...active];
        shuffleArray(seeds); // random initial seeding
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(2, n))));
        const order = bracketSeedOrder(bracketSize); // length = bracketSize, 1-indexed
        const pairings = [];
        let tableNum = 1;
        for (let i = 0; i < bracketSize; i += 2) {
            const seedA = order[i];
            const seedB = order[i + 1];
            const playerA = seeds[seedA - 1] || null; // null = bye slot
            const playerB = seeds[seedB - 1] || null;
            // If either side is null, the other auto-advances
            if (!playerA && !playerB) continue;
            if (!playerA) {
                pairings.push({
                    table: 0, playerA: playerB.id, playerB: null,
                    result: 'bye', isBye: true
                });
            } else if (!playerB) {
                pairings.push({
                    table: 0, playerA: playerA.id, playerB: null,
                    result: 'bye', isBye: true
                });
            } else {
                pairings.push({
                    table: tableNum++, playerA: playerA.id, playerB: playerB.id, result: null
                });
            }
        }
        return { pairings, resultsSubmitted: false, knockout: true };
    }

    function buildKnockoutNextRound(prevRound) {
        // Winners of prevRound, in pairing order, become next-round players.
        // Pair adjacent winners: (w0,w1), (w2,w3), ...
        const winners = [];
        prevRound.pairings.forEach(p => {
            if (p.isBye) {
                winners.push(p.playerA);
            } else if (p.result === 'a') {
                winners.push(p.playerA);
            } else if (p.result === 'b') {
                winners.push(p.playerB);
            } else {
                winners.push(null);
            }
        });
        const pairings = [];
        let tableNum = 1;
        for (let i = 0; i < winners.length; i += 2) {
            const a = winners[i];
            const b = winners[i + 1];
            if (!a && !b) continue;
            if (!a || !b) {
                pairings.push({
                    table: 0, playerA: (a || b), playerB: null,
                    result: 'bye', isBye: true
                });
            } else {
                pairings.push({
                    table: tableNum++, playerA: a, playerB: b, result: null
                });
            }
        }
        return { pairings, resultsSubmitted: false, knockout: true };
    }

    function knockoutRoundLabel(remaining) {
        if (remaining === 2) return t('ko.final');
        if (remaining === 4) return t('ko.semi');
        if (remaining === 8) return t('ko.quarter');
        return t('ko.roundN', { n: remaining });
    }

    // Backtracking pairing: returns a flat [a1,b1,a2,b2,...] array with no rematches,
    // or null if impossible. Partners are tried in input order so the closest-ranked
    // rematch-free opponent is preferred.
    function pairUpNoRematch(players) {
        if (players.length === 0) return [];
        if (players.length % 2 !== 0) return null;
        const used = new Array(players.length).fill(false);
        const result = [];

        function backtrack() {
            let firstIdx = -1;
            for (let i = 0; i < players.length; i++) {
                if (!used[i]) { firstIdx = i; break; }
            }
            if (firstIdx === -1) return true;
            const a = players[firstIdx];
            used[firstIdx] = true;
            for (let j = firstIdx + 1; j < players.length; j++) {
                if (used[j]) continue;
                const b = players[j];
                if (a.opponents.includes(b.id)) continue;
                used[j] = true;
                result.push(a, b);
                if (backtrack()) return true;
                result.pop(); result.pop();
                used[j] = false;
            }
            used[firstIdx] = false;
            return false;
        }

        return backtrack() ? result : null;
    }

    function generatePairings(roundIndex) {
        let players = state.players.filter(p => !p.dropped);
        const pairings = [];
        let bye = null;

        // Handle odd number of players
        if (players.length % 2 !== 0) {
            const sorted = [...players].sort((a, b) => a.matchPoints - b.matchPoints);
            bye = sorted.find(p => !p.hadBye) || sorted[0];
            players = players.filter(p => p.id !== bye.id);
        }

        if (roundIndex === 0) {
            shuffleArray(players);
        } else {
            players.sort((a, b) => b.matchPoints - a.matchPoints);
        }

        // Backtracking: strictly avoid rematches when possible.
        // Players are visited in their current order (sorted by MP for round > 0),
        // so the first valid pairing kept is the closest-ranked rematch-free option.
        const ordered = pairUpNoRematch(players);
        if (ordered) {
            players = ordered;
        } else {
            // Mathematically impossible to fully avoid rematches; fall back and warn.
            console.warn('No rematch-free pairing exists for this round; allowing rematches as a fallback.');
        }

        let tableNum = 1;
        for (let i = 0; i < players.length; i += 2) {
            pairings.push({
                table: tableNum++,
                playerA: players[i].id,
                playerB: players[i + 1].id,
                result: null
            });
        }

        if (bye) {
            pairings.push({
                table: 0,
                playerA: bye.id,
                playerB: null,
                result: 'bye',
                isBye: true
            });
        }

        return pairings;
    }

    function renderRound() {
        const round = state.rounds[state.currentRound];
        if (!round) return;

        // Toggle a body class so spin-battle mode can hide the round timer (Beyblade matches
        // are first-to-N points, not time-bound)
        document.body.classList.toggle('gametype-spin', state.gameType === 'spin-battle');

        let roundLabel;
        if (state.tournamentType === 'knockout') {
            const remaining = round.pairings.reduce((n, p) => n + (p.isBye ? 1 : 2), 0);
            roundLabel = t('ko.title', { label: knockoutRoundLabel(remaining) });
        } else {
            const recRounds = getPlannedRounds();
            roundLabel = recRounds
                ? t('round.titleOf', { n: state.currentRound + 1, m: recRounds })
                : t('round.title', { n: state.currentRound + 1 });
        }
        document.getElementById('round-title').textContent = roundLabel;

        const reshuffleBtn = document.getElementById('btn-reshuffle');
        if (reshuffleBtn) {
            const show = !viewOnly && state.currentRound === 0 && !round.resultsSubmitted;
            reshuffleBtn.style.display = show ? '' : 'none';
        }

        const container = document.getElementById('pairings-container');
        container.innerHTML = '';

        // Knockout: prepend a visual bracket-tree overview above the editable pairing list
        if (state.tournamentType === 'knockout') {
            const bracketHtml = renderKnockoutBracket();
            if (bracketHtml) {
                const bw = document.createElement('div');
                bw.className = 'bracket-wrap';
                bw.innerHTML = bracketHtml;
                container.appendChild(bw);
            }
        }

        round.pairings.forEach((pairing, pIdx) => {
            const playerA = getPlayer(pairing.playerA);
            const playerB = pairing.playerB ? getPlayer(pairing.playerB) : null;

            if (pairing.isBye) {
                const row = document.createElement('div');
                row.className = 'pairing-row bye-row';
                row.innerHTML = `
                    <div class="table-number">${t('round.bye')}</div>
                    <div>
                        <span class="pairing-player" onclick="app.showTrainerCard('${pairing.playerA}')">${escapeHtml(playerA.name)}</span>
                        <span class="bye-tag">${t('round.byeWin')}</span>
                    </div>
                `;
                container.appendChild(row);
                return;
            }

            const row = document.createElement('div');
            row.className = 'pairing-row';
            // Self-report markers — flag rows that came in from a player
            // self-report so the organizer can see at a glance which results
            // they didn't manually enter, and red-flag any disputed ones.
            if (pairing.disputed) row.classList.add('pairing-row-disputed');
            else if (pairing.selfReportedAt) row.classList.add('pairing-row-selfreported');

            let playerAClass = '';
            let playerBClass = '';
            if (pairing.result === 'a') { playerAClass = 'winner'; playerBClass = 'loser'; }
            else if (pairing.result === 'b') { playerAClass = 'loser'; playerBClass = 'winner'; }
            else if (pairing.result === 'draw') { playerAClass = 'draw'; playerBClass = 'draw'; }

            const disabled = round.resultsSubmitted ? 'style="pointer-events:none;opacity:0.6"' : '';

            // Inline status badge HTML — appended above the result buttons.
            // Owner can override either state via the existing setResult call
            // (bo3 / spin paths handle their own override entry points).
            const selfReportBadge = !viewOnly && (pairing.disputed || pairing.selfReportedAt)
                ? (pairing.disputed
                    ? `<div class="pairing-self-report-flag pairing-self-report-disputed" onclick="event.stopPropagation(); app.openDisputeReview(${pIdx})" title="玩家自報但對家不同意 — 點擊查看詳情">⚠ 玩家自報分歧（點擊查看）</div>`
                    : `<div class="pairing-self-report-flag pairing-self-report-confirmed" onclick="event.stopPropagation(); app.openDisputeReview(${pIdx})" title="玩家自報並雙方確認 — 點擊查看簽名">✓ 玩家自報</div>`)
                : '';

            if (state.gameType === 'spin-battle') {
                row.classList.add('pairing-row-spin');
                const target = state.matchTargetPoints || 4;
                const pa = pairing.pointsA || 0;
                const pb = pairing.pointsB || 0;
                const battles = pairing.battles || [];
                const matchDone = !!pairing.result;
                const locked = matchDone || round.resultsSubmitted;
                const log = battles.map((b, i) => {
                    const finishLabel = t('battle.' + b.finish);
                    const winnerPlayer = b.winner === 'a' ? playerA : playerB;
                    const winnerName = escapeHtml(winnerPlayer.name);
                    let beyTag = '';
                    if (b.bey) {
                        const beyEntry = winnerPlayer.deck && winnerPlayer.deck[b.bey - 1];
                        if (beyEntry && beyEntry.blade) {
                            beyTag = `<span class="spin-log-bey" title="${escapeHtml((beyEntry.blade||'') + ' / ' + (beyEntry.ratchet||'') + ' / ' + (beyEntry.bit||''))}">B${b.bey}: ${escapeHtml(beyEntry.blade)}</span> `;
                        } else {
                            beyTag = `<span class="spin-log-bey">B${b.bey}</span> `;
                        }
                    }
                    return `<div class="spin-log-row"><span class="spin-log-num">${i + 1}.</span> ${winnerName} ${beyTag}— ${finishLabel} (+${b.points})</div>`;
                }).join('');
                // Cross popup HTML — motion-based mapping (Option B):
                //   ↑ Xtreme +3 (knocked into central pocket)
                //   → Knock Out +2 (knocked sideways)
                //   ↓ Survivor +1 (still spinning at bottom)
                //   ← Burst +2 (parts fly outward)
                // In 3-on-3 mode, tapping a finish opens a 1-2-3 Bey picker instead of scoring directly.
                const crossFor = (side) => `
                    <div class="spin-cross" data-pidx="${pIdx}" data-side="${side}">
                        <button class="spin-cross-btn spin-cross-top spin-finish-xtreme"   onclick="event.stopPropagation(); app.spinPickFinish(${pIdx}, '${side}', 'xtreme')">${t('battle.xtreme')}</button>
                        <button class="spin-cross-btn spin-cross-right spin-finish-knockout" onclick="event.stopPropagation(); app.spinPickFinish(${pIdx}, '${side}', 'knockout')">${t('battle.knockout')}</button>
                        <button class="spin-cross-btn spin-cross-bottom spin-finish-survivor" onclick="event.stopPropagation(); app.spinPickFinish(${pIdx}, '${side}', 'survivor')">${t('battle.survivor')}</button>
                        <button class="spin-cross-btn spin-cross-left spin-finish-burst"    onclick="event.stopPropagation(); app.spinPickFinish(${pIdx}, '${side}', 'burst')">${t('battle.burst')}</button>
                        ${state.stadiumOutEnabled ? `<button class="spin-cross-btn spin-cross-extra spin-finish-stadium" onclick="event.stopPropagation(); app.spinPickFinish(${pIdx}, '${side}', 'stadium_out')">${t('battle.stadiumOut')}</button>` : ''}
                    </div>`;
                // Bey picker — replaces the cross when 3-on-3 + a finish is pending
                // If the player has a registered deck, show real Blade names; otherwise fall back to "Bey 1/2/3"
                const beyPickerFor = () => {
                    const winnerPlayer = spinPopupSide === 'a' ? playerA : playerB;
                    const deck = winnerPlayer && winnerPlayer.deck;
                    const beyBtn = (n) => {
                        const bey = deck && deck[n - 1];
                        const label = bey && bey.blade
                            ? `<span class="spin-bey-num">${n}</span><span class="spin-bey-name">${escapeHtml(bey.blade)}</span>`
                            : `<span class="spin-bey-num">${n}</span>`;
                        return `<button class="spin-bey-btn ${bey && bey.blade ? 'spin-bey-btn-named' : ''}" onclick="event.stopPropagation(); app.spinPickBey(${n})">${label}</button>`;
                    };
                    return `
                        <div class="spin-cross spin-bey-picker" data-pidx="${pIdx}" data-side="${spinPopupSide}">
                            <div class="spin-bey-label">${t('battle.whichBey')}</div>
                            <div class="spin-bey-row">${beyBtn(1)}${beyBtn(2)}${beyBtn(3)}</div>
                        </div>`;
                };
                const sideAOpen = !locked && spinPopupPairing === pIdx && spinPopupSide === 'a';
                const sideBOpen = !locked && spinPopupPairing === pIdx && spinPopupSide === 'b';
                const sideAttrs = (side, isOpen) => locked
                    ? `class="spin-side spin-side-${side} ${(side === 'a' ? pa : pb) >= target ? 'winner' : ''} spin-side-locked" onclick="app.showTrainerCard('${side === 'a' ? pairing.playerA : pairing.playerB}')"`
                    : `class="spin-side spin-side-${side} ${isOpen ? 'is-open' : ''}" onclick="app.toggleSpinPopup(${pIdx}, '${side}')"`;
                // Small "i" info button on each card → opens trainer card popup. stopPropagation
                // so it doesn't also trigger the card's onclick (toggleSpinPopup / scoring).
                const infoBtn = (pid) => `<button class="spin-info-btn" onclick="event.stopPropagation(); app.showTrainerCard('${pid}')" title="${t('trainer.viewCard') || 'Player info'}" aria-label="${t('trainer.viewCard') || 'Player info'}">i</button>`;
                // Missing-Beys warning badge (3-on-3 only) — shown next to each player's name when their Beys aren't registered
                const beysWarn = (player) => (state.threeOnThreeMode !== false && !validateDeck(player.deck).ok)
                    ? `<span class="spin-name-warn" title="${t('deck.missing')}">⚠</span>` : '';
                row.innerHTML = `
                    <div class="spin-row-header">
                        <div class="table-number">T${pairing.table}</div>
                        <div class="spin-row-status">${matchDone ? t('battle.matchComplete') : t('battle.firstTo', { n: target })}</div>
                    </div>
                    <div class="spin-scoreboard">
                        <div ${sideAttrs('a', sideAOpen)}>
                            ${infoBtn(pairing.playerA)}
                            <div class="spin-name">${beysWarn(playerA)}${escapeHtml(playerA.name)}</div>
                            <div class="spin-points"><span class="spin-points-num">${pa}</span><span class="spin-points-target">/${target}</span></div>
                            ${sideAOpen ? (spinPendingFinish ? beyPickerFor() : crossFor('a')) : ''}
                        </div>
                        <div class="spin-vs">vs</div>
                        <div ${sideAttrs('b', sideBOpen)}>
                            ${infoBtn(pairing.playerB)}
                            <div class="spin-name">${beysWarn(playerB)}${escapeHtml(playerB.name)}</div>
                            <div class="spin-points"><span class="spin-points-num">${pb}</span><span class="spin-points-target">/${target}</span></div>
                            ${sideBOpen ? (spinPendingFinish ? beyPickerFor() : crossFor('b')) : ''}
                        </div>
                    </div>
                    ${!locked ? `<div class="spin-hint">${t('battle.tapToScore')}</div>` : ''}
                    ${matchDone && !round.resultsSubmitted ? `<div class="spin-hint spin-hint-locked">${t('battle.lockedHint')}</div>` : ''}
                    ${battles.length ? `<div class="spin-log">${log}</div>` : ''}
                    ${!locked ? renderSpinPenaltyBlock(pairing, pIdx) : ''}
                    <div class="spin-controls ${matchDone && !round.resultsSubmitted ? 'spin-controls-locked' : ''}">
                        <button class="btn btn-small ${matchDone && !round.resultsSubmitted ? 'btn-primary spin-undo-prominent' : 'btn-secondary'}" ${battles.length === 0 || round.resultsSubmitted ? 'disabled' : ''} onclick="app.undoSpinBattle(${pIdx})">↶ ${t('battle.undo')}</button>
                    </div>
                `;
                container.appendChild(row);
                return;
            }

            if (state.bestOfThree) {
                // Best of 3: render per-game tracker (Game 1, Game 2, Game 3)
                row.classList.add('pairing-row-bo3');
                const games = pairing.games || [];
                const gA = games.filter(g => g === 'a').length;
                const gB = games.filter(g => g === 'b').length;
                const matchLockedClass = pairing.result ? 'bo3-locked' : '';
                const gameRow = (gIdx) => {
                    const g = games[gIdx] || null;
                    return `<div class="bo3-game-row">
                        <span class="bo3-game-label">${t('bo3.game', { n: gIdx + 1 })}</span>
                        <button class="bo3-btn ${g === 'a' ? 'selected-win-a' : ''}" ${round.resultsSubmitted ? 'disabled' : ''} onclick="app.setBo3Game(${pIdx}, ${gIdx}, 'a')">${t('round.aWins')}</button>
                        <button class="bo3-btn ${g === 'draw' ? 'selected-draw' : ''}" ${round.resultsSubmitted ? 'disabled' : ''} onclick="app.setBo3Game(${pIdx}, ${gIdx}, 'draw')">${t('round.draw')}</button>
                        <button class="bo3-btn ${g === 'b' ? 'selected-win-b' : ''}" ${round.resultsSubmitted ? 'disabled' : ''} onclick="app.setBo3Game(${pIdx}, ${gIdx}, 'b')">${t('round.bWins')}</button>
                    </div>`;
                };
                row.innerHTML = `
                    <div class="bo3-header">
                        <div class="table-number">T${pairing.table}</div>
                        <div class="bo3-status ${matchLockedClass}">${pairing.result ? t('bo3.matchScore', { a: gA, b: gB }) : t('bo3.firstTo2')}</div>
                    </div>
                    <div class="bo3-players">
                        <div class="pairing-player side-a ${playerAClass}" onclick="app.showTrainerCard('${pairing.playerA}')"><span class="pairing-player-name">${escapeHtml(playerA.name)}</span></div>
                        <div class="bo3-vs"><span class="bo3-score-a">${gA}</span> – <span class="bo3-score-b">${gB}</span></div>
                        <div class="pairing-player side-b ${playerBClass}" onclick="app.showTrainerCard('${pairing.playerB}')" style="text-align:right"><span class="pairing-player-name">${escapeHtml(playerB.name)}</span></div>
                    </div>
                    <div class="bo3-games">
                        ${gameRow(0)}
                        ${gameRow(1)}
                        ${games.length >= 2 && gA < 2 && gB < 2 ? gameRow(2) : ''}
                    </div>
                `;
                container.appendChild(row);
                return;
            }

            row.innerHTML = `
                ${selfReportBadge}
                <div class="table-number">T${pairing.table}</div>
                <div class="pairing-player side-a ${playerAClass}" onclick="app.showTrainerCard('${pairing.playerA}')"><span class="pairing-player-name">${escapeHtml(playerA.name)}</span></div>
                <div class="result-buttons" ${disabled}>
                    <button class="result-btn ${pairing.result === 'a' ? 'selected-win-a' : ''}"
                        onclick="app.setResult(${pIdx}, 'a')">${t('round.aWins')}</button>
                    <button class="result-btn ${pairing.result === 'draw' ? 'selected-draw' : ''}"
                        onclick="app.setResult(${pIdx}, 'draw')">${t('round.draw')}</button>
                    <button class="result-btn ${pairing.result === 'b' ? 'selected-win-b' : ''}"
                        onclick="app.setResult(${pIdx}, 'b')">${t('round.bWins')}</button>
                </div>
                <div class="pairing-player side-b ${playerBClass}" onclick="app.showTrainerCard('${pairing.playerB}')" style="text-align:right"><span class="pairing-player-name">${escapeHtml(playerB.name)}</span></div>
            `;
            container.appendChild(row);
        });

        // Projector mode toggle
        updateProjectorMode();
        // Timer mute button
        updateMuteButton();
        applyCompactMode();
        updatePublishButton();
        renderSharePanel();
        updateSubmitButton();
        if (viewOnly) renderViewerPin();
        applyNoAds();
    }

    // ---- SELF-REPORT — Phase 1 (pass-the-phone) ----
    // Enabled when the viewer landed with &me=hk12345678 in the URL OR when
    // viewerPinName matches a trainer ID. Either gates the interactive
    // result buttons on the viewer's own pinned pairing. Final write goes
    // through the submitMatchReport callable so the reporter's identity can
    // be verified server-side. The owner subscribes to the matchReports
    // subcollection and auto-applies confirmed entries to local state.
    let selfReportTrainerId = '';        // 'hk12345678' lowercased; '' if not active
    let matchReports = [];               // latest matchReports snapshot
    let matchReportsUnsub = null;        // subscription unsubscribe fn
    const _appliedReportIds = new Set(); // session-local idempotency for owner auto-apply
    let _selfReportSheet = null;         // active modal element (if any)

    /* Attach the matchReports listener for `tid`. Idempotent — replaces any
       prior listener. Owner mode auto-applies confirmed reports to local
       state; viewer mode only re-renders to surface dispute / confirmed
       badges on the pinned card. */
    function attachMatchReportsListener(tid) {
        if (matchReportsUnsub) { try { matchReportsUnsub(); } catch (_) {} matchReportsUnsub = null; }
        if (!window.cloud || typeof window.cloud.subscribeMatchReports !== 'function') return;
        if (!tid) return;
        matchReportsUnsub = window.cloud.subscribeMatchReports(
            tid,
            (reports) => {
                matchReports = reports || [];
                if (!viewOnly) applyOwnerMatchReports(matchReports);
                try { renderRound(); } catch (_) {}
                try { renderViewerPin(); } catch (_) {}
            },
            (err) => { console.warn('[matchReports] listener error', err); }
        );
    }

    /* Owner auto-apply — for each confirmed report, set pairing.result if
       not already set; for each disputed report, flag pairing.disputed.
       Idempotent via _appliedReportIds set. Saves + syncs once at end. */
    function applyOwnerMatchReports(reports) {
        if (viewOnly || !state || !state.rounds) return;
        let mutated = false;
        for (const r of reports) {
            if (!r || !r.id) continue;
            if (_appliedReportIds.has(r.id)) continue;
            const round = state.rounds[r.roundIndex];
            if (!round) continue;
            const pairing = round.pairings && round.pairings[r.pairingIndex];
            if (!pairing || pairing.isBye) continue;
            if (round.resultsSubmitted) {
                // Round already locked — record id seen so we don't keep
                // looping; organizer can review the report doc separately.
                _appliedReportIds.add(r.id);
                continue;
            }
            if (r.status === 'confirmed') {
                if (pairing.result !== r.result) {
                    pairing.result = r.result;
                    pairing.selfReportedAt = (r.createdAt && r.createdAt.seconds)
                        ? r.createdAt.seconds * 1000
                        : Date.now();
                    pairing.selfReportedBy = r.reporterTrainerId || '';
                    pairing.disputed = false;
                    pairing.disputeReportId = null;
                    mutated = true;
                }
            } else if (r.status === 'disputed') {
                if (!pairing.disputed) {
                    pairing.disputed = true;
                    pairing.disputeReportId = r.id;
                    pairing.disputeResult = r.result;
                    mutated = true;
                }
            }
            _appliedReportIds.add(r.id);
        }
        if (mutated) {
            saveState();
            if (window.cloud && window.cloud.isReady && window.cloud.isReady()) {
                window.cloud.syncState(state);
            }
            try { updateSubmitButton && updateSubmitButton(); } catch (_) {}
        }
    }

    /* Resolve the viewer's identity → which player they are + side on the
       current round's pairing. Tries trainerId first (URL ?me= or pin
       search hit), then falls back to viewerPinName matching a player
       name. Returns null when no pinned player or no live pairing. */
    function resolveSelfReportContext() {
        if (!state || !state.players || !state.rounds) return null;
        const round = state.rounds[state.currentRound];
        if (!round) return null;
        let me = null;
        if (selfReportTrainerId) {
            me = state.players.find(p => p && (p.trainerId || '').toLowerCase() === selfReportTrainerId);
        }
        if (!me && viewerPinName) {
            const lc = viewerPinName.toLowerCase();
            me = state.players.find(p => {
                const pname = (p.name || '').toLowerCase();
                const ptid = (p.trainerId || '').toLowerCase();
                return pname === lc || ptid === lc;
            });
        }
        if (!me) return null;
        const pIdx = round.pairings.findIndex(p => !p.isBye && (p.playerA === me.id || p.playerB === me.id));
        if (pIdx < 0) return null;
        const pairing = round.pairings[pIdx];
        const side = pairing.playerA === me.id ? 'a' : 'b';
        const oppId = side === 'a' ? pairing.playerB : pairing.playerA;
        const opp = state.players.find(p => p && p.id === oppId);
        return { me, pairing, pairingIndex: pIdx, side, opp, round };
    }

    /* Open the pass-the-phone confirmation sheet. Reporter has just tapped
       a result on the viewer pin's interactive buttons. The opponent will
       sign here on the same device. */
    function openSelfReport(pairingIndex, result) {
        const ctx = resolveSelfReportContext();
        if (!ctx || ctx.pairingIndex !== pairingIndex) return;
        if (ctx.pairing.result) return;        // already resolved
        if (ctx.round.resultsSubmitted) return; // round locked
        if (state.gameType === 'spin-battle') return;  // not supported in MVP
        if (!ctx.opp) return;

        // Decide who won (by player name) so the opponent sees an unambiguous summary.
        let outcomeLabel;
        const meName = escapeHtml(ctx.me.name);
        const oppName = escapeHtml(ctx.opp.name);
        if (result === 'draw') {
            outcomeLabel = `<strong>${meName}</strong> 同 <strong>${oppName}</strong> 平手`;
        } else if ((result === 'a' && ctx.side === 'a') || (result === 'b' && ctx.side === 'b')) {
            outcomeLabel = `<strong>${meName}</strong> 勝（即 <strong>${oppName}</strong> 輸）`;
        } else {
            outcomeLabel = `<strong>${oppName}</strong> 勝（即 <strong>${meName}</strong> 輸）`;
        }

        // Mount sheet
        if (_selfReportSheet) closeSelfReport();
        const sheet = document.createElement('div');
        sheet.className = 'self-report-overlay';
        sheet.innerHTML = `
          <div class="self-report-sheet" role="dialog" aria-modal="true">
            <div class="self-report-head">
              <strong>📨 對家確認</strong>
              <button type="button" class="self-report-close" aria-label="Close">✕</button>
            </div>
            <div class="self-report-body">
              <p class="self-report-summary">${meName} 報咗：${outcomeLabel}</p>
              <p class="self-report-instruction">請將部機交俾 <strong>${oppName}</strong>，由佢 sign 確認。</p>
              <div class="self-report-sig-wrap">
                <canvas class="self-report-sig" width="600" height="180"></canvas>
                <div class="self-report-sig-overlay">${oppName} 喺呢度簽名</div>
                <button type="button" class="self-report-sig-clear">清除</button>
              </div>
              <p class="self-report-hint">呢個簽名留底，事後爭議主辦可以查證。</p>
              <div class="self-report-error" hidden></div>
            </div>
            <div class="self-report-actions">
              <button type="button" class="btn btn-danger self-report-dispute">❌ 唔同意（標紅旗）</button>
              <button type="button" class="btn btn-primary self-report-confirm" disabled>✓ 同意並確定</button>
            </div>
          </div>`;
        document.body.appendChild(sheet);
        _selfReportSheet = sheet;

        const canvas = sheet.querySelector('.self-report-sig');
        const overlay = sheet.querySelector('.self-report-sig-overlay');
        const confirmBtn = sheet.querySelector('.self-report-confirm');
        const errEl = sheet.querySelector('.self-report-error');
        const sig = setupSignatureCanvas(canvas, () => {
            overlay.style.display = 'none';
            confirmBtn.disabled = false;
        });

        sheet.querySelector('.self-report-close').addEventListener('click', closeSelfReport);
        sheet.querySelector('.self-report-sig-clear').addEventListener('click', () => {
            sig.clear();
            overlay.style.display = '';
            confirmBtn.disabled = true;
        });

        async function send(confirmed) {
            const dataURL = confirmed ? sig.toDataURL() : '';
            errEl.hidden = true;
            confirmBtn.disabled = true;
            sheet.querySelector('.self-report-dispute').disabled = true;
            try {
                const tid = state.publishedTournamentId || (window.cloud.getActiveTournamentId && window.cloud.getActiveTournamentId());
                if (!tid) throw new Error('呢場比賽未發佈到雲端，無法自報');
                if (!window.cloud || !window.cloud.isReady()) {
                    if (window.cloud && window.cloud.init) await window.cloud.init();
                }
                if (!window.cloud.isReady()) throw new Error('連線未就緒，請刷新再試');
                await window.cloud.submitMatchReport({
                    tournamentId: tid,
                    roundIndex: state.currentRound,
                    pairingIndex,
                    reporterPlayerId: ctx.me.id,
                    // Trainer ID bonus when player has one — server cross-checks.
                    reporterTrainerId: (ctx.me.trainerId || '').toLowerCase() || undefined,
                    result,
                    confirmedByOpponent: !!confirmed,
                    confirmSig: dataURL
                });
                closeSelfReport();
                // Surface a toast — the listener will update the pinned card on its own.
                showToast(confirmed ? '✅ 賽果已確認' : '⚠ 已標記分歧，主辦會處理');
            } catch (e) {
                console.error('[self-report] submit failed', e);
                let msg = '提交失敗';
                if (e && e.code === 'failed-precondition') msg = '呢場已經有結果或者 round 已關，請聯絡主辦';
                else if (e && e.code === 'permission-denied') msg = '只有對局兩位玩家可以報賽果';
                else if (e && e.code === 'already-exists') msg = '呢場已經報咗，主辦審核緊';
                else if (e && e.message) msg = e.message;
                errEl.textContent = msg;
                errEl.hidden = false;
                confirmBtn.disabled = sig.isEmpty();
                sheet.querySelector('.self-report-dispute').disabled = false;
            }
        }

        confirmBtn.addEventListener('click', () => send(true));
        sheet.querySelector('.self-report-dispute').addEventListener('click', () => {
            if (!confirm('標記為「對家不同意」之後，主辦會手動仲裁。要繼續嗎？')) return;
            send(false);
        });
    }

    function closeSelfReport() {
        if (_selfReportSheet && _selfReportSheet.parentNode) {
            _selfReportSheet.parentNode.removeChild(_selfReportSheet);
        }
        _selfReportSheet = null;
    }

    /* Owner-side dispute / audit review modal. Triggered when the organizer
       taps the «⚠ 玩家自報分歧» or «✓ 玩家自報» chip on a round-view row.
       Surfaces the original matchReports doc (reporter identity + claimed
       result + signature image / dispute reason) so the organizer can make
       an informed override. Confirmed reports show the opponent's signature
       as audit evidence; disputed reports show «對家不同意» banner. */
    function openDisputeReview(pairingIndex) {
        if (viewOnly) return;
        const round = state.rounds && state.rounds[state.currentRound];
        if (!round) return;
        const pairing = round.pairings && round.pairings[pairingIndex];
        if (!pairing) return;
        const reportId = pairing.disputeReportId
            || matchReports.find(r => r.roundIndex === state.currentRound && r.pairingIndex === pairingIndex)?.id;
        const report = matchReports.find(r => r.id === reportId)
            || matchReports.find(r => r.roundIndex === state.currentRound && r.pairingIndex === pairingIndex);
        if (!report) {
            showToast('搵唔到報告紀錄');
            return;
        }
        const pa = getPlayer(pairing.playerA);
        const pb = pairing.playerB ? getPlayer(pairing.playerB) : null;
        const reporterName = report.reporterSide === 'a'
            ? (pa ? pa.name : 'A')
            : (pb ? pb.name : 'B');
        const reportedOutcome = report.result === 'draw'
            ? '平手'
            : report.result === 'a'
                ? `${pa ? escapeHtml(pa.name) : 'A'} 勝`
                : `${pb ? escapeHtml(pb.name) : 'B'} 勝`;
        const isDispute = report.status === 'disputed';

        if (_selfReportSheet) closeSelfReport();
        const sheet = document.createElement('div');
        sheet.className = 'self-report-overlay';
        sheet.innerHTML = `
          <div class="self-report-sheet" role="dialog" aria-modal="true">
            <div class="self-report-head">
              <strong>${isDispute ? '⚠ 玩家自報分歧' : '✓ 玩家自報紀錄'}</strong>
              <button type="button" class="self-report-close" aria-label="Close">✕</button>
            </div>
            <div class="self-report-body">
              <p class="self-report-summary">
                <strong>${escapeHtml(reporterName)}</strong> 報咗：${reportedOutcome}
              </p>
              ${isDispute
                ? `<div class="self-report-error" style="display:block">
                    對家不同意呢個結果。主辦可選擇採用報告嘅結果，或者用下方按鈕自行裁決。
                  </div>`
                : (report.confirmSig
                    ? `<p class="self-report-instruction">對家簽名確認：</p>
                       <div class="dispute-sig-wrap">
                         <img src="${escapeHtml(report.confirmSig)}" alt="opponent signature" class="dispute-sig-img">
                       </div>`
                    : `<p class="self-report-instruction">已雙方確認（無簽名紀錄）。</p>`)
              }
              <p class="self-report-hint">
                報告 ID: <code>${escapeHtml(report.id)}</code><br>
                Reporter trainer: <code>${escapeHtml(report.reporterTrainerId || '—')}</code>
              </p>
            </div>
            <div class="self-report-actions">
              <button type="button" class="btn btn-secondary self-report-close-btn">關閉</button>
              ${isDispute
                ? `<button type="button" class="btn btn-primary self-report-accept">✓ 採用報告嘅結果</button>`
                : `<button type="button" class="btn btn-danger self-report-revert">✗ 撤銷此自報</button>`
              }
            </div>
          </div>`;
        document.body.appendChild(sheet);
        _selfReportSheet = sheet;
        sheet.querySelector('.self-report-close').addEventListener('click', closeSelfReport);
        sheet.querySelector('.self-report-close-btn').addEventListener('click', closeSelfReport);

        const acceptBtn = sheet.querySelector('.self-report-accept');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                // Apply the reporter's claimed result + clear dispute. setResult
                // would toggle, so we set the field directly and re-render.
                pairing.result = report.result;
                pairing.disputed = false;
                pairing.disputeReportId = null;
                pairing.disputeResult = null;
                pairing.organizerOverrode = false;
                pairing.selfReportedAt = (report.createdAt && report.createdAt.seconds)
                    ? report.createdAt.seconds * 1000 : Date.now();
                pairing.selfReportedBy = report.reporterTrainerId || '';
                saveState();
                renderRound();
                if (window.cloud && window.cloud.isReady && window.cloud.isReady()) {
                    window.cloud.syncState(state);
                }
                closeSelfReport();
                showToast('已採用玩家報告嘅結果');
            });
        }

        const revertBtn = sheet.querySelector('.self-report-revert');
        if (revertBtn) {
            revertBtn.addEventListener('click', () => {
                if (!confirm('撤銷會清除呢場嘅結果，主辦需要重新入分。確定？')) return;
                pairing.result = null;
                pairing.selfReportedAt = null;
                pairing.selfReportedBy = null;
                saveState();
                renderRound();
                if (window.cloud && window.cloud.isReady && window.cloud.isReady()) {
                    window.cloud.syncState(state);
                }
                closeSelfReport();
                showToast('已撤銷自報結果');
            });
        }
    }

    /* Vanilla-JS signature canvas. Returns { isEmpty, clear, toDataURL }.
       Uses devicePixelRatio for crisp output, supports mouse + touch. */
    function setupSignatureCanvas(canvas, onFirstStroke) {
        const ctx = canvas.getContext('2d');
        function fitDPR() {
            const ratio = window.devicePixelRatio || 1;
            const w = canvas.clientWidth || canvas.width;
            const h = canvas.clientHeight || canvas.height;
            canvas.width = Math.round(w * ratio);
            canvas.height = Math.round(h * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.lineWidth = 2.4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = getComputedStyle(canvas).color || '#fff';
        }
        // Wait for layout so clientWidth is non-zero.
        requestAnimationFrame(fitDPR);

        let drawing = false, lastX = 0, lastY = 0, hasDrawn = false;
        function pos(e) {
            const r = canvas.getBoundingClientRect();
            const t = e.touches && e.touches[0];
            const x = (t ? t.clientX : e.clientX) - r.left;
            const y = (t ? t.clientY : e.clientY) - r.top;
            return { x, y };
        }
        function start(e) {
            drawing = true;
            const p = pos(e);
            lastX = p.x; lastY = p.y;
        }
        function move(e) {
            if (!drawing) return;
            if (e.cancelable) e.preventDefault();
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            lastX = p.x; lastY = p.y;
            if (!hasDrawn) {
                hasDrawn = true;
                if (typeof onFirstStroke === 'function') onFirstStroke();
            }
        }
        function stop() { drawing = false; }
        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        canvas.addEventListener('mouseup', stop);
        canvas.addEventListener('mouseleave', stop);
        canvas.addEventListener('touchstart', start, { passive: true });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', stop);

        return {
            isEmpty: () => !hasDrawn,
            clear: () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                hasDrawn = false;
            },
            toDataURL: () => canvas.toDataURL('image/png')
        };
    }

    // ---- VIEWER PIN (player searches their own pairing in view-only mode) ----
    let viewerPinName = '';

    function viewerPinSearch(name) {
        viewerPinName = (name || '').trim();
        try { localStorage.setItem('ptcg_viewer_pin', viewerPinName); } catch (e) {}
        renderViewerPin();
    }

    function viewerPinClear() {
        viewerPinName = '';
        try { localStorage.removeItem('ptcg_viewer_pin'); } catch (e) {}
        const input = document.getElementById('viewer-pin-input');
        if (input) input.value = '';
        renderViewerPin();
    }

    function renderViewerPin() {
        if (!viewOnly) return;
        const wrap = document.getElementById('viewer-pin');
        if (!wrap) return;
        wrap.style.display = '';

        const input = document.getElementById('viewer-pin-input');
        if (input && input.value !== viewerPinName) input.value = viewerPinName;

        const dl = document.getElementById('viewer-pin-names');
        if (dl) {
            dl.innerHTML = (state.players || [])
                .map(p => `<option value="${escapeHtml(p.name)}"></option>`)
                .join('');
        }

        const result = document.getElementById('viewer-pin-result');
        if (!result) return;

        if (!viewerPinName) { result.innerHTML = ''; return; }

        const round = state.rounds[state.currentRound];
        const lc = viewerPinName.toLowerCase();
        // Match by name OR by trainer id (lets the player paste hk12345678
        // directly; needed to pin themselves for self-report mode).
        const tidLc = lc.replace(/^hk/, '').match(/^\d{8}$/) ? ('hk' + lc.replace(/^hk/, '')) : null;
        const me = (state.players || []).find(p => {
            const pname = (p.name || '').toLowerCase();
            const ptid = (p.trainerId || '').toLowerCase();
            return pname === lc || (tidLc && ptid === tidLc) || ptid === lc;
        });
        if (!me || !round) {
            result.innerHTML = `<div class="viewer-pin-empty">${escapeHtml(t('viewer.notFound'))}</div>`;
            return;
        }
        // If we matched via trainerId, auto-enable self-report mode for this player.
        // (URL ?me= takes priority but this catches manual paste cases too.)
        if (me.trainerId && !selfReportTrainerId) {
            selfReportTrainerId = (me.trainerId || '').toLowerCase();
        }
        const pairing = round.pairings.find(p => p.playerA === me.id || p.playerB === me.id);
        if (!pairing) {
            result.innerHTML = `<div class="viewer-pin-empty">${escapeHtml(t('viewer.noPairing'))}</div>`;
            return;
        }

        const pa = getPlayer(pairing.playerA);
        const pb = pairing.playerB ? getPlayer(pairing.playerB) : null;
        let html = `<div class="viewer-pin-label">${escapeHtml(t('viewer.yourMatch'))}</div>`;

        if (pairing.isBye) {
            html += `<div class="pairing-row bye-row pinned">
                <div class="table-number">${t('round.bye')}</div>
                <div>
                    <span class="pairing-player" data-player-id="${escapeHtml(pairing.playerA)}">${escapeHtml(pa.name)}</span>
                    <span class="bye-tag">${t('round.byeWin')}</span>
                </div>
            </div>`;
        } else if (state.gameType === 'spin-battle') {
            // Spin-battle pinned card — read-only scoreboard mirroring the publisher's view.
            const target = state.matchTargetPoints || 4;
            const ptsA = pairing.pointsA || 0, ptsB = pairing.pointsB || 0;
            const aWin = pairing.result === 'a';
            const bWin = pairing.result === 'b';
            html += `<div class="pairing-row pairing-row-spin pinned">
                <div class="spin-row-header">
                    <div class="table-number">T${pairing.table}</div>
                    <div class="spin-row-status">${pairing.result ? t('battle.matchComplete') : t('battle.firstTo', { n: target })}</div>
                </div>
                <div class="spin-scoreboard">
                    <div class="spin-side spin-side-a spin-side-locked ${aWin ? 'winner' : ''}" data-player-id="${escapeHtml(pairing.playerA)}">
                        <div class="spin-name">${escapeHtml(pa.name)}</div>
                        <div class="spin-points"><span class="spin-points-num">${ptsA}</span><span class="spin-points-target">/${target}</span></div>
                    </div>
                    <div class="spin-vs">vs</div>
                    <div class="spin-side spin-side-b spin-side-locked ${bWin ? 'winner' : ''}" data-player-id="${escapeHtml(pairing.playerB)}">
                        <div class="spin-name">${escapeHtml(pb.name)}</div>
                        <div class="spin-points"><span class="spin-points-num">${ptsB}</span><span class="spin-points-target">/${target}</span></div>
                    </div>
                </div>
            </div>`;
        } else {
            let aClass = '', bClass = '';
            if (pairing.result === 'a') { aClass = 'winner'; bClass = 'loser'; }
            else if (pairing.result === 'b') { aClass = 'loser'; bClass = 'winner'; }
            else if (pairing.result === 'draw') { aClass = 'draw'; bClass = 'draw'; }

            // Self-report eligibility — any pinned player whose pairing is
            // still open. Identity uses player.id (always unique within a
            // tournament). Trainer ID is bonus metadata when present. The
            // signature on the opponent's pass-the-phone confirmation is
            // the real auth boundary, not the URL gate.
            const canSelfReport = !!me.id
                && !pairing.result
                && !pairing.disputed
                && !round.resultsSubmitted;
            // Find the pairing index for the modal — the pairing variable
            // above is the object reference; we need its position.
            const pIdxForReport = round.pairings.indexOf(pairing);
            const pinIdx = pIdxForReport >= 0 ? pIdxForReport : -1;

            // Status note — disputed reports surface here for the player
            // (so they know the organizer is reviewing).
            let statusNote = '';
            if (pairing.disputed) {
                statusNote = `<div class="self-report-status self-report-status-disputed">⚠ 對家不同意，主辦審核中</div>`;
            } else if (pairing.selfReportedAt) {
                statusNote = `<div class="self-report-status self-report-status-confirmed">✓ 賽果已自報並確認</div>`;
            }

            const btnAttr = (canSelfReport && pinIdx >= 0)
                ? (r) => `onclick="app.openSelfReport(${pinIdx}, '${r}')"`
                : () => '';
            const btnsStyle = canSelfReport
                ? 'class="result-buttons self-report-on"'
                : 'class="result-buttons" style="pointer-events:none;opacity:0.85"';

            html += `<div class="pairing-row pinned">
                <div class="table-number">T${pairing.table}</div>
                <div class="pairing-player side-a ${aClass}" data-player-id="${escapeHtml(pairing.playerA)}">${escapeHtml(pa.name)}</div>
                <div ${btnsStyle}>
                    <button class="result-btn ${pairing.result === 'a' ? 'selected-win-a' : ''}" ${btnAttr('a')}>${t('round.aWins')}</button>
                    <button class="result-btn ${pairing.result === 'draw' ? 'selected-draw' : ''}" ${btnAttr('draw')}>${t('round.draw')}</button>
                    <button class="result-btn ${pairing.result === 'b' ? 'selected-win-b' : ''}" ${btnAttr('b')}>${t('round.bWins')}</button>
                </div>
                <div class="pairing-player side-b ${bClass}" data-player-id="${escapeHtml(pairing.playerB)}" style="text-align:right">${escapeHtml(pb.name)}</div>
            </div>${statusNote}`;
        }
        result.innerHTML = html;

        // Event delegation — works even if IDs contain characters that would break inline onclick strings.
        // Re-binds safely because we replaced innerHTML above; we also use a flag so we don't double-bind.
        if (!result._trainerDelegated) {
            result.addEventListener('click', (e) => {
                const el = e.target.closest('.pairing-player[data-player-id]');
                if (!el) return;
                const pid = el.getAttribute('data-player-id');
                if (pid) showTrainerCard(pid);
            });
            result._trainerDelegated = true;
        }
    }

    function setResult(pairingIndex, result) {
        if (viewOnly) return;
        const round = state.rounds[state.currentRound];
        if (!round || round.resultsSubmitted) return;

        const pairing = round.pairings[pairingIndex];
        if (pairing.isBye) return;

        // Toggle off if clicking same result
        if (pairing.result === result) {
            pairing.result = null;
        } else {
            pairing.result = result;
        }
        // Organizer override always clears any self-report dispute flag.
        // Their tap is the final word — keep the audit trail in matchReports
        // subcollection so we can still see what the players reported.
        if (pairing.disputed) {
            pairing.disputed = false;
            pairing.disputeReportId = null;
            pairing.disputeResult = null;
            pairing.organizerOverrode = true;
        }
        saveState();
        renderRound();
    }

    // ---- KNOCKOUT BRACKET — visual tree overview above the round view ----
    function renderKnockoutBracket() {
        if (state.tournamentType !== 'knockout' || !state.rounds.length) return '';
        // Compute total bracket size from round 1 (count of seats including byes)
        const r0 = state.rounds[0];
        if (!r0) return '';
        const seats = r0.pairings.reduce((n, p) => n + (p.isBye ? 1 : 2), 0);
        const totalRounds = Math.ceil(Math.log2(Math.max(2, seats)));
        const cols = [];
        for (let r = 0; r < totalRounds; r++) {
            const round = state.rounds[r];
            const expectedMatches = seats / Math.pow(2, r + 1);   // power-of-2 bracket size
            const matches = [];
            for (let m = 0; m < expectedMatches; m++) {
                const pairing = round && round.pairings && round.pairings[m];
                if (!pairing) {
                    matches.push(`<div class="bracket-match bracket-match-pending">${escapeHtml(t('bracket.tbd'))}</div>`);
                    continue;
                }
                const pa = getPlayer(pairing.playerA);
                const pb = pairing.playerB ? getPlayer(pairing.playerB) : null;
                const isBye = pairing.isBye;
                const aWin = pairing.result === 'a';
                const bWin = pairing.result === 'b';
                const isCurrent = r === state.currentRound && !pairing.result && !isBye;
                const aLabel = pa ? escapeHtml(pa.name) : '—';
                const bLabel = isBye ? escapeHtml(t('round.bye')) : (pb ? escapeHtml(pb.name) : '—');
                const aClick = pa ? `onclick="app.showTrainerCard('${escapeHtml(pa.id)}')"` : '';
                const bClick = pb ? `onclick="app.showTrainerCard('${escapeHtml(pb.id)}')"` : '';
                matches.push(`
                    <div class="bracket-match ${isCurrent ? 'bracket-match-current' : ''} ${pairing.result || isBye ? 'bracket-match-done' : ''}">
                        <div class="bracket-row ${aWin ? 'bracket-winner' : (bWin ? 'bracket-loser' : '')}" ${aClick}>${aLabel}</div>
                        <div class="bracket-row ${bWin ? 'bracket-winner' : (aWin ? 'bracket-loser' : '')} ${isBye ? 'bracket-bye-row' : ''}" ${bClick}>${bLabel}</div>
                    </div>
                `);
            }
            cols.push(`
                <div class="bracket-col" data-round="${r}">
                    <div class="bracket-col-label">${escapeHtml(knockoutRoundLabel(seats / Math.pow(2, r)))}</div>
                    <div class="bracket-col-matches">${matches.join('')}</div>
                </div>
            `);
        }
        return `
            <details class="bracket-details" open>
                <summary class="bracket-summary">${escapeHtml(t('bracket.title'))} <span class="bracket-summary-chev">▾</span></summary>
                <div class="bracket-scroll">
                    <div class="bracket-grid" data-rounds="${totalRounds}">
                        ${cols.join('')}
                    </div>
                </div>
            </details>
        `;
    }

    // ---- TCG Best-of-3 — per-game tracking ----
    function setBo3Game(pairingIndex, gameIndex, result) {
        if (viewOnly) return;
        const round = state.rounds[state.currentRound];
        if (!round || round.resultsSubmitted) return;
        const pairing = round.pairings[pairingIndex];
        if (!pairing || pairing.isBye) return;
        pairing.games = pairing.games || [];
        // Toggle off if clicking the same result on the same game (lets user clear a mis-tap)
        if (pairing.games[gameIndex] === result) {
            pairing.games[gameIndex] = null;
        } else {
            pairing.games[gameIndex] = result;
        }
        // If Game 1 set but Game 2 not yet → that's fine, just stored.
        // Compute match winner: first to 2 game wins. Draws don't count toward 2.
        const gA = pairing.games.filter(g => g === 'a').length;
        const gB = pairing.games.filter(g => g === 'b').length;
        if (gA >= 2)      pairing.result = 'a';
        else if (gB >= 2) pairing.result = 'b';
        else if (pairing.games.length >= 3 && gA === gB) {
            // 3 games played, no winner (rare in Bo3 with draws) → match draw
            pairing.result = 'draw';
        } else {
            pairing.result = null;
        }
        saveState();
        renderRound();
        updateSubmitButton();
    }

    // ---- SPIN BATTLE — per-battle finish entry ----
    const SPIN_FINISH_POINTS = { survivor: 1, burst: 2, knockout: 2, xtreme: 3, stadium_out: 3 };

    // Module-level popup state: which pairing+side currently has its cross-popup open. UI-only, not persisted.
    let spinPopupPairing = null;
    let spinPopupSide = null;
    // 3-on-3 deck mode: when a finish button is tapped, we hold it pending while the user picks a Bey.
    let spinPendingFinish = null;   // 'survivor' | 'burst' | 'knockout' | 'xtreme' | null
    let spinPopupBackdropBound = false;

    function toggleSpinPopup(pairingIndex, side) {
        if (viewOnly) return;
        const round = state.rounds[state.currentRound];
        if (!round || round.resultsSubmitted) return;
        const pairing = round.pairings[pairingIndex];
        if (!pairing || pairing.isBye || pairing.result) return;
        if (spinPopupPairing === pairingIndex && spinPopupSide === side) {
            // Same target tapped → close
            closeSpinPopup();
        } else {
            spinPopupPairing = pairingIndex;
            spinPopupSide = side;
            spinPendingFinish = null;
            renderRound();
            // Schedule a backdrop click handler + edge-flip pass after the DOM updates
            requestAnimationFrame(() => {
                bindSpinBackdrop();
                // Wait for the open animation to finish before flipping, so the spring isn't cut short
                setTimeout(applySpinCrossEdgeFlip, 180);
            });
        }
    }

    function closeSpinPopup() {
        if (spinPopupPairing === null) return;
        spinPopupPairing = null;
        spinPopupSide = null;
        spinPendingFinish = null;
        renderRound();
    }

    // Render the penalty panel block — collapsed toggle by default, expands to show 3 counters per side
    function renderSpinPenaltyBlock(pairing, pIdx) {
        const isOpen = spinPenaltyOpen === pIdx;
        const eA = pairing.errorsA || 0, eB = pairing.errorsB || 0;
        const wA = pairing.matchWarnsA || 0, wB = pairing.matchWarnsB || 0;
        const mA = pairing.malfunctionsA || 0, mB = pairing.malfunctionsB || 0;
        const anyTrigger = eA + eB + wA + wB + mA + mB > 0;
        const summary = anyTrigger
            ? `<span class="spin-pen-summary-active">⚠ A:${eA + wA + mA} B:${eB + wB + mB}</span>`
            : '';
        return `
            <div class="spin-penalty-block ${isOpen ? 'is-open' : ''}">
                <button class="spin-penalty-toggle" onclick="app.toggleSpinPenaltyPanel(${pIdx})">
                    <span>⚠ ${t('penalty.title')}</span>
                    ${summary}
                    <span class="spin-penalty-chev">${isOpen ? '▴' : '▾'}</span>
                </button>
                ${isOpen ? `
                    <div class="spin-penalty-grid">
                        <div class="spin-penalty-row">
                            <span class="spin-penalty-label" title="${t('penalty.launchErrorHint')}">${t('penalty.launchError')}</span>
                            <span class="spin-penalty-counters">
                                <button onclick="app.spinAddLaunchError(${pIdx},'a')">A <strong>${eA}</strong>/2</button>
                                <button onclick="app.spinAddLaunchError(${pIdx},'b')">B <strong>${eB}</strong>/2</button>
                            </span>
                        </div>
                        <div class="spin-penalty-row">
                            <span class="spin-penalty-label" title="${t('penalty.matchWarnHint')}">${t('penalty.matchWarn')}</span>
                            <span class="spin-penalty-counters">
                                <button onclick="app.spinAddMatchWarn(${pIdx},'a')">A <strong>${wA}</strong>/3</button>
                                <button onclick="app.spinAddMatchWarn(${pIdx},'b')">B <strong>${wB}</strong>/3</button>
                            </span>
                        </div>
                        <div class="spin-penalty-row">
                            <span class="spin-penalty-label" title="${t('penalty.malfunctionHint')}">${t('penalty.malfunction')}</span>
                            <span class="spin-penalty-counters">
                                <button onclick="app.spinAddMalfunction(${pIdx},'a')">A <strong>${mA}</strong>/3</button>
                                <button onclick="app.spinAddMalfunction(${pIdx},'b')">B <strong>${mB}</strong>/3</button>
                            </span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // ---- SPIN BATTLE — penalty counters (per official Beyblade X rules) ----
    // Returns the side that just hit a fatal threshold (DQ at 3rd warn, 3rd malfunction), or null
    function checkSpinPenaltyEnd(pairing, side, target) {
        const opp = side === 'a' ? 'b' : 'a';
        // 3rd DQ warning → opponent wins match
        if ((side === 'a' ? pairing.matchWarnsA : pairing.matchWarnsB) >= 3) {
            pairing.result = opp;
            return opp;
        }
        // 3rd malfunction → opponent wins match
        if ((side === 'a' ? pairing.malfunctionsA : pairing.malfunctionsB) >= 3) {
            pairing.result = opp;
            return opp;
        }
        return null;
    }

    // Increment per-battle launch error counter. On 2nd error in same battle: opponent +1pt, counter resets, "battle replayed"
    function spinAddLaunchError(pairingIndex, side) {
        if (viewOnly) return;
        const round = state.rounds[state.currentRound];
        if (!round || round.resultsSubmitted) return;
        const pairing = round.pairings[pairingIndex];
        if (!pairing || pairing.isBye || pairing.result) return;
        const key = side === 'a' ? 'errorsA' : 'errorsB';
        pairing[key] = (pairing[key] || 0) + 1;
        pairing.battles = pairing.battles || [];
        if (pairing[key] >= 2) {
            // Award +1 to opponent, reset error counter, log as a 'penalty' battle entry
            const oppSide = side === 'a' ? 'b' : 'a';
            const oppPointsKey = oppSide === 'a' ? 'pointsA' : 'pointsB';
            pairing[oppPointsKey] = (pairing[oppPointsKey] || 0) + 1;
            pairing[key] = 0;
            pairing.battles.push({ winner: oppSide, finish: 'penalty', points: 1, ts: Date.now(), kind: 'launchError' });
            const target = state.matchTargetPoints || 4;
            if (pairing.pointsA >= target) pairing.result = 'a';
            else if (pairing.pointsB >= target) pairing.result = 'b';
        }
        saveState();
        renderRound();
        updateSubmitButton();
    }

    // Per-match DQ escalation: warn → penalty point → DQ
    function spinAddMatchWarn(pairingIndex, side) {
        if (viewOnly) return;
        const round = state.rounds[state.currentRound];
        if (!round || round.resultsSubmitted) return;
        const pairing = round.pairings[pairingIndex];
        if (!pairing || pairing.isBye || pairing.result) return;
        const key = side === 'a' ? 'matchWarnsA' : 'matchWarnsB';
        pairing[key] = (pairing[key] || 0) + 1;
        pairing.battles = pairing.battles || [];
        const oppSide = side === 'a' ? 'b' : 'a';
        if (pairing[key] === 2) {
            // 2nd warn = +1 to opponent
            const oppPointsKey = oppSide === 'a' ? 'pointsA' : 'pointsB';
            pairing[oppPointsKey] = (pairing[oppPointsKey] || 0) + 1;
            pairing.battles.push({ winner: oppSide, finish: 'penalty', points: 1, ts: Date.now(), kind: 'warnPenalty' });
            const target = state.matchTargetPoints || 4;
            if (pairing.pointsA >= target) pairing.result = 'a';
            else if (pairing.pointsB >= target) pairing.result = 'b';
        } else if (pairing[key] >= 3) {
            // 3rd warn = DQ → opponent wins match
            pairing.result = oppSide;
            pairing.battles.push({ winner: oppSide, finish: 'dq', points: 0, ts: Date.now(), kind: 'dq' });
        }
        saveState();
        renderRound();
        updateSubmitButton();
    }

    // Per-match malfunction counter: 3 → opponent wins match
    function spinAddMalfunction(pairingIndex, side) {
        if (viewOnly) return;
        const round = state.rounds[state.currentRound];
        if (!round || round.resultsSubmitted) return;
        const pairing = round.pairings[pairingIndex];
        if (!pairing || pairing.isBye || pairing.result) return;
        const key = side === 'a' ? 'malfunctionsA' : 'malfunctionsB';
        pairing[key] = (pairing[key] || 0) + 1;
        pairing.battles = pairing.battles || [];
        if (pairing[key] >= 3) {
            const oppSide = side === 'a' ? 'b' : 'a';
            pairing.result = oppSide;
            pairing.battles.push({ winner: oppSide, finish: 'malfunction', points: 0, ts: Date.now(), kind: 'malfunction' });
        }
        saveState();
        renderRound();
        updateSubmitButton();
    }

    // Toggle which pairing's penalty panel is open (mutually exclusive with cross popup)
    let spinPenaltyOpen = null;   // pairingIndex or null
    function toggleSpinPenaltyPanel(pairingIndex) {
        if (viewOnly) return;
        // Close cross popup if open
        if (spinPopupPairing !== null) {
            spinPopupPairing = null;
            spinPopupSide = null;
            spinPendingFinish = null;
        }
        spinPenaltyOpen = spinPenaltyOpen === pairingIndex ? null : pairingIndex;
        renderRound();
    }

    // 3-on-3: tap a finish button → set pending, render Bey picker
    function spinPickFinish(pairingIndex, side, finish) {
        if (viewOnly) return;
        if (state.threeOnThreeMode === false) {
            // 1-on-1: score immediately
            addSpinFinish(pairingIndex, side, finish);
            return;
        }
        spinPendingFinish = finish;
        spinPopupPairing = pairingIndex;
        spinPopupSide = side;
        renderRound();
        requestAnimationFrame(() => setTimeout(applySpinCrossEdgeFlip, 180));
    }

    // Tapping a Bey finalises the score
    function spinPickBey(bey) {
        if (viewOnly || spinPopupPairing === null || !spinPendingFinish) return;
        addSpinFinish(spinPopupPairing, spinPopupSide, spinPendingFinish, bey);
    }

    // Click anywhere outside an open popup → close. Also ESC.
    function bindSpinBackdrop() {
        if (spinPopupBackdropBound) return;
        spinPopupBackdropBound = true;
        document.addEventListener('click', (e) => {
            if (spinPopupPairing === null) return;
            const cross = e.target.closest('.spin-cross');
            const sideCard = e.target.closest('.spin-side');
            if (cross) return;                        // tap inside the cross — let buttons handle it
            if (sideCard && sideCard.classList.contains('is-open')) return; // tap on the open card itself — toggleSpinPopup handles
            closeSpinPopup();
        }, true);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && spinPopupPairing !== null) {
                closeSpinPopup();
            }
        });
    }

    // Smart-flip: each cross button is anchored just outside one edge of the player card. If the
    // LEFT or RIGHT button overflows the viewport, shift the entire popup container horizontally
    // so all buttons stay on screen. The vertical (top/bottom) buttons rarely overflow because
    // they sit inline within the round view's scroll area.
    function applySpinCrossEdgeFlip() {
        const cross = document.querySelector('.spin-cross');
        if (!cross) return;
        const left = cross.querySelector('.spin-cross-left');
        const right = cross.querySelector('.spin-cross-right');
        const margin = 8;
        const vw = window.innerWidth;
        let dx = 0;
        if (left) {
            const r = left.getBoundingClientRect();
            if (r.left < margin) dx = Math.max(dx, margin - r.left);
        }
        if (right) {
            const r = right.getBoundingClientRect();
            if (r.right > vw - margin) dx = Math.min(dx, (vw - margin) - r.right);
        }
        if (dx !== 0) cross.style.transform = `translateX(${dx}px)`;
    }

    function addSpinFinish(pairingIndex, side, finish, bey) {
        if (viewOnly) return;
        const round = state.rounds[state.currentRound];
        if (!round || round.resultsSubmitted) return;
        const pairing = round.pairings[pairingIndex];
        if (!pairing || pairing.isBye) return;
        if (pairing.result) return;                       // match already locked
        const points = SPIN_FINISH_POINTS[finish];
        if (!points) return;
        pairing.battles = pairing.battles || [];
        const entry = { winner: side, finish, points, ts: Date.now() };
        if (state.threeOnThreeMode !== false && bey) entry.bey = bey;
        pairing.battles.push(entry);
        pairing.pointsA = (pairing.pointsA || 0) + (side === 'a' ? points : 0);
        pairing.pointsB = (pairing.pointsB || 0) + (side === 'b' ? points : 0);
        // Auto-lock the match when a side reaches the target
        const target = state.matchTargetPoints || 4;
        if (pairing.pointsA >= target) pairing.result = 'a';
        else if (pairing.pointsB >= target) pairing.result = 'b';
        // Always close the popup after a tap (one-finish-per-tap UX)
        spinPopupPairing = null;
        spinPopupSide = null;
        spinPendingFinish = null;
        saveState();
        renderRound();
        updateSubmitButton();
    }

    function undoSpinBattle(pairingIndex) {
        if (viewOnly) return;
        const round = state.rounds[state.currentRound];
        if (!round || round.resultsSubmitted) return;
        const pairing = round.pairings[pairingIndex];
        if (!pairing || pairing.isBye) return;
        if (!pairing.battles || pairing.battles.length === 0) return;
        const last = pairing.battles.pop();
        if (last.winner === 'a') pairing.pointsA = Math.max(0, (pairing.pointsA || 0) - last.points);
        else pairing.pointsB = Math.max(0, (pairing.pointsB || 0) - last.points);
        // If the match was auto-locked, undoing the winning battle should unlock it
        if (pairing.result) {
            const target = state.matchTargetPoints || 4;
            if ((pairing.pointsA || 0) < target && (pairing.pointsB || 0) < target) {
                pairing.result = null;
            }
        }
        saveState();
        renderRound();
        updateSubmitButton();
    }

    function isFinalRound() {
        const round = state.rounds[state.currentRound];
        if (!round) return false;
        if (state.tournamentType === 'knockout') {
            // Final = exactly one non-bye pairing (the championship match)
            const matches = round.pairings.filter(p => !p.isBye);
            return matches.length === 1;
        }
        const rec = getPlannedRounds();
        return rec > 0 && state.currentRound + 1 >= rec;
    }

    function updateSubmitButton() {
        const round = state.rounds[state.currentRound];
        if (!round) return;

        const allSet = round.pairings.every(p => p.isBye || p.result !== null);
        const btn = document.getElementById('btn-submit-results');
        btn.disabled = !allSet || round.resultsSubmitted;

        const final = isFinalRound();
        if (round.resultsSubmitted) {
            btn.textContent = t('round.submitted');
        } else {
            btn.textContent = final ? t('round.submitEnd') : t('round.submitNext');
        }

        // Hide standalone End Tournament on the final round (merged action covers it)
        const endBtn = document.getElementById('btn-end');
        if (endBtn) endBtn.style.display = final ? 'none' : '';
    }

    // Returns [pointsForA, pointsForB] for a given match result, honouring the
    // current scoring mode. Bye is always +3 (treated as automatic win).
    //   default (scoringDrawBonus = false): Win 3, Loss 1, Draw 0
    //   alternate (scoringDrawBonus = true): Win 3, Loss 0, Draw 1
    function pointsFor(result) {
        const drawBonus = !!state.scoringDrawBonus;
        if (result === 'a') return [3, drawBonus ? 0 : 1];
        if (result === 'b') return [drawBonus ? 0 : 1, 3];
        if (result === 'draw') return drawBonus ? [1, 1] : [0, 0];
        return [0, 0];
    }

    // FIX #2: Single applyResults function used by both submitResults and endTournament
    function applyResults(round) {
        round.pairings.forEach(pairing => {
            const pA = getPlayer(pairing.playerA);

            if (pairing.isBye) {
                pA.matchPoints += 3;
                pA.wins += 1;
                pA.hadBye = true;
                return;
            }

            if (pairing.result === null) return;

            const pB = getPlayer(pairing.playerB);
            pA.opponents.push(pairing.playerB);
            pB.opponents.push(pairing.playerA);

            const [pa, pb] = pointsFor(pairing.result);
            pA.matchPoints += pa;
            pB.matchPoints += pb;

            if (pairing.result === 'a') { pA.wins += 1; pB.losses += 1; }
            else if (pairing.result === 'b') { pB.wins += 1; pA.losses += 1; }
            else if (pairing.result === 'draw') { pA.draws += 1; pB.draws += 1; }

            // Spin-battle: also accumulate per-player battle points scored / conceded
            if (state.gameType === 'spin-battle') {
                const ptsA = pairing.pointsA || 0;
                const ptsB = pairing.pointsB || 0;
                pA.battlePointsScored = (pA.battlePointsScored || 0) + ptsA;
                pA.battlePointsConceded = (pA.battlePointsConceded || 0) + ptsB;
                pB.battlePointsScored = (pB.battlePointsScored || 0) + ptsB;
                pB.battlePointsConceded = (pB.battlePointsConceded || 0) + ptsA;
            }

            // Best-of-3 TCG: also accumulate per-game wins/losses
            if (state.gameType === 'tcg' && state.bestOfThree && pairing.games) {
                const gA = pairing.games.filter(g => g === 'a').length;
                const gB = pairing.games.filter(g => g === 'b').length;
                pA.gameWins = (pA.gameWins || 0) + gA;
                pA.gameLosses = (pA.gameLosses || 0) + gB;
                pB.gameWins = (pB.gameWins || 0) + gB;
                pB.gameLosses = (pB.gameLosses || 0) + gA;
            }
        });
    }

    function reshufflePairings() {
        if (viewOnly) return;
        if (state.currentRound !== 0) return;
        const round = state.rounds[0];
        if (!round || round.resultsSubmitted) return;
        if (!confirm(t('round.confirmReshuffle'))) return;
        if (state.tournamentType === 'knockout') {
            state.rounds[0] = buildKnockoutFirstRound(state.players);
        } else {
            const pairings = generatePairings(0);
            state.rounds[0] = { pairings, resultsSubmitted: false };
        }
        saveRoundSnapshot(0);
        saveState();
        track('pairings_reshuffled', { format: state.tournamentType || 'swiss' });
        renderRound();
    }

    function submitResults() {
        const round = state.rounds[state.currentRound];
        if (!round) return;
        const final = isFinalRound();
        const confirmKey = final ? 'round.confirmSubmitEnd' : 'round.confirmSubmit';
        if (!confirm(t(confirmKey))) return;

        applyResults(round);
        round.resultsSubmitted = true;
        saveRoundSnapshot(state.currentRound);
        track('round_submitted', {
            format: state.tournamentType || 'swiss',
            round_number: state.currentRound + 1,
            player_count: state.players.length
        });

        if (state.tournamentType === 'knockout') {
            // Count winners advancing from this round.
            const winners = round.pairings.map(p => {
                if (p.isBye) return p.playerA;
                if (p.result === 'a') return p.playerA;
                if (p.result === 'b') return p.playerB;
                return null;
            }).filter(Boolean);

            if (winners.length <= 1) {
                // Champion reached.
                const champ = winners.length === 1 ? getPlayer(winners[0]) : null;
                if (champ && confirm(t('ko.champConfirm', { name: champ.name }))) {
                    state.tournamentEnded = true;
                    stopTimer();
                    saveState();
                    track('tournament_ended', {
                        format: 'knockout',
                        total_rounds: state.rounds.length,
                        player_count: state.players.length
                    });
                    fireChampionCelebration();
                    if (state.hostEventId) pushEventResultSnapshot();
                    navigateTo('standings');
                    return;
                }
                // User cancelled — leave them on the final round so they can adjust.
                round.resultsSubmitted = false;
                saveState();
                renderRound();
                return;
            }

            const nextRound = buildKnockoutNextRound(round);
            state.rounds.push(nextRound);
            state.currentRound++;
            saveState();
            resetTimerValue();
            navigateTo('round');
            return;
        }

        if (final) {
            // Swiss final round — end the tournament instead of generating another.
            state.tournamentEnded = true;
            stopTimer();
            saveState();
            track('tournament_ended', {
                format: 'swiss',
                total_rounds: state.rounds.length,
                player_count: state.players.length
            });
            fireChampionCelebration();
            if (state.hostEventId) pushEventResultSnapshot();
            navigateTo('standings');
            return;
        }

        const nextRoundIndex = state.currentRound + 1;
        const pairings = generatePairings(nextRoundIndex);
        state.rounds.push({ pairings, resultsSubmitted: false });
        state.currentRound = nextRoundIndex;

        saveState();
        resetTimerValue();
        navigateTo('round');
    }

    // Fire confetti + celebration once per tournament end, re-armable if user starts a new one.
    let championCelebrationFired = false;
    function fireChampionCelebration() {
        if (championCelebrationFired) return;
        championCelebrationFired = true;
        if (typeof confetti !== 'function') return;
        const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#FF7324', '#22D3EE'];
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 }, colors });
        setTimeout(() => confetti({ particleCount: 80, spread: 120, angle: 60, origin: { x: 0, y: 0.5 }, colors }), 250);
        setTimeout(() => confetti({ particleCount: 80, spread: 120, angle: 120, origin: { x: 1, y: 0.5 }, colors }), 500);
    }

    function endTournament() {
        if (viewOnly) return;
        const round = state.rounds[state.currentRound];
        if (round && !round.resultsSubmitted) {
            const allSet = round.pairings.every(p => p.isBye || p.result !== null);
            if (allSet) {
                if (confirm(t('round.confirmSubmitBeforeEnd'))) {
                    applyResults(round);
                    round.resultsSubmitted = true;
                    saveRoundSnapshot(state.currentRound);
                    saveState();
                }
            } else {
                // Some results missing — don't allow ending without submitting
                if (!confirm(t('round.confirmDiscardEnd'))) {
                    return;
                }
                // Remove the incomplete round entirely so standings are clean
                state.rounds.pop();
                state.currentRound = Math.max(0, state.currentRound - 1);
            }
        }
        state.tournamentEnded = true;
        stopTimer();
        saveState();
        track('tournament_ended', {
            format: state.tournamentType || 'swiss',
            total_rounds: state.rounds.length,
            player_count: state.players.length
        });
        fireChampionCelebration();
        // If this tournament originated from a host event, push a result
        // snapshot back so the organizer can preview + publish to TopCut.
        // Non-blocking — failure just means manual re-trigger from host UI.
        if (state.hostEventId) pushEventResultSnapshot();
        navigateTo('standings');
    }

    // Compose + send a tournament-result snapshot to the originating event
    // doc. Includes ranked standings (with player decks) + a top-N + others
    // deck-distribution roll-up. The host UI polls events/{eid}.tournamentResultSnapshot
    // to render its preview-and-publish modal.
    async function pushEventResultSnapshot() {
        if (!state.hostEventId) return;
        if (!window.cloud || !window.cloud.isConfigured() || !window.cloud.isReady()) return;
        try {
            const standings = getStandings();
            const ranked = standings.map((p, i) => {
                const player = state.players.find(pp => pp.id === p.id) || {};
                return {
                    rank: i + 1,
                    name: p.name,
                    trainerId: player.trainerId || '',
                    record: p.record,
                    points: p.matchPoints || 0,
                    deckSpecies1: player.deckSpecies1 || '',
                    deckSpecies2: player.deckSpecies2 || ''
                };
            });

            // Aggregate by (species1, species2) pair → top 5 + others
            const buckets = new Map();
            ranked.forEach(p => {
                if (!p.deckSpecies1) return;
                const key = p.deckSpecies1 + '__' + (p.deckSpecies2 || '');
                if (!buckets.has(key)) {
                    buckets.set(key, { species1: p.deckSpecies1, species2: p.deckSpecies2 || '', count: 0 });
                }
                buckets.get(key).count++;
            });
            const total = Array.from(buckets.values()).reduce((s, b) => s + b.count, 0);
            const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count);
            const top = sorted.slice(0, 5);
            const others = sorted.slice(5);
            const deckDistribution = top.map(b => ({
                species1: b.species1, species2: b.species2, count: b.count,
                percent: total > 0 ? Math.round((b.count / total) * 100) : 0
            }));
            if (others.length > 0) {
                const otherCount = others.reduce((s, b) => s + b.count, 0);
                deckDistribution.push({
                    species1: '', species2: '', count: otherCount,
                    percent: total > 0 ? Math.round((otherCount / total) * 100) : 0
                });
            }

            const snapshot = {
                eventName: state.tournamentName || '',
                date: state.tournamentDate || new Date().toISOString().split('T')[0],
                format: (state.tournamentType === 'knockout' ? 'knockout' : 'swiss'),
                totalPlayers: state.players.length,
                totalRounds: state.rounds.length,
                standings: ranked,
                deckDistribution
            };
            await window.cloud.setEventResultSnapshot(state.hostEventId, snapshot);
        } catch (e) {
            console.error('[event] pushEventResultSnapshot failed', e);
        }
    }

    // Go back to the previous round with its results pre-filled for editing
    function goBackFromRound() {
        if (state.currentRound === 0) {
            navigateTo('registration');
            return;
        }

        if (!confirm(t('round.confirmGoBack'))) return;

        // The previous round (already submitted) — we want to re-open it for editing
        const prevIndex = state.currentRound - 1;
        const prevRound = state.rounds[prevIndex];

        if (!prevRound || !prevRound.resultsSubmitted) {
            // Shouldn't happen, but fallback
            navigateTo('registration');
            return;
        }

        // Save the previous round's pairings WITH results pre-filled
        const savedPairings = JSON.parse(JSON.stringify(prevRound.pairings));

        // Restore player stats to BEFORE the previous round was applied
        // Snapshot at prevIndex-1 has the state before prevRound was submitted
        const snapshotBeforePrev = prevIndex > 0 ? loadRoundSnapshot(prevIndex - 1) : null;
        if (snapshotBeforePrev) {
            state.players = snapshotBeforePrev.players;
            state.rounds = snapshotBeforePrev.rounds;
        } else if (prevIndex === 0) {
            // Going back to round 1 — reset all player stats to zero
            state.players.forEach(p => {
                p.matchPoints = 0;
                p.wins = 0;
                p.losses = 0;
                p.draws = 0;
                p.opponents = [];
                p.hadBye = false;
            });
            state.rounds = [];
        } else {
            // No snapshot available — reverse the previous round's results
            reverseResults(prevRound);
            // Also discard everything from prevIndex onward
            state.rounds = state.rounds.slice(0, prevIndex);
        }

        // Put back the previous round with results pre-filled but NOT submitted
        state.rounds[prevIndex] = {
            pairings: savedPairings,
            resultsSubmitted: false
        };
        // Trim any rounds after this one (current round + beyond)
        state.rounds = state.rounds.slice(0, prevIndex + 1);
        state.currentRound = prevIndex;

        saveState();
        resetTimerValue();
        renderRound();
        navigateTo('round');
        showToast(t('round.editResubmit'));
    }

    // Reverse the stat changes from a submitted round (fallback if no snapshot)
    function reverseResults(round) {
        round.pairings.forEach(pairing => {
            const pA = getPlayer(pairing.playerA);
            if (!pA) return;

            if (pairing.isBye) {
                pA.matchPoints -= 3;
                pA.wins -= 1;
                // Only clear hadBye if no other (still-applied) round granted this player a bye
                const stillHasBye = state.rounds.some(r =>
                    r !== round && r.resultsSubmitted &&
                    r.pairings.some(pp => pp.isBye && pp.playerA === pA.id)
                );
                if (!stillHasBye) pA.hadBye = false;
                return;
            }

            if (pairing.result === null) return;
            const pB = getPlayer(pairing.playerB);
            if (!pB) return;

            // Remove last opponent entry
            const idxA = pA.opponents.lastIndexOf(pairing.playerB);
            if (idxA !== -1) pA.opponents.splice(idxA, 1);
            const idxB = pB.opponents.lastIndexOf(pairing.playerA);
            if (idxB !== -1) pB.opponents.splice(idxB, 1);

            if (pairing.result === 'a') {
                pA.matchPoints -= 3; pA.wins -= 1; pB.losses -= 1;
            } else if (pairing.result === 'b') {
                pB.matchPoints -= 3; pB.wins -= 1; pA.losses -= 1;
            } else if (pairing.result === 'draw') {
                pA.matchPoints -= 1; pB.matchPoints -= 1;
                pA.draws -= 1; pB.draws -= 1;
            }
        });
    }

    function backToLastRound() {
        if (state.rounds.length > 0) {
            state.tournamentEnded = false;
            // Make sure currentRound points to a valid round
            state.currentRound = state.rounds.length - 1;
            saveState();
            navigateTo('round');
        }
    }

    // ---- STANDINGS ----
    function calculateOWP(player) {
        if (player.opponents.length === 0) return 0;

        let totalOppWinPct = 0;
        let oppCount = 0;

        player.opponents.forEach(oppId => {
            const opp = getPlayer(oppId);
            if (!opp) return;

            const totalGames = opp.wins + opp.losses + opp.draws;
            if (totalGames === 0) {
                totalOppWinPct += 0.25;
            } else {
                // Official Pokémon TCG match-win %: (wins + 0.5*draws) / games
                // Independent of scoring mode (draw=0 or draw=1 point).
                const winPct = (opp.wins + 0.5 * opp.draws) / totalGames;
                totalOppWinPct += Math.max(0.25, winPct);
            }
            oppCount++;
        });

        return oppCount > 0 ? totalOppWinPct / oppCount : 0;
    }

    function getStandings() {
        // Pass 1: everyone's OWP
        const owpById = {};
        state.players.forEach(p => { owpById[p.id] = calculateOWP(p); });

        // Byes received per player (scan submitted rounds once)
        const byesById = {};
        state.rounds.forEach(round => {
            if (!round.resultsSubmitted) return;
            round.pairings.forEach(pairing => {
                if (pairing.isBye && pairing.playerA) {
                    byesById[pairing.playerA] = (byesById[pairing.playerA] || 0) + 1;
                }
            });
        });

        // Pass 2: OOMW = average of opponents' OWP (0.25 floor per opponent, standard TCG rule)
        //          WOScore = sum of opponents' match points
        const standings = state.players.map(p => {
            const owp = owpById[p.id];
            let oomw = 0;
            let woscore = 0;
            if (p.opponents.length > 0) {
                let oomwTotal = 0, oomwCount = 0;
                p.opponents.forEach(oppId => {
                    const opp = getPlayer(oppId);
                    if (opp) woscore += opp.matchPoints;
                    if (!(oppId in owpById)) return;
                    oomwTotal += Math.max(0.25, owpById[oppId]);
                    oomwCount++;
                });
                oomw = oomwCount > 0 ? oomwTotal / oomwCount : 0;
            }
            return {
                ...p,
                owp,
                oomw,
                woscore,
                battlePoints: p.battlePointsScored || 0,
                gameRecord: (p.gameWins != null || p.gameLosses != null) ? `${p.gameWins || 0}-${p.gameLosses || 0}` : '—',
                byes: byesById[p.id] || 0,
                record: `${p.wins}-${p.losses}-${p.draws}`
            };
        });

        standings.sort((a, b) => {
            if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
            if (b.owp !== a.owp) return b.owp - a.owp;
            if (b.oomw !== a.oomw) return b.oomw - a.oomw;
            // Spin-battle uses BattlePoints as a 4th tiebreaker; TCG falls through to original order
            if (state.gameType === 'spin-battle') return b.battlePoints - a.battlePoints;
            return 0;
        });

        return standings;
    }

    function updateTournamentMeta() {
        if (viewOnly || state.tournamentStarted) return;
        const nameInput = document.getElementById('tournament-name');
        const dateInput = document.getElementById('tournament-date');
        if (nameInput) state.tournamentName = nameInput.value.trim();
        if (dateInput) state.tournamentDate = dateInput.value;
        saveState();
    }

    function toggleScoringDrawBonus() {
        if (viewOnly || state.tournamentStarted) return;
        const cb = document.getElementById('scoring-draw-bonus');
        if (!cb) return;
        state.scoringDrawBonus = !!cb.checked;
        saveState();
    }

    function setMatchTargetPoints(value) {
        if (viewOnly || state.tournamentStarted) return;
        const n = Math.max(2, Math.min(20, parseInt(value, 10) || 4));
        state.matchTargetPoints = n;
        saveState();
    }

    function toggleThreeOnThreeMode() {
        if (viewOnly || state.tournamentStarted) return;
        const cb = document.getElementById('spin-three-on-three');
        if (!cb) return;
        state.threeOnThreeMode = !!cb.checked;
        saveState();
    }

    function toggleStadiumOut() {
        if (viewOnly || state.tournamentStarted) return;
        const cb = document.getElementById('spin-stadium-out');
        if (!cb) return;
        state.stadiumOutEnabled = !!cb.checked;
        saveState();
    }

    // ---- DECK REGISTRATION (3-on-3 spin-battle, v1) ----
    // A deck = 3 Beys, each Bey = { blade, ratchet, bit }. Within one deck no part may repeat.
    function validateDeck(deck) {
        if (!deck || !Array.isArray(deck) || deck.length !== 3) return { ok: false, reason: 'incomplete' };
        const seen = { blade: new Set(), ratchet: new Set(), bit: new Set() };
        for (let i = 0; i < 3; i++) {
            const bey = deck[i] || {};
            for (const part of ['blade', 'ratchet', 'bit']) {
                const v = (bey[part] || '').trim().toLowerCase();
                if (!v) return { ok: false, reason: 'missing-part', beyIndex: i, part };
                if (seen[part].has(v)) return { ok: false, reason: 'duplicate-' + part, part: bey[part] };
                seen[part].add(v);
            }
        }
        return { ok: true };
    }

    let deckEditorPlayerId = null;

    function openDeckEditor(playerId) {
        if (viewOnly || state.tournamentStarted) return;
        const player = getPlayer(playerId);
        if (!player) return;
        deckEditorPlayerId = playerId;
        renderDeckEditor();
        const ov = document.getElementById('deck-editor-overlay');
        if (ov) ov.classList.add('open');
    }

    function closeDeckEditor() {
        stopDeckScanner();
        deckQrPanelOpen = false;
        deckEditorPlayerId = null;
        const ov = document.getElementById('deck-editor-overlay');
        if (ov) ov.classList.remove('open');
    }

    function renderDeckEditor() {
        const body = document.getElementById('deck-editor-body');
        if (!body || !deckEditorPlayerId) return;
        const player = getPlayer(deckEditorPlayerId);
        if (!player) return;
        // Pull current draft (kept in DOM until save) or fall back to player.deck or empty
        const deck = player._draftDeck || player.deck || [{}, {}, {}];
        // Ensure exactly 3 entries
        while (deck.length < 3) deck.push({});
        const beyRow = (i) => `
            <div class="deck-bey-row">
                <span class="deck-bey-num">Bey ${i + 1}</span>
                <input type="text" data-bey="${i}" data-part="blade"   placeholder="${escapeHtml(t('deck.bladePh'))}"   value="${escapeHtml(deck[i].blade || '')}"   oninput="app.updateDeckDraft()" />
                <input type="text" data-bey="${i}" data-part="ratchet" placeholder="${escapeHtml(t('deck.ratchetPh'))}" value="${escapeHtml(deck[i].ratchet || '')}" oninput="app.updateDeckDraft()" />
                <input type="text" data-bey="${i}" data-part="bit"     placeholder="${escapeHtml(t('deck.bitPh'))}"     value="${escapeHtml(deck[i].bit || '')}"     oninput="app.updateDeckDraft()" />
            </div>
        `;
        const v = validateDeck(deck);
        let statusHtml;
        if (v.ok) {
            statusHtml = `<div class="deck-status deck-status-ok">✓ ${t('deck.valid')}</div>`;
        } else if (v.reason === 'incomplete' || v.reason === 'missing-part') {
            statusHtml = `<div class="deck-status deck-status-warn">⚠ ${t('deck.incomplete')}</div>`;
        } else {
            const partKey = v.reason.replace('duplicate-', '');
            statusHtml = `<div class="deck-status deck-status-error">⚠ ${t('deck.duplicate', { part: t('deck.' + partKey), value: v.part })}</div>`;
        }
        const code = encodeBeysCode(deck);
        const supportsScan = ('BarcodeDetector' in window);
        const qrPanel = deckQrPanelOpen ? `
            <div class="deck-qr-panel">
                <div class="deck-qr-row">
                    <div class="deck-qr-col">
                        <label class="deck-qr-label">${t('qr.codeLabel')}</label>
                        <div id="deck-qr-svg" class="deck-qr-svg"></div>
                        <input type="text" class="deck-qr-code-text" readonly value="${escapeHtml(code)}" onclick="this.select()" />
                    </div>
                    <div class="deck-qr-col deck-qr-col-import">
                        ${supportsScan ? `<button class="btn btn-small btn-secondary" onclick="app.startDeckScanner()">${t('qr.scan')}</button>` : ''}
                        <video id="deck-scan-video" class="deck-scan-video" muted playsinline></video>
                        <label class="deck-qr-label">${t('qr.pasteCode')}</label>
                        <textarea id="deck-paste-input" class="deck-paste-input" rows="2" placeholder="gshk-bey:..."></textarea>
                        <button class="btn btn-small btn-secondary" onclick="app.importDeckFromPaste()">${t('qr.import')}</button>
                    </div>
                </div>
                <p id="deck-qr-note" class="info-text"></p>
            </div>
        ` : '';
        body.innerHTML = `
            <h3>${t('deck.title', { name: escapeHtml(player.name) })}</h3>
            <p class="info-text deck-rules-hint">${t('deck.rulesHint')}</p>
            <div class="deck-grid">
                <div class="deck-bey-header">
                    <span></span>
                    <span>${t('deck.blade')}</span>
                    <span>${t('deck.ratchet')}</span>
                    <span>${t('deck.bit')}</span>
                </div>
                ${beyRow(0)}
                ${beyRow(1)}
                ${beyRow(2)}
            </div>
            <div id="deck-status-line">${statusHtml}</div>
            ${qrPanel}
            <div class="deck-actions">
                <button class="btn btn-secondary btn-small" onclick="app.toggleDeckQrPanel()">${deckQrPanelOpen ? '✕ QR' : '⊞ QR'}</button>
                <span style="flex:1"></span>
                <button class="btn btn-secondary" onclick="app.closeDeckEditor()">${t('common.cancel')}</button>
                <button class="btn btn-primary" ${v.ok ? '' : 'disabled'} onclick="app.saveDeckEditor()">${t('deck.save')}</button>
            </div>
        `;
        // After DOM update, render the QR if the panel is open
        if (deckQrPanelOpen) {
            const svgHost = document.getElementById('deck-qr-svg');
            renderQrInto(svgHost, code);
        }
    }

    function updateDeckDraft() {
        if (!deckEditorPlayerId) return;
        const player = getPlayer(deckEditorPlayerId);
        if (!player) return;
        const deck = [{}, {}, {}];
        document.querySelectorAll('#deck-editor-body input[data-bey]').forEach(inp => {
            const i = parseInt(inp.dataset.bey, 10);
            const p = inp.dataset.part;
            deck[i][p] = inp.value;
        });
        player._draftDeck = deck;
        // Re-validate + update status line + save button enable state without rebuilding inputs (preserves focus)
        const v = validateDeck(deck);
        const line = document.getElementById('deck-status-line');
        if (line) {
            let statusHtml;
            if (v.ok) {
                statusHtml = `<div class="deck-status deck-status-ok">✓ ${t('deck.valid')}</div>`;
            } else if (v.reason === 'incomplete' || v.reason === 'missing-part') {
                statusHtml = `<div class="deck-status deck-status-warn">⚠ ${t('deck.incomplete')}</div>`;
            } else {
                const partKey = v.reason.replace('duplicate-', '');
                statusHtml = `<div class="deck-status deck-status-error">⚠ ${t('deck.duplicate', { part: t('deck.' + partKey), value: v.part })}</div>`;
            }
            line.innerHTML = statusHtml;
        }
        const saveBtn = document.querySelector('#deck-editor-body .deck-actions .btn-primary');
        if (saveBtn) saveBtn.disabled = !v.ok;
        // Live-update QR + code text if panel is open
        if (deckQrPanelOpen) {
            const code = encodeBeysCode(deck);
            const svg = document.getElementById('deck-qr-svg');
            const codeInput = document.querySelector('.deck-qr-code-text');
            if (svg) renderQrInto(svg, code);
            if (codeInput) codeInput.value = code;
        }
    }

    // ---- BEYS QR — encode / decode / generate / scan ----
    const BEY_CODE_PREFIX = 'gshk-bey:';
    function encodeBeysCode(deck) {
        const parts = (deck || []).slice(0, 3).map(b => {
            const blade = (b && b.blade || '').trim();
            const ratchet = (b && b.ratchet || '').trim();
            const bit = (b && b.bit || '').trim();
            // pipes are illegal in part names; strip them defensively
            return [blade, ratchet, bit].map(s => s.replace(/\|/g, '/').replace(/;/g, ',')).join('|');
        });
        return BEY_CODE_PREFIX + parts.join(';');
    }
    function decodeBeysCode(code) {
        if (!code || typeof code !== 'string') return null;
        const trimmed = code.trim();
        if (!trimmed.startsWith(BEY_CODE_PREFIX)) return null;
        const body = trimmed.slice(BEY_CODE_PREFIX.length);
        const parts = body.split(';');
        if (parts.length < 1 || parts.length > 3) return null;
        const deck = [];
        for (let i = 0; i < 3; i++) {
            const triplet = parts[i] ? parts[i].split('|') : ['', '', ''];
            deck.push({
                blade: (triplet[0] || '').trim(),
                ratchet: (triplet[1] || '').trim(),
                bit: (triplet[2] || '').trim(),
            });
        }
        return deck;
    }

    // Render a QR <table> into the given container element using qrcode-generator
    function renderQrInto(containerEl, text) {
        if (!containerEl || !text) return;
        if (typeof qrcode !== 'function') {
            containerEl.innerHTML = '<p class="info-text">QR library not loaded yet — please retry in a moment.</p>';
            return;
        }
        const qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        // 4 px per cell, no margin — bey codes are tiny so this fits comfortably
        containerEl.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    }

    // Toggle the QR/scan/paste section inside the deck editor (shown beneath the inputs)
    let deckQrPanelOpen = false;
    let deckScannerStream = null;
    let deckScannerInterval = null;

    function toggleDeckQrPanel() {
        deckQrPanelOpen = !deckQrPanelOpen;
        if (!deckQrPanelOpen) stopDeckScanner();
        renderDeckEditor();
    }

    function applyImportedDeckCode(code) {
        const decoded = decodeBeysCode(code);
        if (!decoded) {
            const note = document.getElementById('deck-qr-note');
            if (note) { note.textContent = t('qr.invalidCode'); note.className = 'info-text deck-qr-note-error'; }
            return false;
        }
        const player = getPlayer(deckEditorPlayerId);
        if (!player) return false;
        player._draftDeck = decoded;
        renderDeckEditor();
        const note = document.getElementById('deck-qr-note');
        if (note) { note.textContent = t('qr.imported'); note.className = 'info-text deck-qr-note-ok'; }
        return true;
    }

    function importDeckFromPaste() {
        const input = document.getElementById('deck-paste-input');
        if (!input) return;
        applyImportedDeckCode(input.value);
    }

    async function startDeckScanner() {
        if (!('BarcodeDetector' in window)) {
            const note = document.getElementById('deck-qr-note');
            if (note) { note.textContent = t('qr.scanUnsupported'); note.className = 'info-text deck-qr-note-error'; }
            return;
        }
        const video = document.getElementById('deck-scan-video');
        if (!video) return;
        try {
            deckScannerStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }, audio: false
            });
            video.srcObject = deckScannerStream;
            await video.play();
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            const note = document.getElementById('deck-qr-note');
            if (note) { note.textContent = t('qr.scanInstr'); note.className = 'info-text'; }
            deckScannerInterval = setInterval(async () => {
                try {
                    const codes = await detector.detect(video);
                    if (codes && codes.length > 0) {
                        const raw = codes[0].rawValue || '';
                        if (applyImportedDeckCode(raw)) {
                            stopDeckScanner();
                        }
                    }
                } catch (e) { /* keep trying */ }
            }, 400);
        } catch (e) {
            const note = document.getElementById('deck-qr-note');
            if (note) { note.textContent = t('qr.scanFail'); note.className = 'info-text deck-qr-note-error'; }
            stopDeckScanner();
        }
    }

    function stopDeckScanner() {
        if (deckScannerInterval) { clearInterval(deckScannerInterval); deckScannerInterval = null; }
        if (deckScannerStream) {
            deckScannerStream.getTracks().forEach(t => t.stop());
            deckScannerStream = null;
        }
        const video = document.getElementById('deck-scan-video');
        if (video) { video.pause(); video.srcObject = null; }
    }

    function saveDeckEditor() {
        if (!deckEditorPlayerId) return;
        const player = getPlayer(deckEditorPlayerId);
        if (!player) return;
        const deck = player._draftDeck || player.deck;
        const v = validateDeck(deck);
        if (!v.ok) return;
        player.deck = deck.map(b => ({
            blade: (b.blade || '').trim(),
            ratchet: (b.ratchet || '').trim(),
            bit: (b.bit || '').trim(),
        }));
        delete player._draftDeck;
        saveState();
        closeDeckEditor();
        renderPlayerList();   // refresh ✓/⚠ badge
    }

    function toggleBestOfThree() {
        if (viewOnly || state.tournamentStarted) return;
        const cb = document.getElementById('scoring-bo3');
        if (!cb) return;
        state.bestOfThree = !!cb.checked;
        saveState();
    }

    // Toggle the spin-battle banner + sync UI on registration page based on gameType.
    function syncRegistrationGameType() {
        const banner = document.getElementById('reg-spin-banner');
        const bo3Block = document.getElementById('reg-bo3');
        if (state.gameType === 'spin-battle') {
            if (banner) banner.style.display = '';
            if (bo3Block) bo3Block.style.display = 'none';   // Bo3 doesn't apply in spin-battle (matches are points-target)
            const tpInput = document.getElementById('spin-target-points');
            if (tpInput) tpInput.value = state.matchTargetPoints || 4;
            const tttCb = document.getElementById('spin-three-on-three');
            if (tttCb) tttCb.checked = state.threeOnThreeMode !== false;
            const soCb = document.getElementById('spin-stadium-out');
            if (soCb) soCb.checked = !!state.stadiumOutEnabled;
        } else {
            if (banner) banner.style.display = 'none';
            if (bo3Block) bo3Block.style.display = '';
            const bo3Cb = document.getElementById('scoring-bo3');
            if (bo3Cb) bo3Cb.checked = !!state.bestOfThree;
        }
    }

    function formatTournamentDate(iso) {
        if (!iso) return '';
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
        if (!m) return iso;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthIdx = parseInt(m[2], 10) - 1;
        const day = parseInt(m[3], 10);
        return `${m[1]}${months[monthIdx]}${day}`;
    }

    function tournamentTitlePrefix() {
        const parts = [];
        if (state.tournamentName) parts.push(state.tournamentName);
        const d = formatTournamentDate(state.tournamentDate);
        if (d) parts.push(d);
        return parts.join(' ');
    }

    function renderStandings() {
        // Update the confirm-CTA visibility / state on every render so
        // editing a name + saving correctly flips it back to "re-send".
        updateStandingsConfirmCta();
        const standings = getStandings();
        const tbody = document.getElementById('standings-body');
        const title = document.getElementById('standings-title');

        const lastSubmitted = state.rounds.filter(r => r.resultsSubmitted).length;
        const baseTitle = state.tournamentEnded
            ? t('standings.final', { n: lastSubmitted })
            : t('standings.afterRound', { n: lastSubmitted });
        const prefix = tournamentTitlePrefix();
        title.textContent = prefix ? `${prefix} ${baseTitle}` : baseTitle;

        // Swap the 7th column header dynamically based on mode
        const ths = document.querySelectorAll('#standings-table thead th');
        if (ths && ths.length >= 7) {
            let col7Label;
            if (state.gameType === 'spin-battle')  col7Label = t('standings.battlePts');
            else if (state.bestOfThree)            col7Label = t('standings.gw');
            else                                   col7Label = t('standings.woscore');
            ths[6].textContent = col7Label;
        }

        tbody.innerHTML = '';
        // Editable name only when the bracket has wrapped — viewer-mode still
        // shows read-only. The pencil affordance pops on hover so the table
        // doesn't look "noisy" but organisers know it's tap-to-edit.
        const allowEdit = !viewOnly && state.tournamentEnded;
        standings.forEach((p, i) => {
            const tr = document.createElement('tr');
            tr.onclick = (e) => {
                if (e.target && e.target.closest('.standings-name-edit')) return;
                showTrainerCard(p.id);
            };
            const playerObj = getPlayer(p.id);
            const isDropped = playerObj && playerObj.dropped;
            if (isDropped) tr.classList.add('player-dropped');
            const droppedTag = isDropped
                ? ` <span class="dropped-tag">${t('trainer.droppedTag')}</span>`
                : '';
            const medal = state.tournamentEnded && !isDropped
                ? (i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '')
                : '';
            const nameCell = allowEdit
                ? `<span class="standings-name standings-name-edit"
                          data-pid="${p.id}"
                          contenteditable="plaintext-only"
                          spellcheck="false"
                          title="${t('standings.tapToRename')}">${escapeHtml(p.name)}</span>${droppedTag}`
                : `${escapeHtml(p.name)}${droppedTag}`;
            // Column 7 swaps based on mode:
            //   spin-battle → BattlePts (sum scored across matches)
            //   tcg + bestOfThree → GW-GL (per-game record)
            //   default tcg → WOScore
            let tiebreakCol;
            if (state.gameType === 'spin-battle') tiebreakCol = p.battlePoints;
            else if (state.bestOfThree)           tiebreakCol = p.gameRecord;
            else                                  tiebreakCol = p.woscore;
            tr.innerHTML = `
                <td>${medal}${i + 1}</td>
                <td>${nameCell}</td>
                <td>${p.record}</td>
                <td>${p.matchPoints}</td>
                <td>${(p.owp * 100).toFixed(1)}%</td>
                <td>${(p.oomw * 100).toFixed(1)}%</td>
                <td>${tiebreakCol}</td>
                <td>${p.byes}</td>
            `;
            tbody.appendChild(tr);
        });
        // Wire inline rename — commit on blur or Enter.
        if (allowEdit) {
            tbody.querySelectorAll('.standings-name-edit').forEach(el => {
                const pid = el.getAttribute('data-pid');
                let original = el.textContent;
                el.addEventListener('focus', () => { original = el.textContent; });
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
                    if (e.key === 'Escape') { el.textContent = original; el.blur(); }
                });
                el.addEventListener('blur', () => {
                    const next = el.textContent.trim().slice(0, 60);
                    if (!next || next === original) { el.textContent = original; return; }
                    const player = getPlayer(pid);
                    if (!player) return;
                    player.name = next;
                    saveState();
                    // Renaming may shuffle equal-rank rows since name isn't a
                    // sort key, but it does invalidate the result snapshot —
                    // refresh standings + clear the published flag so the
                    // updated name re-syncs to TopCut next opportunity.
                    if (state.hostEventId) {
                        state.hostEventResultPublished = false;
                        saveState();
                        // Re-push snapshot so the next publish carries the
                        // new name without waiting for a fresh tournament-end.
                        if (typeof pushEventResultSnapshot === 'function') pushEventResultSnapshot();
                    }
                    renderStandings();
                });
            });
        }
        updateShowdownButton();
    }

    function downloadStandings() {
        const wrapper = document.getElementById('standings-table-wrapper');
        if (typeof html2canvas === 'undefined') {
            alert(t('standings.htmlMissing'));
            return;
        }
        // The wrapper has overflow-x:auto on phone, so the table is horizontally scrolled
        // and html2canvas would only capture what's visible. Two-pass approach:
        //   1. Switch wrapper to overflow:visible + width:max-content so the layout reflows
        //      to its true full width (table + padding + cell right-edges all included).
        //   2. Read the now-accurate scrollWidth and use it for capture.
        //   3. Add a safety buffer for sub-pixel rounding + last-column right padding.
        // This guarantees every tiebreaker column lands in the saved PNG no matter how
        // narrow the viewport is.
        const origStyle = {
            width: wrapper.style.width,
            minWidth: wrapper.style.minWidth,
            maxWidth: wrapper.style.maxWidth,
            overflow: wrapper.style.overflow,
            display: wrapper.style.display
        };
        wrapper.style.overflow = 'visible';
        wrapper.style.maxWidth = 'none';
        wrapper.style.width = 'max-content';
        wrapper.style.minWidth = 'max-content';
        // Force a synchronous reflow so getBoundingClientRect/scrollWidth give the new layout
        // eslint-disable-next-line no-unused-expressions
        wrapper.offsetHeight;
        const measuredWidth = Math.max(
            wrapper.scrollWidth,
            wrapper.getBoundingClientRect().width
        );
        const safetyBuffer = 24;            // sub-pixel + last-column right padding
        const captureWidth = Math.ceil(measuredWidth + safetyBuffer);
        // Re-pin the wrapper at the measured width so html2canvas sees a stable element
        wrapper.style.width = captureWidth + 'px';
        wrapper.style.minWidth = captureWidth + 'px';
        const restoreWrapper = () => {
            wrapper.style.width = origStyle.width;
            wrapper.style.minWidth = origStyle.minWidth;
            wrapper.style.maxWidth = origStyle.maxWidth;
            wrapper.style.overflow = origStyle.overflow;
            wrapper.style.display = origStyle.display;
        };
        html2canvas(wrapper, {
            backgroundColor: '#0a0e27',
            scale: 2,
            width: captureWidth,
            windowWidth: Math.max(captureWidth, window.innerWidth)
        }).then(srcCanvas => {
            restoreWrapper();
            const scale = 2;
            const pad = 24 * scale;

            // Header strip with tournament name + date + round label
            const tName = (state.tournamentName || '').trim();
            const tDate = formatTournamentDate(state.tournamentDate);
            const lastSubmitted = state.rounds.filter(r => r.resultsSubmitted).length;
            const roundLabel = state.tournamentEnded
                ? t('standings.final', { n: lastSubmitted })
                : t('standings.afterRound', { n: lastSubmitted });

            const headerNameH = tName ? 44 * scale : 0;
            const headerSubH = (tDate || roundLabel) ? 28 * scale : 0;
            const headerPadTop = 20 * scale;
            const headerPadBot = 16 * scale;
            const headerH = (tName || tDate || roundLabel)
                ? headerPadTop + headerNameH + (headerNameH && headerSubH ? 6 * scale : 0) + headerSubH + headerPadBot
                : 0;

            const footerH = 56 * scale;

            const out = document.createElement('canvas');
            out.width = srcCanvas.width;
            out.height = headerH + srcCanvas.height + footerH;
            const ctx = out.getContext('2d');
            ctx.fillStyle = '#0a0e27';
            ctx.fillRect(0, 0, out.width, out.height);

            // Draw header strip
            if (headerH > 0) {
                ctx.fillStyle = '#141414';
                ctx.fillRect(0, 0, out.width, headerH);
                ctx.textBaseline = 'alphabetic';
                ctx.textAlign = 'center';
                let cursorY = headerPadTop;
                if (tName) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${32 * scale}px Inter, sans-serif`;
                    cursorY += headerNameH * 0.78;
                    ctx.fillText(tName, out.width / 2, cursorY);
                    cursorY += headerNameH * 0.22 + (headerSubH ? 6 * scale : 0);
                }
                if (tDate || roundLabel) {
                    const subParts = [];
                    if (tDate) subParts.push(tDate);
                    if (roundLabel) subParts.push(roundLabel);
                    ctx.fillStyle = '#FF7324';
                    ctx.font = `${18 * scale}px Inter, sans-serif`;
                    cursorY += headerSubH * 0.72;
                    ctx.fillText(subParts.join('  •  '), out.width / 2, cursorY);
                }
            }

            // Draw table below header
            ctx.drawImage(srcCanvas, 0, headerH);

            // Watermark strip
            const footerY = headerH + srcCanvas.height;
            ctx.fillStyle = '#141414';
            ctx.fillRect(0, footerY, out.width, footerH);
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#FF7324';
            ctx.font = `bold ${22 * scale}px "JetBrains Mono", ui-monospace, monospace`;
            ctx.textAlign = 'left';
            ctx.fillText('gameset-hk.com', pad, footerY + footerH / 2);
            ctx.fillStyle = '#888';
            ctx.font = `${14 * scale}px Inter, sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText('Generated by GameSet HK', out.width - pad, footerY + footerH / 2);

            const roundNum = state.rounds.filter(r => r.resultsSubmitted).length;
            const safeName = tName ? tName.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) : '';
            const filename = safeName
                ? `${safeName}_Standings_Round${roundNum}.png`
                : `Standings_Round${roundNum}.png`;

            // Convert canvas → Blob → try the Web Share API first. On iOS/iPadOS Safari this
            // opens the native share sheet whose "Save Image" entry writes to Photos (not Files,
            // which is what a plain <a download> on iOS does — file ends up in iCloud Drive).
            // Desktop browsers / Android-without-share fall back to the classic download anchor.
            out.toBlob((blob) => {
                if (!blob) { alert(t('standings.snapFail')); return; }
                const triggerDownload = () => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1500);
                };
                try {
                    const file = new File([blob], filename, { type: 'image/png' });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        navigator.share({
                            files: [file],
                            title: tName || 'GameSet HK',
                            text: tName ? `${tName} — ${roundLabel}` : roundLabel
                        }).catch(err => {
                            // User cancelled the share sheet — don't fall back, that's intentional
                            if (err && err.name === 'AbortError') return;
                            // Any other share-API failure → use the classic download as fallback
                            triggerDownload();
                        });
                        return;
                    }
                } catch (_) { /* File constructor or canShare unsupported — fall through */ }
                triggerDownload();
            }, 'image/png');
        }).catch(err => {
            restoreWrapper();
            console.error('Screenshot failed:', err);
            alert(t('standings.snapFail'));
        });
    }

    function sendToShowdown() {
        const standings = getStandings();
        const rounds = state.rounds.map((r, i) => ({
            roundNumber: i + 1,
            pairings: r.pairings.map(p => ({
                table: p.table,
                playerA: { name: getPlayer(p.playerA)?.name || p.playerA },
                playerB: p.playerB ? { name: getPlayer(p.playerB)?.name || p.playerB } : null,
                result: p.result === 'a' ? 'a_win' : p.result === 'b' ? 'b_win' : p.result === 'bye' ? 'bye' : p.result === 'draw' ? 'draw' : p.result,
            })),
        }));
        const payload = {
            version: '1.0',
            source: 'tcgtm',
            createEvent: !state.showdownEventId,
            eventId: state.showdownEventId || '',
            tournamentName: state.tournamentName || '',
            tournamentDate: state.tournamentDate || '',
            tournamentType: state.tournamentType || 'swiss',
            totalRounds: state.rounds.filter(r => r.resultsSubmitted).length,
            standings: standings.map((p, i) => ({
                rank: i + 1,
                name: p.name,
                trainerId: p.trainerId || '',
                record: p.record,
                matchPoints: p.matchPoints,
                wins: p.wins,
                losses: p.losses,
                draws: p.draws,
                owp: p.owp,
                oomw: p.oomw,
                woscore: p.woscore,
                byes: p.byes,
                dropped: !!p.dropped,
            })),
            rounds,
        };
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
        const showdownUrl = window.SHOWDOWN_URL || 'https://topcut-hk.com';
        const urlId = state.showdownEventId || 'new';
        window.open(`${showdownUrl}/en/dashboard/results?id=${urlId}&tcgtm=${encodeURIComponent(encoded)}`, '_blank');
    }

    function updateShowdownButton() {
        const btn = document.getElementById('btn-send-showdown');
        if (!btn) return;
        const tournamentEnded = state.tournamentStarted && state.currentRound >= state.totalRounds && state.rounds.every(r => r.resultsSubmitted);
        btn.style.display = (state.showdownEventId || tournamentEnded) ? '' : 'none';
    }

    // ---- TRAINER CARD MODAL ----
    function showTrainerCard(playerId) {
        const player = getPlayer(playerId);
        if (!player) return;

        // Pull tiebreakers from the same getStandings pipeline so values are consistent
        const standingEntry = getStandings().find(s => s.id === playerId);
        const owp = standingEntry ? standingEntry.owp : calculateOWP(player);
        const oomw = standingEntry ? standingEntry.oomw : 0;
        const woscore = standingEntry ? standingEntry.woscore : 0;
        const byes = standingEntry ? standingEntry.byes : 0;
        const body = document.getElementById('modal-body');

        let timeline = '';
        // Aggregate finish counts (spin-battle only) — used for the "Finish breakdown" stat box
        const finishCounts = { survivor: 0, burst: 0, knockout: 0, xtreme: 0, stadium_out: 0, penalty: 0 };
        state.rounds.forEach((round, rIdx) => {
            if (!round.resultsSubmitted) return;
            round.pairings.forEach(pairing => {
                if (pairing.playerA !== playerId && pairing.playerB !== playerId) return;

                if (pairing.isBye && pairing.playerA === playerId) {
                    timeline += `
                        <div class="timeline-item">
                            <span class="timeline-round">${t('trainer.round', { n: rIdx + 1 })}</span>
                            <span class="timeline-result-bye">${t('trainer.byeWin')}</span>
                        </div>`;
                    return;
                }

                const isA = pairing.playerA === playerId;
                const oppId = isA ? pairing.playerB : pairing.playerA;
                const opp = getPlayer(oppId);
                const oppName = opp ? opp.name : 'Unknown';

                let resultText = '';
                let resultClass = '';
                if (pairing.result === 'draw') {
                    resultText = t('trainer.draw');
                    resultClass = 'timeline-result-draw';
                } else if ((pairing.result === 'a' && isA) || (pairing.result === 'b' && !isA)) {
                    resultText = t('trainer.win');
                    resultClass = 'timeline-result-win';
                } else {
                    resultText = t('trainer.loss');
                    resultClass = 'timeline-result-loss';
                }

                // Sub-detail: per-battle list for spin-battle, per-game list for Bo3 TCG
                let subDetail = '';
                if (state.gameType === 'spin-battle' && pairing.battles && pairing.battles.length > 0) {
                    const items = pairing.battles.map((b, i) => {
                        const won = (b.winner === 'a' && isA) || (b.winner === 'b' && !isA);
                        if (won && b.finish && finishCounts[b.finish] != null) finishCounts[b.finish]++;
                        const cls = won ? 'timeline-sub-win' : 'timeline-sub-loss';
                        const finishLabel = t('battle.' + b.finish) || b.finish;
                        const beyTag = b.bey ? ` <span class="timeline-sub-bey">B${b.bey}</span>` : '';
                        return `<div class="timeline-sub-item ${cls}">${i + 1}. ${won ? '✓' : '✗'} ${finishLabel}${beyTag}</div>`;
                    }).join('');
                    subDetail = `<div class="timeline-sub">${items}</div>`;
                } else if (state.gameType === 'tcg' && state.bestOfThree && pairing.games && pairing.games.length > 0) {
                    const items = pairing.games.map((g, i) => {
                        let txt, cls;
                        if (g === 'draw') { txt = t('trainer.draw'); cls = 'timeline-sub-draw'; }
                        else if ((g === 'a' && isA) || (g === 'b' && !isA)) { txt = t('trainer.win'); cls = 'timeline-sub-win'; }
                        else { txt = t('trainer.loss'); cls = 'timeline-sub-loss'; }
                        return `<div class="timeline-sub-item ${cls}">${t('bo3.game', { n: i + 1 })}: ${txt}</div>`;
                    }).join('');
                    subDetail = `<div class="timeline-sub">${items}</div>`;
                }

                timeline += `
                    <div class="timeline-item">
                        <span class="timeline-round">${t('trainer.round', { n: rIdx + 1 })}</span>
                        ${t('trainer.vs')} ${escapeHtml(oppName)} -
                        <span class="${resultClass}">${resultText}</span>
                        ${subDetail}
                    </div>`;
            });
        });

        body.innerHTML = `
            <h3>${escapeHtml(player.name)}</h3>
            <div class="trainer-stats">
                <div class="stat-box">
                    <div class="stat-label">${t('trainer.points')}</div>
                    <div class="stat-value">${player.matchPoints}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">${t('trainer.owp')}</div>
                    <div class="stat-value">${(owp * 100).toFixed(1)}%</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">${t('trainer.oomw')}</div>
                    <div class="stat-value">${(oomw * 100).toFixed(1)}%</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">${t('trainer.woscore')}</div>
                    <div class="stat-value">${woscore}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">${t('trainer.byes')}</div>
                    <div class="stat-value">${byes}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">${t('trainer.record')}</div>
                    <div class="stat-value">${player.wins}-${player.losses}-${player.draws}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">${t('trainer.games')}</div>
                    <div class="stat-value">${player.wins + player.losses + player.draws}</div>
                </div>
                ${state.gameType === 'spin-battle' && player.deck && validateDeck(player.deck).ok ? `
                <div class="stat-box stat-box-wide stat-box-deck">
                    <div class="stat-label">${t('trainer.deck')}</div>
                    <div class="stat-value stat-deck-list">
                        ${player.deck.map((b, i) => `<div class="stat-deck-row"><span class="stat-deck-num">B${i + 1}</span><strong>${escapeHtml(b.blade)}</strong> <em>${escapeHtml(b.ratchet)}</em> <em>${escapeHtml(b.bit)}</em></div>`).join('')}
                    </div>
                </div>
                ` : ''}
                ${state.gameType === 'spin-battle' && (player.battlePointsScored || 0) > 0 ? `
                <div class="stat-box stat-box-wide">
                    <div class="stat-label">${t('trainer.battlePts')}</div>
                    <div class="stat-value">${player.battlePointsScored || 0}</div>
                </div>
                <div class="stat-box stat-box-wide stat-box-finishes">
                    <div class="stat-label">${t('trainer.finishBreakdown')}</div>
                    <div class="stat-value stat-finish-breakdown">
                        <span title="${t('battle.xtreme')}"><b>${finishCounts.xtreme}</b><em>×3</em></span>
                        <span title="${t('battle.knockout')}"><b>${finishCounts.knockout}</b><em>K</em></span>
                        <span title="${t('battle.burst')}"><b>${finishCounts.burst}</b><em>B</em></span>
                        <span title="${t('battle.survivor')}"><b>${finishCounts.survivor}</b><em>S</em></span>
                        ${finishCounts.stadium_out > 0 ? `<span title="${t('battle.stadiumOut')}"><b>${finishCounts.stadium_out}</b><em>SO</em></span>` : ''}
                        ${finishCounts.penalty > 0 ? `<span title="${t('penalty.title')}" class="finish-penalty"><b>${finishCounts.penalty}</b><em>P</em></span>` : ''}
                    </div>
                </div>
                ` : ''}
                ${state.gameType === 'tcg' && state.bestOfThree && (player.gameWins || 0) + (player.gameLosses || 0) > 0 ? `
                <div class="stat-box stat-box-wide">
                    <div class="stat-label">${t('standings.gw')}</div>
                    <div class="stat-value">${player.gameWins || 0}-${player.gameLosses || 0}</div>
                </div>
                ` : ''}
            </div>
            ${timeline ? `<h4 style="margin-bottom:0.5rem;color:var(--text-dim)">${t('trainer.history')}</h4><div class="trainer-timeline">${timeline}</div>` : `<p style="color:var(--text-dim)">${t('trainer.none')}</p>`}
            ${(!viewOnly && state.tournamentStarted && !state.tournamentEnded) ? `
                <div class="trainer-actions">
                    <button class="btn ${player.dropped ? 'btn-secondary' : 'btn-danger'}" onclick="app.toggleDrop('${player.id}')">
                        ${player.dropped ? t('trainer.undoDrop') : t('trainer.drop')}
                    </button>
                </div>` : ''}
        `;

        document.getElementById('modal-overlay').classList.add('open');
    }

    function toggleDrop(playerId) {
        const player = getPlayer(playerId);
        if (!player) return;
        if (!player.dropped) {
            if (!confirm(t('trainer.confirmDrop', { name: player.name }))) return;
            player.dropped = true;
            // In knockout, auto-award the current-round match to their opponent.
            if (state.tournamentType === 'knockout') {
                const round = state.rounds[state.currentRound];
                if (round && !round.resultsSubmitted) {
                    round.pairings.forEach(p => {
                        if (p.isBye) return;
                        if (p.playerA === playerId && p.result === null) p.result = 'b';
                        else if (p.playerB === playerId && p.result === null) p.result = 'a';
                    });
                }
            }
        } else {
            player.dropped = false;
        }
        saveState();
        closeModal();
        renderRound();
        renderStandings();
    }

    function closeModal() {
        document.getElementById('modal-overlay').classList.remove('open');
    }

    // ---- TIMER ----
    function resetTimerValue() {
        state.timerSeconds = state.timerDefault;
        state.timerRunning = false;
        state.timerEndsAt = null;
        stopTimer();
        renderTimer();
    }

    function renderTimer() {
        const display = document.getElementById('timer-display');
        const mins = Math.floor(Math.abs(state.timerSeconds) / 60);
        const secs = Math.abs(state.timerSeconds) % 60;
        const prefix = state.timerSeconds < 0 ? '-' : '';
        display.textContent = `${prefix}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        display.classList.remove('warning', 'danger');
        if (state.timerSeconds <= 0) {
            display.classList.add('danger');
        } else if (state.timerSeconds <= 60) {
            display.classList.add('danger');
        } else if (state.timerSeconds <= 300) {
            display.classList.add('warning');
        }

        const toggleBtn = document.getElementById('btn-timer-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = state.timerRunning ? t('timer.pause') : t('timer.start');
        }
    }

    function timerToggle() {
        if (state.timerRunning) {
            stopTimer();
        } else {
            startTimer();
        }
    }

    // FIX #1: Timer auto-stops at 0, saves state periodically
    function startTimer() {
        state.timerRunning = true;
        state.timerEndsAt = Date.now() + state.timerSeconds * 1000;
        saveState(); // push endsAt to cloud immediately so viewers can sync
        if (timerInterval) clearInterval(timerInterval);
        timerSaveCounter = 0;
        timerInterval = setInterval(() => {
            const remaining = state.timerEndsAt
                ? Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000))
                : 0;
            state.timerSeconds = remaining;

            if (remaining === 0) {
                if (!state.timerMuted) playBeep();
                stopTimer();
                showToast(t('timer.up'));
                return;
            }

            // Periodic save for crash recovery (deadline already in cloud)
            timerSaveCounter++;
            if (timerSaveCounter >= 30) {
                timerSaveCounter = 0;
                saveState();
            }

            renderTimer();
        }, 1000);
        renderTimer();
    }

    function stopTimer() {
        if (state.timerEndsAt) {
            state.timerSeconds = Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000));
        }
        state.timerRunning = false;
        state.timerEndsAt = null;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        saveState();
        renderTimer();
    }

    function timerReset() {
        stopTimer();
        state.timerSeconds = state.timerDefault;
        state.timerEndsAt = null;
        saveState();
        renderTimer();
    }

    function timerAdjust(seconds) {
        if (state.timerRunning && state.timerEndsAt) {
            state.timerEndsAt = Math.max(Date.now(), state.timerEndsAt + seconds * 1000);
            state.timerSeconds = Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000));
        } else {
            state.timerSeconds = Math.max(0, state.timerSeconds + seconds);
        }
        saveState();
        renderTimer();
    }

    // Enhancement: Timer sound toggle
    function toggleTimerMute() {
        state.timerMuted = !state.timerMuted;
        saveState();
        updateMuteButton();
    }

    function updateMuteButton() {
        const btn = document.getElementById('btn-timer-mute');
        if (btn) {
            btn.textContent = state.timerMuted ? t('timer.unmute') : t('timer.mute');
            btn.classList.toggle('btn-active', state.timerMuted);
        }
    }

    function toggleCompactMode() {
        state.compactMode = !state.compactMode;
        applyCompactMode();
        saveState();
    }

    function applyCompactMode() {
        const panel = document.getElementById('round-panel');
        if (panel) panel.classList.toggle('compact-mode', state.compactMode);
        const btn = document.getElementById('btn-compact');
        if (btn) {
            const label = btn.querySelector('.btn-label') || btn;
            label.textContent = state.compactMode ? t('timer.expand') : t('timer.compact');
            btn.classList.toggle('btn-active', state.compactMode);
        }
    }

    // Enhancement: Projector mode
    function toggleProjectorMode() {
        state.projectorMode = !state.projectorMode;
        document.body.classList.toggle('projector-mode', state.projectorMode);
        saveState();
        updateProjectorMode();
    }

    function updateProjectorMode() {
        const btn = document.getElementById('btn-projector');
        if (btn) {
            const label = btn.querySelector('.btn-label') || btn;
            label.textContent = state.projectorMode ? t('timer.exitProjector') : t('timer.projector');
            btn.classList.toggle('btn-active', state.projectorMode);
        }
        document.body.classList.toggle('projector-mode', state.projectorMode);
    }

    function playBeep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'square';
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.frequency.value = 880;
                osc2.type = 'square';
                gain2.gain.value = 0.3;
                osc2.start();
                osc2.stop(ctx.currentTime + 0.5);
            }, 600);
        } catch (e) { /* Audio not available */ }
    }

    function playVictorySound() {
        if (state.timerMuted) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'triangle';
                gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.5);
                osc.start(ctx.currentTime + i * 0.15);
                osc.stop(ctx.currentTime + i * 0.15 + 0.5);
            });
        } catch (e) { /* Audio not available */ }
    }

    // ---- LUCKY WHEEL ----
    const WHEEL_COLORS = [
        '#e63946', '#ffd60a', '#00b4d8', '#2ec4b6', '#9b5de5',
        '#f77f00', '#d62828', '#457b9d', '#e76f51', '#606c38',
        '#3a86a7', '#fb5607', '#8338ec', '#06d6a0', '#118ab2'
    ];

    function wheelSetNames() {
        const textarea = document.getElementById('wheel-names');
        const names = textarea.value.split('\n').map(n => n.trim()).filter(n => n);
        state.wheelNames = names;
        saveState();
        renderWheel();
    }

    function wheelSyncFromTournament() {
        if (state.players.length === 0) {
            alert(t('wheel.noPlayers'));
            return;
        }
        openWheelPicker();
    }

    // Standings → Wheel handoff: jump to wheel view with picker auto-open and
    // every tournament player pre-checked. Organizer can untick top 3 / VIP /
    // already-prized players, then confirm — same flow as wheelSyncFromTournament
    // but launches from the standings page.
    //
    // When this tournament originated from a host event, starting the wheel
    // is treated as the organizer signalling "ranking finalised". We fire a
    // background publishEventResult so the gamesetResult post + per-player
    // tournamentRecords land on TopCut without forcing the organizer to flip
    // back to /host/?e=. The call is idempotent — a re-publish updates the
    // existing post via topcutResultPostId.
    function standingsToWheel() {
        if (state.players.length === 0) {
            alert(t('wheel.noPlayers'));
            return;
        }
        publishEventResultIfNeeded();
        navigateTo('wheel');
        // Defer one frame so the wheel view DOM is ready before we open the picker.
        setTimeout(openWheelPicker, 30);
    }

    async function publishEventResultIfNeeded(opts) {
        const force = opts && opts.force;
        const silent = opts && opts.silent;
        const tag = '[event.publish]';
        if (!state.hostEventId) {
            console.info(tag, 'skip: not event-sourced (no hostEventId)');
            return;
        }
        if (!force && state.hostEventResultPublished) {
            console.info(tag, 'skip: already published, no force flag');
            return;
        }
        if (!window.cloud || !window.cloud.isConfigured()) {
            console.warn(tag, 'skip: cloud not configured');
            if (!silent) showToast('⚠️ Firebase 未設置 — 無法發送');
            return;
        }
        if (!window.cloud.isReady()) {
            console.warn(tag, 'skip: cloud not ready, retrying init');
            try { await window.cloud.init(); } catch (e) { console.error(tag, 'init failed', e); }
            if (!window.cloud.isReady()) {
                if (!silent) showToast('⚠️ 連線未就緒 — 請刷新再試');
                return;
            }
        }
        if (!window.cloud.publishEventResult) {
            console.warn(tag, 'skip: publishEventResult helper missing (old cache?)');
            if (!silent) showToast('⚠️ 版本太舊，請 hard refresh');
            return;
        }
        if (!state.tournamentEnded) {
            console.info(tag, 'skip: tournament not ended');
            if (!silent) showToast('⚠️ 比賽未結束');
            return;
        }

        console.info(tag, 'publishing', { eventId: state.hostEventId, force });

        // Mark optimistically so we don't fire repeatedly on re-entry into the
        // wheel page — flag is rolled back if the call actually fails.
        state.hostEventResultPublished = true;
        saveState();
        if (!silent) showToast(t('event.publishing'));
        updateStandingsConfirmCta();
        try {
            // The Cloud Function refuses to publish without a result snapshot
            // on the event doc. Push the latest one (idempotent overwrite)
            // before invoking the function so old sessions that ended before
            // the snapshot pipeline existed still publish successfully, and
            // any post-rename edits land in the same call.
            await pushEventResultSnapshot();
            const res = await window.cloud.publishEventResult(state.hostEventId);
            console.info('[event] result published', res);
            if (!opts || !opts.silent) showToast(t('event.published'));
            updateStandingsConfirmCta();
            return res;
        } catch (err) {
            console.error('[event] publishEventResult failed', err);
            state.hostEventResultPublished = false;                  // allow retry
            saveState();
            showToast(t('event.publishFail'));
            updateStandingsConfirmCta();
            throw err;
        }
    }

    /* Manual "Confirm + send" button in the standings page. Behaves the
       same as the auto-trigger but always fires (force) so the organizer
       can re-publish after editing names inline. Catches errors so a
       failure doesn't surface as the unhandled-promise warning. */
    function confirmStandingsToTopCut() {
        console.info('[event.publish] manual confirm clicked', {
            hostEventId: state.hostEventId,
            tournamentEnded: state.tournamentEnded,
            published: state.hostEventResultPublished,
            cloudReady: !!(window.cloud && window.cloud.isReady && window.cloud.isReady()),
        });
        if (!state.hostEventId) {
            alert('呢場比賽唔係由 GameSet 活動開始，所以無法 publish 去 TopCut。');
            return;
        }
        publishEventResultIfNeeded({ force: true }).catch(() => {
            /* error toast already shown */
        });
    }

    function updateStandingsConfirmCta() {
        const btn = document.getElementById('btn-standings-confirm-result');
        if (!btn) return;
        const showBtn = !!state.hostEventId && state.tournamentEnded;
        btn.hidden = !showBtn;
        if (!showBtn) return;
        const titleEl = btn.querySelector('.standings-confirm-title');
        const subEl = btn.querySelector('.standings-confirm-sub');
        const iconEl = btn.querySelector('.standings-confirm-icon');
        const isPublished = !!state.hostEventResultPublished;
        btn.classList.toggle('is-published', isPublished);
        if (titleEl) titleEl.textContent = isPublished
            ? t('standings.confirmDone')
            : t('standings.confirmTitle');
        if (subEl) subEl.textContent = isPublished
            ? t('standings.confirmResend')
            : t('standings.confirmSub');
        if (iconEl) iconEl.textContent = isPublished ? '✅' : '📣';
    }

    // Picker modal — choose which tournament players go onto the wheel.
    // Sorted by standings so champion / runners-up are obvious.
    function openWheelPicker() {
        const standings = getStandings();
        const list = document.getElementById('wheel-pick-list');
        list.innerHTML = '';
        standings.forEach((p, i) => {
            const row = document.createElement('label');
            row.className = 'wheel-pick-row';
            row.innerHTML = `
                <input type="checkbox" class="wheel-pick-cb" data-name="${escapeHtml(p.name)}" checked>
                <span class="wheel-pick-rank">${t('wheel.pickRank', { n: i + 1 })}</span>
                <span class="wheel-pick-name">${escapeHtml(p.name)}</span>
                <span class="wheel-pick-record">${p.record}</span>
            `;
            list.appendChild(row);
        });
        document.getElementById('wheel-pick-overlay').classList.add('open');
    }

    function closeWheelPicker() {
        document.getElementById('wheel-pick-overlay').classList.remove('open');
    }

    // ---- CLOUD: publish / inline share panel / view-only ----
    let shareExpanded = false;

    async function cloudPublishToggle() {
        if (viewOnly) return;
        if (state.publishedTournamentId) {
            // Already published — toggle the inline panel
            toggleSharePanel();
            return;
        }
        if (!window.cloud || !window.cloud.isConfigured()) {
            alert(t('cloud.notConfigured'));
            return;
        }
        const btn = document.getElementById('btn-publish');
        const labelEl = btn ? (btn.querySelector('.btn-label') || btn) : null;
        const originalLabel = labelEl ? labelEl.textContent : '';
        if (btn) { btn.disabled = true; if (labelEl) labelEl.textContent = t('cloud.publishing'); }
        try {
            if (!window.cloud.isReady()) await window.cloud.init();
            if (!window.cloud.isReady()) throw new Error('init failed');
            const tid = await window.cloud.publish(state);
            state.publishedTournamentId = tid;
            saveState();
            updatePublishButton();
            shareExpanded = true;
            renderSharePanel();
            showToast(t('cloud.published'));
            // Owner: subscribe to the matchReports subcollection so any
            // self-reports from players auto-apply to local state.
            attachMatchReportsListener(tid);
            track('tournament_published', {
                format: state.tournamentType || 'swiss',
                player_count: state.players.length
            });
        } catch (e) {
            console.error(e);
            alert(t('cloud.publishFail'));
        } finally {
            if (btn) { btn.disabled = false; if (!state.publishedTournamentId && labelEl) labelEl.textContent = originalLabel; }
        }
    }

    async function cloudUnpublish() {
        if (!state.publishedTournamentId) return;
        if (!confirm(t('cloud.unpublishConfirm'))) return;
        try {
            if (window.cloud) await window.cloud.unpublish();
        } catch (_) { /* ignore */ }
        state.publishedTournamentId = null;
        shareExpanded = false;
        saveState();
        renderSharePanel();
        updatePublishButton();
    }

    function toggleSharePanel() {
        if (!state.publishedTournamentId) return;
        shareExpanded = !shareExpanded;
        renderSharePanel();
    }

    function renderSharePanel() {
        const panel = document.getElementById('share-panel');
        if (!panel) return;
        const tid = state.publishedTournamentId;
        if (!tid || viewOnly) {
            panel.style.display = 'none';
            return;
        }
        panel.style.display = '';
        panel.classList.toggle('expanded', shareExpanded);
        panel.classList.toggle('collapsed', !shareExpanded);

        const idEl = document.getElementById('share-panel-id-value');
        if (idEl) idEl.textContent = tid;

        if (shareExpanded) {
            const url = window.cloud ? window.cloud.buildViewUrl(tid) : '';
            const linkEl = document.getElementById('share-link-input');
            if (linkEl) linkEl.value = url;
            const img = document.getElementById('share-qr');
            if (img && url && img.dataset.srcUrl !== url) {
                img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=' + encodeURIComponent(url);
                img.dataset.srcUrl = url;
            }
        }
    }

    // Back-compat no-ops (modal removed)
    function closeShareModal() {}

    // ---- VIEWER TABS — flip between live round + full standings on the viewer page ----
    // Visible only in view-only mode (CSS hides for owners). Tabs are also hidden when
    // the tournament hasn't started yet (registration view) or when there are no rounds.
    function updateViewerTabs() {
        const nav = document.getElementById('viewer-tabs');
        if (!nav) return;
        // Only show in view mode AND when round/standings are meaningful
        const hasRounds = state.rounds && state.rounds.length > 0;
        if (!viewOnly || !hasRounds) {
            nav.style.display = 'none';
            return;
        }
        nav.style.display = '';
        // Mark active based on currentView
        nav.querySelectorAll('.viewer-tab').forEach(btn => {
            const target = btn.getAttribute('data-target');
            btn.classList.toggle('viewer-tab-active', target === state.currentView);
        });
        // Wheel tab — surface only when the owner has primed the wheel
        // (names set up OR a spin has run). Pulse dot shows mid-spin.
        const wheelTab = document.getElementById('viewer-tab-wheel');
        if (wheelTab) {
            const wheelHasContent = (state.wheelNames && state.wheelNames.length > 0)
                || (state.wheelHistory && state.wheelHistory.length > 0)
                || !!state.wheelSpin;
            wheelTab.hidden = !wheelHasContent;
            const pulse = document.getElementById('viewer-wheel-pulse');
            if (pulse) pulse.hidden = !state.wheelSpin;
        }
    }

    function viewerSwitchTab(target) {
        if (!viewOnly) return;
        if (target !== 'round' && target !== 'standings' && target !== 'wheel') return;
        navigateTo(target);
    }

    // ---- VIEWER SHARE QR (player-to-player link sharing in view-only mode) ----
    function viewerShareOpen() {
        const overlay = document.getElementById('viewer-share-overlay');
        if (!overlay) return;
        const url = window.location.href;
        const img = document.getElementById('viewer-share-qr');
        if (img) img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=' + encodeURIComponent(url);
        const linkEl = document.getElementById('viewer-share-link');
        if (linkEl) linkEl.value = url;
        overlay.classList.add('open');
    }

    function viewerShareClose() {
        const overlay = document.getElementById('viewer-share-overlay');
        if (overlay) overlay.classList.remove('open');
    }

    function viewerShareCopy() {
        const linkEl = document.getElementById('viewer-share-link');
        if (!linkEl) return;
        linkEl.select();
        linkEl.setSelectionRange(0, 99999);
        try {
            document.execCommand('copy');
            showToast(t('viewer.linkCopied'));
        } catch (_) {
            navigator.clipboard && navigator.clipboard.writeText(linkEl.value)
                .then(() => showToast(t('viewer.linkCopied')));
        }
    }

    function copyShareLink() {
        const linkEl = document.getElementById('share-link-input');
        if (!linkEl) return;
        linkEl.select();
        linkEl.setSelectionRange(0, 99999);
        try {
            document.execCommand('copy');
            showToast(t('cloud.copied'));
        } catch (_) {
            navigator.clipboard && navigator.clipboard.writeText(linkEl.value)
                .then(() => showToast(t('cloud.copied')));
        }
    }

    function updatePublishButton() {
        const btn = document.getElementById('btn-publish');
        if (!btn) return;
        if (viewOnly) { btn.style.display = 'none'; return; }
        btn.style.display = '';
        btn.disabled = false;
        const label = btn.querySelector('.btn-label') || btn;
        if (state.publishedTournamentId) {
            label.textContent = t('cloud.published');
            btn.classList.add('btn-active');
        } else {
            label.textContent = t('cloud.publish');
            btn.classList.remove('btn-active');
        }
    }

    function showViewerStatus(message) {
        // Replace the app main area with a centered status message
        let overlay = document.getElementById('viewer-status');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'viewer-status';
            overlay.className = 'viewer-status';
            const main = document.getElementById('app');
            if (main) main.parentNode.insertBefore(overlay, main);
        }
        overlay.innerHTML = `<div class="viewer-status-box">
            <div class="viewer-status-dot"></div>
            <p>${escapeHtml(message)}</p>
            <p class="info-text viewer-status-id">${t('cloud.tournamentId')}: <strong>${escapeHtml(viewTournamentId || '')}</strong></p>
        </div>`;
        overlay.style.display = '';
    }

    function hideViewerStatus() {
        const overlay = document.getElementById('viewer-status');
        if (overlay) overlay.style.display = 'none';
    }

    function enterViewMode(tid) {
        viewOnly = true;
        viewTournamentId = tid;
        try { viewerPinName = localStorage.getItem('ptcg_viewer_pin') || ''; } catch (e) {}
        // Parse self-report identity from URL — &me= can be a trainer ID
        // (hk + 8 digits) or a player name. Both auto-pin the matching
        // player and unlock the pass-the-phone confirmation flow on their
        // pairing. Trainer ID is preferred when present (cross-event auth);
        // names work for tournaments not started from a hosted event.
        try {
            const meRaw = (new URLSearchParams(window.location.search).get('me') || '').trim();
            if (meRaw) {
                const meLc = meRaw.toLowerCase();
                if (/^hk\d{8}$/.test(meLc)) {
                    selfReportTrainerId = meLc;
                    if (!viewerPinName) viewerPinName = meLc;
                } else if (!viewerPinName) {
                    viewerPinName = meRaw;
                }
            }
        } catch (e) {}
        document.body.classList.add('view-only');
        const banner = document.getElementById('view-mode-banner');
        if (banner) banner.style.display = '';
        // Stop any local admin ticker; viewer ticks from synced timerEndsAt instead.
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        showViewerStatus(t('cloud.viewLoading'));

        // Local 1Hz ticker that derives timerSeconds from the synced deadline.
        if (!window._viewerTimerInterval) {
            window._viewerTimerInterval = setInterval(() => {
                if (!viewOnly) return;
                if (state.timerRunning && state.timerEndsAt) {
                    const remaining = Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000));
                    state.timerSeconds = remaining;
                    renderTimer();
                }
            }, 1000);
        }

        const apply = (remoteState) => {
            if (!remoteState) return;
            // Viewers get a locked-down preset: no projector, no compact, always muted.
            // Timer fields (timerRunning, timerEndsAt, timerSeconds) come from admin so countdown stays in sync.
            const viewerLock = {
                projectorMode: false,
                compactMode: false,
                timerMuted: true,
                currentView: state.currentView
            };
            const wasInitial = !state.publishedTournamentId;
            state = { ...DEFAULT_STATE, ...remoteState, ...viewerLock, publishedTournamentId: tid };
            hideViewerStatus();
            // Canonical view from tournament state. Used on initial load OR
            // when the viewer somehow lands on a view that doesn't have a
            // tab (e.g. registration after a fresh session reset).
            const canonical = state.tournamentEnded ? 'standings'
                            : state.tournamentStarted ? 'round'
                            : 'registration';
            const tabbedViews = ['round', 'standings', 'wheel'];
            const view = (wasInitial || !tabbedViews.includes(state.currentView))
                ? canonical
                : state.currentView;
            navigateTo(view);
            renderTimer();
            applyNoAds();
        };

        const onErr = (err) => {
            console.warn('[view] subscribe error', err);
            if (err && err.message === 'not_found') {
                showViewerStatus(t('cloud.viewNotFound'));
            } else {
                showViewerStatus((err && err.message) || 'Connection error');
            }
        };

        const start = async () => {
            if (!window.cloud) { onErr(new Error('cloud unavailable')); return; }
            if (!window.cloud.isConfigured()) {
                showViewerStatus(t('cloud.notConfigured'));
                return;
            }
            const ok = await window.cloud.init();
            if (!ok) {
                showViewerStatus('Firebase init failed — check console.');
                return;
            }
            window.cloud.subscribeView(tid, apply, onErr);
            attachMatchReportsListener(tid);
        };
        start();
    }

    function wheelPickSetAll(checked) {
        document.querySelectorAll('#wheel-pick-list .wheel-pick-cb').forEach(cb => {
            cb.checked = checked;
        });
    }

    function wheelPickExcludeTop3() {
        const cbs = document.querySelectorAll('#wheel-pick-list .wheel-pick-cb');
        cbs.forEach((cb, i) => { cb.checked = i >= 3; });
    }

    function wheelPickApply() {
        const names = [];
        document.querySelectorAll('#wheel-pick-list .wheel-pick-cb').forEach(cb => {
            if (cb.checked) names.push(cb.getAttribute('data-name'));
        });
        state.wheelNames = names;
        document.getElementById('wheel-names').value = names.join('\n');
        saveState();
        renderWheel();
        closeWheelPicker();
        showToast(t('wheel.pickAdded', { n: names.length }));
    }

    // Enhancement: Reset wheel history and clear names for fresh start
    function wheelReset() {
        if (!confirm(t('wheel.confirmReset'))) return;
        state.wheelHistory = [];
        state.wheelNames = [];
        document.getElementById('wheel-names').value = '';
        saveState();
        renderWheel();
    }

    function renderWheel() {
        const canvas = document.getElementById('wheel-canvas');
        const ctx = canvas.getContext('2d');
        const names = state.wheelNames;
        const spinBtn = document.getElementById('btn-spin');

        const textarea = document.getElementById('wheel-names');
        if (textarea && textarea.value.trim() === '' && names.length > 0) {
            textarea.value = names.join('\n');
        }

        const historyList = document.getElementById('wheel-history');
        if (historyList) {
            historyList.innerHTML = '';
            state.wheelHistory.forEach(name => {
                const li = document.createElement('li');
                li.textContent = name;
                historyList.appendChild(li);
            });
        }

        if (spinBtn) spinBtn.disabled = names.length < 2 || wheelSpinning;

        // Use synced wheelAngle as baseline when no spin is active locally
        // (viewers who land here mid-tournament get the correct snapshot).
        if (!wheelSpinning && typeof state.wheelAngle === 'number') {
            wheelAngle = state.wheelAngle;
        }
        drawWheel(ctx, canvas.width, canvas.height, names, wheelAngle);

        // Viewer-side: kick off the synced animation if owner has just
        // emitted a wheelSpin envelope and we're not already running one.
        // Skip stale envelopes — if the owner blurred their tab mid-spin
        // and never flushed the cleanup, late-arriving viewers shouldn't
        // loop a phantom animation past its expected end.
        if (viewOnly && state.wheelSpin && !wheelSpinning) {
            const env = state.wheelSpin;
            const ageMs = Date.now() - (env.startedAt || 0);
            const stale = ageMs > (env.durationMs || 6000) + 5000;
            if (!stale) startSyncedSpinAnimation(env);
        }
    }

    /* Replay the spin envelope on the viewer side. Computes elapsed time
       from `startedAt` (wall clock) so a viewer who joins mid-spin still
       lands on the correct angle, just with a shortened tail animation.
       After the local animation completes, derives the winner the same
       way the owner does (pointer at -PI/2) and shows the winner banner. */
    function startSyncedSpinAnimation(envelope) {
        if (wheelSpinning) return;
        if (!envelope || typeof envelope.startedAt !== 'number') return;
        const canvas = document.getElementById('wheel-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const names = state.wheelNames || [];
        if (names.length < 2) return;

        wheelSpinning = true;
        const sliceAngle = (Math.PI * 2) / names.length;
        const { startAngle, totalRotation, durationMs, startedAt } = envelope;

        function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

        function tick() {
            // Re-fetch envelope each frame — owner may have ended the spin
            // (state.wheelSpin → null) and we should snap to final angle.
            const env = state.wheelSpin;
            if (!env || env.startedAt !== startedAt) {
                wheelSpinning = false;
                if (typeof state.wheelAngle === 'number') wheelAngle = state.wheelAngle;
                drawWheel(ctx, canvas.width, canvas.height, names, wheelAngle);
                return;
            }
            const elapsed = Date.now() - startedAt;
            const progress = Math.max(0, Math.min(elapsed / durationMs, 1));
            const eased = easeOutCubic(progress);
            wheelAngle = startAngle + totalRotation * eased;
            drawWheel(ctx, canvas.width, canvas.height, names, wheelAngle);

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                wheelSpinning = false;
                // Best-effort viewer winner banner — owner will sync the
                // canonical winner via state.wheelHistory anyway, but a
                // local computation here makes the banner appear in the
                // same frame the wheel stops (no extra round-trip wait).
                const pointerAngle = -Math.PI / 2;
                let offset = ((pointerAngle - wheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                const winnerIndex = Math.floor(offset / sliceAngle) % names.length;
                const winner = names[winnerIndex];
                if (winner) showViewerWinner(winner);
            }
        }
        requestAnimationFrame(tick);
    }

    /* Lightweight winner banner for viewers — re-uses the existing winner
       modal flow when present, falls back to a toast otherwise. */
    function showViewerWinner(name) {
        if (typeof confetti === 'function') {
            try {
                confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
            } catch (_) {}
        }
        const modal = document.getElementById('winner-modal');
        const nameEl = document.getElementById('winner-name');
        if (modal && nameEl) {
            nameEl.textContent = name;
            modal.classList.add('active');
        } else {
            try { showToast('🎉 ' + name); } catch (_) {}
        }
    }

    function drawWheel(ctx, w, h, names, rotation) {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(cx, cy) - 5;

        ctx.clearRect(0, 0, w, h);

        if (names.length === 0) {
            ctx.fillStyle = '#1a1f4e';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8d99ae';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(t('wheel.empty'), cx, cy);
            return;
        }

        const sliceAngle = (Math.PI * 2) / names.length;

        names.forEach((name, i) => {
            const startAngle = rotation + i * sliceAngle;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            const fontSize = Math.min(16, Math.max(10, 200 / names.length));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 3;
            const textR = r * 0.7;
            const maxWidth = r * 0.55;
            ctx.fillText(truncateText(ctx, name, maxWidth), textR, 0);
            ctx.restore();
        });

        // Center circle
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0e27';
        ctx.fill();
        ctx.strokeStyle = '#ffd60a';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    function truncateText(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        let t = text;
        while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) {
            t = t.slice(0, -1);
        }
        return t + '...';
    }

    // FIX #5: Corrected wheel winner detection
    function spinWheel() {
        if (viewOnly) return;        // viewers spin only via synced wheelSpin
        if (state.wheelNames.length < 2 || wheelSpinning) return;

        wheelSpinning = true;
        document.getElementById('btn-spin').disabled = true;

        const canvas = document.getElementById('wheel-canvas');
        const ctx = canvas.getContext('2d');
        const names = state.wheelNames;
        const sliceAngle = (Math.PI * 2) / names.length;

        const totalRotation = (5 + Math.random() * 5) * Math.PI * 2 + Math.random() * Math.PI * 2;
        const startAngle = wheelAngle;
        const endAngle = startAngle + totalRotation;
        const duration = 4000 + Math.random() * 2000;
        const startTime = performance.now();
        // Synced spin envelope — viewers start their own RAF loop with these
        // params and land on the same final angle. Date.now() (wall clock)
        // is used for `startedAt` so viewers can compute elapsed time off
        // the same anchor; minor clock-skew is harmless because the viewer
        // tweens to catch up when they receive the update.
        state.wheelSpin = { startAngle, totalRotation, durationMs: duration, startedAt: Date.now() };
        saveState();
        // Force-flush so the spin envelope hits the cloud immediately
        // instead of waiting for the 800ms debounce — players who tabbed
        // over from the round view see the spin without lag.
        if (window.cloud && window.cloud.isReady && window.cloud.isReady()) {
            window.cloud.syncState(state);
            if (window.cloud.flush) window.cloud.flush();
        }

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        // Compute the final winner from the wheel's resting angle. Pulled out
        // so both the RAF terminal branch AND the safety setTimeout below
        // can settle the spin identically.
        let settled = false;
        function settleSpin() {
            if (settled) return;
            settled = true;
            wheelSpinning = false;
            const btn = document.getElementById('btn-spin');
            if (btn) btn.disabled = false;
            // Snap to the deterministic end angle so viewers who animated
            // alongside us land on the exact same wheel position regardless
            // of any RAF throttling on either side.
            wheelAngle = startAngle + totalRotation;
            drawWheel(ctx, canvas.width, canvas.height, names, wheelAngle);
            // Spin done — clear envelope, persist final angle so viewers
            // who join between spins still render the correct snapshot.
            state.wheelSpin = null;
            state.wheelAngle = wheelAngle;
            if (window.cloud && window.cloud.isReady && window.cloud.isReady()) {
                saveState();
                window.cloud.syncState(state);
                if (window.cloud.flush) window.cloud.flush();
            }
            // The pointer is at the top of the canvas (12 o'clock = -PI/2).
            const pointerAngle = -Math.PI / 2;
            const offset = ((pointerAngle - wheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            const winnerIndex = Math.floor(offset / sliceAngle) % names.length;
            const winner = names[winnerIndex];
            showWinner(winner);
        }

        function animate(now) {
            if (settled) return;        // safety setTimeout already fired
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);

            wheelAngle = startAngle + totalRotation * eased;
            drawWheel(ctx, canvas.width, canvas.height, names, wheelAngle);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                settleSpin();
            }
        }

        requestAnimationFrame(animate);
        // Safety net — if the owner blurs the wheel tab mid-spin, RAF
        // pauses (browsers throttle hidden-tab RAF) and the terminal
        // branch never fires. Without this fallback the cloud envelope
        // (state.wheelSpin) would stay live indefinitely and viewers
        // who arrive after the real winner is already shown would loop
        // through a phantom animation. setTimeout still fires in hidden
        // tabs (just rate-limited), so we always reach settleSpin().
        setTimeout(settleSpin, duration + 200);
    }

    // FIX #6: Remove winner by index, not by name (handles duplicates)
    function showWinner(name) {
        state.wheelHistory.push(name);

        const removeWinner = document.getElementById('wheel-remove-winner').checked;
        if (removeWinner) {
            // Remove only the FIRST occurrence of winner name
            const idx = state.wheelNames.indexOf(name);
            if (idx !== -1) {
                state.wheelNames.splice(idx, 1);
            }
            document.getElementById('wheel-names').value = state.wheelNames.join('\n');
        }

        saveState();

        if (typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#e63946', '#ffd60a', '#00b4d8', '#2ec4b6', '#9b5de5']
            });
        }

        playVictorySound();

        document.getElementById('winner-name').textContent = name;
        document.getElementById('winner-overlay').classList.add('open');

        renderWheel();
    }

    function closeWinnerModal() {
        document.getElementById('winner-overlay').classList.remove('open');
    }

    // ---- ADVANCED RECOVERY ----
    // Staging state — kept completely separate from the live tournament state
    // until the user explicitly commits. Persisted so a mid-recovery tab close
    // isn't a second disaster.
    let advancedStaging = {
        players: [], // [{ name, tempId }]
        rounds: []   // [{ pairings: [{ tempA, tempB|null, result: 'a'|'b'|'draw'|'bye' }] }]
    };

    function saveAdvancedStaging() {
        localStorage.setItem('ptcg_advanced_staging', JSON.stringify(advancedStaging));
    }

    function loadAdvancedStaging() {
        const saved = localStorage.getItem('ptcg_advanced_staging');
        if (saved) {
            try {
                advancedStaging = JSON.parse(saved);
            } catch (e) {
                advancedStaging = { players: [], rounds: [] };
            }
        }
    }

    function clearAdvancedStaging() {
        advancedStaging = { players: [], rounds: [] };
        localStorage.removeItem('ptcg_advanced_staging');
    }

    function newTempId() {
        return 'tmp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    function renderAdvanced() {
        // Restore roster textarea if staging has names
        const rosterInput = document.getElementById('adv-roster-input');
        if (rosterInput && advancedStaging.players.length > 0 && rosterInput.value.trim() === '') {
            rosterInput.value = advancedStaging.players.map(p => p.name).join('\n');
        }
        renderAdvancedRosterCount();
        renderAdvancedRounds();
        renderAdvancedValidation();
    }

    function renderAdvancedRosterCount() {
        const el = document.getElementById('adv-roster-count');
        if (!el) return;
        const n = advancedStaging.players.length;
        el.textContent = n > 0 ? t('adv.rosterCount', { n }) : '';
    }

    function advancedSetRoster() {
        const textarea = document.getElementById('adv-roster-input');
        const lines = textarea.value.split('\n').map(l => l.trim()).filter(l => l);
        // Preserve existing tempIds where the name already matches, so rounds keep working
        const existingByName = {};
        advancedStaging.players.forEach(p => { existingByName[p.name.toLowerCase()] = p.tempId; });

        const seen = new Set();
        const next = [];
        lines.forEach(name => {
            const key = name.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            next.push({
                name,
                tempId: existingByName[key] || newTempId()
            });
        });

        // If names were removed, drop any round pairing referencing a gone tempId
        const validIds = new Set(next.map(p => p.tempId));
        advancedStaging.rounds.forEach(round => {
            round.pairings = round.pairings.filter(p =>
                validIds.has(p.tempA) && (p.tempB === null || validIds.has(p.tempB))
            );
        });

        advancedStaging.players = next;
        saveAdvancedStaging();
        renderAdvanced();
        showToast(t('adv.rosterSet', { n: next.length }));
    }

    function advancedAddRound() {
        if (advancedStaging.players.length < 2) {
            alert(t('adv.needRoster'));
            return;
        }
        advancedStaging.rounds.push({ pairings: [] });
        saveAdvancedStaging();
        renderAdvancedRounds();
        renderAdvancedValidation();
    }

    function advancedRemoveRound(roundIdx) {
        if (!confirm(t('adv.removeRoundConfirm', { n: roundIdx + 1 }))) return;
        advancedStaging.rounds.splice(roundIdx, 1);
        saveAdvancedStaging();
        renderAdvancedRounds();
        renderAdvancedValidation();
    }

    function advancedAddPairing(roundIdx) {
        const round = advancedStaging.rounds[roundIdx];
        if (!round) return;
        round.pairings.push({ tempA: '', tempB: '', result: null });
        saveAdvancedStaging();
        renderAdvancedRounds();
    }

    function advancedAddBye(roundIdx) {
        const round = advancedStaging.rounds[roundIdx];
        if (!round) return;
        round.pairings.push({ tempA: '', tempB: null, result: 'bye' });
        saveAdvancedStaging();
        renderAdvancedRounds();
    }

    function advancedRemovePairing(roundIdx, pIdx) {
        const round = advancedStaging.rounds[roundIdx];
        if (!round) return;
        round.pairings.splice(pIdx, 1);
        saveAdvancedStaging();
        renderAdvancedRounds();
        renderAdvancedValidation();
    }

    function advancedUpdatePairing(roundIdx, pIdx, field, value) {
        const round = advancedStaging.rounds[roundIdx];
        if (!round) return;
        const pairing = round.pairings[pIdx];
        if (!pairing) return;
        pairing[field] = value === '' ? (field === 'result' ? null : '') : value;
        saveAdvancedStaging();
        renderAdvancedValidation();
    }

    function advancedSetPairingResult(roundIdx, pIdx, result) {
        const round = advancedStaging.rounds[roundIdx];
        if (!round) return;
        const pairing = round.pairings[pIdx];
        if (!pairing || pairing.result === 'bye') return;
        pairing.result = pairing.result === result ? null : result;
        saveAdvancedStaging();
        renderAdvancedRounds();
        renderAdvancedValidation();
    }

    function renderAdvancedRounds() {
        const container = document.getElementById('adv-rounds-container');
        if (!container) return;
        container.innerHTML = '';

        if (advancedStaging.rounds.length === 0) {
            container.innerHTML = `<p class="info-text">${t('adv.noRounds')}</p>`;
            document.getElementById('adv-rounds-info').textContent = '';
            return;
        }

        advancedStaging.rounds.forEach((round, rIdx) => {
            const rDiv = document.createElement('div');
            rDiv.className = 'adv-round-block';

            const header = document.createElement('div');
            header.className = 'adv-round-header';
            header.innerHTML = `
                <h4>${t('adv.roundLabel', { n: rIdx + 1 })}</h4>
                <button class="btn btn-danger btn-small" onclick="app.advancedRemoveRound(${rIdx})">${t('adv.removeRound')}</button>
            `;
            rDiv.appendChild(header);

            if (round.pairings.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'info-text';
                empty.textContent = t('adv.noPairings');
                rDiv.appendChild(empty);
            }

            round.pairings.forEach((pairing, pIdx) => {
                const row = document.createElement('div');
                row.className = 'adv-pairing-row';

                if (pairing.result === 'bye') {
                    row.innerHTML = `
                        <div class="adv-table-label">${t('adv.bye')}</div>
                        ${playerSelectHtml(rIdx, pIdx, 'tempA', pairing.tempA)}
                        <div class="adv-result-label">${t('adv.autoWin')}</div>
                        <button class="btn-delete" onclick="app.advancedRemovePairing(${rIdx}, ${pIdx})" title="Remove">&times;</button>
                    `;
                } else {
                    row.innerHTML = `
                        <div class="adv-table-label">T${pIdx + 1}</div>
                        ${playerSelectHtml(rIdx, pIdx, 'tempA', pairing.tempA)}
                        <div class="adv-result-buttons">
                            <button class="result-btn ${pairing.result === 'a' ? 'selected-win-a' : ''}" onclick="app.advancedSetPairingResult(${rIdx}, ${pIdx}, 'a')">${t('round.aWins')}</button>
                            <button class="result-btn ${pairing.result === 'draw' ? 'selected-draw' : ''}" onclick="app.advancedSetPairingResult(${rIdx}, ${pIdx}, 'draw')">${t('round.draw')}</button>
                            <button class="result-btn ${pairing.result === 'b' ? 'selected-win-b' : ''}" onclick="app.advancedSetPairingResult(${rIdx}, ${pIdx}, 'b')">${t('round.bWins')}</button>
                        </div>
                        ${playerSelectHtml(rIdx, pIdx, 'tempB', pairing.tempB)}
                        <button class="btn-delete" onclick="app.advancedRemovePairing(${rIdx}, ${pIdx})" title="Remove">&times;</button>
                    `;
                }
                rDiv.appendChild(row);
            });

            const actions = document.createElement('div');
            actions.className = 'adv-round-actions';
            actions.innerHTML = `
                <button class="btn btn-secondary btn-small" onclick="app.advancedAddPairing(${rIdx})">${t('adv.addPairing')}</button>
                <button class="btn btn-secondary btn-small" onclick="app.advancedAddBye(${rIdx})">${t('adv.addBye')}</button>
            `;
            rDiv.appendChild(actions);

            container.appendChild(rDiv);
        });

        document.getElementById('adv-rounds-info').textContent =
            t('adv.roundsInfo', { n: advancedStaging.rounds.length });
    }

    function playerSelectHtml(roundIdx, pIdx, field, currentVal) {
        let opts = `<option value="">${t('adv.select')}</option>`;
        advancedStaging.players.forEach(p => {
            const sel = p.tempId === currentVal ? 'selected' : '';
            opts += `<option value="${p.tempId}" ${sel}>${escapeHtml(p.name)}</option>`;
        });
        return `<select class="adv-player-select" onchange="app.advancedUpdatePairing(${roundIdx}, ${pIdx}, '${field}', this.value)">${opts}</select>`;
    }

    // Run full validation across staging. Returns { errors: [], warnings: [] }.
    function advancedValidate() {
        const errors = [];
        const warnings = [];

        if (advancedStaging.players.length < 2) {
            errors.push(t('val.minRoster'));
        }

        // Duplicate name check
        const nameCounts = {};
        advancedStaging.players.forEach(p => {
            const k = p.name.toLowerCase();
            nameCounts[k] = (nameCounts[k] || 0) + 1;
        });
        Object.entries(nameCounts).forEach(([k, c]) => {
            if (c > 1) errors.push(t('val.duplicate', { name: k }));
        });

        // Track opponents across rounds for rematch warnings
        const opponentMap = {}; // tempId -> Set of tempIds
        const byeCount = {};    // tempId -> count

        advancedStaging.rounds.forEach((round, rIdx) => {
            const label = t('adv.roundLabel', { n: rIdx + 1 });
            const usedThisRound = new Set();
            let byesThisRound = 0;

            if (round.pairings.length === 0) {
                errors.push(t('val.noPairings', { label }));
            }

            round.pairings.forEach((pairing, pIdx) => {
                const tag = `${label} #${pIdx + 1}`;

                if (pairing.result === 'bye') {
                    if (!pairing.tempA) {
                        errors.push(t('val.byeNotSelected', { tag }));
                        return;
                    }
                    if (usedThisRound.has(pairing.tempA)) {
                        errors.push(t('val.dupInRound', { tag }));
                    }
                    usedThisRound.add(pairing.tempA);
                    byesThisRound++;
                    byeCount[pairing.tempA] = (byeCount[pairing.tempA] || 0) + 1;
                    return;
                }

                if (!pairing.tempA || !pairing.tempB) {
                    errors.push(t('val.bothNeeded', { tag }));
                    return;
                }
                if (pairing.tempA === pairing.tempB) {
                    errors.push(t('val.sameAB', { tag }));
                    return;
                }
                if (usedThisRound.has(pairing.tempA) || usedThisRound.has(pairing.tempB)) {
                    errors.push(t('val.dupInRound2', { tag }));
                }
                usedThisRound.add(pairing.tempA);
                usedThisRound.add(pairing.tempB);

                if (pairing.result === null) {
                    errors.push(t('val.resultNotSet', { tag }));
                }

                // Rematch warning
                if (!opponentMap[pairing.tempA]) opponentMap[pairing.tempA] = new Set();
                if (!opponentMap[pairing.tempB]) opponentMap[pairing.tempB] = new Set();
                if (opponentMap[pairing.tempA].has(pairing.tempB)) {
                    const a = advancedStaging.players.find(p => p.tempId === pairing.tempA);
                    const b = advancedStaging.players.find(p => p.tempId === pairing.tempB);
                    warnings.push(t('val.rematch', { tag, a: a ? a.name : '?', b: b ? b.name : '?' }));
                }
                opponentMap[pairing.tempA].add(pairing.tempB);
                opponentMap[pairing.tempB].add(pairing.tempA);
            });

            // Bye count / roster size consistency
            const rosterSize = advancedStaging.players.length;
            if (rosterSize > 0 && round.pairings.length > 0) {
                if (rosterSize % 2 === 1 && byesThisRound !== 1) {
                    errors.push(t('val.oddBye', { label, n: rosterSize, found: byesThisRound }));
                }
                if (rosterSize % 2 === 0 && byesThisRound !== 0) {
                    errors.push(t('val.evenBye', { label, found: byesThisRound }));
                }
                if (usedThisRound.size !== rosterSize && round.pairings.length > 0) {
                    errors.push(t('val.notAccounted', { label, used: usedThisRound.size, total: rosterSize }));
                }
            }
        });

        // Multiple byes warning
        Object.entries(byeCount).forEach(([tempId, c]) => {
            if (c > 1) {
                const p = advancedStaging.players.find(pp => pp.tempId === tempId);
                warnings.push(t('val.tooManyByes', { name: p ? p.name : '?', n: c }));
            }
        });

        return { errors, warnings };
    }

    function renderAdvancedValidation() {
        const box = document.getElementById('adv-validation-messages');
        if (!box) return;
        const { errors, warnings } = advancedValidate();
        let html = '';
        if (errors.length > 0) {
            html += `<div class="adv-errors"><strong>${t('adv.errors')}</strong><ul>` +
                errors.map(e => `<li>${escapeHtml(e)}</li>`).join('') + '</ul></div>';
        }
        if (warnings.length > 0) {
            html += `<div class="adv-warnings"><strong>${t('adv.warnings')}</strong><ul>` +
                warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('') + '</ul></div>';
        }
        if (html === '') {
            html = `<div class="adv-ok">${t('adv.ok')}</div>`;
        }
        box.innerHTML = html;

        const btn = document.getElementById('btn-adv-commit');
        if (btn) btn.disabled = errors.length > 0;
    }

    // Build a throwaway preview of players + their reconstructed stats
    // without touching real state. Returns array of player-like objects.
    function advancedBuildPreviewPlayers() {
        // Clone staging players into real player shape
        const previewPlayers = advancedStaging.players.map(sp => ({
            name: sp.name,
            tempId: sp.tempId,
            matchPoints: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            opponents: [],
            hadBye: false
        }));
        const byTempId = {};
        previewPlayers.forEach(p => { byTempId[p.tempId] = p; });

        advancedStaging.rounds.forEach(round => {
            round.pairings.forEach(pairing => {
                if (pairing.result === 'bye') {
                    const p = byTempId[pairing.tempA];
                    if (!p) return;
                    p.matchPoints += 3;
                    p.wins += 1;
                    p.hadBye = true;
                    return;
                }
                const pA = byTempId[pairing.tempA];
                const pB = byTempId[pairing.tempB];
                if (!pA || !pB || pairing.result === null) return;
                pA.opponents.push(pairing.tempB);
                pB.opponents.push(pairing.tempA);
                const [pa, pb] = pointsFor(pairing.result);
                pA.matchPoints += pa;
                pB.matchPoints += pb;
                if (pairing.result === 'a') { pA.wins += 1; pB.losses += 1; }
                else if (pairing.result === 'b') { pB.wins += 1; pA.losses += 1; }
                else if (pairing.result === 'draw') { pA.draws += 1; pB.draws += 1; }
            });
        });

        return previewPlayers;
    }

    function advancedPreview() {
        const area = document.getElementById('adv-preview-area');
        if (!area) return;
        renderAdvancedValidation();

        if (advancedStaging.players.length < 2) {
            area.innerHTML = `<p class="info-text">${t('adv.previewRosterFirst')}</p>`;
            return;
        }

        const previewPlayers = advancedBuildPreviewPlayers();
        const byTempId = {};
        previewPlayers.forEach(p => { byTempId[p.tempId] = p; });

        // Compute OWP the same way calculateOWP does, but against preview data
        function previewOWP(p) {
            if (p.opponents.length === 0) return 0;
            let total = 0, count = 0;
            p.opponents.forEach(oppId => {
                const opp = byTempId[oppId];
                if (!opp) return;
                const games = opp.wins + opp.losses + opp.draws;
                if (games === 0) {
                    total += 0.25;
                } else {
                    const winPct = (opp.wins + 0.5 * opp.draws) / games;
                    total += Math.max(0.25, winPct);
                }
                count++;
            });
            return count > 0 ? total / count : 0;
        }

        // Pass 1: OWP for everyone; Pass 2: OOMW + WOScore from those OWPs
        const owpByTempId = {};
        previewPlayers.forEach(p => { owpByTempId[p.tempId] = previewOWP(p); });

        const rows = previewPlayers.map(p => {
            let oomw = 0;
            let woscore = 0;
            if (p.opponents.length > 0) {
                let total = 0, count = 0;
                p.opponents.forEach(oppId => {
                    const opp = byTempId[oppId];
                    if (opp) woscore += opp.matchPoints;
                    if (!(oppId in owpByTempId)) return;
                    total += Math.max(0.25, owpByTempId[oppId]);
                    count++;
                });
                oomw = count > 0 ? total / count : 0;
            }
            return {
                name: p.name,
                record: `${p.wins}-${p.losses}-${p.draws}`,
                points: p.matchPoints,
                owp: owpByTempId[p.tempId],
                oomw,
                woscore,
                byes: p.byes || 0,
            };
        });
        rows.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.owp !== a.owp) return b.owp - a.owp;
            return b.oomw - a.oomw;
        });

        let html = `<table class="standings-table"><thead><tr>` +
            `<th>${t('standings.rank')}</th><th>${t('standings.player')}</th><th>${t('standings.record')}</th><th>${t('standings.points')}</th><th>${t('standings.owp')}</th><th>${t('standings.oomw')}</th><th>${t('standings.woscore')}</th><th>${t('standings.byes')}</th>` +
            `</tr></thead><tbody>`;
        rows.forEach((r, i) => {
            html += `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${r.record}</td><td>${r.points}</td><td>${(r.owp * 100).toFixed(1)}%</td><td>${(r.oomw * 100).toFixed(1)}%</td><td>${r.woscore}</td><td>${r.byes}</td></tr>`;
        });
        html += '</tbody></table>';
        area.innerHTML = html;
    }

    // Replay staging into real state, then generate the next round and navigate.
    function advancedCommit() {
        const { errors } = advancedValidate();
        if (errors.length > 0) {
            alert(t('adv.commitFail'));
            return;
        }
        if (state.tournamentStarted) {
            if (!confirm(t('adv.replaceConfirm'))) return;
        } else {
            if (!confirm(t('adv.commitConfirm'))) return;
        }

        // Clear any old per-round snapshots
        for (let i = 0; i < 50; i++) {
            localStorage.removeItem(`ptcg_round_${i}`);
        }

        // 1. Build fresh real players from staging
        const tempIdToRealId = {};
        state.players = advancedStaging.players.map(sp => {
            const real = createPlayer(sp.name, sp.trainerId);
            tempIdToRealId[sp.tempId] = real.id;
            return real;
        });

        // 2. Build real rounds from staging, replay each with applyResults
        state.rounds = [];
        advancedStaging.rounds.forEach((stagingRound, rIdx) => {
            const realPairings = [];
            let tableNum = 1;
            stagingRound.pairings.forEach(sp => {
                if (sp.result === 'bye') {
                    realPairings.push({
                        table: 0,
                        playerA: tempIdToRealId[sp.tempA],
                        playerB: null,
                        result: 'bye',
                        isBye: true
                    });
                } else {
                    realPairings.push({
                        table: tableNum++,
                        playerA: tempIdToRealId[sp.tempA],
                        playerB: tempIdToRealId[sp.tempB],
                        result: sp.result
                    });
                }
            });
            const realRound = { pairings: realPairings, resultsSubmitted: false };
            applyResults(realRound);
            realRound.resultsSubmitted = true;
            state.rounds.push(realRound);
            saveRoundSnapshot(rIdx);
        });

        // 3. Generate the next round's pairings using the existing algorithm
        const nextRoundIndex = state.rounds.length;
        const nextPairings = generatePairings(nextRoundIndex);
        state.rounds.push({ pairings: nextPairings, resultsSubmitted: false });
        state.currentRound = nextRoundIndex;

        // 4. Mark tournament as live and navigate to round view
        state.tournamentStarted = true;
        state.tournamentEnded = false;
        resetTimerValue();
        saveState();

        clearAdvancedStaging();
        showToast(t('adv.reconstructed', { n: nextRoundIndex + 1 }));
        navigateTo('round');
    }

    async function advancedResumeFromCloud() {
        if (viewOnly) return;
        const input = document.getElementById('adv-resume-id-input');
        const statusEl = document.getElementById('adv-resume-status');
        const btn = document.getElementById('btn-adv-resume');
        const setStatus = (msg, isError) => {
            if (!statusEl) return;
            statusEl.textContent = msg || '';
            statusEl.style.color = isError ? 'var(--danger, #ff6b6b)' : '';
        };

        const raw = (input ? input.value : '').trim().toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(raw)) {
            setStatus(t('adv.resume.invalidId'), true);
            return;
        }

        if (!window.cloud || !window.cloud.isConfigured()) {
            setStatus(t('adv.resume.notConfigured'), true);
            return;
        }

        if (state.tournamentStarted && !confirm(t('adv.resume.replaceConfirm'))) return;

        if (btn) btn.disabled = true;
        setStatus(t('adv.resume.fetching'), false);

        try {
            if (!window.cloud.isReady()) await window.cloud.init();
            if (!window.cloud.isReady()) {
                setStatus(t('adv.resume.initFailed'), true);
                return;
            }

            let data;
            try {
                data = await window.cloud.fetchOnce(raw);
            } catch (e) {
                if (e && e.message === 'not_found') setStatus(t('adv.resume.notFound'), true);
                else { console.error('[resume] fetch failed', e); setStatus(t('adv.resume.fetchFailed'), true); }
                return;
            }

            const remote = data && data.state;
            if (!remote || typeof remote !== 'object') {
                setStatus(t('adv.resume.fetchFailed'), true);
                return;
            }

            // Clear any old per-round snapshots — fresh state incoming.
            for (let i = 0; i < 50; i++) {
                localStorage.removeItem(`ptcg_round_${i}`);
            }

            // Merge remote state into local. Drop publishedTournamentId so the
            // resumer is local-only (they are not the cloud owner and writes
            // would be rejected by the security rules).
            state = {
                ...DEFAULT_STATE,
                ...remote,
                publishedTournamentId: null,
                // Preserve per-device prefs
                timerMuted: state.timerMuted,
                noAds: true
            };
            // Cloud was detached by publisher, so ensure local timer isn't auto-running
            state.timerRunning = false;

            // If every round already has results submitted, the tournament is
            // effectively complete — route the resumer to standings rather than
            // a locked round view. (This also covers the case where the publisher
            // ended the tournament then used Back to Last Round before publishing.)
            if (Array.isArray(state.rounds) && state.rounds.length > 0 &&
                state.rounds.every(r => r.resultsSubmitted)) {
                state.tournamentEnded = true;
                state.currentView = 'standings';
            }

            saveState();

            // Re-snapshot each completed round so back-to-round navigation works
            if (Array.isArray(state.rounds)) {
                state.rounds.forEach((_, idx) => saveRoundSnapshot(idx));
            }

            setStatus('', false);
            showToast(t('adv.resume.success'));
            alert(t('adv.resume.note'));

            updatePublishButton && updatePublishButton();
            resumeTournament();
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function advancedDiscard() {
        if (advancedStaging.players.length === 0 && advancedStaging.rounds.length === 0) {
            navigateTo('home');
            return;
        }
        if (!confirm(t('adv.discardConfirm'))) return;
        clearAdvancedStaging();
        const rosterInput = document.getElementById('adv-roster-input');
        if (rosterInput) rosterInput.value = '';
        const preview = document.getElementById('adv-preview-area');
        if (preview) preview.innerHTML = `<p class="info-text">${t('adv.previewHint')}</p>`;
        renderAdvanced();
    }

    // ---- TOAST NOTIFICATION ----
    function showToast(message, duration = 2500) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('toast-show');
        setTimeout(() => {
            toast.classList.remove('toast-show');
        }, duration);
    }

    // ---- HELPERS ----
    function getPlayer(id) {
        return state.players.find(p => p.id === id);
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // FIX #8: Keyboard handler for modals
    function handleKeydown(e) {
        if (e.key === 'Escape') {
            if (document.getElementById('winner-overlay').classList.contains('open')) {
                closeWinnerModal();
            } else if (document.getElementById('wheel-pick-overlay').classList.contains('open')) {
                closeWheelPicker();
            } else if (document.getElementById('modal-overlay').classList.contains('open')) {
                closeModal();
            }
            // Exit projector mode with Escape
            if (state.projectorMode) {
                toggleProjectorMode();
            }
        }
    }

    // ---- INIT ----
    function applyNoAds() {
        const on = !!state.noAds;
        document.body.classList.toggle('no-ads', on);
        const btn = document.getElementById('btn-no-ads');
        if (btn) btn.classList.toggle('active', on);
    }

    function toggleNoAds() {
        if (viewOnly) return; // only admins toggle; players inherit via synced state
        state.noAds = !state.noAds;
        saveState(); // persists locally + mirrors to cloud → players see it
        applyNoAds();
    }

    /* ── PWA install prompt ──────────────────────────────────────────────────
       Browsers that support `beforeinstallprompt` (Chrome / Edge / mobile
       Chrome / Samsung Internet) fire it once on visit if our manifest +
       icons + service-worker prereqs are met. We stash the event and
       reveal a small floating chip; clicking it triggers the native dialog.

       iOS Safari has no equivalent event — we detect iOS and surface a
       short manual instruction toast instead so the chip feels useful.
       Desktop browsers without support: chip stays hidden. */
    let deferredInstallPrompt = null;
    function installPwaInit() {
        const chip = document.getElementById('pwa-install-chip');
        if (!chip) return;
        const isIos = /iP(hone|ad|od)/.test(navigator.platform || '')
            || (/Mac/.test(navigator.platform || '') && navigator.maxTouchPoints > 1);
        const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
            || window.navigator.standalone === true;
        if (isStandalone) return; // already installed
        // Only show chip for visitors who haven't dismissed it before.
        const dismissed = localStorage.getItem('ptcg_pwa_dismissed') === '1';
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredInstallPrompt = e;
            if (!dismissed) chip.hidden = false;
        });
        if (isIos && !dismissed) {
            // iOS has no programmatic install — chip still appears so the
            // hint modal pops on tap.
            chip.hidden = false;
        }
        chip.addEventListener('click', async () => {
            if (deferredInstallPrompt) {
                try {
                    deferredInstallPrompt.prompt();
                    const choice = await deferredInstallPrompt.userChoice;
                    deferredInstallPrompt = null;
                    chip.hidden = true;
                    if (choice && choice.outcome === 'accepted') {
                        showToast(t('pwa.installed'));
                    }
                } catch (e) {
                    console.warn('[pwa] prompt failed', e);
                }
                return;
            }
            if (isIos) {
                alert(t('pwa.iosTitle') + '\n\n' + t('pwa.iosBody'));
                return;
            }
            // Fallback — chip clickable but neither browser supports install.
            chip.hidden = true;
            localStorage.setItem('ptcg_pwa_dismissed', '1');
        });
        // Long-press / right-click → dismiss (keep chip from being annoying).
        chip.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            chip.hidden = true;
            localStorage.setItem('ptcg_pwa_dismissed', '1');
        });
        // Auto-hide once installed (Chrome fires `appinstalled`).
        window.addEventListener('appinstalled', () => {
            chip.hidden = true;
            showToast(t('pwa.installed'));
        });
    }

    function init() {
        loadState();
        loadAdvancedStaging();
        applyTheme();
        applyI18n();
        applyNoAds();
        renderUpdates();

        // Keyboard events
        document.addEventListener('keydown', handleKeydown);

        // VIEW MODE first — if a tournament ID is in the URL, this tab is a read-only
        // viewer. Skip every owner-side bootstrap path (SHOWDOWN import, resume, etc.)
        // so a malicious or malformed link can't accidentally drop a viewer into owner UI.
        const earlyTid = getUrlTournamentId();
        if (earlyTid && state.publishedTournamentId !== earlyTid) {
            enterViewMode(earlyTid);
            return;
        }

        // Import players from SHOWDOWN via URL param (owner-only — viewers handled above)
        const importParam = new URLSearchParams(window.location.search).get('import');
        if (importParam) {
            try {
                const raw = atob(decodeURIComponent(importParam));
                let jsonStr;
                try { jsonStr = decodeURIComponent(escape(raw)); } catch (_) { jsonStr = raw; }
                const imported = JSON.parse(jsonStr);
                if (imported.players && Array.isArray(imported.players)) {
                    // Reset state for fresh import
                    for (let i = 0; i < 50; i++) localStorage.removeItem(`ptcg_round_${i}`);
                    const keepWheel = { wheelNames: state.wheelNames, wheelHistory: state.wheelHistory };
                    state = { ...DEFAULT_STATE, ...keepWheel, players: [], rounds: [] };
                    stopTimer();

                    state.tournamentType = imported.tournamentType || 'swiss';
                    state.tournamentName = imported.eventTitle || '';
                    state.tournamentDate = imported.eventDate || new Date().toISOString().split('T')[0];
                    state.showdownEventId = imported.eventId || null;
                    let added = 0;
                    imported.players.forEach(p => {
                        const name = p.name || p.playerName;
                        const trainerId = p.playerId || '';
                        if (name) {
                            state.players.push(createPlayer(name, trainerId));
                            added++;
                        }
                    });
                    saveState();
                    window.history.replaceState({}, '', window.location.pathname);
                    navigateTo('registration');
                    if (added > 0) showToast(t('reg.added', { n: added }));
                    renderTimer();
                    return;
                }
            } catch (e) {
                console.error('SHOWDOWN import failed:', e);
            }
        }

        // Hosted-event handoff — when organizer hits "▶ 開始比賽" on /host/?e=...
        // we land here with ?event=<EID> + localStorage.ptcg_event_handoff payload.
        const handoffEid = new URLSearchParams(window.location.search).get('event');
        if (handoffEid) {
            try {
                const raw = localStorage.getItem('ptcg_event_handoff');
                const payload = raw ? JSON.parse(raw) : null;
                if (payload && payload.eventId === handoffEid && Array.isArray(payload.players) && payload.players.length > 0) {
                    for (let i = 0; i < 50; i++) localStorage.removeItem(`ptcg_round_${i}`);
                    const keepWheel = { wheelNames: state.wheelNames, wheelHistory: state.wheelHistory };
                    state = { ...DEFAULT_STATE, ...keepWheel, players: [], rounds: [] };
                    stopTimer();

                    state.tournamentType = 'swiss';
                    state.tournamentName = payload.tournamentName || '';
                    state.tournamentDate = payload.tournamentDate || new Date().toISOString().split('T')[0];
                    state.hostEventId = payload.eventId;
                    payload.players.forEach(p => {
                        if (p.name) {
                            state.players.push(createPlayer(p.name, p.trainerId || '', {
                                deckSpecies1: p.deckSpecies1 || '',
                                deckSpecies2: p.deckSpecies2 || ''
                            }));
                        }
                    });
                    saveState();
                    localStorage.removeItem('ptcg_event_handoff');
                    window.history.replaceState({}, '', window.location.pathname);
                    navigateTo('registration');
                    showToast(t('reg.added', { n: payload.players.length }));
                    renderTimer();
                    return;
                }
            } catch (e) {
                console.error('Event handoff failed:', e);
            }
        }

        // Re-attach to a previously-published tournament after reload
        if (state.publishedTournamentId && window.cloud && window.cloud.isConfigured()) {
            (async () => {
                await window.cloud.init();
                if (window.cloud.isReady()) {
                    window.cloud.attachExisting(state.publishedTournamentId);
                    window.cloud.syncState(state);
                    attachMatchReportsListener(state.publishedTournamentId);
                }
            })();
        }

        // Belt-and-suspenders: if the previous session ended a host-event
        // tournament but never managed to push the result (offline, tab
        // closed mid-flight, function unreachable), retry on this fresh load.
        // Silent so we don't toast every refresh; the toast still fires if
        // the user-driven publish path runs concurrently.
        if (state.hostEventId && state.tournamentEnded && !state.hostEventResultPublished) {
            const tryPublish = async () => {
                if (!window.cloud || !window.cloud.isConfigured()) return;
                try { await window.cloud.init(); } catch (_) { return; }
                if (!window.cloud.isReady()) return;
                publishEventResultIfNeeded({ silent: true }).catch(() => {/* swallowed */});
            };
            // Defer so init() can finish first and Firebase has a moment to settle.
            setTimeout(tryPublish, 1500);
        }

        // Restore view
        if (state.currentView && state.currentView !== 'home') {
            navigateTo(state.currentView);
        } else {
            navigateTo('home');
        }

        renderTimer();
        updatePublishButton();

        if (state.timerRunning) {
            startTimer();
        }

        // Restore projector mode
        if (state.projectorMode) {
            document.body.classList.add('projector-mode');
        }

        installPwaInit();

        // Final flush on tab hide / close — guards against any in-flight changes
        window.addEventListener('pagehide', () => {
            saveState();
            // Last-chance attempt to send the result before the tab dies.
            // Fire-and-forget; the Cloud Function call has already issued the
            // network request by the time the tab is gone, so even if we
            // can't observe success it should land server-side. The retry on
            // next init covers the rare case where the network was actually
            // dropped before the request flushed.
            if (state.hostEventId && state.tournamentEnded && !state.hostEventResultPublished) {
                publishEventResultIfNeeded({ silent: true });
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') saveState();
        });

        // Warn if the user tries to close mid-tournament
        window.addEventListener('beforeunload', (e) => {
            if (state.tournamentStarted && !state.tournamentEnded) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);

    // ---- PUBLIC API ----
    return {
        toggleLang,
        toggleThemeMenu,
        selectTheme,
        navigateTo,
        resumeTournament,
        resetTournament,
        bulkAddPlayers,
        deletePlayer,
        editPlayerName,
        startTournament,
        startNewTournament,
        setResult,
        setBo3Game,
        addSpinFinish,
        undoSpinBattle,
        toggleSpinPopup,
        spinPickFinish,
        spinPickBey,
        toggleSpinPenaltyPanel,
        spinAddLaunchError,
        spinAddMatchWarn,
        spinAddMalfunction,
        submitResults,
        reshufflePairings,
        openUpdatesList,
        closeUpdatesList,
        openUpdateDetail,
        closeUpdatesDetail,
        openPairingHelp,
        closePairingHelp,
        endTournament,
        goBackFromRound,
        backToLastRound,
        showTrainerCard,
        toggleDrop,
        closeModal,
        closeWinnerModal,
        downloadStandings,
        sendToShowdown,
        timerToggle,
        timerReset,
        timerAdjust,
        toggleTimerMute,
        toggleProjectorMode,
        toggleCompactMode,
        wheelSetNames,
        wheelSyncFromTournament,
        standingsToWheel,
        confirmStandingsToTopCut,
        closeWheelPicker,
        cloudPublishToggle,
        cloudUnpublish,
        toggleSharePanel,
        closeShareModal,
        copyShareLink,
        wheelPickSetAll,
        wheelPickExcludeTop3,
        wheelPickApply,
        viewerPinSearch,
        viewerSwitchTab,
        viewerPinClear,
        viewerShareOpen,
        viewerShareClose,
        viewerShareCopy,
        openSelfReport,
        closeSelfReport,
        openDisputeReview,
        updateTournamentMeta,
        toggleScoringDrawBonus,
        toggleBestOfThree,
        setMatchTargetPoints,
        toggleThreeOnThreeMode,
        toggleStadiumOut,
        openDeckEditor,
        closeDeckEditor,
        updateDeckDraft,
        saveDeckEditor,
        toggleDeckQrPanel,
        importDeckFromPaste,
        startDeckScanner,
        toggleNoAds,
        wheelReset,
        spinWheel,
        advancedSetRoster,
        advancedAddRound,
        advancedRemoveRound,
        advancedAddPairing,
        advancedAddBye,
        advancedRemovePairing,
        advancedUpdatePairing,
        advancedSetPairingResult,
        advancedPreview,
        advancedCommit,
        advancedDiscard,
        advancedResumeFromCloud,
        setRoundCount
    };
})();
