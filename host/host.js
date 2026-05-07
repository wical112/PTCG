/* ============================================================================
   host.js — Organizer-side editor for hosted PTCG events.
   ============================================================================ */

window.hostApp = (() => {
    let eventId = null;
    let editKey = null;
    let eventData = null;          // full doc
    let signupsList = [];
    let saveTimer = null;
    let signupSubscribe = null;
    let eventSubscribe = null;
    let imageDirty = false;        // becomes true after a fresh upload, prompts immediate save
    let signupFilter = 'all';      // all | checked | paid | walkin | unpaid
    let walkinSpecies1 = null;
    let walkinSpecies2 = null;
    const PTCG_HK_TRAINER_ID_REGEX = /^hk\d{8}$/;

    const SAVE_DEBOUNCE_MS = 700;
    const PAYMENT_LABELS = {
        cash: '現金', payme: 'PayMe', fps: '轉數快', alipay: '支付寶',
        wechat: 'WeChat', visa: 'Visa', master: 'Master', octopus: '八達通'
    };

    /* ── Init ─────────────────────────────────────────────────────────────── */
    async function init() {
        const params = new URLSearchParams(window.location.search);
        eventId = (params.get('e') || '').toUpperCase().trim() || null;
        editKey = params.get('k') || null;

        if (!window.cloud || !window.cloud.isConfigured || !window.cloud.isConfigured()) {
            showCreateError('Firebase 未設置，無法使用雲端功能。請聯絡管理員。');
            showView('host-create');
            return;
        }

        try {
            await window.cloud.init();
        } catch (e) {
            showCreateError('連線失敗：' + e.message);
            showView('host-create');
            return;
        }

        if (!eventId) {
            showView('host-create');
            wireCreateScreen();
            return;
        }

        // Existing event — load and decide which view
        try {
            eventData = await window.cloud.fetchEvent(eventId);
        } catch (e) {
            showCreateError('搵唔到活動 ID `' + eventId + '`，可能已過期。');
            showView('host-create');
            wireCreateScreen();
            return;
        }

        // P1 auth: same-browser ownerUid required for edit. We don't expose
        // currentUid through the public cloud API, so we proceed optimistically;
        // any cross-device attempt will fail at the first updateEvent and the
        // banner above the signups list will surface the limitation. P2 adds
        // a Cloud Function that verifies editKey hash and re-claims ownerUid.
        showView('host-editor');
        wireEditor();
        renderEditor();
        subscribeToEvent();
        subscribeToSignups();
    }

    /* ── View switching ────────────────────────────────────────────────────── */
    function showView(id) {
        document.querySelectorAll('.host-view').forEach(v => v.hidden = true);
        const v = document.getElementById(id);
        if (v) v.hidden = false;
    }

    function showCreateError(msg) {
        const el = document.getElementById('host-create-error');
        if (!el) return;
        el.textContent = msg;
        el.hidden = false;
    }

    /* ── Create screen ────────────────────────────────────────────────────── */
    function wireCreateScreen() {
        const btn = document.getElementById('btn-create-event');
        if (!btn || btn.dataset.wired) return;
        btn.dataset.wired = '1';
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = '建立中...';
            try {
                const result = await window.cloud.createEvent();
                showJustCreated(result);
            } catch (e) {
                showCreateError('建立失敗：' + (e.message || e));
                btn.disabled = false;
                btn.textContent = '+ 立即創建活動';
            }
        });
    }

    /* ── Just-created splash (force user to save edit URL) ────────────────── */
    function showJustCreated(result) {
        showView('host-just-created');
        document.getElementById('host-just-created-eid').textContent = result.eventId;
        document.getElementById('host-just-created-url').value = result.hostUrl;

        const ack = document.getElementById('chk-edit-url-saved');
        const enter = document.getElementById('btn-enter-editor');
        ack.checked = false;
        enter.disabled = true;
        ack.addEventListener('change', () => { enter.disabled = !ack.checked; });

        document.getElementById('btn-copy-edit-url').addEventListener('click', () => {
            copyToClipboard(result.hostUrl, '主辦人連結已複製');
        });
        document.getElementById('btn-share-edit-url').addEventListener('click', async () => {
            if (navigator.share) {
                try {
                    await navigator.share({ title: 'GameSet HK 主辦人專用連結', text: '請保管，唔好公開：' + result.hostUrl, url: result.hostUrl });
                } catch (_) { /* user cancelled */ }
            } else {
                copyToClipboard(result.hostUrl, '主辦人連結已複製');
            }
        });

        enter.addEventListener('click', () => {
            // Replace URL so reload keeps editing the event without a stale
            // browser-history entry pointing at /host/?(empty).
            window.location.replace(result.hostUrl);
        });
    }

    /* ── Editor wiring ────────────────────────────────────────────────────── */
    function wireEditor() {
        // Tabs
        document.querySelectorAll('.host-tab').forEach(t => {
            t.addEventListener('click', () => switchTab(t.dataset.tab));
        });

        // Live save — every change to a [data-meta] field
        document.querySelectorAll('[data-meta]').forEach(el => {
            el.addEventListener('input', () => scheduleSave());
            el.addEventListener('change', () => scheduleSave());
        });

        // Payment chips
        document.querySelectorAll('[data-payment]').forEach(cb => {
            cb.addEventListener('change', () => scheduleSave());
        });

        // Status toggles
        document.getElementById('signup-open-toggle').addEventListener('change', () => scheduleSave());
        document.getElementById('sync-topcut-toggle').addEventListener('change', () => scheduleSave());
        document.getElementById('btn-cancel-event').addEventListener('click', toggleCancel);
        document.getElementById('btn-publish-event').addEventListener('click', publishEvent);
        document.getElementById('btn-unpublish-event').addEventListener('click', unpublishEvent);

        // Prize tier add
        document.getElementById('btn-add-tier').addEventListener('click', addPrizeTier);
        document.getElementById('prize-lucky').addEventListener('input', () => scheduleSave());

        // Image upload
        document.getElementById('host-image-input').addEventListener('change', handleImageUpload);
        document.getElementById('btn-remove-image').addEventListener('click', handleImageRemove);

        // Promo lang toggle
        document.querySelectorAll('input[name="promo-lang"]').forEach(r => {
            r.addEventListener('change', renderPromo);
        });
        document.getElementById('btn-copy-promo').addEventListener('click', () => {
            const text = document.getElementById('host-promo-text').value;
            copyToClipboard(text, '推廣文本已複製');
        });
        document.getElementById('btn-share-promo').addEventListener('click', async () => {
            const text = document.getElementById('host-promo-text').value;
            if (navigator.share) {
                try { await navigator.share({ title: eventData?.meta?.name || 'GameSet HK 活動', text }); }
                catch (_) {}
            } else {
                copyToClipboard(text, '推廣文本已複製');
            }
        });

        // Public URL copy + show modal
        document.getElementById('btn-show-edit-url').addEventListener('click', openUrlModal);
        document.getElementById('btn-copy-public-url').addEventListener('click', () => {
            const text = document.getElementById('host-public-url').value;
            copyToClipboard(text, '報名連結已複製');
        });

        // Modal backdrop
        document.getElementById('host-url-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'host-url-overlay') closeUrlModal();
        });

        // Signups tab — filter chips
        document.querySelectorAll('.host-filter-chip').forEach(c => {
            c.addEventListener('click', () => setFilter(c.dataset.filter));
        });

        // Walk-in panel — copy URL, manual form
        document.getElementById('btn-copy-walkin-url').addEventListener('click', () => {
            const text = document.getElementById('host-walkin-url').value;
            copyToClipboard(text, 'Walk-in 連結已複製');
        });

        document.getElementById('btn-walkin-pick-1').addEventListener('click', () => {
            window.pokemonPicker.open({
                title: '揀 Deck 主角',
                lang: 'zh',
                excludeIds: walkinSpecies2 ? [walkinSpecies2.id] : [],
                onPick: (sp) => { walkinSpecies1 = sp; renderWalkinSlots(); }
            });
        });
        document.getElementById('btn-walkin-pick-2').addEventListener('click', () => {
            window.pokemonPicker.open({
                title: '揀 Deck 副角',
                lang: 'zh',
                excludeIds: walkinSpecies1 ? [walkinSpecies1.id] : [],
                pairWith: walkinSpecies1 ? walkinSpecies1.id : undefined,
                onPick: (sp) => { walkinSpecies2 = sp; renderWalkinSlots(); }
            });
        });

        const wTid = document.getElementById('walkin-trainer-id');
        wTid.addEventListener('input', (e) => {
            let v = e.target.value.replace(/^hk/i, '').replace(/\D/g, '').slice(0, 8);
            e.target.value = v;
        });

        document.getElementById('btn-add-walkin').addEventListener('click', submitWalkin);

        // Bulk + start tournament
        document.getElementById('btn-bulk-check').addEventListener('click', bulkCheckIn);
        document.getElementById('btn-bulk-paid-cash').addEventListener('click', bulkMarkPaidCash);
        document.getElementById('btn-start-tournament').addEventListener('click', startTournament);
        document.getElementById('btn-publish-result').addEventListener('click', openResultPreview);
        document.getElementById('btn-confirm-publish').addEventListener('click', confirmPublishResult);
        document.getElementById('host-result-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'host-result-overlay') closeResultPreview();
        });
    }

    function switchTab(tab) {
        document.querySelectorAll('.host-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        document.querySelectorAll('.host-tab-panel').forEach(p => {
            p.hidden = p.dataset.tabPanel !== tab;
        });
        if (tab === 'promo') renderPromo();
    }

    /* ── Render editor with current eventData ─────────────────────────────── */
    function renderEditor() {
        if (!eventData) return;
        const meta = eventData.meta || {};
        const prizes = eventData.prizes || { tiers: [], lucky: '' };

        // Header
        document.getElementById('host-editor-eid').textContent = eventData.eventId;
        const phaseText = phaseLabel(eventData.phase);
        const phaseEl = document.getElementById('host-editor-phase');
        phaseEl.textContent = phaseText;
        phaseEl.className = 'host-editor-phase phase-' + eventData.phase;

        // Meta fields
        ['org', 'name', 'date', 'time', 'address', 'desc', 'contact', 'fee'].forEach(k => {
            const el = document.querySelector('[data-meta="' + k + '"]');
            if (el) el.value = meta[k] !== undefined && meta[k] !== null ? meta[k] : '';
        });

        // Payment chips
        const pm = new Set(meta.paymentMethods || ['cash']);
        document.querySelectorAll('[data-payment]').forEach(cb => {
            cb.checked = pm.has(cb.dataset.payment);
        });

        // Image preview
        const previewWrap = document.getElementById('host-image-preview');
        const previewImg = document.getElementById('host-image-img');
        if (eventData.imageUrl) {
            previewImg.src = eventData.imageUrl;
            previewWrap.hidden = false;
        } else {
            previewWrap.hidden = true;
        }

        // Prize tiers
        renderPrizeTiers(prizes.tiers || []);
        document.getElementById('prize-lucky').value = prizes.lucky || '';

        // Status
        document.getElementById('signup-open-toggle').checked = !!eventData.signupOpen;
        document.getElementById('sync-topcut-toggle').checked = eventData.syncToTopCut !== false;
        const cancelBtn = document.getElementById('btn-cancel-event');
        cancelBtn.textContent = eventData.phase === 'cancelled' ? '還原活動' : '取消活動';

        // Publish state — drives the publish cluster in the save row.
        const publishBtn = document.getElementById('btn-publish-event');
        const unpublishBtn = document.getElementById('btn-unpublish-event');
        const stateBadge = document.getElementById('host-publish-state');
        if (eventData.published === true) {
            publishBtn.textContent = '✅ 已發佈 — 更新';
            publishBtn.classList.remove('btn-primary');
            publishBtn.classList.add('btn-secondary');
            unpublishBtn.hidden = false;
            stateBadge.hidden = false;
            stateBadge.textContent = eventData.syncToTopCut === false ? '🔇 同步已停用' : '🟢 已發佈到 TopCut HK';
            stateBadge.className = 'host-publish-state ' + (eventData.syncToTopCut === false ? 'is-muted' : 'is-live');
        } else {
            publishBtn.textContent = '📣 發佈活動';
            publishBtn.classList.add('btn-primary');
            publishBtn.classList.remove('btn-secondary');
            unpublishBtn.hidden = true;
            stateBadge.hidden = false;
            stateBadge.textContent = '⚪ 未發佈（草稿）';
            stateBadge.className = 'host-publish-state is-draft';
        }

        // Publish-result row visible only after the bracket has actually
        // finished AND we have a result snapshot to render. Hidden until both.
        const publishRow = document.getElementById('host-publish-result-row');
        if (publishRow) {
            publishRow.hidden = !(eventData.phase === 'ended' && eventData.tournamentResultSnapshot);
        }

        // Modal-backed URL fields
        document.getElementById('modal-public-url').value = window.cloud.buildEventPublicUrl(eventData.eventId);
        document.getElementById('modal-edit-url').value =
            editKey ? window.cloud.buildEventHostUrl(eventData.eventId, editKey) : window.location.href;
        document.getElementById('host-public-url').value = window.cloud.buildEventPublicUrl(eventData.eventId);

        // Walk-in URL = public URL + ?w=1 — appears on Signups tab
        const walkinUrl = window.cloud.buildEventPublicUrl(eventData.eventId) + '&w=1';
        const walkinUrlEl = document.getElementById('host-walkin-url');
        if (walkinUrlEl) walkinUrlEl.value = walkinUrl;
        const walkinQrWrap = document.getElementById('host-walkin-qr');
        if (walkinQrWrap) {
            const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(walkinUrl);
            walkinQrWrap.innerHTML = '<img src="' + qrSrc + '" alt="Walk-in QR" width="200" height="200">';
        }

        renderPublicQR();
    }

    function phaseLabel(phase) {
        switch (phase) {
            case 'signup': return '報名中';
            case 'live': return '比賽進行';
            case 'ended': return '已完結';
            case 'cancelled': return '⛔ 已取消';
            default: return phase || '—';
        }
    }

    function renderPrizeTiers(tiers) {
        const container = document.getElementById('host-prize-tiers');
        container.innerHTML = '';
        tiers.forEach((tier, idx) => {
            const card = document.createElement('div');
            card.className = 'host-prize-tier';
            card.innerHTML = `
                <div class="host-prize-tier-head">
                    <label>達 <input type="number" min="2" step="1" data-prize-idx="${idx}" data-prize-field="threshold" value="${tier.threshold || ''}" style="width:4.5rem"> 人解鎖</label>
                    <button type="button" class="btn btn-small btn-danger" data-prize-remove="${idx}">移除</button>
                </div>
                <div class="host-prize-tier-body">
                    <div class="reg-meta-field"><label>頭獎</label><input type="text" data-prize-idx="${idx}" data-prize-field="first" value="${escapeHtml(tier.first || '')}" placeholder="e.g. 一盒新版補充包"></div>
                    <div class="reg-meta-field"><label>第二名</label><input type="text" data-prize-idx="${idx}" data-prize-field="second" value="${escapeHtml(tier.second || '')}"></div>
                    <div class="reg-meta-field"><label>第三名</label><input type="text" data-prize-idx="${idx}" data-prize-field="third" value="${escapeHtml(tier.third || '')}"></div>
                    <div class="reg-meta-field reg-meta-field-wide"><label>備註</label><input type="text" data-prize-idx="${idx}" data-prize-field="notes" value="${escapeHtml(tier.notes || '')}" placeholder="e.g. 含參加紀念品"></div>
                </div>
            `;
            container.appendChild(card);
        });
        // Wire change events
        container.querySelectorAll('input[data-prize-idx]').forEach(inp => {
            inp.addEventListener('input', () => scheduleSave());
        });
        container.querySelectorAll('[data-prize-remove]').forEach(btn => {
            btn.addEventListener('click', () => {
                const i = +btn.dataset.prizeRemove;
                eventData.prizes.tiers.splice(i, 1);
                renderPrizeTiers(eventData.prizes.tiers);
                scheduleSave();
            });
        });
    }

    function addPrizeTier() {
        if (!eventData.prizes) eventData.prizes = { tiers: [], lucky: '' };
        if (!eventData.prizes.tiers) eventData.prizes.tiers = [];
        const last = eventData.prizes.tiers[eventData.prizes.tiers.length - 1];
        const nextThreshold = last ? Math.max(8, +last.threshold + 8) : 8;
        eventData.prizes.tiers.push({ threshold: nextThreshold, first: '', second: '', third: '', notes: '' });
        renderPrizeTiers(eventData.prizes.tiers);
        scheduleSave();
    }

    /* ── Save ─────────────────────────────────────────────────────────────── */
    function collectFromUI() {
        // Meta
        const meta = { ...(eventData.meta || {}) };
        document.querySelectorAll('[data-meta]').forEach(el => {
            const key = el.dataset.meta;
            let val = el.value;
            if (key === 'fee') val = +val || 0;
            meta[key] = val;
        });
        meta.currency = meta.currency || 'HKD';
        meta.paymentMethods = Array.from(document.querySelectorAll('[data-payment]'))
            .filter(cb => cb.checked).map(cb => cb.dataset.payment);

        // Prize tiers
        const tierMap = {};
        document.querySelectorAll('input[data-prize-idx]').forEach(el => {
            const i = +el.dataset.prizeIdx;
            const f = el.dataset.prizeField;
            tierMap[i] = tierMap[i] || {};
            tierMap[i][f] = (f === 'threshold') ? (+el.value || 0) : el.value;
        });
        const tiers = Object.keys(tierMap).sort((a, b) => +a - +b).map(k => ({
            threshold: tierMap[k].threshold || 0,
            first: tierMap[k].first || '',
            second: tierMap[k].second || '',
            third: tierMap[k].third || '',
            notes: tierMap[k].notes || ''
        }));

        const lucky = document.getElementById('prize-lucky').value;
        const signupOpen = document.getElementById('signup-open-toggle').checked;
        const syncToTopCut = document.getElementById('sync-topcut-toggle').checked;

        return {
            meta,
            prizes: { tiers, lucky },
            signupOpen,
            syncToTopCut
        };
    }

    function scheduleSave() {
        markSaving('草稿中...');
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(saveNow, SAVE_DEBOUNCE_MS);
    }

    async function saveNow() {
        if (!eventId) return;
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        const patch = collectFromUI();
        // Merge into local cache for promo render
        eventData.meta = patch.meta;
        eventData.prizes = patch.prizes;
        eventData.signupOpen = patch.signupOpen;
        eventData.syncToTopCut = patch.syncToTopCut;
        markSaving('儲存中...');
        try {
            await window.cloud.updateEvent(eventId, patch);
            markSaving('✅ 已儲存');
            renderPromo();
        } catch (e) {
            console.error(e);
            markSaving('❌ 儲存失敗：' + (e.message || ''), true);
        }
    }

    function markSaving(text, isError) {
        const el = document.getElementById('host-save-status');
        if (!el) return;
        el.textContent = text;
        el.style.color = isError ? '#ff5470' : '';
    }

    /* ── Publish / unpublish ──────────────────────────────────────────────── */
    async function publishEvent() {
        if (!eventData) return;
        // Make sure any pending edits are flushed first so the published doc
        // matches what's on screen.
        await saveNow();

        const meta = eventData.meta || {};
        const missing = [];
        if (!meta.name) missing.push('活動名稱');
        if (!meta.date) missing.push('日期');
        if (missing.length) {
            alert('未可發佈 — 仲未填：' + missing.join('、'));
            return;
        }
        if (eventData.syncToTopCut === false) {
            if (!confirm('「同步去 TopCut HK 社群」目前係關閉狀態，發佈後唔會喺 TopCut 出 post。\n要繼續發佈嗎？（仍然會 mark 為已發佈）')) return;
        } else {
            const isFirstPublish = !eventData.published;
            const msg = isFirstPublish
                ? '即刻將活動發佈到 TopCut HK 社群，會以 @gameset_hk 出 post。確定？'
                : '推送現時嘅活動內容更新到 TopCut HK post？';
            if (!confirm(msg)) return;
        }
        try {
            await window.cloud.updateEvent(eventId, { published: true });
            eventData.published = true;
            renderEditor();
            showToast(eventData.syncToTopCut === false
                ? '已標記為已發佈（同步停用中）'
                : '✅ 已發佈 — TopCut 會幾秒內更新');
        } catch (e) {
            alert('發佈失敗：' + (e.message || e));
        }
    }

    async function unpublishEvent() {
        if (!confirm('取消發佈？TopCut HK 上嘅 post 會立即移除。將來仲可以重新發佈。')) return;
        try {
            await window.cloud.updateEvent(eventId, { published: false });
            eventData.published = false;
            renderEditor();
            showToast('↩ 已取消發佈，TopCut post 將被移除');
        } catch (e) {
            alert('操作失敗：' + (e.message || e));
        }
    }

    /* ── Cancel / restore ─────────────────────────────────────────────────── */
    async function toggleCancel() {
        if (!eventData) return;
        if (eventData.phase === 'cancelled') {
            if (!confirm('還原活動？公開頁將恢復顯示。')) return;
            eventData.phase = 'signup';
            await window.cloud.updateEvent(eventId, { phase: 'signup' });
        } else {
            if (!confirm('確定取消活動？玩家公開頁將顯示「⛔ 活動已取消」橫幅。可隨時還原。')) return;
            eventData.phase = 'cancelled';
            await window.cloud.updateEvent(eventId, { phase: 'cancelled' });
        }
        renderEditor();
    }

    /* ── Image upload ─────────────────────────────────────────────────────── */
    async function handleImageUpload(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const errEl = document.getElementById('host-image-error');
        errEl.hidden = true;

        try {
            markSaving('上傳圖片中...');
            // Delete old image first if present
            if (eventData.imageStoragePath) {
                await window.cloud.deleteEventImage(eventData.imageStoragePath).catch(() => {});
            }
            const { url, storagePath } = await window.cloud.uploadEventImage(eventId, file);
            eventData.imageUrl = url;
            eventData.imageStoragePath = storagePath;
            await window.cloud.updateEvent(eventId, { imageUrl: url, imageStoragePath: storagePath });
            renderEditor();
            markSaving('✅ 圖片已上傳');
        } catch (err) {
            errEl.textContent = '上傳失敗：' + (err.message || err);
            errEl.hidden = false;
            markSaving('❌ 上傳失敗', true);
        }
        e.target.value = '';
    }

    async function handleImageRemove() {
        if (!eventData.imageStoragePath) return;
        if (!confirm('移除宣傳圖片？')) return;
        try {
            await window.cloud.deleteEventImage(eventData.imageStoragePath);
            await window.cloud.updateEvent(eventId, { imageUrl: null, imageStoragePath: null });
            eventData.imageUrl = null;
            eventData.imageStoragePath = null;
            renderEditor();
            markSaving('✅ 已移除');
        } catch (e) {
            markSaving('❌ 移除失敗', true);
        }
    }

    /* ── Promo text generator ─────────────────────────────────────────────── */
    function renderPromo() {
        const langInput = document.querySelector('input[name="promo-lang"]:checked');
        const lang = langInput ? langInput.value : 'zh';
        const ta = document.getElementById('host-promo-text');
        if (!ta) return;
        ta.value = generatePromo(lang);
    }

    function generatePromo(lang) {
        if (!eventData) return '';
        const meta = eventData.meta || {};
        const prizes = eventData.prizes || { tiers: [], lucky: '' };
        const publicUrl = window.cloud.buildEventPublicUrl(eventData.eventId);

        const PM_LABELS_ZH = { cash: '現金', payme: 'PayMe', fps: '轉數快', alipay: '支付寶', wechat: 'WeChat', visa: 'Visa', master: 'Master', octopus: '八達通' };
        const PM_LABELS_EN = { cash: 'Cash', payme: 'PayMe', fps: 'FPS', alipay: 'AliPay', wechat: 'WeChat', visa: 'Visa', master: 'Master', octopus: 'Octopus' };

        function buildZh() {
            const lines = [];
            const head = (meta.org ? meta.org + ' — ' : '') + (meta.name || '【活動名稱】');
            lines.push('🎴 ' + head);
            lines.push('');
            if (meta.date) lines.push('📅 ' + formatDate(meta.date, 'zh') + (meta.time ? ' ' + meta.time : ''));
            if (meta.address) lines.push('📍 ' + meta.address);
            if (meta.fee !== undefined && meta.fee !== '') {
                const pmList = (meta.paymentMethods || []).map(k => PM_LABELS_ZH[k] || k).join(' / ');
                lines.push('💰 入場費 HK$' + (+meta.fee || 0) + (pmList ? '（' + pmList + '）' : ''));
            }
            if (meta.desc) { lines.push(''); lines.push(meta.desc); }
            if (prizes.tiers && prizes.tiers.length) {
                lines.push('');
                lines.push('🏆 獎品（隨人數解鎖）：');
                prizes.tiers.forEach(t => {
                    const parts = [];
                    if (t.first) parts.push('頭獎 ' + t.first);
                    if (t.second) parts.push('第二 ' + t.second);
                    if (t.third) parts.push('第三 ' + t.third);
                    if (t.notes) parts.push(t.notes);
                    lines.push('• ' + (t.threshold ? t.threshold + ' 人' : '開賽') + '：' + (parts.join(' · ') || '—'));
                });
            }
            if (prizes.lucky) lines.push('🎁 ' + prizes.lucky);
            lines.push('');
            lines.push('👉 報名：' + publicUrl);
            if (meta.contact) lines.push('📧 查詢：' + meta.contact);
            return lines.join('\n');
        }

        function buildEn() {
            const lines = [];
            const head = (meta.org ? meta.org + ' — ' : '') + (meta.name || '[Event Name]');
            lines.push('🎴 ' + head);
            lines.push('');
            if (meta.date) lines.push('📅 ' + formatDate(meta.date, 'en') + (meta.time ? ' ' + meta.time : ''));
            if (meta.address) lines.push('📍 ' + meta.address);
            if (meta.fee !== undefined && meta.fee !== '') {
                const pmList = (meta.paymentMethods || []).map(k => PM_LABELS_EN[k] || k).join(' / ');
                lines.push('💰 Entry HK$' + (+meta.fee || 0) + (pmList ? ' (' + pmList + ')' : ''));
            }
            if (meta.desc) { lines.push(''); lines.push(meta.desc); }
            if (prizes.tiers && prizes.tiers.length) {
                lines.push('');
                lines.push('🏆 Prizes (unlocked by player count):');
                prizes.tiers.forEach(t => {
                    const parts = [];
                    if (t.first) parts.push('1st ' + t.first);
                    if (t.second) parts.push('2nd ' + t.second);
                    if (t.third) parts.push('3rd ' + t.third);
                    if (t.notes) parts.push(t.notes);
                    lines.push('• ' + (t.threshold ? t.threshold + '+ players' : 'Min entry') + ': ' + (parts.join(' · ') || '—'));
                });
            }
            if (prizes.lucky) lines.push('🎁 ' + prizes.lucky);
            lines.push('');
            lines.push('👉 Register: ' + publicUrl);
            if (meta.contact) lines.push('📧 Contact: ' + meta.contact);
            return lines.join('\n');
        }

        if (lang === 'en') return buildEn();
        if (lang === 'both') return buildZh() + '\n\n———\n\n' + buildEn();
        return buildZh();
    }

    function formatDate(iso, lang) {
        if (!iso) return '';
        try {
            const d = new Date(iso + 'T00:00:00');
            if (isNaN(d)) return iso;
            if (lang === 'en') {
                return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            }
            return d.toLocaleDateString('zh-HK', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
        } catch (_) { return iso; }
    }

    function renderPublicQR() {
        // Lazy-render — only when promo tab opens. The qrcode-generator
        // library isn't loaded here; we fall back to a Google Chart URL.
        const wrap = document.getElementById('host-public-qr');
        if (!wrap) return;
        const url = window.cloud.buildEventPublicUrl(eventData.eventId);
        const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(url);
        wrap.innerHTML = `<img src="${qrSrc}" alt="QR" width="220" height="220">`;
    }

    /* ── Signups subscribe ─────────────────────────────────────────────────── */
    function subscribeToEvent() {
        if (eventSubscribe) eventSubscribe();
        eventSubscribe = window.cloud.subscribeEvent(eventId, (data) => {
            // Only update from cloud if local state isn't actively being edited.
            // We update non-form fields (signupCount, phase changes from other
            // sources) but avoid clobbering in-progress meta edits.
            const wasFocused = document.activeElement && document.activeElement.matches('[data-meta], [data-prize-idx], [data-payment], #prize-lucky, #signup-open-toggle');
            eventData = data;
            if (!wasFocused) {
                renderEditor();
                renderPromo();
            }
        }, (err) => {
            console.error('[host] event subscribe', err);
        });
    }

    function subscribeToSignups() {
        if (signupSubscribe) signupSubscribe();
        try {
            signupSubscribe = window.cloud.subscribeSignups(eventId, (list) => {
                signupsList = list;
                renderSignups();
            }, (err) => {
                console.warn('[host] signups subscribe denied (different browser?):', err.message);
                document.getElementById('host-signups-list').innerHTML =
                    '<p class="info-text">⚠️ 無法讀取報名清單。可能你而家用緊另一部裝置／瀏覽器，cross-device 編輯會喺 P2 版本支援。</p>';
            });
        } catch (e) {
            console.warn(e);
        }
    }

    function setFilter(filter) {
        signupFilter = filter;
        document.querySelectorAll('.host-filter-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.filter === filter);
        });
        renderSignups();
    }

    function passesFilter(s, filter) {
        if (filter === 'all') return true;
        if (filter === 'checked') return !!s.checkedIn;
        if (filter === 'paid') return !!s.paid;
        if (filter === 'walkin') return s.source === 'walkin';
        if (filter === 'unpaid') return !s.paid;
        return true;
    }

    function renderSignups() {
        const list = document.getElementById('host-signups-list');
        const empty = document.getElementById('host-signups-empty');
        const countBadge = document.getElementById('host-signup-count-badge');
        const countTop = document.getElementById('host-signup-count');
        countBadge.textContent = signupsList.length;
        countTop.textContent = signupsList.length + ' 人';

        // Update filter chip counts
        const counts = {
            all: signupsList.length,
            checked: signupsList.filter(s => s.checkedIn).length,
            paid: signupsList.filter(s => s.paid).length,
            walkin: signupsList.filter(s => s.source === 'walkin').length,
            unpaid: signupsList.filter(s => !s.paid).length
        };
        document.querySelectorAll('[data-filter-num]').forEach(el => {
            el.textContent = counts[el.dataset.filterNum] || 0;
        });

        // Bulk action enable state
        const bulkCheckBtn = document.getElementById('btn-bulk-check');
        if (bulkCheckBtn) bulkCheckBtn.disabled = signupsList.length === 0 || signupsList.every(s => s.checkedIn);
        const bulkPaidBtn = document.getElementById('btn-bulk-paid-cash');
        if (bulkPaidBtn) bulkPaidBtn.disabled = signupsList.length === 0 || signupsList.every(s => s.paid);

        const startBtn = document.getElementById('btn-start-tournament');
        if (startBtn) {
            // Phase-aware visibility — hide entirely once the bracket is live
            // / ended, otherwise enable when there are at least 2 checked-in
            // players. Avoid showing both 「開始」 and 「預覽結果」 at the same
            // time (visual ambiguity that asked-for the redesign).
            const startRow = startBtn.closest('.host-start-tournament-row');
            const phase = eventData?.phase || 'signup';
            if (startRow) startRow.hidden = phase !== 'signup' && phase !== 'cancelled';
            startBtn.disabled = counts.checked < 2 || phase !== 'signup';
        }

        const filtered = signupsList.filter(s => passesFilter(s, signupFilter));

        if (signupsList.length === 0) {
            list.innerHTML = '';
            empty.hidden = false;
            return;
        }
        empty.hidden = true;

        if (filtered.length === 0) {
            list.innerHTML = '<p class="host-signups-empty">呢個 filter 之下無結果。</p>';
            return;
        }

        list.innerHTML = filtered.map((s) => {
            const idx = signupsList.indexOf(s) + 1;
            const sp1 = window.pokemonPicker && window.pokemonPicker.getById(s.species1);
            const sp2 = s.species2 ? (window.pokemonPicker && window.pokemonPicker.getById(s.species2)) : null;
            const trainerDisp = s.trainerId || '—';
            const isWalkin = s.source === 'walkin';
            const checkedClass = s.checkedIn ? ' is-checked' : '';
            const paidClass = s.paid ? ' is-paid' : '';
            const walkinClass = isWalkin ? ' is-walkin' : '';

            const checkChipText = s.checkedIn
                ? '<span class="row-chip-icon">✓</span><span class="row-chip-text">已簽到</span>'
                : '<span class="row-chip-icon">○</span><span class="row-chip-text">簽到</span>';

            const payChipText = s.paid
                ? `<span class="row-chip-icon">✓</span><span class="row-chip-text">${PAYMENT_LABELS[s.paidMethod] || '已付'}${s.paidAmount ? ' $' + s.paidAmount : ''}</span>`
                : '<span class="row-chip-icon">💵</span><span class="row-chip-text">未付</span>';

            return `
                <div class="host-signup-row${checkedClass}${paidClass}${walkinClass}" data-sid="${s.sid}">
                    <div class="row-head">
                        <span class="row-num">${idx}</span>
                        <div class="row-decks">
                            ${sp1 ? `<img class="row-sprite" src="${sp1.sprite}" alt="${sp1.en}" title="${sp1.zh} / ${sp1.en}">` : '<span class="row-sprite is-placeholder">?</span>'}
                            ${sp2 ? `<img class="row-sprite is-second" src="${sp2.sprite}" alt="${sp2.en}" title="${sp2.zh} / ${sp2.en}">` : ''}
                        </div>
                        <div class="row-name-block">
                            <div class="row-name-line">
                                <span class="row-name">${escapeHtml(s.name)}</span>
                                ${isWalkin ? '<span class="row-tag-walkin" title="場內 walk-in">🚶 walk-in</span>' : ''}
                            </div>
                            <div class="row-meta-line">
                                <span class="row-trainer" title="${trainerDisp}">${trainerDisp}</span>
                                ${s.phone ? `<span class="row-meta-sep">·</span><span class="row-phone" title="${escapeHtml(s.phone)}">📞 ${escapeHtml(s.phone)}</span>` : ''}
                            </div>
                        </div>
                        <button class="row-del" type="button" data-action="del" data-sid="${s.sid}" aria-label="刪除" title="刪除呢個報名">×</button>
                    </div>
                    <div class="row-actions">
                        <button class="row-chip row-chip-check ${s.checkedIn ? 'is-on' : ''}" type="button" data-action="check" data-sid="${s.sid}" aria-pressed="${s.checkedIn ? 'true' : 'false'}" title="${s.checkedIn ? '已簽到 — 撳取消' : '撳一下標記為已簽到'}">
                            ${checkChipText}
                        </button>
                        <button class="row-chip row-chip-pay ${s.paid ? 'is-on' : ''}" type="button" data-action="pay" data-sid="${s.sid}" title="撳開付款方式編輯">
                            ${payChipText}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Ensure Pokémon data is preloaded so sprites resolve on first render.
        if (window.pokemonPicker && window.pokemonPicker.ensureLoaded && !window._spritesPreloaded) {
            window._spritesPreloaded = true;
            window.pokemonPicker.ensureLoaded().then(() => renderSignups());
        }

        // Wire row actions
        list.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => onRowAction(btn.dataset.action, btn.dataset.sid));
        });
    }

    async function onRowAction(action, sid) {
        const s = signupsList.find(x => x.sid === sid);
        if (!s) return;
        try {
            if (action === 'check') {
                await window.cloud.updateSignup(eventId, sid, {
                    checkedIn: !s.checkedIn,
                    checkedInAt: !s.checkedIn ? firebase.firestore.FieldValue.serverTimestamp() : null
                });
            } else if (action === 'pay') {
                await openPaymentEditor(s);
            } else if (action === 'del') {
                if (!confirm('刪除「' + s.name + '」嘅報名？')) return;
                await window.cloud.deleteSignup(eventId, sid);
            }
        } catch (e) {
            alert('操作失敗：' + (e.message || e));
        }
    }

    /* ── Payment editor (lightweight inline modal) ───────────────────────── */
    function openPaymentEditor(signup) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay open';
            overlay.style.zIndex = '1080';
            const allowed = (eventData.meta?.paymentMethods && eventData.meta.paymentMethods.length)
                ? eventData.meta.paymentMethods : ['cash'];
            const fee = eventData.meta?.fee || 0;
            const isPaid = signup.paid;

            overlay.innerHTML = `
                <div class="modal-content payment-editor" onclick="event.stopPropagation()">
                    <button class="modal-close" type="button">&times;</button>
                    <h3>${isPaid ? '修改 / 取消付款記錄' : '記錄收款'}</h3>
                    <p class="info-text">${escapeHtml(signup.name)} ${signup.trainerId ? '· ' + signup.trainerId : ''}</p>

                    <div class="reg-meta-field">
                        <label>付款方式</label>
                        <div class="payment-method-grid">
                            ${allowed.map(m => `
                                <label class="payment-method-chip">
                                    <input type="radio" name="pay-method" value="${m}" ${(signup.paidMethod || allowed[0]) === m ? 'checked' : ''}>
                                    <span>${PAYMENT_LABELS[m] || m}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="reg-meta-field">
                        <label>金額 (HKD)</label>
                        <input type="number" id="pay-amount" min="0" step="1" value="${signup.paidAmount || fee || 0}" style="max-width:8rem">
                    </div>
                    <div class="event-signup-footer">
                        ${isPaid ? '<button class="btn btn-danger" id="btn-pay-clear" type="button">取消付款</button>' : ''}
                        <button class="btn btn-secondary" id="btn-pay-cancel" type="button">取消</button>
                        <button class="btn btn-primary" id="btn-pay-save" type="button">${isPaid ? '更新' : '記錄已付'}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            function close() {
                overlay.remove();
                resolve();
            }
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            overlay.querySelector('.modal-close').addEventListener('click', close);
            overlay.querySelector('#btn-pay-cancel').addEventListener('click', close);
            overlay.querySelector('#btn-pay-save').addEventListener('click', async () => {
                const method = overlay.querySelector('input[name="pay-method"]:checked').value;
                const amount = +overlay.querySelector('#pay-amount').value || 0;
                try {
                    await window.cloud.updateSignup(eventId, signup.sid, {
                        paid: true,
                        paidMethod: method,
                        paidAmount: amount,
                        paidAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    close();
                } catch (e) {
                    alert('儲存失敗：' + (e.message || e));
                }
            });
            const clearBtn = overlay.querySelector('#btn-pay-clear');
            if (clearBtn) clearBtn.addEventListener('click', async () => {
                try {
                    await window.cloud.updateSignup(eventId, signup.sid, {
                        paid: false, paidMethod: null, paidAmount: 0, paidAt: null
                    });
                    close();
                } catch (e) {
                    alert('儲存失敗：' + (e.message || e));
                }
            });
        });
    }

    /* ── Walk-in (organizer-side) ─────────────────────────────────────────── */
    function renderWalkinSlots() {
        renderWalkinSlot('btn-walkin-pick-1', walkinSpecies1, '主角');
        renderWalkinSlot('btn-walkin-pick-2', walkinSpecies2, '副 (可選)');
    }
    function renderWalkinSlot(btnId, sp, fallback) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (!sp) {
            btn.innerHTML = '<span class="deck-picker-empty">＋ ' + fallback + '</span>';
            return;
        }
        btn.innerHTML = `
            <span class="deck-picker-filled">
                <img src="${sp.sprite}" alt="${sp.en}" width="36" height="36">
                <span class="deck-picker-name">${sp.zh}<br><small>${sp.en}</small></span>
                <span class="deck-picker-x" data-walkin-clear="${btnId}">×</span>
            </span>
        `;
        const x = btn.querySelector('[data-walkin-clear]');
        if (x) x.addEventListener('click', (e) => {
            e.stopPropagation();
            if (btnId === 'btn-walkin-pick-1') walkinSpecies1 = null;
            if (btnId === 'btn-walkin-pick-2') walkinSpecies2 = null;
            renderWalkinSlots();
        });
    }

    async function submitWalkin() {
        const errEl = document.getElementById('walkin-error');
        errEl.hidden = true;
        const name = document.getElementById('walkin-name').value.trim();
        const trainerRaw = document.getElementById('walkin-trainer-id').value.trim();
        const phone = document.getElementById('walkin-phone').value.trim();

        if (!name) return showWalkinError('請輸入姓名');
        const trainerFull = 'hk' + trainerRaw;
        if (!PTCG_HK_TRAINER_ID_REGEX.test(trainerFull)) return showWalkinError('Trainer ID 必須係 8 位數字');
        if (!walkinSpecies1) return showWalkinError('請揀返 deck 主角');

        const btn = document.getElementById('btn-add-walkin');
        btn.disabled = true;
        btn.textContent = '加入中...';

        try {
            await window.cloud.submitSignup(eventId, {
                name,
                trainerId: trainerFull,
                phone: phone || '',
                species1: walkinSpecies1.id,
                species2: walkinSpecies2 ? walkinSpecies2.id : '',
                source: 'walkin'
            });
            // Auto-mark checked-in since organizer is adding live
            // (we don't have the new sid yet — server-side timestamp needs round-trip;
            // simpler: rely on subscribe → user can tap simply ✓ anyway. Skipping
            // auto-check to keep flow predictable.)
            document.getElementById('walkin-name').value = '';
            document.getElementById('walkin-trainer-id').value = '';
            document.getElementById('walkin-phone').value = '';
            walkinSpecies1 = null;
            walkinSpecies2 = null;
            renderWalkinSlots();
            showToast('✅ 已加入清單');
        } catch (e) {
            showWalkinError('加入失敗：' + (e.message || e));
        } finally {
            btn.disabled = false;
            btn.textContent = '+ 加入清單';
        }

        function showWalkinError(msg) { errEl.textContent = msg; errEl.hidden = false; }
    }

    /* ── Bulk actions ─────────────────────────────────────────────────────── */
    async function bulkCheckIn() {
        const targets = signupsList.filter(s => !s.checkedIn);
        if (targets.length === 0) return;
        if (!confirm('將 ' + targets.length + ' 個未簽到玩家全部標記為已簽到？')) return;
        try {
            await Promise.all(targets.map(s => window.cloud.updateSignup(eventId, s.sid, {
                checkedIn: true,
                checkedInAt: firebase.firestore.FieldValue.serverTimestamp()
            })));
            showToast('✅ 全部簽到');
        } catch (e) {
            alert('部分失敗：' + (e.message || e));
        }
    }

    async function bulkMarkPaidCash() {
        const fee = eventData.meta?.fee || 0;
        const targets = signupsList.filter(s => !s.paid);
        if (targets.length === 0) return;
        if (!confirm('將 ' + targets.length + ' 個未付款玩家標記為現金已付 (HK$' + fee + ')？')) return;
        try {
            await Promise.all(targets.map(s => window.cloud.updateSignup(eventId, s.sid, {
                paid: true,
                paidMethod: 'cash',
                paidAmount: fee,
                paidAt: firebase.firestore.FieldValue.serverTimestamp()
            })));
            showToast('✅ 已標記');
        } catch (e) {
            alert('部分失敗：' + (e.message || e));
        }
    }

    /* ── Result preview + publish to TopCut ──────────────────────────────── */
    function openResultPreview() {
        const snap = eventData.tournamentResultSnapshot;
        if (!snap) {
            alert('未有比賽結果。請完成比賽後再試。');
            return;
        }
        renderResultPreview(snap);
        document.getElementById('host-result-overlay').classList.add('open');
        document.getElementById('host-result-status').hidden = true;
    }

    function closeResultPreview() {
        document.getElementById('host-result-overlay').classList.remove('open');
    }

    function renderResultPreview(snap) {
        const host = document.getElementById('host-result-preview');
        const standings = snap.standings || [];
        const dist = snap.deckDistribution || [];

        // Build pie chart via inline conic-gradient. Top 5 + others.
        const palette = ['#FF7324', '#22D3EE', '#FFD700', '#FF52D9', '#6E32A8', '#94A3B8'];
        let acc = 0;
        const slices = dist.slice(0, 6).map((d, i) => {
            const start = acc; acc += d.percent;
            return { ...d, start, end: acc, color: palette[i % palette.length] };
        });
        const conicStops = slices.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ') || '#444 0% 100%';

        const speciesName = (id) => {
            if (!id) return '';
            const sp = window.pokemonPicker?.getById(id);
            return sp ? (sp.zh || sp.en) : id;
        };
        const speciesSprite = (id) => {
            if (!id) return '';
            const sp = window.pokemonPicker?.getById(id);
            return sp ? sp.sprite : '';
        };

        host.innerHTML = `
            <div class="host-result-card">
                <h4>${escapeHtml(snap.eventName || '(未命名)')}</h4>
                <p class="info-text">${snap.date || ''} · ${snap.totalPlayers} 人 · ${snap.totalRounds} 輪 · ${snap.format === 'knockout' ? '淘汰制' : '瑞士制'}</p>

                ${slices.length > 0 ? `
                <div class="host-result-pie-block">
                    <div class="host-result-pie" style="background: conic-gradient(${conicStops})"></div>
                    <ul class="host-result-pie-legend">
                        ${slices.map(s => `
                            <li>
                                <span class="host-result-swatch" style="background:${s.color}"></span>
                                ${speciesSprite(s.species1) ? `<img src="${speciesSprite(s.species1)}" width="20" height="20" alt="">` : ''}
                                ${speciesSprite(s.species2) ? `<img src="${speciesSprite(s.species2)}" width="20" height="20" alt="">` : ''}
                                <span>${speciesName(s.species1) || '其他'}${s.species2 ? ' / ' + speciesName(s.species2) : ''}</span>
                                <span class="host-result-pct">${s.percent}% (${s.count})</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>` : ''}

                <p class="info-text"><strong>排名 — 可改顯示名（不影響 trainer ID 戰績綁定）：</strong></p>
                <ol class="host-result-standings">
                    ${standings.slice(0, 16).map(p => {
                        const sp1 = speciesSprite(p.deckSpecies1);
                        const sp2 = speciesSprite(p.deckSpecies2);
                        const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`;
                        return `
                            <li class="host-result-row">
                                <span class="host-result-rank">${medal}</span>
                                ${sp1 ? `<img src="${sp1}" width="22" height="22" alt="">` : ''}
                                ${sp2 ? `<img src="${sp2}" width="22" height="22" alt="" style="margin-left:-6px">` : ''}
                                <input type="text" class="host-result-rename" data-original="${escapeHtml(p.name)}" value="${escapeHtml(p.name)}" maxlength="60">
                                <span class="host-result-record">${p.record}</span>
                            </li>
                        `;
                    }).join('')}
                </ol>
            </div>
        `;
    }

    async function confirmPublishResult() {
        const status = document.getElementById('host-result-status');
        status.hidden = true;
        const btn = document.getElementById('btn-confirm-publish');
        btn.disabled = true;
        btn.textContent = '發送中...';

        // Collect renames
        const rename = {};
        document.querySelectorAll('.host-result-rename').forEach(inp => {
            const orig = inp.dataset.original;
            const cur = inp.value.trim();
            if (orig && cur && orig !== cur) rename[orig] = cur;
        });

        try {
            const res = await window.cloud.publishEventResult(eventId, { rename });
            status.hidden = false;
            status.style.background = 'rgba(46,196,182,0.12)';
            status.style.borderColor = 'rgba(46,196,182,0.4)';
            status.style.color = '#9ee8df';
            status.textContent = `✅ 已發送到 TopCut（postId ${res.postId}，已寫入 ${res.recordsWritten || 0} 筆 trainer 戰績）`;
            setTimeout(closeResultPreview, 2000);
        } catch (e) {
            status.hidden = false;
            status.style.background = '';
            status.style.borderColor = '';
            status.style.color = '';
            status.textContent = '❌ 發送失敗：' + (e.message || e);
        } finally {
            btn.disabled = false;
            btn.textContent = '📣 確定發送到 TopCut';
        }
    }

    /* ── Start tournament — hand checked-in players over to / app.js ──────── */
    function startTournament() {
        const checked = signupsList.filter(s => s.checkedIn);
        if (checked.length < 2) {
            alert('需要至少 2 名已簽到玩家先可以開賽。');
            return;
        }
        if (!confirm('用呢 ' + checked.length + ' 名已簽到玩家開始比賽？\n會跳轉到比賽頁，仲可以喺登記頁加減玩家。')) return;

        // Hand off via localStorage payload — / app.js reads ptcg_event_handoff
        // on next load and prefills state.players + meta.
        const payload = {
            eventId: eventData.eventId,
            tournamentName: (eventData.meta?.org ? eventData.meta.org + ' — ' : '') + (eventData.meta?.name || ''),
            tournamentDate: eventData.meta?.date || '',
            players: checked.map(s => ({
                name: s.name,
                trainerId: s.trainerId,
                deckSpecies1: s.species1,
                deckSpecies2: s.species2 || ''
            })),
            createdAt: Date.now()
        };
        try {
            localStorage.setItem('ptcg_event_handoff', JSON.stringify(payload));
        } catch (e) {
            alert('儲存 handoff 失敗：' + (e.message || e));
            return;
        }
        // Mark event as live (best-effort; safe to ignore failure)
        window.cloud.updateEvent(eventId, { phase: 'live' }).catch(() => {});
        window.location.href = '/?event=' + encodeURIComponent(eventData.eventId);
    }

    /* ── URL modal ────────────────────────────────────────────────────────── */
    function openUrlModal() {
        document.getElementById('host-url-overlay').classList.add('open');
    }
    function closeUrlModal() {
        document.getElementById('host-url-overlay').classList.remove('open');
    }

    /* ── Helpers ──────────────────────────────────────────────────────────── */
    function copyToClipboard(text, toast) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => showToast(toast || '已複製'));
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); showToast(toast || '已複製'); } catch (_) {}
            document.body.removeChild(ta);
        }
    }
    function copyText(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;
        copyToClipboard(el.value, '已複製');
    }
    function showToast(msg) {
        let t = document.getElementById('host-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'host-toast';
            t.className = 'host-toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 1800);
    }
    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    return { init, copyText, closeUrlModal, closeResultPreview };
})();

document.addEventListener('DOMContentLoaded', () => {
    if (window.hostApp) window.hostApp.init();
});
