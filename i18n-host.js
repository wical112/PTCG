/* ============================================================================
   i18n-host.js — minimal i18n for /host/ and /event/ pages.

   Plain JS, no build step, no framework. Reuses the same `ptcg_lang`
   localStorage key as the main app so a user's choice on / carries over
   to the organizer / signup pages.

   Usage from HTML:
     <script src="/i18n-host.js" defer></script>
     <span data-i18n="reg.title">Player Registration</span>
     <input data-i18n-placeholder="reg.bulkPlaceholder" placeholder="...">
     <p data-i18n-html="some.key">…</p>

   On DOMContentLoaded the helper walks the DOM, swaps the textContent /
   placeholder / innerHTML to the matched dict value, and re-applies on
   `setLang(...)`. Pages can also call `t('some.key')` for dynamic strings.

   The dict is intentionally compact — covers tabs / labels / buttons /
   status badges / common errors. Long descriptive paragraphs that don't
   carry a key fall through to whatever HTML originally said (zh-Hant
   primary). Add keys here as the surface evolves.
   ============================================================================ */

(function () {
    var STRINGS = {
        en: {
            // ── Common ──
            'common.cancel':          'Cancel',
            'common.confirm':         'Confirm',
            'common.copy':            'Copy',
            'common.share':           'Share',
            'common.delete':          'Delete',
            'common.back':            'Back',
            'common.home':            'Home',
            'common.save':            'Save',
            'common.savedNow':        '✅ Saved',
            'common.savingDraft':     'Drafting…',
            'common.saving':          'Saving…',
            'common.required':        '*',
            'common.optional':        '(optional)',
            'common.langToggleZh':    '中文',
            'common.langToggleEn':    'EN',
            'lang.label':             'EN',

            // ── Header / branding ──
            'header.gameset':         'GameSet HK',
            'host.headerTag':         'Host event',
            'event.headerWalkin':     'On-site walk-in',

            // ── Host: create-new splash ──
            'hostCreate.title':       'Host a PTCG event',
            'hostCreate.lead':        'One tap → unique event ID. Players sign up via the link, no login. Save the host URL when it appears — losing it means you have to re-create the event.',
            'hostCreate.btn':         '+ Create event now',
            'hostCreate.haveId':      'Have an event ID already?',
            'hostCreate.haveIdBody':  'Re-open the host URL you got at creation. If you only remember the event ID, open <code>https://gameset-hk.com/host/?e=YOUR_ID&amp;k=YOUR_KEY</code>.',

            // ── Host: just-created splash ──
            'justCreated.title':      '✅ Event created',
            'justCreated.warn':       '⚠️ <strong>This is your host-only URL (contains your edit key)</strong> — save / screenshot / send it to yourself now. Treat it like a backstage key; lose it and you can no longer edit this event.',
            'justCreated.copyEdit':   'Copy',
            'justCreated.shareEdit':  '📤 Send to myself',
            'justCreated.ack':        'I\'ve saved this host URL',
            'justCreated.enter':      'Enter editor',

            // ── Host: editor banner ──
            'editor.eventId':         'Event ID',
            'editor.linksBtn':        'Event links',
            'phase.signup':           'Signup open',
            'phase.live':             'Tournament live',
            'phase.ended':            'Ended',
            'phase.cancelled':        '⛔ Cancelled',

            // ── Host: tabs ──
            'tab.info':               'Event details',
            'tab.promo':              'Promo text',
            'tab.signups':            'Signups',

            // ── Host: info tab ──
            'info.title':             'Event details',
            'info.org':               'Organizer',
            'info.orgPh':             'e.g. AAB Card Shop',
            'info.name':              'Event name',
            'info.namePh':            'e.g. May Gym Battle',
            'info.date':              'Date',
            'info.time':              'Time',
            'info.address':           'Address',
            'info.addressPh':         'e.g. 5/F Mong Kok Centre Rm 503',
            'info.desc':              'Description',
            'info.descPh':            'Format / rules / notes…',
            'info.contact':           'Contact',
            'info.contactPh':         'e.g. WhatsApp 9123 4567',
            'info.fee':               'Entry fee (HKD)',
            'info.capacity':          'Registration cap',
            'info.capacityUnlimited': 'No cap',
            'info.capacityHint':      'Online signup blocks at the cap (organizer can still add walk-ins manually).',
            'info.payments':          'Accepted payment methods',
            'info.image':             'Promo image',
            'info.imageHint':         'Recommend Instagram portrait (4:5) or 1:1 square. Max 2 MB. Auto-deleted after the event expires.',
            'info.imageDrop':         '📷 Tap to upload / drop image here',
            'info.imageRemove':       'Remove image',
            'info.prizes':            'Prize tiers',
            'info.prizesHint':        'Set prizes per player-count threshold. e.g. 4 players = event runs · 8 = 1st: a booster box · 16 = 1st: a chase card.',
            'info.tierAdd':           '+ Add tier',
            'info.tierThreshold':     'Unlocked at',
            'info.tierThresholdSuffix':' players',
            'info.tierFirst':         '1st',
            'info.tierSecond':        '2nd',
            'info.tierThird':         '3rd',
            'info.tierNotes':         'Notes',
            'info.tierNotesPh':       'e.g. all attendees get a sleeve',
            'info.lucky':             'Lucky draw / all-attendee prize',
            'info.luckyPh':           'e.g. all-attendee draw: 3× premium sleeves',
            'info.statusTitle':       'Event status',
            'info.cancel':            'Pause event',
            'info.cancelHint':        'The public page will show a "⛔ Paused" banner. Reversible anytime.',
            'info.uncancel':          'Restore event',
            'info.delete':            '🗑 Delete',
            'info.deleteHint':        'Permanently removes all signups, the promo image, and the TopCut post. <strong>Only available before the tournament starts.</strong>',

            // Save row + publish cluster
            'save.autoNote':          'All edits auto-save',
            'publish.draftBadge':     '⚪ Draft (not published)',
            'publish.liveBadge':      '🟢 Published to TopCut HK',
            'publish.mutedBadge':     '🔇 Sync disabled',
            'publish.publishBtn':     '📣 Publish event',
            'publish.updateBtn':      '✅ Published — Update',
            'publish.unpublishBtn':   '↩ Unpublish',

            // ── Host: promo tab ──
            'promo.title':            'Promotional text',
            'promo.intro':            'Auto-generated from your event details. Copy → paste into WhatsApp / IG / Telegram.',
            'promo.langZh':           '繁中',
            'promo.langEn':           'English',
            'promo.langBoth':         'Bilingual',
            'promo.copy':             '📋 Copy',
            'promo.share':            '📤 Share',
            'promo.publicTitle':      'Player signup link',

            // ── Host: signups tab ──
            'signups.walkinPanel':    '🎟 On-site walk-in tools',
            'signups.walkinTagline':  'QR · manual entry',
            'signups.walkinQrTitle':  'On-site self-signup QR',
            'signups.walkinQrHint':   'Players scan with their phone, fill the form, and auto-mark walk-in.',
            'signups.walkinManualTitle': 'Or enter for them',
            'signups.list':           'Signup list',
            'signups.peopleSuffix':   ' players',
            'signups.filterAll':      'All',
            'signups.filterChecked':  'Checked in',
            'signups.filterPaid':     'Paid',
            'signups.filterWalkin':   'Walk-in',
            'signups.filterUnpaid':   'Unpaid',
            'signups.bulkCheck':      '✓ Check in all',
            'signups.bulkPaidCash':   '💵 Mark unpaid as cash-paid',
            'signups.exportCsv':      '📥 Download CSV',
            'signups.empty':          'No signups yet.',
            'signups.emptyHint':      'Copy the link from the Promo tab and share it.',
            'signups.startTournament':'▶ Start tournament (checked-in only)',
            'signups.startHint':      'Only checked-in players are pre-loaded. You can still add or drop players on the registration page.',
            'signups.publishResult':  '📣 Preview + send result to TopCut HK',
            'signups.publishResultHint':'Shows post-tournament standings + deck pie chart for organizer review before posting. Trainer-ID records bind on send.',

            // Row chips
            'row.checkin':            'Check in',
            'row.checked':            '✓ Checked in',
            'row.unpaid':             '💵 Unpaid',

            // Walk-in form labels
            'walkin.name':            'Name',
            'walkin.nameOptional':    'Player name',
            'walkin.trainerId':       'Trainer ID',
            'walkin.phoneOptional':   'Contact phone (optional)',
            'walkin.deck':            'Deck headliner',
            'walkin.add':             '+ Add to list',
            'walkin.copyUrl':         'Copy',

            // Modals
            'modal.linksTitle':       'Event links',
            'modal.publicLabel':      '📤 Player signup link (share publicly)',
            'modal.editLabel':        '🔒 Host-only URL (keep private)',
            'modal.editWarn':         'Lose it = lose edit access for this event.',
            'resultModal.title':      'Result preview — TopCut HK post',
            'resultModal.lead':       'Below is the post that will go up under <strong>@gameset_hk</strong>. You can rename players (does not affect trainer-ID binding).',
            'resultModal.confirm':    '📣 Confirm post to TopCut',

            // Event success page
            'eventSuccess.title':     '✅ Registered!',
            'eventSuccess.lead':      'Thanks for registering. Please arrive on time on event day for check-in. Screenshot for reference.',
            'eventSuccess.walkinNote':'Walk-in registration recorded ✨',
            'eventSuccess.dataLead':  'Below is your submitted info — keep a screenshot.',
            'eventSuccess.deckLabel': 'Deck',
            'eventSuccess.backFeed':  'Back to TopCut HK feed',

            // Event card
            'event.metaDate':         '📅 Date',
            'event.metaTime':         '⏰ Time',
            'event.metaAddress':      '📍 Location',
            'event.metaFee':          '💰 Entry fee',
            'event.detailsTitle':     'Event details',
            'event.prizesTitle':      '🏆 Prizes',
            'event.contactTitle':     '📧 Contact',
            'event.signupBtn':        '🎟 Register now',
            'event.signupClosed':     'Online signup is paused. Please contact the organizer on-site.',
            'event.notFound':         'Event not found',
            'event.notFoundHint':     'The event ID may be wrong, or the event has ended / expired.',
            'event.cancelledTitle':   '⛔ Event paused',
            'event.cancelledLead':    'The organizer paused this event temporarily. For questions please reach out to them.',
            'event.loading':          'Loading event…',
            'event.backHome':         'Back to home',

            // Signup form
            'signup.title':           'Registration form',
            'signup.intro':           'Phone / Trainer ID / deck headliner are organizer-only and never public until the event ends.',
            'signup.name':            'Name / display',
            'signup.trainerId':       'PTCG Trainer ID',
            'signup.trainerIdHint':   'Enter your 8-digit PTCG Live ID (e.g. 12345678 → hk12345678). No TopCut account needed — results bind to this ID for future claim.',
            'signup.phone':           'Contact phone',
            'signup.phonePh':         '9123 4567',
            'signup.deck':            'Deck headliner Pokémon',
            'signup.deckHint':        'Pick up to two (1 main + 1 sub). Hidden until the event ends; for Meta stats only.',
            'signup.deckMain':        '+ Main',
            'signup.deckSub':         '+ Sub (optional)',
            'signup.submit':          'Submit',

            // Updates / pricing — placeholders
            'pwa.install':            '📱 Install as App',
        },
        zh: {
            // ── Common ──
            'common.cancel':          '取消',
            'common.confirm':         '確認',
            'common.copy':            '複製',
            'common.share':           '分享',
            'common.delete':          '刪除',
            'common.back':            '返回',
            'common.home':            '首頁',
            'common.save':            '儲存',
            'common.savedNow':        '✅ 已儲存',
            'common.savingDraft':     '草稿中...',
            'common.saving':          '儲存中...',
            'common.required':        '*',
            'common.optional':        '（可選）',
            'common.langToggleZh':    '中文',
            'common.langToggleEn':    'EN',
            'lang.label':             '中文',

            // Header
            'header.gameset':         'GameSet HK',
            'host.headerTag':         '舉辦活動',
            'event.headerWalkin':     '場內 walk-in',

            // Host create splash
            'hostCreate.title':       '舉辦 PTCG 活動',
            'hostCreate.lead':        '一按即生成獨立 event ID，玩家用報名連結即時填表，免登入。創建後請即刻儲存「主辦人專用連結」—— 失去就要重新建立活動。',
            'hostCreate.btn':         '+ 立即創建活動',
            'hostCreate.haveId':      '已有 event ID？',
            'hostCreate.haveIdBody':  '用返創建活動時拎到嘅「主辦人專用連結」直接打開就可以繼續編輯。如果你只記得 event ID，請打開 <code>https://gameset-hk.com/host/?e=YOUR_ID&amp;k=YOUR_KEY</code>。',

            // Just-created splash
            'justCreated.title':      '✅ 活動已創建',
            'justCreated.warn':       '⚠️ <strong>下面係主辦人專用連結（包含你嘅 edit key）</strong>—— 請即刻儲存／截圖／傳俾自己。呢條 link 等於本活動嘅後台鎖匙，唔好公開分享，遺失將無法繼續編輯。',
            'justCreated.copyEdit':   '複製',
            'justCreated.shareEdit':  '📤 分享俾自己',
            'justCreated.ack':        '我已經儲存咗呢條主辦人連結',
            'justCreated.enter':      '進入編輯',

            // Editor banner
            'editor.eventId':         'Event ID',
            'editor.linksBtn':        '活動連結',
            'phase.signup':           '報名中',
            'phase.live':             '比賽進行',
            'phase.ended':            '已完結',
            'phase.cancelled':        '⛔ 已取消',

            // Tabs
            'tab.info':               '活動資料',
            'tab.promo':              '推廣文本',
            'tab.signups':            '報名清單',

            // Info tab
            'info.title':             '活動資料',
            'info.org':               '主辦機構',
            'info.orgPh':             'e.g. AAB Card Shop',
            'info.name':              '活動名稱',
            'info.namePh':            'e.g. 5 月 Gym Battle',
            'info.date':              '日期',
            'info.time':              '時間',
            'info.address':           '地址',
            'info.addressPh':         'e.g. 旺角中心 5/F 503 室',
            'info.desc':              '活動描述',
            'info.descPh':            '格式 / 規則 / 注意事項…',
            'info.contact':           '聯絡資料',
            'info.contactPh':         'e.g. WhatsApp 9123 4567',
            'info.fee':               '入場費 (HKD)',
            'info.capacity':          '報名上限',
            'info.capacityUnlimited': '不設上限',
            'info.capacityHint':      '滿額後玩家無法網上報名（主辦仍可手動加 walk-in）。',
            'info.payments':          '接受嘅付款方式',
            'info.image':             '宣傳圖片',
            'info.imageHint':         '建議 Instagram 直度比例（4:5）或 1:1，最大 2 MB。活動到期後自動刪除。',
            'info.imageDrop':         '📷 按此上傳 / 拖入圖片',
            'info.imageRemove':       '移除圖片',
            'info.prizes':            '獎品 Tier',
            'info.prizesHint':        '設定每個人數門檻嘅獎品。例如：4 人開賽 → 有開賽；8 人 → 頭獎一盒卡；16 人 → 一張稀有卡⋯',
            'info.tierAdd':           '+ 新增 Tier',
            'info.tierThreshold':     '達',
            'info.tierThresholdSuffix':' 人解鎖',
            'info.tierFirst':         '頭獎',
            'info.tierSecond':        '第二名',
            'info.tierThird':         '第三名',
            'info.tierNotes':         '備註',
            'info.tierNotesPh':       'e.g. 含參加紀念品',
            'info.lucky':             '抽獎獎品 / 全員獎',
            'info.luckyPh':           'e.g. 全員抽獎：精美卡套 ×3',
            'info.statusTitle':       '活動狀態',
            'info.cancel':            '暫停活動',
            'info.cancelHint':        '公開頁將顯示「⛔ 活動已暫停」橫幅。可以隨時還原。',
            'info.uncancel':          '還原活動',
            'info.delete':            '🗑 刪除',
            'info.deleteHint':        '會移除全部報名、宣傳圖、TopCut post — 完全不可復原。<strong>只可以喺比賽未開始時刪除。</strong>',

            'save.autoNote':          '所有改動會自動儲存',
            'publish.draftBadge':     '⚪ 未發佈（草稿）',
            'publish.liveBadge':      '🟢 已發佈到 TopCut HK',
            'publish.mutedBadge':     '🔇 同步已停用',
            'publish.publishBtn':     '📣 發佈活動',
            'publish.updateBtn':      '✅ 已發佈 — 更新',
            'publish.unpublishBtn':   '↩ 取消發佈',

            // Promo tab
            'promo.title':            '推廣文本',
            'promo.intro':            '根據活動資料即時生成。可直接複製貼到 WhatsApp / IG / Telegram。',
            'promo.langZh':           '繁中',
            'promo.langEn':           'English',
            'promo.langBoth':         '雙語',
            'promo.copy':             '📋 複製',
            'promo.share':            '📤 分享',
            'promo.publicTitle':      '玩家報名連結',

            // Signups tab
            'signups.walkinPanel':    '🎟 場內 Walk-in 工具',
            'signups.walkinTagline':  'QR · 手動加入',
            'signups.walkinQrTitle':  '場內掃碼自助報名',
            'signups.walkinQrHint':   '玩家用手機掃描即場填表，即時加入清單（自動 mark walk-in）。',
            'signups.walkinManualTitle':'由你代填（玩家口頭報資料）',
            'signups.list':           '報名清單',
            'signups.peopleSuffix':   ' 人',
            'signups.filterAll':      '全部',
            'signups.filterChecked':  '已簽到',
            'signups.filterPaid':     '已付款',
            'signups.filterWalkin':   'Walk-in',
            'signups.filterUnpaid':   '未付款',
            'signups.bulkCheck':      '✓ 全部簽到',
            'signups.bulkPaidCash':   '💵 未付款全部標為現金已付',
            'signups.exportCsv':      '📥 下載 CSV',
            'signups.empty':          '仲未有人報名。',
            'signups.emptyHint':      '到「推廣文本」tab 複製連結出去廣傳吧 🎴',
            'signups.startTournament':'▶ 開始比賽（已簽到玩家）',
            'signups.startHint':      '只有已簽到嘅玩家會載入到比賽頁。仲可以喺登記頁加額外玩家或刪走。',
            'signups.publishResult':  '📣 預覽 + 發送結果到 TopCut HK',
            'signups.publishResultHint':'展示比賽完結後嘅排名 / Deck 餅圖，組織者可以改名再發送。發送後 trainer ID 戰績會綁定到 TopCut。',

            // Row chips
            'row.checkin':            '簽到',
            'row.checked':            '✓ 已簽到',
            'row.unpaid':             '💵 未付',

            // Walk-in form
            'walkin.name':            '姓名',
            'walkin.nameOptional':    '玩家名',
            'walkin.trainerId':       'Trainer ID',
            'walkin.phoneOptional':   '聯絡電話 (可空)',
            'walkin.deck':            'Deck 主角',
            'walkin.add':             '+ 加入清單',
            'walkin.copyUrl':         '複製',

            // Modals
            'modal.linksTitle':       '活動連結',
            'modal.publicLabel':      '📤 玩家報名連結（公開分享）',
            'modal.editLabel':        '🔒 主辦人專用連結（請保管，不要公開）',
            'modal.editWarn':         '遺失 = 失去本活動編輯權。',
            'resultModal.title':      '結果預覽 — TopCut HK 帖文',
            'resultModal.lead':       '下面係將會以 <strong>@gameset_hk</strong> 身份出 post 嘅內容。可以改玩家顯示名（不影響 trainer ID 綁定）。',
            'resultModal.confirm':    '📣 確定發送到 TopCut',

            // Event success page
            'eventSuccess.title':     '✅ 報名成功！',
            'eventSuccess.lead':      '多謝報名，活動當日請準時到場簽到。',
            'eventSuccess.walkinNote':'Walk-in 報名已記錄到舉辦者後台 ✨',
            'eventSuccess.dataLead':  '下面係你嘅資料 —— 截圖留底以備不時之需。',
            'eventSuccess.deckLabel': 'Deck',
            'eventSuccess.backFeed':  '返回 TopCut HK 動態',

            // Event card
            'event.metaDate':         '📅 日期',
            'event.metaTime':         '⏰ 時間',
            'event.metaAddress':      '📍 地點',
            'event.metaFee':          '💰 入場費',
            'event.detailsTitle':     '活動詳情',
            'event.prizesTitle':      '🏆 獎品',
            'event.contactTitle':     '📧 查詢',
            'event.signupBtn':        '🎟 立即報名',
            'event.signupClosed':     '網上報名已暫停。請現場聯絡舉辦方。',
            'event.notFound':         '搵唔到呢個活動',
            'event.notFoundHint':     'Event ID 可能輸錯，或者活動已經結束 / 過期。',
            'event.cancelledTitle':   '⛔ 活動已暫停',
            'event.cancelledLead':    '舉辦方暫時暫停咗呢個活動。如有疑問請直接聯絡舉辦方。',
            'event.loading':          '載入活動資料中…',
            'event.backHome':         '返回首頁',

            // Signup form
            'signup.title':           '報名表',
            'signup.intro':           '電話 / Trainer ID / 用 deck 主角僅供舉辦方參考，比賽完結前不會公開。',
            'signup.name':            '姓名 / 暱稱',
            'signup.trainerId':       'PTCG Trainer ID',
            'signup.trainerIdHint':   '輸入你嘅 8 位 PTCG Live ID（例：12345678 → hk12345678）。如果未有 TopCut 帳號都可以輸入，比賽戰績會綁定呢個 ID 等你日後 claim。',
            'signup.phone':           '聯絡電話',
            'signup.phonePh':         '9123 4567',
            'signup.deck':            'Deck 主角 Pokémon',
            'signup.deckHint':        '最多揀兩隻（一主一副）。比賽完結前不會公開，只供 TopCut Meta 統計用。',
            'signup.deckMain':        '＋ 主角',
            'signup.deckSub':         '＋ 副 (可選)',
            'signup.submit':          '提交報名',

            'pwa.install':            '📱 安裝為 App',
        },
    };

    function detectLang() {
        try {
            var v = (localStorage.getItem('ptcg_lang') || '').toLowerCase();
            if (v === 'en' || v === 'zh') return v;
        } catch (e) { /* private mode */ }
        // fall back to browser hint — match anything starting with `zh` to zh
        var h = (navigator.language || 'zh').toLowerCase();
        return h.indexOf('zh') === 0 ? 'zh' : 'en';
    }

    var current = detectLang();

    function t(key, fallback) {
        var dict = STRINGS[current] || STRINGS.zh;
        if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
        var alt = STRINGS[current === 'zh' ? 'en' : 'zh'];
        if (alt && Object.prototype.hasOwnProperty.call(alt, key)) return alt[key];
        return fallback != null ? fallback : key;
    }

    function applyI18n(root) {
        var scope = root || document;
        scope.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (key) el.textContent = t(key, el.textContent);
        });
        scope.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-html');
            if (key) el.innerHTML = t(key, el.innerHTML);
        });
        scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-placeholder');
            if (key) el.setAttribute('placeholder', t(key, el.getAttribute('placeholder') || ''));
        });
        scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-title');
            if (key) el.setAttribute('title', t(key, el.getAttribute('title') || ''));
        });
        scope.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-aria');
            if (key) el.setAttribute('aria-label', t(key, el.getAttribute('aria-label') || ''));
        });
        // Update <html lang> + the toggle button label.
        try {
            document.documentElement.setAttribute('lang', current === 'zh' ? 'zh-Hant' : 'en');
        } catch (_) { /* */ }
        var btn = scope.querySelector('[data-i18n-toggle]');
        if (btn) btn.textContent = t(current === 'zh' ? 'common.langToggleEn' : 'common.langToggleZh');
    }

    function setLang(lang) {
        if (lang !== 'en' && lang !== 'zh') return;
        current = lang;
        try { localStorage.setItem('ptcg_lang', lang); } catch (e) { /* */ }
        applyI18n();
        // Let pages re-render dynamic strings (signup table rows etc).
        document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: lang } }));
    }

    function toggleLang() {
        setLang(current === 'zh' ? 'en' : 'zh');
    }

    function getLang() { return current; }

    window.gameSetI18n = {
        t: t,
        applyI18n: applyI18n,
        setLang: setLang,
        toggleLang: toggleLang,
        getLang: getLang,
    };
    // Convenience global so legacy host.js / event.js call sites stay short.
    window.t = t;

    if (document.readyState !== 'loading') applyI18n();
    else document.addEventListener('DOMContentLoaded', function () { applyI18n(); });
})();
