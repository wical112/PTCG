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
    const TTL_DAYS = 30;

    function ttlTimestamp() {
        const expires = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
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
        // Always point new share links at the dedicated viewer page so visitors land
        // straight on /view/ without going through the root-page redirect.
        const u = new URL(window.location.href);
        u.pathname = '/view/';
        u.search = '';
        u.hash = '';
        u.searchParams.set('t', tid);
        return u.toString();
    }

    /* ────────────────────────────────────────────────────────────────────────
       HOSTED EVENTS — pre-tournament registration / promo flow.
       ──────────────────────────────────────────────────────────────────────── */

    const EVENTS_COLLECTION = 'events';
    const EDIT_KEY_LEN = 16;
    const EVENT_TTL_DAYS = 90;

    function eventTtlTimestamp() {
        const expires = new Date(Date.now() + EVENT_TTL_DAYS * 24 * 60 * 60 * 1000);
        return firebase.firestore.Timestamp.fromDate(expires);
    }

    function genEventId() {
        let s = '';
        for (let i = 0; i < ID_LEN; i++) s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
        return s;
    }

    function genEditKey() {
        let s = 'K';
        for (let i = 0; i < EDIT_KEY_LEN; i++) s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
        return s;
    }

    async function sha256Hex(str) {
        const buf = new TextEncoder().encode(str);
        const hash = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function buildEventHostUrl(eid, editKey) {
        const u = new URL(window.location.href);
        u.pathname = '/host/';
        u.search = '';
        u.hash = '';
        u.searchParams.set('e', eid);
        u.searchParams.set('k', editKey);
        return u.toString();
    }

    function buildEventPublicUrl(eid) {
        const u = new URL(window.location.href);
        u.pathname = '/event/';
        u.search = '';
        u.hash = '';
        u.searchParams.set('e', eid);
        return u.toString();
    }

    function defaultEventMeta() {
        return {
            org: '',
            name: '',
            date: '',
            time: '',
            address: '',
            desc: '',
            contact: '',
            fee: 0,
            currency: 'HKD',
            paymentMethods: ['cash']
        };
    }

    function defaultEventPrizes() {
        return {
            tiers: [
                { threshold: 4, first: '', second: '', third: '', notes: '' }
            ],
            lucky: ''
        };
    }

    /* Create a new hosted event. Returns { eventId, editKey, hostUrl, publicUrl }. */
    async function createEvent() {
        if (!isReady()) throw new Error('Cloud not ready');
        const editKey = genEditKey();
        const editKeyHash = await sha256Hex(editKey);

        for (let attempt = 0; attempt < 5; attempt++) {
            const eid = genEventId();
            const ref = db.collection(EVENTS_COLLECTION).doc(eid);
            try {
                const snap = await ref.get();
                if (snap.exists) continue;
                await ref.set({
                    eventId: eid,
                    ownerUid: currentUid,
                    editKeyHash,
                    phase: 'signup',
                    meta: defaultEventMeta(),
                    prizes: defaultEventPrizes(),
                    capacity: null,
                    signupOpen: true,
                    signupCount: 0,
                    imageUrl: null,
                    imageStoragePath: null,
                    tournamentId: null,
                    syncToTopCut: true,           // organizer can opt out via host editor
                    published: false,             // explicit publish gate — TopCut sync skipped while false
                    topcutPostId: null,
                    topcutResultPostId: null,
                    publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    expiresAt: eventTtlTimestamp()
                });
                return {
                    eventId: eid,
                    editKey,
                    hostUrl: buildEventHostUrl(eid, editKey),
                    publicUrl: buildEventPublicUrl(eid)
                };
            } catch (e) {
                console.error('[cloud] createEvent attempt failed', e);
            }
        }
        throw new Error('Could not allocate event ID');
    }

    async function fetchEvent(eid) {
        if (!db) throw new Error('not_initialized');
        const snap = await db.collection(EVENTS_COLLECTION).doc(eid).get();
        if (!snap.exists) throw new Error('not_found');
        return snap.data();
    }

    /* Write a tournament-result snapshot back to events/{eid} so the
       publishEventResult Cloud Function has everything it needs to assemble
       the TopCut post + per-player records. Called by app.js when an event-
       sourced tournament ends. */
    async function setEventResultSnapshot(eid, snapshot) {
        if (!isReady()) throw new Error('Cloud not ready');
        await db.collection(EVENTS_COLLECTION).doc(eid).set({
            tournamentResultSnapshot: snapshot,
            phase: 'ended',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: eventTtlTimestamp()
        }, { merge: true });
    }

    /* Owner update — patch shape only (Firestore merge:true). Always re-arms
       expiresAt so an actively-edited event keeps its 90-day TTL. */
    async function updateEvent(eid, patch) {
        if (!isReady()) throw new Error('Cloud not ready');
        const payload = {
            ...patch,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: eventTtlTimestamp()
        };
        await db.collection(EVENTS_COLLECTION).doc(eid).set(payload, { merge: true });
    }

    function subscribeEvent(eid, onUpdate, onError) {
        if (!db) {
            if (onError) onError(new Error('not_initialized'));
            return null;
        }
        return db.collection(EVENTS_COLLECTION).doc(eid).onSnapshot(
            snap => {
                if (snap.exists) onUpdate(snap.data());
                else if (onError) onError(new Error('not_found'));
            },
            err => { if (onError) onError(err); }
        );
    }

    /* Public anonymous signup. Schema enforced by Firestore rule.

       Doc ID = trainerId (e.g. 'hk12345678') so a second signup attempt
       with the same trainer ID maps to the same doc — Firestore's create
       semantics in a transaction reject the duplicate, giving us per-event
       uniqueness at the data layer with no extra index. The legacy auto-id
       path is kept as a fallback for callers that haven't normalized. */
    function buildSignupPayload(signup) {
        return {
            name: signup.name,
            trainerId: signup.trainerId,            // hk + 8 digits, normalised
            phone: signup.phone || '',
            species1: signup.species1,
            species2: signup.species2 || '',
            source: signup.source || 'online',      // 'online' | 'walkin'
            checkedIn: false,
            checkedInAt: null,
            paid: false,
            paidAmount: 0,
            paidMethod: null,
            paidAt: null,
            notes: '',
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
    }

    async function submitSignup(eid, signup) {
        if (!isReady()) throw new Error('Cloud not ready');
        const trainerId = (signup.trainerId || '').toLowerCase();
        const data = buildSignupPayload({ ...signup, trainerId });
        const signupsCol = db.collection(EVENTS_COLLECTION).doc(eid).collection('signups');

        if (!trainerId) {
            // Defensive: client should never call this without a trainerId,
            // but if it does, fall through to auto-id so we don't lose the
            // data. Duplicate-check skipped.
            const ref = signupsCol.doc();
            await ref.set(data);
            return ref.id;
        }

        const ref = signupsCol.doc(trainerId);
        try {
            await db.runTransaction(async (tx) => {
                const existing = await tx.get(ref);
                if (existing.exists) {
                    const err = new Error('TRAINER_ID_ALREADY_SIGNED_UP');
                    err.code = 'already-exists';
                    throw err;
                }
                tx.set(ref, data);
            });
            return ref.id;
        } catch (e) {
            if (e && e.code === 'already-exists') throw e;
            throw e;
        }
    }

    /* Owner-only listing. Returns array of {sid, ...data} sorted by joinedAt. */
    async function listSignups(eid) {
        if (!isReady()) throw new Error('Cloud not ready');
        const snap = await db.collection(EVENTS_COLLECTION).doc(eid)
            .collection('signups').orderBy('joinedAt', 'asc').get();
        return snap.docs.map(d => ({ sid: d.id, ...d.data() }));
    }

    function subscribeSignups(eid, onUpdate, onError) {
        if (!db) {
            if (onError) onError(new Error('not_initialized'));
            return null;
        }
        return db.collection(EVENTS_COLLECTION).doc(eid)
            .collection('signups').orderBy('joinedAt', 'asc').onSnapshot(
                snap => {
                    const list = snap.docs.map(d => ({ sid: d.id, ...d.data() }));
                    onUpdate(list);
                },
                err => { if (onError) onError(err); }
            );
    }

    async function updateSignup(eid, sid, patch) {
        if (!isReady()) throw new Error('Cloud not ready');
        await db.collection(EVENTS_COLLECTION).doc(eid)
            .collection('signups').doc(sid).set(patch, { merge: true });
    }

    async function deleteSignup(eid, sid) {
        if (!isReady()) throw new Error('Cloud not ready');
        await db.collection(EVENTS_COLLECTION).doc(eid)
            .collection('signups').doc(sid).delete();
    }

    /* Image upload — stores under event-images/{eid}/promo-{ts}.{ext} so
       each new upload doesn't clobber the previous (organizer can roll back).
       Returns { url, storagePath }. */
    async function uploadEventImage(eid, file) {
        if (!isReady()) throw new Error('Cloud not ready');
        if (!firebase.storage) throw new Error('Storage SDK not loaded');
        if (file.size > 2 * 1024 * 1024) throw new Error('Image must be ≤ 2 MB');
        if (!/^image\//.test(file.type)) throw new Error('File must be an image');

        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = `event-images/${eid}/promo-${Date.now()}.${ext}`;
        const ref = firebase.storage().ref(path);
        await ref.put(file, { contentType: file.type });
        const url = await ref.getDownloadURL();
        return { url, storagePath: path };
    }

    async function deleteEventImage(storagePath) {
        if (!isReady()) throw new Error('Cloud not ready');
        if (!firebase.storage || !storagePath) return;
        try {
            await firebase.storage().ref(storagePath).delete();
        } catch (e) {
            console.warn('[cloud] deleteEventImage failed (already removed?)', e);
        }
    }

    /* Invoke the publishEventResult Cloud Function — organizer-triggered
       after they preview and approve the standings. Returns { ok, postId,
       recordsWritten } from the function. */
    async function publishEventResult(eid, editorOverrides) {
        if (!isReady()) throw new Error('Cloud not ready');
        if (!firebase.functions) throw new Error('Functions SDK not loaded');
        const fn = firebase.app().functions('asia-east1').httpsCallable('publishEventResult');
        const res = await fn({ eventId: eid, editorOverrides: editorOverrides || {} });
        return res.data;
    }

    /* Hard-delete a not-yet-started event. Cloud Function gate-checks
       phase == 'signup' and cascade-cleans signups + storage image +
       TopCut post + meta credit. Throws on permission / phase failure. */
    async function deleteEvent(eid) {
        if (!isReady()) throw new Error('Cloud not ready');
        if (!firebase.functions) throw new Error('Functions SDK not loaded');
        const fn = firebase.app().functions('asia-east1').httpsCallable('deleteEvent');
        const res = await fn({ eventId: eid });
        return res.data;
    }

    return {
        init, isConfigured, isReady,
        publish, attachExisting, getActiveTournamentId,
        syncState, flush, unpublish,
        fetchOnce,
        subscribeView, unsubscribeView,
        buildViewUrl,
        // Hosted events
        createEvent, fetchEvent, updateEvent, subscribeEvent,
        setEventResultSnapshot, publishEventResult, deleteEvent,
        submitSignup, listSignups, subscribeSignups, updateSignup, deleteSignup,
        uploadEventImage, deleteEventImage,
        buildEventHostUrl, buildEventPublicUrl,
        sha256Hex
    };
})();
