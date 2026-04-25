# GameSet HK — Spin Battle Tournament feature plan

**Status:** Planning v2 — owner decisions locked in below. Awaiting final go-ahead before development.

**Goal:** Add Beyblade-X-style spin battle tournament support. Two new home-screen tiles ("Spin Battle Swiss" + "Spin Battle Knockout"). Reuse the existing pairing/standings engine; add per-battle scoring, points-target match win, launch-error penalty tracking, and malfunction tracking.

---

## 0. Owner decisions (locked)

| # | Question | Answer | Impact |
|---|---|---|---|
| 1 | Home button approach | **B — two tiles (Swiss + KO)** | 6 tiles on home; need 3-column grid layout |
| 2 | Stadium Out (3pt) default | **ON** | Will explain a wrinkle below — official Hasbro rules do NOT include Stadium Out; only community rulesets do. Re-confirm? |
| 3 | BattlePoints as tiebreaker | **YES, after OOMW** | 4-tier sort: MP → OWP → OOMW → BattlePts |
| 4 | 1-on-1 only for v1, 3-on-3 in v2 | (need answer — see explanation below) | Affects data model — **don't start without this** |
| 5 | Branding | **"Spin Battle Tournament"** (generic, no trademark risk) | Use this throughout app + i18n |
| 6 | Match-level Draw button | **Hide** | One less UI element to maintain |

---

## 1. What 3-on-3 actually means (re: Q4)

**Common confusion:** "3 on 3" sounds like it could mean 3 people vs 3 people. It does NOT in Beyblade X.

| Format | What it means |
|---|---|
| **1 on 1** | One person vs one person, each brings ONE Beyblade. Match = first to 4 (or 7) battle points. |
| **3 on 3** | One person vs one person, each brings a **deck of three different Beyblades** (no repeating parts — every Blade, Ratchet, and Bit must be unique within the deck). Within a single match, each player can choose which of their three Beys to use for each battle. So one match might be: B1 vs B2, then if you lose that battle you might switch to your B2 for the next battle, etc. |
| **Deck format** | Same as 3-on-3 with a few extra strategic switching rules (e.g. mandatory switch after a Burst Finish). |

So "3 on 3" is about your **roster of Beyblades**, not the number of human players. It is still 1 human vs 1 human.

**Recommendation for our app:** start with **1-on-1 in v1**. 3-on-3 adds a deck registration UI (3 Beys, parts uniqueness validation) and per-battle Bey switching, both of which are significant work. Get 1-on-1 shipping and proven, then add 3-on-3 as v2.

**Need owner to confirm: 1-on-1 only for v1?**

---

## 2. Reference: Official Beyblade X rules (corrected from v1 plan)

Sourced from the [Hasbro USA Beyblade X Secret Showdown Tournament Official Rules PDF](https://beyblade.com/assets/pdf/Tournament%20Official%20Rules.pdf) and [Beyblade X Tournament Regulations Vol.4](https://www.takaratomyasia.com/img/beybladex/1711658048_BBX%20regulation%20Vol.4_Eng.pdf).

### 2.1 Battle finish types (per battle within a match) — CORRECTED NAMES

| Finish | Points | Description |
|---|---|---|
| **Survivor Finish** | **1** | Opponent's Beyblade stops spinning before yours (NOT "Spin Finish" — that's the colloquial name) |
| **Burst Finish** | **2** | Opponent's Beyblade bursts apart (Blade/Ratchet/Bit detaches) |
| **Knock Out Finish** | **2** | Opponent's Beyblade is knocked into the side knockout zone (NOT "Over Finish") |
| **Xtreme Finish** | **3** | Opponent's Beyblade is knocked into the central Xtreme zone (Beyblade X exclusive) |

**Owner note re: Q2 (Stadium Out):** This is NOT in the official Hasbro / Takara Tomy rulebook. The 4 finishes above are it. Some community shop rulesets ([beybladebattle.net](https://www.beybladebattle.net/rules-info)) add "Stadium Out (over the top)" as a 3-point finish — it's a regional/community variant, not standard. **Recommendation:** don't enable by default. Make it an opt-in toggle on the registration page (default OFF) so an organizer can enable it for community-style events. Re-confirm your answer to Q2 with this in mind.

### 2.2 Match win condition

| Stage | Default target |
|---|---|
| First Stage (Swiss / round-robin) | **First to 4 points** |
| Final Stage (top cut bracket) | **First to 7 points** |

Configurable per event. Some community events use first to 5.

### 2.3 ⭐ Warning / Penalty rules (this is what you were asking about)

The official rulebook has THREE distinct penalty systems running in parallel. We need to model all three.

#### A. Two-Launch-Error Penalty (per battle)

> "In the same battle, if a player has a total of two (2) launching errors, premature launches, or delayed launches, the judge shall award one (1) point to the player's opponent, and the battle shall be replayed."

What counts as a launch error:
- Bey doesn't detach from launcher during launch
- Bey falls off after the judge calls "Three, two, one, let it rip"
- Bey is launched outside the designated launch area and touches the stadium exterior
- "Premature launch" — launching before the judge calls "rip"
- "Delayed launch" — launching after the judge calls "rip"

Subtle clauses:
- Once the +1 point is awarded, that player's launch-error counter **resets to zero** (for fresh accounting)
- If the same player commits 2 errors AGAIN in the same battle, judge discretion may invalidate the second-occurrence penalty (replay without point)
- The battle in which the penalty was triggered is **replayed**, not concluded

#### B. Disqualification Escalation (per match)

> "During any instance of a disqualification of a player, the player will be warned with the following: first offense = warning, second = point penalty, third = disqualification."

So: 1st minor offense = verbal warning, 2nd = +1 point to opponent, 3rd = the player is DQ'd from the match (opponent wins).

This is a per-match counter (not per-battle), independent of launch errors above.

#### C. Equipment Malfunction Limit (per match)

> "If a player has 3 malfunctions in a game play the opposing player will win the current match."

Malfunctions = parts breaking mid-battle, driver getting stuck, etc. Player gets up to 3 minutes to swap parts after each malfunction. After the **3rd** malfunction in the same match → opponent automatically wins.

### 2.4 Other organiser-relevant rules

- **5-minute late forfeit:** Players more than 5 min late to a scheduled match auto-forfeit
- **Stadium touch:** Body/launcher/Bey touching the stadium during launch may result in DQ if judged intentional
- **Reverse rule:** If a Bey enters the Knock Out / Xtreme zone but returns to the battle zone while still spinning, the finish is canceled and the battle continues
- **Simultaneous finish:** If two finishes happen at exactly the same moment, the battle is a draw and is restarted (so individual battles CAN draw, but matches don't terminate on a draw)
- **Appeals:** Judge rulings are final, no appeals onsite

---

## 3. What we keep from the existing TCG / GameSet HK engine (reuse)

Same as before — listed for completeness:

- Swiss pairing (bucket-by-points + backtrack to avoid rematches)
- Knockout bracket builder (1-vs-N seed order)
- Bye handling for odd counts
- Standings sort with OWP / OOMW (we'll add BattlePts as the 4th tiebreaker)
- Cloud sharing / spectator view / pin-your-match
- Trainer-card style player history modal (renamed "Battler card")
- Recovery from cloud ID
- Standings PNG download with watermark
- Drop player / undo drop
- i18n EN + ZH framework (extend with new keys)
- Telegram tournament-started alert (already piped through, just needs the new gameType in the payload)

**Engine code touched for Beyblade:** primarily `applyResults`, `submitResults`, and the round-view rendering. Pairing engine doesn't need to know.

---

## 4. Feature scope (v1 MVP — locked decisions baked in)

### What ships in v1

- **Two new home tiles:** "Spin Battle Swiss" + "Spin Battle Knockout" (option B), each launches the existing Swiss / KO flow but flagged `gameType: 'spin-battle'`
- **1-on-1 only** (assuming you confirm Q4)
- **Configurable on registration:**
  - Target points (default 4 for Swiss, 7 for KO — actually let's just default to 4 and let the organizer set 7 manually for top-cut-only events; a dual default would need stage-detection logic)
  - Stadium Out toggle (default **OFF** per the official-rules note above — re-confirm)
  - Allow 5th finish slot if Stadium Out enabled
- **Per-battle entry UI** for each match card (see §6)
- **Per-battle launch-error counter** with auto +1-to-opponent on 2nd error + auto-replay
- **Per-match DQ counter** (warning → +1 → DQ at 3rd offense, organizer-triggered)
- **Per-match malfunction counter** (auto match-loss at 3rd, organizer-triggered)
- **Standings:** column 6 swaps from `WOScore` → `BattlePts`. Sort becomes: MP → OWP → OOMW → BattlePts.
- **Battler card popup:** new stat box for Battle Points scored
- **i18n EN + ZH** for ~50 new keys (more than original estimate due to penalty system + 5 finish types)
- **New rules help popup** explaining all 3 penalty systems + finish types + match win, EN + ZH (parallels existing Swiss/KO helpers)
- **Draw button hidden** for spin-battle mode (per Q6); battles can still individually draw (auto-restart) but matches cannot
- **Updates panel** entry announcing the feature

### What's deferred to v2

- 3-on-3 / Deck format (deck registration UI, parts uniqueness check, per-battle Bey switching)
- Ban / restricted parts list
- Per-match battle-log CSV export
- Battle history visible in Battler card timeline (currently shows match-level results; for spin battle we could show per-battle finishes)

### Permanently out of scope

- Round Robin / Double Elimination tournament types (not currently supported by GameSet HK at all)
- Live video / streaming integration
- Cross-event battler ELO

---

## 5. UI changes — home screen (option B, 6 tiles)

Current 4 tiles → 6 tiles. Layout becomes a 3×2 grid on desktop, 2×3 on mobile, 1×6 stacked on narrow phones.

```
┌─────────────────┬─────────────────┬─────────────────┐
│   TCG Swiss     │  TCG Knockout   │   Lucky Wheel   │
├─────────────────┼─────────────────┼─────────────────┤
│ Spin Battle Sw. │ Spin Battle KO  │    Advanced     │
└─────────────────┴─────────────────┴─────────────────┘
```

The two new spin-battle tiles get a distinct color/icon (suggested: blue with a spinning-top SVG icon) so they're visually grouped and distinguishable from the orange TCG tiles.

---

## 6. UI changes — round view (battle entry card)

This is the most novel piece. Each match card shows live scoreboard + tap-to-add-finish for each side.

Sketch (1-on-1, target = 4):

```
┌──────────────────────────────────────────────────────────────────┐
│  T1                                                               │
│                                                                   │
│  Battler A                              Battler B                 │
│  ▓▓▓▓░░░░  3 / 4 pts                    ▓▓░░░░░░  2 / 4 pts       │
│                                                                   │
│  [Survivor +1] [Burst +2] [KO +2] [Xtreme +3]                    │
│   ↑ tap for A                                                     │
│  [Survivor +1] [Burst +2] [KO +2] [Xtreme +3]                    │
│   ↑ tap for B                                                     │
│                                                                   │
│  Battles so far:                                                  │
│   1. A — Burst (+2)    A: 2  B: 0                                 │
│   2. B — Burst (+2)    A: 2  B: 2                                 │
│   3. A — Survivor (+1) A: 3  B: 2                                 │
│                                                                   │
│  Launch errors —  A: 0    B: 0                                    │
│  [⚠ A error] [⚠ B error]                                          │
│                                                                   │
│  Match penalties (per match — DQ at 3) —  A: 0   B: 0             │
│  [⚠ A warn] [⚠ B warn]                                            │
│                                                                   │
│  Malfunctions (per match — auto-loss at 3) —  A: 0   B: 0         │
│  [🔧 A] [🔧 B]                                                    │
│                                                                   │
│  [Undo last action]                          First to 4 pts       │
└──────────────────────────────────────────────────────────────────┘
```

Behavior:
- Tap a finish button → asks "winner: A or B?" via inline pill, then adds points
- (Alt simpler: each side has its own row of finish buttons — eliminates the A/B picker, faster but doubles button count)
- When a side reaches the target → match auto-locks with "Match complete — A wins (4 vs 2)"
- "⚠ error" tap increments that side's launch-error counter; on the 2nd error, app auto-awards +1 to the opponent, resets the counter, displays "Battle replayed — penalty +1 to B"
- "⚠ warn" tap on first press shows "Warning issued (1/3)", second press auto-awards +1 to opponent ("Penalty point — 2/3, next is DQ"), third press auto-ends match with the OTHER side as winner
- "🔧" tap increments malfunction; 3rd press auto-ends match with opponent winning
- "Undo last action" pops the most recent entry from the action log (works for finishes, errors, warns, malfunctions)

Mobile layout: collapse the secondary controls (errors / warns / malfunctions) behind a "More…" toggle to keep the main scoreboard + finish buttons visible.

---

## 7. Data model changes (additive — no migration needed for existing TCG events)

```ts
interface State {
  // ...existing TCG fields...
  gameType?: 'tcg' | 'spin-battle';     // NEW — defaults 'tcg' for backward compat
  matchTargetPoints?: number;           // NEW — default 4
  stadiumOutEnabled?: boolean;          // NEW — default false (re: Q2 reconsider)
}

interface Pairing {
  // ...existing...
  battles?: BattleEntry[];              // NEW — full per-battle log
  pointsA?: number;                     // NEW — cached cumulative
  pointsB?: number;                     // NEW
  errorsA?: number;                     // NEW — current battle's launch-error count for A
  errorsB?: number;                     // NEW — for B (resets on penalty award or new battle)
  matchWarnsA?: number;                 // NEW — escalation count (per match): 0=none, 1=warned, 2=penalty given, 3=DQ
  matchWarnsB?: number;                 // NEW
  malfunctionsA?: number;               // NEW — per match, auto-loss at 3
  malfunctionsB?: number;               // NEW
}

type FinishType = 'survivor' | 'burst' | 'knockout' | 'xtreme' | 'stadium_out';

interface BattleEntry {
  winner: 'a' | 'b';                    // who scored
  finish: FinishType | 'penalty';       // 'penalty' = the 2-launch-error auto-award
  points: 1 | 2 | 3;                    // denormalized for safety
  ts: number;
}

interface Player {
  // ...existing...
  battlePointsScored?: number;           // NEW — sum across matches; new sort tiebreaker
  battlePointsConceded?: number;         // NEW — useful for super-deep tiebreakers, optional display
}
```

All new fields are optional. Existing tournaments keep working with no migration.

---

## 8. Standings page (spin battle mode)

```
🏆 SPIN BATTLE TOURNAMENT — FINAL STANDINGS                      [Download PNG]

#   Battler          Record    MP    OWP%    OOMW%   BattlePts   Byes
1  🥇 Alice           4-0-0    12    72.0%   65.4%      24         0
2  🥈 Bob             3-1-0    9     68.5%   60.2%      19         1
3  🥉 Charlie         3-1-0    9     68.5%   60.2%      18         0
…
```

Sort: MP desc → OWP desc → OOMW desc → **BattlePts desc** → registration order.

Bob and Charlie tied through OOMW; Bob wins the tiebreak via BattlePts (19 vs 18). This matches Beyblade community convention.

Watermark on PNG: still "gameset-hk.com" + "Generated by GameSet HK".

---

## 9. i18n strings to add (EN + ZH, ~50 keys)

Sample (full list will be in the PR):

```js
// home — new tiles
'home.spinSwiss': 'Spin Battle Swiss' | '陀螺對戰瑞士制'
'home.spinKO':    'Spin Battle Knockout' | '陀螺對戰淘汰賽'

// reg — new fields
'reg.targetPoints':     'Target Points (first to win)' | '勝利目標分數'
'reg.targetPointsHint': 'Default 4 (Swiss). Use 7 for top-cut events.' | '預設 4 分（瑞士制）。最終 8 強建議改為 7 分。'
'reg.stadiumOut':       'Allow Stadium Out (3 pts, community variant)' | '允許台外（3 分，社群規則）'
'reg.stadiumOutHint':   'Not in official Hasbro rules. Enable only if your venue uses it.' | '非官方 Hasbro 規則。僅當場館採用時才啟用。'

// battle finishes
'battle.survivor':      'Survivor (+1)' | '存活（+1）'
'battle.burst':         'Burst (+2)'    | '爆裂（+2）'
'battle.knockout':      'Knock Out (+2)' | '擊出（+2）'
'battle.xtreme':        'Xtreme (+3)'   | '中央區（+3）'
'battle.stadiumOut':    'Stadium Out (+3)' | '台外（+3）'

// penalties
'penalty.launchError':       'Launch error' | '發射失誤'
'penalty.launchErrorAwarded':'2 launch errors → +1 point to opponent (battle replays)' | '兩次發射失誤 → 對手加 1 分（本回合重打）'
'penalty.matchWarn':         'Issue warning' | '發出警告'
'penalty.matchWarn1':        'Warning issued (1/3)' | '已發警告（1/3）'
'penalty.matchWarn2':        'Penalty: +1 to opponent (2/3 — next is DQ)' | '罰分：對手 +1（2/3，下一次直接判負）'
'penalty.matchWarn3':        'DQ — opponent wins this match' | '判負 — 對手贏得本對局'
'penalty.malfunction':       'Equipment malfunction' | '器材故障'
'penalty.malfunction3':      '3rd malfunction — opponent wins this match' | '第 3 次故障 — 對手贏得本對局'

// match status
'battle.firstTo':         'First to {n} points' | '先取 {n} 分獲勝'
'battle.matchComplete':   'Match complete — {winner} wins ({a} vs {b})' | '對局結束 — {winner} 勝（{a} 比 {b}）'
'battle.undo':            'Undo last action' | '撤銷上一步'

// standings + battler card
'standings.battlePts': 'BattlePts' | '對戰得分'
'trainer.battlePts':   'Battle Points' | '對戰得分'
'trainer.title':       (already 'Trainer Card' / '訓練家卡片' — for spin-battle mode, override at runtime to 'Battler Card' / '陀螺手卡片')

// rules popup — long help text in both languages, parallels existing Swiss/Knockout helpers
// Covers: 4 finishes, points target, 2-launch-error rule, 3-warn DQ, 3-malfunction match-loss,
// late forfeit, simultaneous-finish replay rule
'spinHelp.title': 'Spin Battle rules' | '陀螺對戰規則'
'spinHelp.body':  '<long bilingual help text>'
```

---

## 10. Effort estimate (revised, MVP = 1-on-1 + warning system)

Original estimate was ~11 hrs. Adding the warning/penalty/malfunction tracking adds:

| Task | Estimate |
|---|---|
| (Original baseline 1-on-1 work) | ~11 hrs |
| **Additional for warning system:** | |
| Per-battle launch-error counter + auto-penalty award + battle replay | ~1.5 hrs |
| Per-match DQ escalation (warn→penalty→DQ) | ~1 hr |
| Per-match malfunction counter + auto-loss | ~45 min |
| "Undo last action" for the action log | ~1 hr |
| Extra i18n strings for penalty system (~15 keys) | ~30 min |
| Penalty section in rules-help popup (EN + ZH) | ~45 min |
| **New total** | **~16-17 hrs** (~2-2.5 working days) |

---

## 11. Updated open questions for owner

Two questions to confirm before I start coding:

1. **Q2 reconsider:** Stadium Out is not in the official Hasbro / Takara Tomy ruleset — only some community shop rulesets have it. **Default OFF** (organizer can enable), or **default ON** (treat as standard)? My recommendation: default OFF, but make it a one-tap toggle on registration.

2. **Q4 confirm:** **Yes to 1-on-1 only for v1** (3-on-3 in v2)?

Once those two are answered, I'll start implementing.

---

## 12. Risks (updated)

- **Trademark concern:** by using "Spin Battle Tournament" instead of "Beyblade X Tournament", we sidestep the Takara Tomy / Hasbro trademark entirely. The legal disclaimer in `legal.html` already covers fan-made tools — no extra legal work needed. ✅
- **Per-battle UI on mobile:** finish buttons + error/warn/malfunction sections + per-battle log in one card is cramped. The "More…" collapse is essential.
- **Action log integrity:** if a user undoes the action that caused a penalty award, we have to roll back the auto-award too. Action log needs to be carefully designed.
- **Cloud sync:** each "tap" updates the pairing in localStorage and syncs to Firestore. With per-battle granularity (potentially 8-15 actions per match), we'll see more frequent writes — well within Firestore free tier, but worth a debounce so we don't write 10 docs in 5 seconds.

---

## Sources

- [USA Beyblade X Secret Showdown Tournament Official Rules — Hasbro PDF](https://beyblade.com/assets/pdf/Tournament%20Official%20Rules.pdf) (the canonical source for warning rules and finish names)
- [Beyblade X Tournament Regulations Vol. 4 — Takara Tomy Asia PDF](https://www.takaratomyasia.com/img/beybladex/1711658048_BBX%20regulation%20Vol.4_Eng.pdf)
- [WBO portal](https://www.worldbeyblade.org/portal.php)
- [Beyblade Battle Net — Rules & Info](https://www.beybladebattle.net/rules-info) (community variant rulesets including Stadium Out)
- [Mall Of Toys — Beyblade scoring & formats](https://malloftoys.com/blogs/news/how-beyblade-scoring-works)
- [Trinity Hobby — How to play in a Beyblade X tournament](https://trinityhobby.com/blogs/news/how-to-play-in-a-beyblade-x-tournament)
- [Conjutsu — Beyblade X 3-on-3 rules](https://conjutsu.com/beyblade-x-3-on-3-tournament-rules)
