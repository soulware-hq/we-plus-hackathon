# BRIEF — what we're building

**Audience:** the 8 crews building during the hackathon.
**Scope of this brief:** the *vacancy-led* candidate matching flow. Anything outside this is roadmap.

---

## The pain (in WE+'s own words)

> "A vacancy comes in via Connecting Expertise. We have 2-3 days to respond. I copy the vacancy text into ChatGPT, paste in 5 candidate CVs, ask 'who's the top 2?', generate a motivation text, edit it, send. Five other consultancies are doing the same. Speed matters. Quality matters." — Jody, Sales

> "We get 20-25 vacancies a day. Most are no-match. Each still needs to be evaluated." — Sales lead

> "LinkedIn search → 400 generic InMails → 7 follow-ups → maybe a phone call. Near-zero quality candidates this way." — Yoni, Recruiter

The **manual matching** step is the bottleneck. That's what you're attacking.

---

## The flow you're building

```
[Vacancy text]   →   [Match]   →   [Ranked shortlist]
  (one of 5)         (your AI)      (top 3–5 of 54)
                                         │
                                         └─→ each candidate has:
                                             • match score (0–1)
                                             • 1–2 sentence reason
                                             • flagged risks (e.g. "no Spring Boot")
```

That's the minimum. If you have time:
- Generate a **motivation text** (1 paragraph, in Dutch or English) per top candidate
- Generate a **tailored CV summary** (1-pager) emphasizing what matches the vacancy

---

## What "good" looks like

Per session, the win condition shifts:

### Session 1 (Tue, 30 min) — Working prototype
Run `your-tool VAC-001` → get a ranked list of CAND-IDs with reasons. Doesn't have to be perfect, has to *work end-to-end*.

**Pass criteria:**
- Reads the vacancy markdown
- Reads the 54 CVs
- Outputs a ranked list (terminal, file, web — anything)
- Each entry has a reason a recruiter could read

### Session 2 (Wed, ~2h) — Sharper
- Deployed somewhere (Vercel URL, Streamlit, anything live)
- Benchmarked against a shared eval set (provided in session 2)
- Reasoning is grounded — quotes from the CV, not hallucinated

### Session 3 (Thu, ~2h) — Shippable
- Privacy: no PII leaves the runtime; CVs aren't in the deploy bundle
- Reproducible: anyone can fork and run it
- Handover-ready: one doc, one command

---

## Match criteria (what should weight your ranking)

From the operator interviews (full transcripts in WE+ briefing materials):

**Hard filters** (no match if missing):
- Main tech stack (e.g. Java + Spring Boot for VAC-001)
- Language requirement (most vacancies need Dutch)
- Regime (freelance vs. employed — vacancy specifies)
- Region (some vacancies are region-specific)

**Soft signal** (weight, don't gate):
- Years per skill
- Seniority level
- Recent project relevance (last 2 years matters more than 10 years ago)
- Soft skills / culture fit (hard to encode — surface as "warning"?)
- Certifications

**Anti-signal:**
- Self-declared but never-used skills (e.g. "Python" listed but no Python project) — penalize
- Stale skills (last touched 8+ years ago)

---

## What NOT to build (yet)

- Don't try to **scrape LinkedIn** — out of scope, GDPR landmine
- Don't build a **full ATS** — pick the *match* slice, do it well
- Don't worry about **ingest** (CV upload, vacancy intake) — the data is given
- Don't build **multi-tenancy / auth** — single-user, terminal-or-localhost is fine

---

## Hint: the de-facto spec

Jody's manual ChatGPT prompt is the de-facto spec. We don't have it written down (yet — Koen is asking him). If it lands during the hackathon, it'll drop in Discord. Until then: build what *you'd* want as a recruiter looking at 54 CVs and 5 vacancies.

---

## Output schema (suggested, not enforced)

```json
{
  "vacancy_id": "VAC-001",
  "matches": [
    {
      "candidate_id": "CAND-042",
      "score": 0.91,
      "reason": "12y Java + Spring Boot, currently at Nike. Freelance ✓. Dutch ✓.",
      "risks": ["No explicit Hibernate experience listed"]
    },
    ...
  ],
  "generated_at": "2026-04-28T17:23:00+02:00"
}
```

See `examples/` for a worked example.
