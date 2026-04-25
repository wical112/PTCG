# TCG Tournament Manager

Browser-based tournament manager for Trading Card Games. Supports **Swiss** (round-robin + standings) and **Knockout** (single-elimination bracket) formats.

**Live:** https://gameset-hk.com

---

## Features

- Swiss pairings with rematch-avoidance backtracking, auto-bye, MP → OWP standings
- Knockout bracket with standard seed order (1v8, 4v5, 2v7, 3v6 …)
- Round timer (start / pause / reset / ±60s / mute)
- Trainer-card modal with match history; drop player mid-tournament
- Lucky Wheel + participant picker
- Cloud Publish: share a live read-only view via QR code (Firebase Firestore)
- 6 colour themes; persists per browser
- Configurable Swiss scoring (Win 3 / Loss 1 / Draw 0  or  Win 3 / Draw 1 / Loss 0)
- EN / 繁體中文 bilingual UI
- Projector mode (giant timer), Compact mode (2-col grid)
- Google Analytics 4 event tracking
- Zero dependencies — plain HTML + CSS + vanilla JS, no build step

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Static HTML / CSS / Vanilla JS |
| Persistence | `localStorage` (per-device) |
| Live-sharing | Firebase Firestore + Anonymous Auth |
| Hosting | Firebase Hosting (`tcgtm` site, project `ptcgstm`) |

---

## Run locally

```bash
# Firebase SDK requires http://, not file://
python3 -m http.server 8000
# Open http://localhost:8000
```

---

## Branches

| Branch | Description |
|---|---|
| `income` | Active development — cloud publish, static pages, all current features |
| `main` | Public open-source release — core Swiss/Knockout, no cloud features |

---

## Deploy

See [`DEPLOY.md`](DEPLOY.md) for the full step-by-step checklist (cache-bust, changelog entry, Firebase deploy, git push).

---

## Contributing / Collaborating

See [`GEMINI.md`](GEMINI.md) for architecture notes, editing conventions, and what to preserve.

---

## Legal

Proprietary — see [`LICENSE`](LICENSE). Not affiliated with Nintendo, The Pokémon Company, Game Freak, or Creatures Inc. See [`legal.html`](legal.html) for full IP notice.
