/* ============================================================================
   pokemon-picker.js — vanilla-JS port of TopCut HK's SpeciesPicker.
   Lazy-loads data/pokemon-species.json on first open, then renders a
   bottom-sheet picker with a search bar + sprite grid. Returns the chosen
   {id, dexId, en, zh, sprite} via the onPick callback.

   Usage:
     pokemonPicker.open({
       title: 'Deck 主角',
       lang: 'zh',                  // 'zh' | 'en'
       excludeIds: ['charizard'],   // optional: hide already-picked species
       onPick: (species) => { ... }
     });

   Designed to mirror TopCut's UX so a player who's seen one will recognise
   the other. Sprite source = PokeAPI master sprites repo.
   ============================================================================ */

window.pokemonPicker = (() => {
    let cachedList = null;
    let inflight = null;
    let overlayEl = null;
    let inputEl = null;
    let resultsEl = null;
    let popularEl = null;
    let titleEl = null;
    let currentOptions = null;
    let bodyOverflowSaved = '';
    let mountListenersBound = false;

    // ── TopCut popularity integration ───────────────────────────────────────
    // Reads the public `pokemonPopularity` + `deckPopularity` collections on
    // TopCut's Firebase project (tournamet-platform) so the GameSet picker
    // surfaces the same "popular" / "popular partners" suggestions as
    // TopCut's SpeciesPicker. Lazy-init: app + reads happen first time the
    // picker opens. Falls back to STAPLE_IDS on any failure.
    const TOPCUT_FIREBASE_CONFIG = {
        apiKey: 'AIzaSyCARX8H9UztkWtTPgLjNFQAD-Lox00OykA',
        authDomain: 'tournamet-platform.firebaseapp.com',
        projectId: 'tournamet-platform',
        appId: '1:2105606157:web:63c64d77b32e7d3272d544',
    };
    const POPULAR_TOP_N = 100;
    let topcutApp = null;
    let popularCache = null;          // PopularSpecies[] global, sorted desc
    let popularInflight = null;
    const partnerCache = new Map();   // speciesId → PopularSpecies[]

    function ensureTopcutApp() {
        if (topcutApp) return topcutApp;
        if (typeof firebase === 'undefined') return null;
        try {
            // Firebase compat: named secondary app — independent from the
            // gameset (default) app already initialised by firebase-config.js.
            const existing = firebase.apps.find(a => a.name === 'topcut');
            topcutApp = existing || firebase.initializeApp(TOPCUT_FIREBASE_CONFIG, 'topcut');
            return topcutApp;
        } catch (e) {
            console.warn('[picker] topcut app init failed', e);
            return null;
        }
    }

    function fetchPopularSpecies() {
        if (popularCache) return Promise.resolve(popularCache);
        if (popularInflight) return popularInflight;
        const app = ensureTopcutApp();
        if (!app) return Promise.resolve([]);
        popularInflight = app.firestore()
            .collection('pokemonPopularity')
            .where('count', '>=', 1)
            .orderBy('count', 'desc')
            .limit(POPULAR_TOP_N)
            .get()
            .then(snap => {
                const list = snap.docs.map(d => {
                    const x = d.data();
                    return { speciesId: x.speciesId || d.id, count: x.count || 0 };
                });
                popularCache = list;
                popularInflight = null;
                return list;
            })
            .catch(e => {
                console.warn('[picker] fetchPopularSpecies failed', e);
                popularInflight = null;
                return [];
            });
        return popularInflight;
    }

    function fetchPopularPartnersFor(speciesId) {
        if (!speciesId) return Promise.resolve([]);
        if (partnerCache.has(speciesId)) return Promise.resolve(partnerCache.get(speciesId));
        const app = ensureTopcutApp();
        if (!app) return Promise.resolve([]);
        return app.firestore()
            .collection('deckPopularity')
            .where('count', '>=', 1)
            .orderBy('count', 'desc')
            .limit(200)
            .get()
            .then(snap => {
                const partnerCounts = new Map();
                snap.docs.forEach(d => {
                    const x = d.data();
                    let partner = null;
                    if (x.species1 === speciesId && x.species2) partner = x.species2;
                    else if (x.species2 === speciesId && x.species1) partner = x.species1;
                    if (!partner || partner === speciesId) return;
                    partnerCounts.set(partner, (partnerCounts.get(partner) || 0) + (x.count || 0));
                });
                const list = Array.from(partnerCounts.entries())
                    .map(([speciesId, count]) => ({ speciesId, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, POPULAR_TOP_N);
                partnerCache.set(speciesId, list);
                return list;
            })
            .catch(e => {
                console.warn('[picker] fetchPopularPartnersFor failed', e);
                return [];
            });
    }

    /* Merge dynamic popularity data with the curated staple meta list so the
       grid never feels empty when popularity counters are sparse. Mirrors
       the same merge logic on TopCut's SpeciesPicker. */
    function mergeWithStaples(dynamicData, cap) {
        const seen = new Set();
        const merged = [];
        for (const d of dynamicData) {
            if (seen.has(d.speciesId)) continue;
            seen.add(d.speciesId);
            merged.push(d.speciesId);
            if (merged.length >= cap) return merged;
        }
        for (const id of STAPLE_IDS) {
            if (seen.has(id)) continue;
            seen.add(id);
            merged.push(id);
            if (merged.length >= cap) return merged;
        }
        return merged;
    }

    // Curated baseline grid — copied from TopCut's STAPLE_META_SPECIES_IDS
    // (~/topcut-hk/src/lib/tournamentLog/metaSpecies.ts). Keeps the picker
    // from looking empty before any popularity data exists.
    const STAPLE_IDS = [
        'archaludon', 'hydrapple', 'ogerpon', 'terapagos',
        'dragapult', 'gholdengo', 'raging-bolt', 'charizard',
        'lugia', 'gardevoir', 'miraidon', 'koraidon',
        'dialga', 'palkia', 'kyurem', 'regidrago',
        'baxcalibur', 'chien-pao', 'pidgeot', 'snorlax',
        'iron-hands', 'iron-thorns', 'iron-valiant', 'palafin',
        'dipplin', 'ceruledge',
        'diancie', 'metagross', 'kangaskhan', 'lopunny',
        'lucario', 'ampharos', 'blastoise', 'venusaur',
        'absol', 'hawlucha', 'gyarados',
        'slaking', 'dragonite', 'garchomp', 'vileplume',
        'beedrill', 'charjabug', 'tyrantrum', 'froslass',
        'flareon', 'starmie', 'toxtricity', 'cinccino',
        'zamazenta', 'lycanroc', 'luxray',
        'pikachu', 'mewtwo', 'mew', 'eevee'
    ];

    const SEARCH_LIMIT = 60;

    function loadList() {
        if (cachedList) return Promise.resolve(cachedList);
        if (inflight) return inflight;
        inflight = fetch('/data/pokemon-species.json')
            .then(r => {
                if (!r.ok) throw new Error('pokemon-species.json ' + r.status);
                return r.json();
            })
            .then(data => {
                cachedList = data;
                inflight = null;
                return data;
            })
            .catch(e => { inflight = null; throw e; });
        return inflight;
    }

    function searchList(q) {
        const needle = q.trim().toLowerCase();
        if (!needle || !cachedList) return [];
        const matches = [];
        for (const s of cachedList) {
            if (s.id.includes(needle) || s.en.toLowerCase().includes(needle) || s.zh.includes(needle)) {
                matches.push(s);
                if (matches.length >= SEARCH_LIMIT) break;
            }
        }
        return matches;
    }

    function findById(id) {
        if (!cachedList) return null;
        return cachedList.find(s => s.id === id) || null;
    }

    function buildOverlay() {
        if (overlayEl) return overlayEl;
        const el = document.createElement('div');
        el.className = 'poke-picker-overlay';
        el.setAttribute('hidden', '');
        el.innerHTML = `
            <div class="poke-picker-sheet" role="dialog" aria-modal="true">
                <div class="poke-picker-head">
                    <h3 class="poke-picker-title"></h3>
                    <button type="button" class="poke-picker-close" aria-label="Close">&times;</button>
                </div>
                <div class="poke-picker-search-row">
                    <span class="poke-picker-search-icon" aria-hidden="true">🔍</span>
                    <input type="text" class="poke-picker-input"
                           placeholder=""
                           autocomplete="off" autocorrect="off"
                           autocapitalize="off" spellcheck="false">
                    <button type="button" class="poke-picker-clear" aria-label="Clear" hidden>&times;</button>
                </div>
                <div class="poke-picker-body">
                    <div class="poke-picker-section poke-picker-results" hidden>
                        <p class="poke-picker-section-label"></p>
                        <div class="poke-picker-grid"></div>
                        <p class="poke-picker-empty" hidden></p>
                    </div>
                    <div class="poke-picker-section poke-picker-popular">
                        <p class="poke-picker-section-label"></p>
                        <div class="poke-picker-grid"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(el);

        overlayEl = el;
        inputEl = el.querySelector('.poke-picker-input');
        resultsEl = el.querySelector('.poke-picker-results');
        popularEl = el.querySelector('.poke-picker-popular');
        titleEl = el.querySelector('.poke-picker-title');

        // Backdrop click → close
        el.addEventListener('mousedown', (e) => {
            if (e.target === el) close();
        });
        // Close button
        el.querySelector('.poke-picker-close').addEventListener('click', close);
        // Clear button
        el.querySelector('.poke-picker-clear').addEventListener('click', () => {
            inputEl.value = '';
            inputEl.focus();
            renderForQuery('');
        });
        // Live search
        inputEl.addEventListener('input', (e) => {
            renderForQuery(e.target.value);
        });

        return el;
    }

    function bindGlobalListeners() {
        if (mountListenersBound) return;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlayEl && !overlayEl.hasAttribute('hidden')) {
                close();
            }
        });
        mountListenersBound = true;
    }

    function renderGrid(targetEl, items) {
        const grid = targetEl.querySelector('.poke-picker-grid');
        const exclude = new Set(currentOptions?.excludeIds || []);
        const lang = currentOptions?.lang === 'en' ? 'en' : 'zh';

        if (!items || items.length === 0) {
            grid.innerHTML = '';
            return;
        }
        const html = items
            .filter(s => !exclude.has(s.id))
            .map(s => `
                <button type="button" class="poke-picker-tile" data-id="${s.id}">
                    <span class="poke-picker-sprite-wrap">
                        <img class="poke-picker-sprite" src="${s.sprite}" alt="${s.en}" width="48" height="48" loading="lazy">
                    </span>
                    <span class="poke-picker-tile-name">${lang === 'zh' ? s.zh : s.en}</span>
                </button>
            `).join('');
        grid.innerHTML = html;

        grid.querySelectorAll('.poke-picker-tile').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const sp = findById(id);
                if (sp && currentOptions?.onPick) currentOptions.onPick(sp);
                close();
            });
        });
    }

    function renderForQuery(q) {
        const lang = currentOptions?.lang === 'en' ? 'en' : 'zh';
        const labelResults = lang === 'zh' ? '搜尋結果' : 'Results';
        const pairWith = currentOptions?.pairWith;
        const labelPopular = pairWith
            ? (lang === 'zh' ? '熱門搭配' : 'Popular partners')
            : (lang === 'zh' ? '熱門 Pokémon' : 'Popular');
        const emptyText = lang === 'zh' ? '冇結果，試吓另一個寫法' : 'No matches — try another spelling';

        overlayEl.querySelector('.poke-picker-clear').hidden = !q;

        if (q.trim()) {
            const matches = searchList(q);
            resultsEl.hidden = false;
            popularEl.hidden = true;
            resultsEl.querySelector('.poke-picker-section-label').textContent = labelResults;
            const empty = resultsEl.querySelector('.poke-picker-empty');
            if (matches.length === 0) {
                resultsEl.querySelector('.poke-picker-grid').innerHTML = '';
                empty.textContent = emptyText;
                empty.hidden = false;
            } else {
                empty.hidden = true;
                renderGrid(resultsEl, matches);
            }
            return;
        }

        // No query — render the popular grid. Show staple IDs IMMEDIATELY so
        // the user has something to tap on while we fetch real popularity in
        // the background; then merge & re-render once the data lands.
        resultsEl.hidden = true;
        popularEl.hidden = false;
        popularEl.querySelector('.poke-picker-section-label').textContent = labelPopular;

        const stapleResolved = STAPLE_IDS.map(findById).filter(Boolean);
        renderGrid(popularEl, stapleResolved);

        // Fetch popular / partner data — fire-and-forget. If the picker has
        // since closed or a query has been entered, we discard the result via
        // the staleness guard.
        const cacheKey = pairWith || '__global__';
        const fetcher = pairWith
            ? fetchPopularPartnersFor(pairWith)
            : fetchPopularSpecies();

        fetcher.then(dynamic => {
            // Bail if the picker is closed or no longer rendering "popular"
            // (user typed a search query in the meantime, or switched slots).
            if (!currentOptions) return;
            const stillSamePair = (currentOptions.pairWith || '__global__') === cacheKey;
            if (!stillSamePair) return;
            if (inputEl.value.trim()) return;
            const merged = mergeWithStaples(dynamic, POPULAR_TOP_N);
            const resolved = merged.map(findById).filter(Boolean);
            if (resolved.length > 0) renderGrid(popularEl, resolved);
        });
    }

    async function open(options) {
        currentOptions = options || {};
        buildOverlay();
        bindGlobalListeners();

        const lang = currentOptions.lang === 'en' ? 'en' : 'zh';
        titleEl.textContent = currentOptions.title || (lang === 'zh' ? '揀寶可夢' : 'Pick Pokémon');
        inputEl.placeholder = lang === 'zh' ? '搜尋 Pokémon (中／英)' : 'Search Pokémon';
        inputEl.value = '';

        // Show overlay with empty state until data loads
        overlayEl.removeAttribute('hidden');
        bodyOverflowSaved = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        try {
            await loadList();
            renderForQuery('');
        } catch (e) {
            console.error('[picker] load failed', e);
            popularEl.querySelector('.poke-picker-grid').innerHTML =
                '<p class="poke-picker-empty">Failed to load Pokémon data.</p>';
        }

        // Mobile keyboards: only autofocus on desktop. On phones the bottom-sheet
        // animation + keyboard pop together would shove the sheet off-screen.
        if (window.matchMedia && !window.matchMedia('(pointer: coarse)').matches) {
            setTimeout(() => inputEl.focus(), 50);
        }
    }

    function close() {
        if (!overlayEl) return;
        overlayEl.setAttribute('hidden', '');
        document.body.style.overflow = bodyOverflowSaved;
        currentOptions = null;
    }

    function getById(id) {
        // Public helper — host/event pages call this to render a previously
        // picked species without re-opening the picker.
        if (!cachedList) {
            // Trigger lazy-load if caller hasn't opened the picker yet.
            loadList().catch(() => {});
            return null;
        }
        return findById(id);
    }

    async function ensureLoaded() {
        if (cachedList) return cachedList;
        return loadList();
    }

    return { open, close, getById, ensureLoaded };
})();
