# we-plus-hackathon

Starter pack for the **WE+ × Soulware AI hackathon** (Hasselt, 2026-04-28 / 30 / 05-02).

You're building an **AI-powered candidate matcher**: given a real WE+ vacancy, surface the top consultants from the WE+ pool, with reasoning the user can trust.

---

## Quick start (5 min)

```bash
# 1. Clone (you've been added as a collaborator)
git clone git@github.com:soulware-hq/we-plus-hackathon.git
cd we-plus-hackathon

# 2. Pick a scaffold (or roll your own)
cd scaffolds/python  # or scaffolds/node

# 3. Set the API key
cp ../../.env.example ../../.env
# edit ../../.env, paste ANTHROPIC_API_KEY

# 4. Run the starter
uv run match.py VAC-001        # python
# or
bun install && bun run match.ts VAC-001   # node
```

> Working in your own repo? Push to a personal private repo, **not** a public one. The data must not become public. See [`PRIVACY.md`](PRIVACY.md).

Look at the data first:

```bash
ls data/vacancies/   # 5 real WE+ vacancies (VAC-001…005)
ls data/cvs/         # 54 anonymized consultant CVs (CAND-001…054)
cat data/cvs/index.json | jq '.["CAND-042"]'
```

---

## What's in this repo

| Path | What |
|------|------|
| [`BRIEF.md`](BRIEF.md) | The task, evaluation criteria, "what good looks like" |
| [`PRIVACY.md`](PRIVACY.md) | GDPR + data-handling rules. **Read before you run anything.** |
| [`DATA.md`](DATA.md) | Dataset description (sources, schema, known caveats) |
| [`CREWS.md`](CREWS.md) | 8 crews × anchor + members + edge |
| `data/vacancies/` | 5 real WE+ vacancies (Java, Cloud, DevOps) — pulled from we-plus.be |
| `data/cvs/` | 54 anonymized consultant CVs from the WE+ pool |
| `scaffolds/python/` | `uv` + `anthropic` SDK starter |
| `scaffolds/node/` | `bun` + `@anthropic-ai/sdk` starter |
| `examples/` | Match-output schema + a sample run |

---

## The task (TL;DR)

> A vacancy comes in. The crew has 30 minutes. Build something that, given a vacancy, returns a **ranked shortlist of candidates** (top 3–5) with a **reason** for each match — useful enough that a recruiter would actually use it.

Full brief in [`BRIEF.md`](BRIEF.md).

Sessions:
- **Tue 28/04** — Session 1: build (30-min sprint)
- **Wed 30/04** — Session 2: make it sharper (deploy + benchmark)
- **Thu 02/05** — Session 3: ship it (deploy + privacy + handover)

---

## Links

- 🌐 Hackathon hub: <https://weplus-session-1.vercel.app>
- 💬 Discord: invite in your application email
- 🎥 Live (Google Meet): link in Discord
- 📦 Repo (this): <https://github.com/soulware-hq/we-plus-hackathon>

---

## Privacy

The CVs in `data/cvs/` are **anonymized** but they describe real people working at real companies. **They never leave your laptop.** No public deploys with the data inside. No uploads to external services that aren't covered by an API agreement. See [`PRIVACY.md`](PRIVACY.md).

The `mapping-private.json` (real-name → CAND-ID) is **not in the repo** — it stays with WE+ leadership for evaluation only.
