/* ============================================================
   TCG Tournament Manager - Complete Application Logic
   © 2026 TCG Tournament Manager. All rights reserved.
   Unauthorised redistribution or rehosting is prohibited.
   Official site: https://tcgtm.web.app
   ============================================================ */

// ---- HOST GUARD (lightweight anti-rehost) ----
(() => {
    const ALLOWED = [
        'tcgtm.web.app',
        'tcgtm.firebaseapp.com',
        'ptcgstm.web.app',
        'ptcgstm.firebaseapp.com',
        'localhost',
        '127.0.0.1'
    ];
    const host = location.hostname;
    if (host === '' || host === 'null') return; // file:// or similar — let it run
    const ok = ALLOWED.includes(host) || host.endsWith('.local');
    if (!ok) {
        document.documentElement.innerHTML = '<head><meta charset="UTF-8"><title>Unauthorized host</title><style>body{background:#141414;color:#eee;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1rem;text-align:center}.box{max-width:420px}.box h1{color:#FF7324;margin-bottom:.5rem}.box a{color:#FF7324}</style></head><body><div class="box"><h1>Unauthorized host</h1><p>This copy of TCG Tournament Manager is being served from an unauthorised domain.</p><p>The official site is <a href="https://tcgtm.web.app">tcgtm.web.app</a>.</p></div></body>';
        throw new Error('TCGTM: host not authorized');
    }
})();

const app = (() => {
    // ---- I18N ----
    const I18N = {
        en: {
            'header.title': 'TCG Tournament Manager',
            'common.back': 'Back',
            'common.home': 'Home',
            'common.reset': 'Reset',
            'common.ok': 'OK',
            'updates.title': 'Updates',
            'updates.allTitle': 'All Updates',
            'updates.more': 'See all',
            'home.welcome': 'Welcome, Trainer!',
            'home.subtitle': 'Choose your path',
            'home.tournament': 'Tournament',
            'home.wheel': 'Lucky Wheel',
            'home.advanced': 'Advanced',
            'home.inProgress': 'You have a tournament in progress.',
            'home.resume': 'Resume Tournament',
            'reg.title': 'Player Registration',
            'reg.tournamentName': 'Tournament Name',
            'reg.tournamentNamePlaceholder': 'e.g. AAB Shop Gym Battle',
            'reg.tournamentDate': 'Tournament Date',
            'reg.scoringDrawBonus': 'Standard Swiss scoring (Draw 1 pt, Loss 0 pt)',
            'reg.scoringHint': 'Default: Win 3 \u00b7 Loss 1 \u00b7 Draw 0. Tick to use the more common Win 3 \u00b7 Draw 1 \u00b7 Loss 0 instead. Locked once the tournament starts.',
            'reg.bulkLabel': 'Add players (one name per line):',
            'reg.bulkPlaceholder': 'Enter one player name per line…\nPlayer 1\nPlayer 2\nPlayer 3',
            'reg.addBtn': 'Add Players',
            'reg.registered': 'Registered Players',
            'reg.start': 'Start Tournament',
            'reg.inProgress': 'Tournament In Progress',
            'reg.players': '{n} player',
            'reg.players_plural': '{n} players',
            'reg.recommended': 'Recommended rounds: {n}',
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
            'standings.rank': 'Rank',
            'standings.player': 'Player',
            'standings.record': 'Record',
            'standings.points': 'Points',
            'standings.owp': 'OWP%',
            'standings.backRound': 'Back to Round',
            'standings.htmlMissing': 'html2canvas not loaded yet. Please try again.',
            'standings.snapFail': 'Failed to capture standings. Try again.',
            'trainer.points': 'Points',
            'trainer.owp': 'OWP',
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
            'cloud.shareHint': 'Players can scan this QR code or open the link below to view the tournament live.',
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
            'viewer.linkCopied': 'Link copied!'
        },
        zh: {
            'header.title': 'TCG 賽事管理',
            'common.back': '返回',
            'common.home': '首頁',
            'common.reset': '重設',
            'common.ok': '確定',
            'updates.title': '更新公告',
            'updates.allTitle': '全部更新',
            'updates.more': '查看全部',
            'home.welcome': '歡迎,訓練家!',
            'home.subtitle': '請選擇',
            'home.tournament': '賽事',
            'home.wheel': '幸運轉盤',
            'home.advanced': '進階',
            'home.inProgress': '你有一場進行中的賽事。',
            'home.resume': '繼續賽事',
            'reg.title': '玩家登記',
            'reg.tournamentName': '賽事名稱',
            'reg.tournamentNamePlaceholder': '例:AAB 店舖道館戰',
            'reg.tournamentDate': '賽事日期',
            'reg.scoringDrawBonus': '使用標準瑞士制計分（和 1 分、負 0 分）',
            'reg.scoringHint': '預設為 勝 3 \u00b7 負 1 \u00b7 和 0；勾選後改為更常見的 勝 3 \u00b7 和 1 \u00b7 負 0。賽事開始後將鎖定不可更改。',
            'reg.bulkLabel': '新增玩家(每行一個名字):',
            'reg.bulkPlaceholder': '每行輸入一位玩家名稱⋯\n玩家 1\n玩家 2\n玩家 3',
            'reg.addBtn': '新增玩家',
            'reg.registered': '已登記玩家',
            'reg.start': '開始賽事',
            'reg.inProgress': '賽事進行中',
            'reg.players': '{n} 位玩家',
            'reg.players_plural': '{n} 位玩家',
            'reg.recommended': '建議輪數:{n}',
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
            'standings.rank': '名次',
            'standings.player': '玩家',
            'standings.record': '戰績',
            'standings.points': '積分',
            'standings.owp': '對手勝率%',
            'standings.backRound': '返回對戰',
            'standings.htmlMissing': 'html2canvas 尚未載入,請稍後再試。',
            'standings.snapFail': '截圖失敗,請再試一次。',
            'trainer.points': '積分',
            'trainer.owp': '對手勝率',
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
            'cloud.shareHint': '玩家可掃描此 QR Code 或開啟下方連結即時觀看賽事。',
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
            'viewer.linkCopied': '已複製連結!'
        }
    };

    let currentLang = localStorage.getItem('ptcg_lang') || 'en';

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
        currentView: 'home',
        tournamentType: 'swiss',
        tournamentStarted: false,
        tournamentEnded: false,
        projectorMode: false,
        compactMode: false,
        publishedTournamentId: null
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
            const recRounds = getRecommendedRounds();
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

    // ---- NAVIGATION ----
    function navigateTo(view) {
        if (view === 'home') checkResumeState();
        if (view === 'registration') renderPlayerList();
        if (view === 'round') renderRound();
        if (view === 'standings') renderStandings();
        if (view === 'wheel') renderWheel();
        if (view === 'advanced') renderAdvanced();
        showView(view);
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
        if (!confirm(t('reset.confirm'))) return;
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
        if (state.tournamentStarted) return;
        const textarea = document.getElementById('bulk-input');
        const lines = textarea.value.split('\n');
        let added = 0;
        lines.forEach(line => {
            const name = line.trim();
            if (name && !state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
                state.players.push(createPlayer(name));
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

    function createPlayer(name) {
        return {
            name,
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
        if (state.tournamentStarted) return;
        state.players.splice(index, 1);
        saveState();
        renderPlayerList();
    }

    function editPlayerName(index) {
        if (state.tournamentStarted) return;
        const player = state.players[index];
        const newName = prompt(t('reg.editPrompt'), player.name);
        if (newName && newName.trim()) {
            const trimmed = newName.trim();
            // Check for duplicate
            if (state.players.some((p, i) => i !== index && p.name.toLowerCase() === trimmed.toLowerCase())) {
                alert(t('reg.dupName'));
                return;
            }
            player.name = trimmed;
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

        list.innerHTML = '';
        state.players.forEach((p, i) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="player-name" ${!locked ? `ondblclick="app.editPlayerName(${i})" title="Double-click to edit"` : ''}>${escapeHtml(p.name)}</span>
                ${!locked ? `<button class="btn-delete" onclick="app.deletePlayer(${i})" title="Remove">&times;</button>` : ''}
            `;
            list.appendChild(li);
        });

        const n = state.players.length;
        countEl.textContent = t('reg.players', { n });

        if (n >= 2) {
            const rec = getRecommendedRounds();
            recEl.textContent = t('reg.recommended', { n: rec });
            startBtn.disabled = false;
        } else {
            recEl.textContent = n === 1 ? t('reg.needTwo') : '';
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
                en: 'A quick walkthrough of every feature and the suggested flow for running a smooth event.\n\n1. PICK A FORMAT (home screen)\n   • Swiss Tournament — every player plays the same number of rounds; best for 4–32 players.\n   • Knockout Tournament — single-elimination bracket; the loser of each match is out.\n\n2. REGISTRATION\n   • Enter the tournament name and date — both appear on the standings header and the downloadable screenshot.\n   • Paste or type one player name per line, then press Add Players. Tap any name to edit or delete.\n   • The recommended round count appears below the list (e.g. 8 players → 3 rounds).\n\n3. THE ROUND VIEW\n   • Each pairing is a coloured card: Side A (blue) vs Side B (orange). Tap "Wins" on the winning side, or "Draw".\n   • Re-shuffle Pairings (round 1 only, before submit) — randomise pairings again if players want a do-over.\n   • End Tournament (top-left, red) — close the event early at any point.\n   • Compact — fits more tables on screen, ideal for store displays.\n   • Projector — full-screen giant timer for a hall projector.\n   • Publish (QR icon) — generate a tournament ID + QR code so spectators can watch live in their own browser. Stop Sharing any time to delete the cloud copy.\n\n4. TIMER & PLAYER ACTIONS\n   • Start / Pause / Reset / ±1m on the timer bar. Mute disables the end-of-round beep.\n   • Tap any player name to open their trainer card with full match history. From here you can drop a player mid-tournament; in knockout mode their pending match auto-awards to the opponent.\n\n5. SUBMITTING & ENDING\n   • Submit Results & Next Round generates the next round automatically.\n   • On the final round the button becomes Submit Results & End Tournament — one click ends the event.\n   • Previous Round (bottom-left) re-opens the prior round if you need to fix a result.\n\n6. STANDINGS & SHARING\n   • Sorted by Match Points, then OWP (opponents\' win percentage). Top 3 get gold / silver / bronze dots.\n   • Download as PNG — captures the standings table with a watermark, ready to post on social.\n\n7. BONUS TOOLS\n   • Lucky Wheel — random draw / prize giveaway with player import; "Exclude Top 3" shortcut for podium prizes.\n   • Advanced Recovery — rebuild a tournament from past round results if a device is lost.\n\nTIPS\n   • Switch language any time with the 中文 / EN button at the top-right.\n   • Spectators viewing a published tournament can pin their own match to the top with the Pin-your-match search box.',
                zh: '以下為各功能簡介與建議的活動流程。\n\n1. 選擇賽制（主畫面）\n   • 瑞士制（Swiss）— 每位玩家打相同輪數，適合 4–32 人。\n   • 淘汰賽（Knockout）— 單敗淘汰，輸掉一場即出局。\n\n2. 報名登記\n   • 輸入賽事名稱與日期，會顯示於排名頁面與下載圖片上。\n   • 一行貼上一位玩家姓名，按「加入玩家」。點擊名字可編輯或刪除。\n   • 列表下方會顯示建議輪數（例如 8 人 → 3 輪）。\n\n3. 輪次畫面\n   • 每組對局以彩色卡片呈現：A 方（藍）對 B 方（橘）。點擊獲勝方的「勝」鈕，或「和」。\n   • 重新配對（僅第 1 輪、提交結果前）— 一鍵重新隨機配對。\n   • 結束賽事（左上角紅色按鈕）— 任何時候提前結束賽事。\n   • 緊湊模式（Compact）— 一頁顯示更多桌次，適合店內展示。\n   • 投影模式（Projector）— 全螢幕巨型計時器，適合會場投影機。\n   • 發佈（QR 圖示）— 產生賽事 ID 與 QR 碼，觀眾可在自己的瀏覽器即時觀看。可隨時停止分享以刪除雲端副本。\n\n4. 計時器與玩家操作\n   • 計時器列：開始 / 暫停 / 重置 / ±1 分；靜音可關閉結束提示音。\n   • 點擊玩家名字可開啟訓練家卡片，查看完整對戰紀錄；亦可在賽事中將該玩家標記為退賽。淘汰賽模式下，其未進行的對局會自動判給對手。\n\n5. 提交與結束\n   • 「提交結果並進入下一輪」會自動產生下一輪配對。\n   • 最後一輪的按鈕會變為「提交結果並結束賽事」，一鍵結束賽事。\n   • 「上一輪」（左下角）可回到前一輪修改結果。\n\n6. 排名與分享\n   • 依勝點排序，再以 OWP（對手勝率）作小分。前三名顯示金 / 銀 / 銅標記。\n   • 下載為圖片（PNG）— 含浮水印，可直接分享到社群媒體。\n\n7. 進階工具\n   • 幸運轉盤（Lucky Wheel）— 隨機抽獎，可匯入玩家名單；「排除前三名」快速鈕適合頒獎場合。\n   • 進階回復（Advanced Recovery）— 若裝置遺失，可由過去輪次結果重建賽事。\n\n小提醒\n   • 右上角「中文 / EN」按鈕可隨時切換語言。\n   • 觀看已發佈賽事的觀眾，可在「鎖定我的對局」搜尋框輸入名字，將自己的對局置頂。'
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
                en: 'Swiss pairings group players with similar match records together each round, without eliminating anyone.\n\nHOW PAIRINGS ARE GENERATED\n   • Round 1: players are randomly shuffled, then paired top-to-bottom.\n   • Round 2 onwards: players are sorted by match points. Highest scorers are paired first.\n\nSCORING (TWO MODES, PICKED ON THE REGISTRATION PAGE)\n   • Default — Win 3, Loss 1, Draw 0 (rewards showing up; draws score nothing).\n   • Standard Swiss — Win 3, Draw 1, Loss 0. Tick the "Standard Swiss scoring" checkbox on the registration page to switch.\n   • Bye is always counted as an automatic Win (3 points).\n   • Scoring is locked once the tournament starts.\n\nAVOIDING REMATCHES\n   • The app uses a backtracking algorithm to find a pairing where no two players have already faced each other this tournament.\n   • If a no-rematch pairing is mathematically impossible (e.g. round 4 with only 4 players left), the closest-ranked rematch is allowed and a warning is logged to the browser console.\n\nBYE (ODD PLAYER COUNT)\n   • If the player count is odd, the lowest-ranked player who has not yet had a bye receives one.\n   • A bye counts as a win and is worth 3 match points; the player skips that round.\n   • The same player will not get a bye twice unless every other player has already had one.\n\nTIEBREAKERS (STANDINGS)\n   • Match Points (MP) first.\n   • Then OWP — Opponents\' Win Percentage — the average win rate of every opponent you faced. Rewards beating tougher fields.\n   • Players still tied are listed in registration order.\n\nRECOMMENDED ROUND COUNT\n   • The app suggests ⌈log₂(N)⌉ rounds for N players (e.g. 8 → 3, 16 → 4, 32 → 5). You can always end early or run extra rounds.\n\nDROP PLAYER\n   • Open a player\'s trainer card and tap Drop Player to remove them from future pairings. Their existing results stay on record. Tap Undo Drop to reinstate.',
                zh: '瑞士制將戰績相近的玩家配對在一起，整個過程不淘汰任何人。\n\n配對方式\n   • 第 1 輪：隨機洗牌後依序配對。\n   • 第 2 輪起：依勝點排序，高分者優先配對。\n\n計分（兩種模式，於報名頁面選擇）\n   • 預設 — 勝 3 分、負 1 分、和 0 分（鼓勵到場參賽，和局不計分）。\n   • 標準瑞士制 — 勝 3 分、和 1 分、負 0 分。在報名頁面勾選「標準瑞士制計分」即可切換。\n   • 輪空一律視為自動勝場（3 分）。\n   • 賽事開始後，計分模式將鎖定。\n\n避免重複對局\n   • 系統使用回溯演算法，盡可能讓本次賽事中沒有任何兩位玩家再次相遇。\n   • 若數學上無法避免（例如第 4 輪只剩 4 人），則允許戰績最相近的重複對局，並在瀏覽器主控台記錄警告。\n\n輪空（玩家人數為奇數時）\n   • 由尚未獲得輪空、戰績最低者獲得輪空。\n   • 輪空計為勝場，獲得 3 勝點，該輪不需出戰。\n   • 同一位玩家不會獲得兩次輪空，除非全員都已輪空過。\n\n排名分小（決勝順位）\n   • 先比勝點（MP）。\n   • 再比 OWP（對手勝率）— 你所有對手的平均勝率，獎勵擊敗強敵者。\n   • 仍同分者依報名順序排列。\n\n建議輪數\n   • 系統依 ⌈log₂(N)⌉ 推薦輪數（例如 8 人 → 3 輪、16 人 → 4 輪、32 人 → 5 輪）。可自行提前結束或加打額外輪次。\n\n退賽\n   • 開啟玩家訓練家卡片並點擊「玩家退賽」，即可從後續配對中移除該玩家；既有對戰結果仍會保留。再點「取消退賽」可恢復。'
            }
        },
        knockout: {
            label: { en: 'KNOCKOUT FORMAT', zh: '淘汰賽' },
            title: { en: 'Knockout pairing rules', zh: '淘汰賽配對規則' },
            body: {
                en: 'Knockout (single-elimination) pairings build a bracket where the loser of each match is out.\n\nBRACKET CONSTRUCTION (ROUND 1)\n   • All registered players are randomly shuffled into a seed list.\n   • Bracket size = the next power of 2 greater than or equal to the player count. Example: 11 players → 16-slot bracket.\n   • Empty slots become byes for the top seeds, who advance automatically without playing.\n\nSTANDARD SEED ORDER\n   • Pairings follow the conventional knockout order: 1 vs N, 4 vs N-3, 5 vs N-4, … 2 vs N-1, 3 vs N-2, …\n   • This guarantees the strongest seeds only meet in later rounds.\n   • Example for 8 players: 1v8, 4v5, 2v7, 3v6.\n\nSUBSEQUENT ROUNDS\n   • The winner of each match is paired with the winner of the adjacent match, preserving bracket structure.\n   • Round names follow the remaining player count: Round of 16 → Quarterfinal → Semifinal → Final.\n\nFINAL ROUND\n   • When only one match remains, the Submit button becomes Submit Results & End Tournament. One click crowns the champion.\n\nDROP PLAYER (KNOCKOUT-AWARE)\n   • If a player drops mid-bracket BEFORE their pending round is submitted, their match auto-awards to their opponent so the bracket can advance.\n   • If their match is already complete, dropping them only updates the standings tag.\n\nDRAWS\n   • Knockout has no draws by design — each match must produce a winner. The Draw button still appears today; we plan to hide it in a future update.\n\nWHEN TO USE\n   • Best for 4–32 players when you want a quick champion rather than full Swiss-style ranking.\n   • For Best-of-3 or manual seeding, use Swiss + a custom round count instead — bracket-tree visualisation and manual seeding are on the roadmap.',
                zh: '淘汰賽（單敗）採用標準括號賽制，每場比賽輸方即出局。\n\n第 1 輪括號建立\n   • 所有報名玩家隨機洗牌後排入種子列表。\n   • 括號大小 = 大於或等於玩家數的最小 2 的次方。例如：11 人 → 16 籤位。\n   • 空缺籤位由高種子玩家獲得輪空，自動晉級無需出賽。\n\n標準種子順序\n   • 採用傳統淘汰賽順序：1 對 N、4 對 N-3、5 對 N-4⋯ 2 對 N-1、3 對 N-2⋯\n   • 這能確保最強的種子要到後期才會碰頭。\n   • 8 人範例：1對8、4對5、2對7、3對6。\n\n後續輪次\n   • 每場勝者與相鄰場次的勝者配對，保留括號結構。\n   • 輪次名稱依剩餘人數命名：16 強 → 8 強 → 準決賽 → 決賽。\n\n決賽\n   • 僅剩一場比賽時，提交按鈕會變為「提交結果並結束賽事」。一鍵決出冠軍。\n\n退賽（淘汰賽特殊處理）\n   • 若玩家在所屬輪次提交結果前退賽，該對局會自動判給對手，使賽程繼續。\n   • 若該場已完成，退賽只會在排名加註標記。\n\n和局\n   • 淘汰賽本質上不允許和局，每場必須分出勝負。目前畫面仍會顯示「和」鈕，未來版本將予以隱藏。\n\n適用情境\n   • 適合 4–32 人快速分出冠軍，不需完整的瑞士制小分。\n   • 若需 BO3 或手動種子，目前可改用瑞士制並調整輪數；括號樹視圖與手動種子已在規劃中。'
            }
        }
    };

    function openPairingHelp(format) {
        const type = format === 'knockout' || (!format && state.tournamentType === 'knockout')
            ? 'knockout'
            : 'swiss';
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
        state.tournamentType = type;
        saveState();
        navigateTo('registration');
    }

    // ---- SWISS TOURNAMENT ----
    function startTournament() {
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

        let roundLabel;
        if (state.tournamentType === 'knockout') {
            const remaining = round.pairings.reduce((n, p) => n + (p.isBye ? 1 : 2), 0);
            roundLabel = t('ko.title', { label: knockoutRoundLabel(remaining) });
        } else {
            const recRounds = getRecommendedRounds();
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

            let playerAClass = '';
            let playerBClass = '';
            if (pairing.result === 'a') { playerAClass = 'winner'; playerBClass = 'loser'; }
            else if (pairing.result === 'b') { playerAClass = 'loser'; playerBClass = 'winner'; }
            else if (pairing.result === 'draw') { playerAClass = 'draw'; playerBClass = 'draw'; }

            const disabled = round.resultsSubmitted ? 'style="pointer-events:none;opacity:0.6"' : '';

            row.innerHTML = `
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
        const me = (state.players || []).find(p => p.name.toLowerCase() === lc);
        if (!me || !round) {
            result.innerHTML = `<div class="viewer-pin-empty">${escapeHtml(t('viewer.notFound'))}</div>`;
            return;
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
                    <span class="pairing-player">${escapeHtml(pa.name)}</span>
                    <span class="bye-tag">${t('round.byeWin')}</span>
                </div>
            </div>`;
        } else {
            let aClass = '', bClass = '';
            if (pairing.result === 'a') { aClass = 'winner'; bClass = 'loser'; }
            else if (pairing.result === 'b') { aClass = 'loser'; bClass = 'winner'; }
            else if (pairing.result === 'draw') { aClass = 'draw'; bClass = 'draw'; }
            html += `<div class="pairing-row pinned">
                <div class="table-number">T${pairing.table}</div>
                <div class="pairing-player side-a ${aClass}">${escapeHtml(pa.name)}</div>
                <div class="result-buttons" style="pointer-events:none;opacity:0.85">
                    <button class="result-btn ${pairing.result === 'a' ? 'selected-win-a' : ''}">${t('round.aWins')}</button>
                    <button class="result-btn ${pairing.result === 'draw' ? 'selected-draw' : ''}">${t('round.draw')}</button>
                    <button class="result-btn ${pairing.result === 'b' ? 'selected-win-b' : ''}">${t('round.bWins')}</button>
                </div>
                <div class="pairing-player side-b ${bClass}" style="text-align:right">${escapeHtml(pb.name)}</div>
            </div>`;
        }
        result.innerHTML = html;
    }

    function setResult(pairingIndex, result) {
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
        saveState();
        renderRound();
    }

    function isFinalRound() {
        const round = state.rounds[state.currentRound];
        if (!round) return false;
        if (state.tournamentType === 'knockout') {
            // Final = exactly one non-bye pairing (the championship match)
            const matches = round.pairings.filter(p => !p.isBye);
            return matches.length === 1;
        }
        const rec = getRecommendedRounds();
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

    function endTournament() {
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
        navigateTo('standings');
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
                const winPct = opp.matchPoints / (totalGames * 3);
                totalOppWinPct += Math.max(0.25, winPct);
            }
            oppCount++;
        });

        return oppCount > 0 ? totalOppWinPct / oppCount : 0;
    }

    function getStandings() {
        const standings = state.players.map(p => {
            const owp = calculateOWP(p);
            return {
                ...p,
                owp,
                record: `${p.wins}-${p.losses}-${p.draws}`
            };
        });

        standings.sort((a, b) => {
            if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
            return b.owp - a.owp;
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
        const standings = getStandings();
        const tbody = document.getElementById('standings-body');
        const title = document.getElementById('standings-title');

        const lastSubmitted = state.rounds.filter(r => r.resultsSubmitted).length;
        const baseTitle = state.tournamentEnded
            ? t('standings.final', { n: lastSubmitted })
            : t('standings.afterRound', { n: lastSubmitted });
        const prefix = tournamentTitlePrefix();
        title.textContent = prefix ? `${prefix} ${baseTitle}` : baseTitle;

        tbody.innerHTML = '';
        standings.forEach((p, i) => {
            const tr = document.createElement('tr');
            tr.onclick = () => showTrainerCard(p.id);
            const playerObj = getPlayer(p.id);
            const isDropped = playerObj && playerObj.dropped;
            if (isDropped) tr.classList.add('player-dropped');
            const nameCell = isDropped
                ? `${escapeHtml(p.name)} <span class="dropped-tag">${t('trainer.droppedTag')}</span>`
                : escapeHtml(p.name);
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${nameCell}</td>
                <td>${p.record}</td>
                <td>${p.matchPoints}</td>
                <td>${(p.owp * 100).toFixed(1)}%</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function downloadStandings() {
        const wrapper = document.getElementById('standings-table-wrapper');
        if (typeof html2canvas === 'undefined') {
            alert(t('standings.htmlMissing'));
            return;
        }
        html2canvas(wrapper, {
            backgroundColor: '#0a0e27',
            scale: 2
        }).then(srcCanvas => {
            // Add a brand watermark strip below the captured table
            const pad = 24;
            const stripH = 56;
            const out = document.createElement('canvas');
            out.width = srcCanvas.width;
            out.height = srcCanvas.height + stripH;
            const ctx = out.getContext('2d');
            ctx.fillStyle = '#0a0e27';
            ctx.fillRect(0, 0, out.width, out.height);
            ctx.drawImage(srcCanvas, 0, 0);
            // Watermark strip
            ctx.fillStyle = '#141414';
            ctx.fillRect(0, srcCanvas.height, out.width, stripH);
            ctx.fillStyle = '#FF7324';
            ctx.font = 'bold 22px "JetBrains Mono", ui-monospace, monospace';
            ctx.textBaseline = 'middle';
            ctx.fillText('tcgtm.web.app', pad, srcCanvas.height + stripH / 2);
            ctx.fillStyle = '#888';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('Generated by TCG Tournament Manager', out.width - pad, srcCanvas.height + stripH / 2);

            const link = document.createElement('a');
            const roundNum = state.rounds.filter(r => r.resultsSubmitted).length;
            link.download = `Standings_Round${roundNum}.png`;
            link.href = out.toDataURL('image/png');
            link.click();
        }).catch(err => {
            console.error('Screenshot failed:', err);
            alert(t('standings.snapFail'));
        });
    }

    // ---- TRAINER CARD MODAL ----
    function showTrainerCard(playerId) {
        const player = getPlayer(playerId);
        if (!player) return;

        const owp = calculateOWP(player);
        const body = document.getElementById('modal-body');

        let timeline = '';
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

                timeline += `
                    <div class="timeline-item">
                        <span class="timeline-round">${t('trainer.round', { n: rIdx + 1 })}</span>
                        ${t('trainer.vs')} ${escapeHtml(oppName)} -
                        <span class="${resultClass}">${resultText}</span>
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
                    <div class="stat-label">${t('trainer.record')}</div>
                    <div class="stat-value">${player.wins}-${player.losses}-${player.draws}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">${t('trainer.games')}</div>
                    <div class="stat-value">${player.wins + player.losses + player.draws}</div>
                </div>
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
            state = { ...DEFAULT_STATE, ...remoteState, ...viewerLock, publishedTournamentId: tid };
            hideViewerStatus();
            const view = state.tournamentEnded ? 'standings'
                       : state.tournamentStarted ? 'round'
                       : 'registration';
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
        if (textarea.value.trim() === '' && names.length > 0) {
            textarea.value = names.join('\n');
        }

        const historyList = document.getElementById('wheel-history');
        historyList.innerHTML = '';
        state.wheelHistory.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            historyList.appendChild(li);
        });

        spinBtn.disabled = names.length < 2 || wheelSpinning;

        drawWheel(ctx, canvas.width, canvas.height, names, wheelAngle);
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

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function animate(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);

            wheelAngle = startAngle + totalRotation * eased;
            drawWheel(ctx, canvas.width, canvas.height, names, wheelAngle);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                wheelSpinning = false;
                document.getElementById('btn-spin').disabled = false;

                // The pointer is at the top of the canvas (12 o'clock = -PI/2).
                // Each slice i starts at: wheelAngle + i * sliceAngle
                // We need to find which slice contains the angle -PI/2 (top).
                // Normalize: find the effective angle at the pointer
                const pointerAngle = -Math.PI / 2;
                // The start of slice i relative to fixed coordinates is: wheelAngle + i * sliceAngle
                // We need: wheelAngle + i * sliceAngle <= pointerAngle < wheelAngle + (i+1) * sliceAngle
                // Rearranging: i * sliceAngle <= (pointerAngle - wheelAngle) < (i+1) * sliceAngle
                // Normalize (pointerAngle - wheelAngle) to [0, 2*PI)
                let offset = ((pointerAngle - wheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                const winnerIndex = Math.floor(offset / sliceAngle) % names.length;
                const winner = names[winnerIndex];

                showWinner(winner);
            }
        }

        requestAnimationFrame(animate);
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
                    const winPct = opp.matchPoints / (games * 3);
                    total += Math.max(0.25, winPct);
                }
                count++;
            });
            return count > 0 ? total / count : 0;
        }

        const rows = previewPlayers.map(p => ({
            name: p.name,
            record: `${p.wins}-${p.losses}-${p.draws}`,
            points: p.matchPoints,
            owp: previewOWP(p)
        }));
        rows.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.owp - a.owp;
        });

        let html = `<table class="standings-table"><thead><tr>` +
            `<th>${t('standings.rank')}</th><th>${t('standings.player')}</th><th>${t('standings.record')}</th><th>${t('standings.points')}</th><th>${t('standings.owp')}</th>` +
            `</tr></thead><tbody>`;
        rows.forEach((r, i) => {
            html += `<tr><td>${i + 1}</td><td>${escapeHtml(r.name)}</td><td>${r.record}</td><td>${r.points}</td><td>${(r.owp * 100).toFixed(1)}%</td></tr>`;
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
            const real = createPlayer(sp.name);
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

    function init() {
        loadState();
        loadAdvancedStaging();
        applyTheme();
        applyI18n();
        applyNoAds();
        renderUpdates();

        // Keyboard events
        document.addEventListener('keydown', handleKeydown);

        // Detect view-mode (URL has ?t=<id>) — but only if we're not the owner
        const urlTid = getUrlTournamentId();
        if (urlTid && state.publishedTournamentId !== urlTid) {
            enterViewMode(urlTid);
            return;
        }

        // Re-attach to a previously-published tournament after reload
        if (state.publishedTournamentId && window.cloud && window.cloud.isConfigured()) {
            (async () => {
                await window.cloud.init();
                if (window.cloud.isReady()) {
                    window.cloud.attachExisting(state.publishedTournamentId);
                    // Push current state in case viewers missed updates while offline
                    window.cloud.syncState(state);
                }
            })();
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

        // Final flush on tab hide / close — guards against any in-flight changes
        window.addEventListener('pagehide', saveState);
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
        timerToggle,
        timerReset,
        timerAdjust,
        toggleTimerMute,
        toggleProjectorMode,
        toggleCompactMode,
        wheelSetNames,
        wheelSyncFromTournament,
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
        viewerPinClear,
        viewerShareOpen,
        viewerShareClose,
        viewerShareCopy,
        updateTournamentMeta,
        toggleScoringDrawBonus,
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
        advancedDiscard
    };
})();
