/* ============================================================================
   event.js — Public participant signup page.
   ============================================================================ */

window.eventApp = (() => {
    let eventId = null;
    let walkin = false;
    let eventData = null;
    let species1 = null;
    let species2 = null;
    const PTCG_HK_TRAINER_ID_REGEX = /^hk\d{8}$/;

    async function init() {
        const params = new URLSearchParams(window.location.search);
        eventId = (params.get('e') || '').toUpperCase().trim() || null;
        walkin = params.get('w') === '1';

        if (walkin) document.getElementById('event-mode-tag').hidden = false;

        if (!eventId) return showState('event-not-found');

        if (!window.cloud || !window.cloud.isConfigured || !window.cloud.isConfigured()) {
            return showState('event-not-found');
        }

        try {
            await window.cloud.init();
            eventData = await window.cloud.fetchEvent(eventId);
        } catch (e) {
            return showState('event-not-found');
        }

        if (eventData.phase === 'cancelled') {
            document.getElementById('event-cancelled-name').textContent = eventData.meta?.name || '';
            return showState('event-cancelled');
        }

        renderEvent();
        showState('event-content');
        wireSignup();
    }

    function showState(id) {
        ['event-loading', 'event-not-found', 'event-cancelled', 'event-content', 'event-success']
            .forEach(s => { const el = document.getElementById(s); if (el) el.hidden = s !== id; });
    }

    /* ── Render event card ────────────────────────────────────────────────── */
    function renderEvent() {
        const m = eventData.meta || {};
        const p = eventData.prizes || { tiers: [], lucky: '' };

        document.title = (m.name || '活動報名') + ' — GameSet HK';
        document.getElementById('event-org').textContent = m.org || '';
        document.getElementById('event-name').textContent = m.name || '【未命名活動】';

        const dateStr = m.date ? formatDate(m.date) : '—';
        document.getElementById('event-date').textContent = dateStr;
        if (m.time) {
            document.getElementById('event-time').textContent = m.time;
            document.getElementById('event-time-item').hidden = false;
        }
        document.getElementById('event-address').textContent = m.address || '—';
        const feeText = (m.fee !== undefined && m.fee !== null && m.fee !== '')
            ? 'HK$' + (+m.fee || 0)
            : '免費';
        const pmList = (m.paymentMethods || []).map(paymentLabel).filter(Boolean);
        document.getElementById('event-fee').textContent = feeText + (pmList.length ? '（' + pmList.join(' / ') + '）' : '');

        if (m.desc) {
            document.getElementById('event-desc').textContent = m.desc;
            document.getElementById('event-desc-block').hidden = false;
        }

        if (eventData.imageUrl) {
            document.getElementById('event-image').src = eventData.imageUrl;
            document.getElementById('event-image').alt = m.name || '';
            document.getElementById('event-image-wrap').hidden = false;
        }

        if (p.tiers && p.tiers.length) {
            document.getElementById('event-prizes-block').hidden = false;
            const list = document.getElementById('event-prizes-list');
            list.innerHTML = p.tiers.map(t => {
                const parts = [];
                if (t.first) parts.push('<strong>頭獎</strong> ' + escapeHtml(t.first));
                if (t.second) parts.push('<strong>第二</strong> ' + escapeHtml(t.second));
                if (t.third) parts.push('<strong>第三</strong> ' + escapeHtml(t.third));
                if (t.notes) parts.push(escapeHtml(t.notes));
                const head = t.threshold ? (t.threshold + ' 人解鎖') : '開賽';
                return `<li><span class="prize-threshold">${head}</span> ${parts.join(' · ')}</li>`;
            }).join('');
            if (p.lucky) {
                document.getElementById('event-lucky').textContent = '🎁 ' + p.lucky;
                document.getElementById('event-lucky').hidden = false;
            }
        }

        if (m.contact) {
            document.getElementById('event-contact').textContent = m.contact;
            document.getElementById('event-contact-block').hidden = false;
        }

        // Signup gating: closed unless we're in walk-in mode
        const signupOpen = eventData.signupOpen !== false;
        const btn = document.getElementById('btn-open-signup');
        const closedMsg = document.getElementById('event-signup-closed');
        if (!signupOpen && !walkin) {
            btn.hidden = true;
            closedMsg.hidden = false;
        } else if (walkin) {
            btn.textContent = '🎟 場內 walk-in 報名';
        }
    }

    function paymentLabel(k) {
        const map = { cash: '現金', payme: 'PayMe', fps: '轉數快', alipay: '支付寶', wechat: 'WeChat', visa: 'Visa', master: 'Master', octopus: '八達通' };
        return map[k] || k;
    }

    /* ── Signup form ──────────────────────────────────────────────────────── */
    function wireSignup() {
        document.getElementById('btn-open-signup').addEventListener('click', openSignup);
        document.getElementById('event-signup-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'event-signup-overlay') closeSignup();
        });

        // Trainer ID — digits only, max 8, auto-strip leading hk
        const tInput = document.getElementById('signup-trainer-id');
        tInput.addEventListener('input', (e) => {
            let v = e.target.value;
            // Auto-strip if user pastes 'hk12345678' or 'HK12345678'
            v = v.replace(/^hk/i, '');
            v = v.replace(/\D/g, '').slice(0, 8);
            e.target.value = v;
            validateTrainerIdInline();
        });
        tInput.addEventListener('blur', validateTrainerIdInline);

        // Pokémon picker triggers
        document.getElementById('btn-pick-species1').addEventListener('click', () => {
            const exclude = species2 ? [species2.id] : [];
            window.pokemonPicker.open({
                title: '揀 Deck 主角',
                lang: getLang(),
                excludeIds: exclude,
                onPick: (sp) => { species1 = sp; renderDeckSlots(); }
            });
        });
        document.getElementById('btn-pick-species2').addEventListener('click', () => {
            const exclude = species1 ? [species1.id] : [];
            window.pokemonPicker.open({
                title: '揀 Deck 副角',
                lang: getLang(),
                excludeIds: exclude,
                // Surface partner-aware suggestions when picking slot 2.
                pairWith: species1 ? species1.id : undefined,
                onPick: (sp) => { species2 = sp; renderDeckSlots(); }
            });
        });

        document.getElementById('btn-submit-signup').addEventListener('click', submit);
    }

    function getLang() {
        return (document.documentElement.lang || '').startsWith('zh') ? 'zh' : 'zh';
    }

    function openSignup() {
        document.getElementById('event-signup-overlay').classList.add('open');
        document.body.style.overflow = 'hidden';
        setTimeout(() => document.getElementById('signup-name').focus(), 50);
    }

    function closeSignup() {
        document.getElementById('event-signup-overlay').classList.remove('open');
        document.body.style.overflow = '';
    }

    function validateTrainerIdInline() {
        const v = document.getElementById('signup-trainer-id').value;
        const errEl = document.getElementById('signup-trainer-id-error');
        const wrap = document.querySelector('.trainer-id-input');
        if (!v) {
            errEl.hidden = true;
            wrap.classList.remove('invalid');
            return false;
        }
        const full = 'hk' + v;
        const ok = PTCG_HK_TRAINER_ID_REGEX.test(full);
        if (!ok) {
            errEl.textContent = '需要 8 位數字（hk' + v + ' 不符合格式）';
            errEl.hidden = false;
            wrap.classList.add('invalid');
            return false;
        }
        errEl.hidden = true;
        wrap.classList.remove('invalid');
        return true;
    }

    function renderDeckSlots() {
        renderSlot('btn-pick-species1', species1, '主角');
        renderSlot('btn-pick-species2', species2, '副 (可選)');
    }
    function renderSlot(btnId, sp, fallback) {
        const btn = document.getElementById(btnId);
        if (!sp) {
            btn.innerHTML = '<span class="deck-picker-empty">＋ ' + fallback + '</span>';
            return;
        }
        btn.innerHTML = `
            <span class="deck-picker-filled">
                <img src="${sp.sprite}" alt="${sp.en}" width="40" height="40">
                <span class="deck-picker-name">${sp.zh}<br><small>${sp.en}</small></span>
                <span class="deck-picker-x" data-clear="${btnId}">×</span>
            </span>
        `;
        const x = btn.querySelector('[data-clear]');
        if (x) x.addEventListener('click', (e) => {
            e.stopPropagation();
            if (btnId === 'btn-pick-species1') species1 = null;
            if (btnId === 'btn-pick-species2') species2 = null;
            renderDeckSlots();
        });
    }

    async function submit(e) {
        if (e && e.preventDefault) e.preventDefault();
        const name = document.getElementById('signup-name').value.trim();
        const trainerRaw = document.getElementById('signup-trainer-id').value.trim();
        const phone = document.getElementById('signup-phone').value.trim();
        const errEl = document.getElementById('signup-submit-error');
        errEl.hidden = true;

        if (!name) return showError('請輸入姓名');
        if (!validateTrainerIdInline()) return showError('Trainer ID 格式不正確');
        if (!phone) return showError('請輸入聯絡電話');
        if (!species1) return showError('請揀返 deck 主角 Pokémon');

        if (eventData.phase === 'cancelled') return showError('活動已取消');
        if (eventData.signupOpen === false && !walkin) return showError('網上報名已關閉');

        const btn = document.getElementById('btn-submit-signup');
        btn.disabled = true;
        btn.textContent = '提交中...';

        const trainerId = 'hk' + trainerRaw;

        try {
            console.log('[signup] start', { eventId, name, trainerId });
            // Defensive ready check — surface a clear error if cloud isn't
            // initialised yet (e.g. anonymous auth still pending after a slow
            // network bootstrap). Otherwise the await below could hang.
            if (!window.cloud || !window.cloud.isReady()) {
                console.warn('[signup] cloud not ready, retrying init');
                if (window.cloud && window.cloud.init) await window.cloud.init();
                if (!window.cloud.isReady()) throw new Error('連線未就緒，請刷新再試');
            }

            const submitPromise = window.cloud.submitSignup(eventId, {
                name,
                trainerId,
                phone,
                species1: species1.id,
                species2: species2 ? species2.id : '',
                source: walkin ? 'walkin' : 'online'
            });

            // 20-second hard timeout so a stuck Firestore write surfaces
            // visibly instead of silently spinning.
            const timeout = new Promise((_, rej) => setTimeout(
                () => rej(new Error('連線逾時（20s）')), 20000
            ));

            const sid = await Promise.race([submitPromise, timeout]);
            console.log('[signup] success', sid);
            renderSuccess({ sid, name, trainerId, phone, species1, species2 });
            // Close the signup modal first — without this the overlay stays
            // mounted on top of the success state, hiding it until the user
            // taps Cancel. (The modal lives outside the .event-state stack
            // so showState() alone doesn't dismiss it.)
            closeSignup();
            showState('event-success');
        } catch (err) {
            console.error('[signup] failed', err);
            const code = err?.code || '';
            let msg;
            if (code === 'already-exists' || /already_signed_up/i.test(err?.message || '')) {
                msg = `Trainer ID ${trainerId} 已經報咗呢個活動。如要更改資料，請聯絡舉辦方。`;
            } else if (code === 'permission-denied') {
                msg = '無法提交報名 — 活動可能已關閉或者已取消。';
            } else {
                msg = '提交失敗：' + (err?.message || code || '未知錯誤');
            }
            showError(msg);
            btn.disabled = false;
            btn.textContent = '提交報名';
        }

        function showError(msg) {
            errEl.textContent = msg;
            errEl.hidden = false;
        }
    }

    function renderSuccess(data) {
        document.getElementById('event-success-walkin').hidden = !walkin;
        const summary = document.getElementById('event-success-summary');
        summary.innerHTML = `
            <div class="event-success-row"><span>姓名</span><strong>${escapeHtml(data.name)}</strong></div>
            <div class="event-success-row"><span>Trainer ID</span><strong>${data.trainerId}</strong></div>
            <div class="event-success-row"><span>電話</span><strong>${escapeHtml(data.phone)}</strong></div>
            <div class="event-success-row event-success-row-deck">
                <span>用 Deck</span>
                <span class="event-success-decks">
                    ${data.species1 ? `<img src="${data.species1.sprite}" alt="" width="32" height="32"> <span>${data.species1.zh}</span>` : ''}
                    ${data.species2 ? `<img src="${data.species2.sprite}" alt="" width="32" height="32"> <span>${data.species2.zh}</span>` : ''}
                </span>
            </div>
        `;
    }

    function formatDate(iso) {
        try {
            const d = new Date(iso + 'T00:00:00');
            if (isNaN(d)) return iso;
            return d.toLocaleDateString('zh-HK', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
        } catch (_) { return iso; }
    }

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    return { init, closeSignup };
})();

document.addEventListener('DOMContentLoaded', () => {
    if (window.eventApp) window.eventApp.init();
});
