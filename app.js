/* ============================================================
   PTCG Tournament Manager - Complete Application Logic
   ============================================================ */

const app = (() => {
    // ---- STATE ----
    const DEFAULT_STATE = {
        players: [],
        rounds: [],
        currentRound: 0,
        timerSeconds: 1500,
        timerRunning: false,
        timerDefault: 1500,
        timerMuted: false,
        wheelNames: [],
        wheelHistory: [],
        currentView: 'home',
        tournamentStarted: false,
        tournamentEnded: false,
        projectorMode: false
    };

    let state = { ...DEFAULT_STATE };
    let timerInterval = null;
    let wheelAngle = 0;
    let wheelSpinning = false;
    let timerSaveCounter = 0;

    // ---- PERSISTENCE ----
    function saveState() {
        localStorage.setItem('ptcg_state', JSON.stringify(state));
    }

    function loadState() {
        const saved = localStorage.getItem('ptcg_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                state = { ...DEFAULT_STATE, ...parsed };
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

        crumbs.push('<span class="bc-link" onclick="app.navigateTo(\'home\')">Home</span>');

        if (viewName === 'registration') {
            crumbs.push('<span class="bc-active">Registration</span>');
        } else if (viewName === 'round') {
            crumbs.push('<span class="bc-link" onclick="app.navigateTo(\'registration\')">Registration</span>');
            const recRounds = getRecommendedRounds();
            crumbs.push(`<span class="bc-active">Round ${state.currentRound + 1}${recRounds ? ` of ${recRounds}` : ''}</span>`);
        } else if (viewName === 'standings') {
            crumbs.push('<span class="bc-active">Standings</span>');
        } else if (viewName === 'wheel') {
            crumbs.push('<span class="bc-active">Lucky Wheel</span>');
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
        if (!confirm('Are you sure you want to reset everything? This cannot be undone.')) return;
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
            showToast(`Added ${added} player${added !== 1 ? 's' : ''}`);
        }
    }

    function createPlayer(name) {
        return {
            name,
            id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            matchPoints: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            opponents: [],
            hadBye: false
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
        const newName = prompt('Edit player name:', player.name);
        if (newName && newName.trim()) {
            const trimmed = newName.trim();
            // Check for duplicate
            if (state.players.some((p, i) => i !== index && p.name.toLowerCase() === trimmed.toLowerCase())) {
                alert('A player with that name already exists.');
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
        countEl.textContent = `${n} player${n !== 1 ? 's' : ''}`;

        if (n >= 2) {
            const rec = getRecommendedRounds();
            recEl.textContent = `Recommended rounds: ${rec}`;
            startBtn.disabled = false;
        } else {
            recEl.textContent = n === 1 ? 'Need at least 2 players' : '';
            startBtn.disabled = true;
        }

        if (locked) {
            startBtn.disabled = true;
            startBtn.textContent = 'Tournament In Progress';
        } else {
            startBtn.textContent = 'Start Tournament';
        }
    }

    // ---- SWISS TOURNAMENT ----
    function startTournament() {
        if (state.players.length < 2) return;
        if (!confirm(`Start tournament with ${state.players.length} players?`)) return;

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
        navigateTo('round');
    }

    function generatePairings(roundIndex) {
        let players = [...state.players];
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

            // Try to avoid repeat matchups
            for (let i = 0; i < players.length - 1; i += 2) {
                const a = players[i];
                const b = players[i + 1];
                if (a.opponents.includes(b.id)) {
                    for (let j = i + 2; j < players.length; j++) {
                        if (!a.opponents.includes(players[j].id)) {
                            [players[i + 1], players[j]] = [players[j], players[i + 1]];
                            break;
                        }
                    }
                }
            }
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

        const recRounds = getRecommendedRounds();
        const roundLabel = `Round ${state.currentRound + 1}${recRounds ? ` of ${recRounds}` : ''}`;
        document.getElementById('round-title').textContent = roundLabel;

        const container = document.getElementById('pairings-container');
        container.innerHTML = '';

        round.pairings.forEach((pairing, pIdx) => {
            const playerA = getPlayer(pairing.playerA);
            const playerB = pairing.playerB ? getPlayer(pairing.playerB) : null;

            if (pairing.isBye) {
                const row = document.createElement('div');
                row.className = 'pairing-row bye-row';
                row.innerHTML = `
                    <div class="table-number">BYE</div>
                    <div>
                        <span class="pairing-player" onclick="app.showTrainerCard('${pairing.playerA}')">${escapeHtml(playerA.name)}</span>
                        <span class="bye-tag"> - Automatic Win (3 pts)</span>
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
                <div class="pairing-player ${playerAClass}" onclick="app.showTrainerCard('${pairing.playerA}')">${escapeHtml(playerA.name)}</div>
                <div class="result-buttons" ${disabled}>
                    <button class="result-btn ${pairing.result === 'a' ? 'selected-win-a' : ''}"
                        onclick="app.setResult(${pIdx}, 'a')">A Wins</button>
                    <button class="result-btn ${pairing.result === 'draw' ? 'selected-draw' : ''}"
                        onclick="app.setResult(${pIdx}, 'draw')">Draw</button>
                    <button class="result-btn ${pairing.result === 'b' ? 'selected-win-b' : ''}"
                        onclick="app.setResult(${pIdx}, 'b')">B Wins</button>
                </div>
                <div class="pairing-player ${playerBClass}" onclick="app.showTrainerCard('${pairing.playerB}')" style="text-align:right">${escapeHtml(playerB.name)}</div>
            `;
            container.appendChild(row);
        });

        // Projector mode toggle
        updateProjectorMode();
        // Timer mute button
        updateMuteButton();
        updateSubmitButton();
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

    function updateSubmitButton() {
        const round = state.rounds[state.currentRound];
        if (!round) return;

        const allSet = round.pairings.every(p => p.isBye || p.result !== null);
        const btn = document.getElementById('btn-submit-results');
        btn.disabled = !allSet || round.resultsSubmitted;

        if (round.resultsSubmitted) {
            btn.textContent = 'Results Submitted';
        } else {
            btn.textContent = 'Submit Results & Next Round';
        }
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

            if (pairing.result === 'a') {
                pA.matchPoints += 3; pA.wins += 1; pB.losses += 1;
            } else if (pairing.result === 'b') {
                pB.matchPoints += 3; pB.wins += 1; pA.losses += 1;
            } else if (pairing.result === 'draw') {
                pA.matchPoints += 1; pB.matchPoints += 1;
                pA.draws += 1; pB.draws += 1;
            }
        });
    }

    function submitResults() {
        const round = state.rounds[state.currentRound];
        if (!round) return;
        if (!confirm('Submit results and proceed to next round? This cannot be undone.')) return;

        applyResults(round);
        round.resultsSubmitted = true;
        saveRoundSnapshot(state.currentRound);

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
                if (confirm('Submit current round results before ending?')) {
                    applyResults(round);
                    round.resultsSubmitted = true;
                    saveRoundSnapshot(state.currentRound);
                    saveState();
                }
            } else {
                // Some results missing — don't allow ending without submitting
                if (!confirm('Current round has incomplete results. Discard this round and end tournament?')) {
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
        navigateTo('standings');
    }

    // Go back to the previous round with its results pre-filled for editing
    function goBackFromRound() {
        if (state.currentRound === 0) {
            navigateTo('registration');
            return;
        }

        if (!confirm('Go back to previous round to edit results?')) return;

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
        showToast('Edit results and re-submit');
    }

    // Reverse the stat changes from a submitted round (fallback if no snapshot)
    function reverseResults(round) {
        round.pairings.forEach(pairing => {
            const pA = getPlayer(pairing.playerA);
            if (!pA) return;

            if (pairing.isBye) {
                pA.matchPoints -= 3;
                pA.wins -= 1;
                pA.hadBye = false;
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

    function renderStandings() {
        const standings = getStandings();
        const tbody = document.getElementById('standings-body');
        const title = document.getElementById('standings-title');

        const lastSubmitted = state.rounds.filter(r => r.resultsSubmitted).length;
        title.textContent = state.tournamentEnded
            ? `Final Standings (After ${lastSubmitted} Round${lastSubmitted !== 1 ? 's' : ''})`
            : `Standings After Round ${lastSubmitted}`;

        tbody.innerHTML = '';
        standings.forEach((p, i) => {
            const tr = document.createElement('tr');
            tr.onclick = () => showTrainerCard(p.id);
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${escapeHtml(p.name)}</td>
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
            alert('html2canvas not loaded yet. Please try again.');
            return;
        }
        html2canvas(wrapper, {
            backgroundColor: '#0a0e27',
            scale: 2
        }).then(canvas => {
            const link = document.createElement('a');
            const roundNum = state.rounds.filter(r => r.resultsSubmitted).length;
            link.download = `PTCG_Standings_Round${roundNum}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            console.error('Screenshot failed:', err);
            alert('Failed to capture standings. Try again.');
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
                            <span class="timeline-round">Round ${rIdx + 1}:</span>
                            <span class="timeline-result-bye">BYE (Win)</span>
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
                    resultText = 'Draw';
                    resultClass = 'timeline-result-draw';
                } else if ((pairing.result === 'a' && isA) || (pairing.result === 'b' && !isA)) {
                    resultText = 'Win';
                    resultClass = 'timeline-result-win';
                } else {
                    resultText = 'Loss';
                    resultClass = 'timeline-result-loss';
                }

                timeline += `
                    <div class="timeline-item">
                        <span class="timeline-round">Round ${rIdx + 1}:</span>
                        vs ${escapeHtml(oppName)} -
                        <span class="${resultClass}">${resultText}</span>
                    </div>`;
            });
        });

        body.innerHTML = `
            <h3>${escapeHtml(player.name)}</h3>
            <div class="trainer-stats">
                <div class="stat-box">
                    <div class="stat-label">Points</div>
                    <div class="stat-value">${player.matchPoints}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">OWP</div>
                    <div class="stat-value">${(owp * 100).toFixed(1)}%</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Record</div>
                    <div class="stat-value">${player.wins}-${player.losses}-${player.draws}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Games</div>
                    <div class="stat-value">${player.wins + player.losses + player.draws}</div>
                </div>
            </div>
            ${timeline ? `<h4 style="margin-bottom:0.5rem;color:var(--text-dim)">Match History</h4><div class="trainer-timeline">${timeline}</div>` : '<p style="color:var(--text-dim)">No matches played yet.</p>'}
        `;

        document.getElementById('modal-overlay').classList.add('open');
    }

    function closeModal() {
        document.getElementById('modal-overlay').classList.remove('open');
    }

    // ---- TIMER ----
    function resetTimerValue() {
        state.timerSeconds = state.timerDefault;
        state.timerRunning = false;
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
            toggleBtn.textContent = state.timerRunning ? 'Pause' : 'Start';
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
        if (timerInterval) clearInterval(timerInterval);
        timerSaveCounter = 0;
        timerInterval = setInterval(() => {
            state.timerSeconds--;

            if (state.timerSeconds === 0) {
                if (!state.timerMuted) playBeep();
                // Auto-stop at 0
                stopTimer();
                showToast('Time is up!');
                return;
            }

            // Save timer state every 10 seconds for crash recovery
            timerSaveCounter++;
            if (timerSaveCounter >= 10) {
                timerSaveCounter = 0;
                saveState();
            }

            renderTimer();
        }, 1000);
        renderTimer();
    }

    function stopTimer() {
        state.timerRunning = false;
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
        saveState();
        renderTimer();
    }

    function timerAdjust(seconds) {
        state.timerSeconds = Math.max(0, state.timerSeconds + seconds);
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
            btn.textContent = state.timerMuted ? 'Unmute' : 'Mute';
            btn.classList.toggle('btn-active', state.timerMuted);
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
            btn.textContent = state.projectorMode ? 'Exit Projector' : 'Projector Mode';
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
            alert('No tournament players registered.');
            return;
        }
        state.wheelNames = state.players.map(p => p.name);
        document.getElementById('wheel-names').value = state.wheelNames.join('\n');
        saveState();
        renderWheel();
    }

    // Enhancement: Reset wheel history and clear names for fresh start
    function wheelReset() {
        if (!confirm('Clear all winners and reset the wheel?')) return;
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
            ctx.fillText('Add names to spin!', cx, cy);
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
    function init() {
        loadState();

        // Keyboard events
        document.addEventListener('keydown', handleKeydown);

        // Restore view
        if (state.currentView && state.currentView !== 'home') {
            navigateTo(state.currentView);
        } else {
            navigateTo('home');
        }

        renderTimer();

        if (state.timerRunning) {
            startTimer();
        }

        // Restore projector mode
        if (state.projectorMode) {
            document.body.classList.add('projector-mode');
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    // ---- PUBLIC API ----
    return {
        navigateTo,
        resumeTournament,
        resetTournament,
        bulkAddPlayers,
        deletePlayer,
        editPlayerName,
        startTournament,
        setResult,
        submitResults,
        endTournament,
        goBackFromRound,
        backToLastRound,
        showTrainerCard,
        closeModal,
        closeWinnerModal,
        downloadStandings,
        timerToggle,
        timerReset,
        timerAdjust,
        toggleTimerMute,
        toggleProjectorMode,
        wheelSetNames,
        wheelSyncFromTournament,
        wheelReset,
        spinWheel
    };
})();
