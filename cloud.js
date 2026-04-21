/* ============================================================
   Cloud module — Firebase Firestore integration for live publish/view.
   Depends on firebase-app-compat, firebase-auth-compat, firebase-firestore-compat,
   and the global window.FIREBASE_CONFIG.
   ============================================================ */
window.cloud = (() => {
    const COLLECTION = 'tournaments';
    const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
    const ID_LEN = 6;
    const SYNC_DEBOUNCE_MS = 800;
    const TTL_HOURS = 24;

    function ttlTimestamp() {
        const expires = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
        return firebase.firestore.Timestamp.fromDate(expires);
    }

    let db = null;
    let auth = null;
    let currentUid = null;
    let activeTournamentId = null;   // when admin is publishing
    let viewSubscription = null;     // unsubscribe fn for view-mode listener
    let syncTimeout = null;
    let pendingState = null;
    let initialized = false;

    function isConfigured() {
        const c = window.FIREBASE_CONFIG;
        return !!(c && c.apiKey && !c.apiKey.startsWith('YOUR_') &&
                  c.projectId && !c.projectId.startsWith('YOUR_'));
    }

    function isReady() {
        return initialized && !!currentUid;
    }

    async function init() {
        if (initialized) return true;
        if (!isConfigured()) {
            console.info('[cloud] Firebase not configured — cloud features disabled.');
            return false;
        }
        if (typeof firebase === 'undefined') {
            console.warn('[cloud] Firebase SDK not loaded.');
            return false;
        }
        try {
            firebase.initializeApp(window.FIREBASE_CONFIG);
            db = firebase.firestore();
            auth = firebase.auth();
            const cred = await auth.signInAnonymously();
            currentUid = cred.user.uid;
            initialized = true;
            return true;
        } catch (e) {
            console.error('[cloud] init failed', e);
            return false;
        }
    }

    function genId() {
        let s = '';
        for (let i = 0; i < ID_LEN; i++) {
            s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
        }
        return s;
    }

    /* Strip per-device-only fields before sending to cloud. */
    function cleanState(state) {
        if (!state) return state;
        const clone = { ...state };
        delete clone.projectorMode;
        delete clone.compactMode;
        delete clone.currentView;   // viewer chooses their own view
        delete clone.timerMuted;    // local audio pref
        return clone;
    }

    async function publish(state) {
        if (!isReady()) throw new Error('Cloud not ready');
        // Try a few IDs in case of (extremely unlikely) collision
        for (let attempt = 0; attempt < 5; attempt++) {
            const tid = genId();
            const ref = db.collection(COLLECTION).doc(tid);
            try {
                const snap = await ref.get();
                if (snap.exists) continue;
                await ref.set({
                    ownerUid: currentUid,
                    state: cleanState(state),
                    publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    expiresAt: ttlTimestamp()
                });
                activeTournamentId = tid;
                return tid;
            } catch (e) {
                console.error('[cloud] publish attempt failed', e);
            }
        }
        throw new Error('Could not allocate tournament ID');
    }

    function attachExisting(tid) {
        // Reattach to a previously-published tournament (after page reload).
        activeTournamentId = tid;
    }

    function getActiveTournamentId() {
        return activeTournamentId;
    }

    function syncState(state) {
        if (!isReady() || !activeTournamentId) return;
        pendingState = cleanState(state);
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(flush, SYNC_DEBOUNCE_MS);
    }

    async function flush() {
        if (!isReady() || !activeTournamentId || !pendingState) return;
        const stateToSend = pendingState;
        pendingState = null;
        try {
            await db.collection(COLLECTION).doc(activeTournamentId).update({
                state: stateToSend,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: ttlTimestamp()
            });
        } catch (e) {
            console.error('[cloud] sync failed', e);
        }
    }

    async function unpublish() {
        if (!isReady() || !activeTournamentId) return;
        const tid = activeTournamentId;
        activeTournamentId = null;
        if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }
        pendingState = null;
        try {
            await db.collection(COLLECTION).doc(tid).delete();
        } catch (e) {
            console.error('[cloud] unpublish failed', e);
        }
    }

    async function fetchOnce(tid) {
        if (!db) throw new Error('not_initialized');
        const snap = await db.collection(COLLECTION).doc(tid).get();
        if (!snap.exists) throw new Error('not_found');
        return snap.data();
    }

    function subscribeView(tid, onUpdate, onError) {
        if (!db) {
            if (onError) onError(new Error('Cloud not initialized'));
            return null;
        }
        if (viewSubscription) viewSubscription();
        viewSubscription = db.collection(COLLECTION).doc(tid).onSnapshot(
            snap => {
                if (snap.exists) onUpdate(snap.data().state);
                else if (onError) onError(new Error('not_found'));
            },
            err => { if (onError) onError(err); }
        );
        return viewSubscription;
    }

    function unsubscribeView() {
        if (viewSubscription) {
            viewSubscription();
            viewSubscription = null;
        }
    }

    function buildViewUrl(tid) {
        const u = new URL(window.location.href);
        u.search = '';
        u.hash = '';
        u.searchParams.set('t', tid);
        // strip path file (use directory) so it works whether served as /index.html or /
        return u.toString();
    }

    return {
        init, isConfigured, isReady,
        publish, attachExisting, getActiveTournamentId,
        syncState, flush, unpublish,
        fetchOnce,
        subscribeView, unsubscribeView,
        buildViewUrl
    };
})();
