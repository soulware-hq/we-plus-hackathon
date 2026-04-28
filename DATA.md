# DATA — what's in `data/`

## Client requests (`data/vacancies/`)

**11 real partner-intake requests** as forwarded by the WE+ partner team on 2026-04-27.

> ⚠️ **These are NOT vacatures from we-plus.be.** the partner team explicitly clarified that real WE+ matching happens against **incoming client requests** from sourcing partners (Atmoz, Solvus, Connecting Expertise, ...) and end clients (Engie, VLABEL, Ypto, Departement Omgeving, ...) — not against jobs posted on the WE+ website. We swapped the dataset accordingly on hackathon day 1.

| ID | Title | Region / End client | Stack focus |
|----|-------|---------------------|-------------|
| VAC-001 | Test Engineer (Selenium, urgent) | Antwerpen | Test, Selenium, ISTQB |
| VAC-002 | Lead Analist | Antwerpen | Microsoft, BA, Proxy PO |
| VAC-003 | Senior Project Manager | Toyota PMO | Waterfall, MS Project |
| VAC-004 | Functioneel Analist | Hasselt (on-site) | Field service, BA |
| VAC-005 | Data Privacy Analyst | Engie | DPIA, Data Protection Register |
| VAC-006 | Junior/Medior DPO (NIS2) | Vlaamse Overheid | ISO 27001, NIS2 |
| VAC-007 | Senior Java Developer | Digitaal Vlaanderen (MAGDA) | Java, Spring, Kafka |
| VAC-008 | Junior IT Security Consultant | Solvus | Qualys, ServiceNow |
| VAC-009 | Medior Full Stack Java | Departement Omgeving (ApoCow) | Java, JS, Spring |
| VAC-010 | Senior Java Developer | VLABEL (Vlaams Fiscaal Platform) | Java, Vaadin, Oracle |
| VAC-011 | CISO Security Architect | Ypto (NMBS Group) | Cybersec architecture |

Each request has at least:
- **Description** — what the role is
- **Required skills** — must-have / should-have / nice-to-have
- **Context** — about the end client / mission, where present in the source

Index file: `data/vacancies/index.json` — includes a `_meta.note` documenting the swap.

---

## CVs (`data/cvs/`)

54 anonymized consultant CVs. Source: WE+ candidate pool (we+ application intake + Privatum partner pool + older WE+ alumni).

Each CV is a markdown file with YAML frontmatter:

```yaml
---
id: CAND-042
primary_role: Backend developer
years_experience: 12
region: Vlaams-Brabant
regime: employed
languages: [Dutch, English, French]
---

# Candidate 042
[anonymized markdown content]
```

Index file: `data/cvs/index.json` — an aggregated map of all 54 candidates with structured metadata you can use directly:

```json
{
  "CAND-042": {
    "id": "CAND-042",
    "primary_role": "Backend developer",
    "primary_stack": ["Java", "Spring Boot", "AWS"],
    "years_experience": 12,
    "languages": ["Dutch (native)", "English (fluent)"],
    "region": "Vlaams-Brabant",
    "regime": "employed",
    "key_employers": ["Nike", "Wit-Gele Kruis"],
    "summary": "Senior Java backend developer..."
  }
}
```

### Pool composition

**Roles** (primary):
- Privacy/Security: 17
- PM/PO: 13
- Full-stack developer: 7
- Functional analyst: 7
- Data engineer: 2
- Frontend: 2
- Backend: 2
- Other (Scrum Master, Architect, Cloud, Other): 4

**Regimes:** 25 freelance · 23 employed · 6 unknown

**Years experience:** min 2 · median 20 · max 38

**Regions:** Limburg (14) · Antwerpen (13) · Vlaams-Brabant (9) · Oost-Vlaanderen (5) · Brussel (4) · others (9)

> ⚠️ **The pool is heavy on Privacy/Security + PM/PO**, light on hands-on developers. The 11 requests cover Java (4), Security/DPO (3), BA/PM (3), and Test (1) — much closer to the real intake mix than the 5 dev-only vacatures we started with. Some requests will still have only a handful of strong matches — that's realistic, that's the actual WE+ situation.

---

## Known caveats

- **CAND-005**: extraction had broken character spacing (a font quirk in the source .docx). Content readable but noisy — your matcher may struggle. Real-world: this happens, decide how to handle.
- **CAND-015 ↔ CAND-016** are the same person (Privatum + LinkedIn versions of the same CV). Test your dedup logic.
- **CAND-040 ↔ CAND-041** are the same person (English + Dutch versions of the same CV). Test your dedup logic.
- **CAND-021, CAND-008** are non-Belgian residents (UK, France). Region = `Other`. Vacancies are Belgium-only.
- **CAND-029** lists eyebrow-raising credentials (Oxford PhD AI, Harvard MBA, Eton). Kept as-stated. Real-world: trust-but-verify.

---

## What's NOT in this repo

- `mapping-private.json` (real-name → CAND-ID) — held by WE+ leadership for evaluation
- The 5 CVs we couldn't extract (4 corrupt .docx + 1 image-only Canva PDF) — flagged in `_skipped.txt`
- A "ground truth" answer key — there isn't one yet. Sessions 2/3 will have evaluation runs.

---

## Re-running the dataset

The pipeline that produced `data/`:
1. Source CVs: `~/Downloads/CV's.zip` (zipped raw .docx + .pdf, never committed) — 28.7 MB WeTransfer from the WE+ team, 2026-04-27.
2. Extract markdown via `markitdown` (Microsoft, `pip install markitdown[docx]`).
3. Anonymize via Claude (Opus subagents) using rules in `scripts/anonymize/` (TODO: ship script).
4. Client requests: forwarded by the WE+ team on 2026-04-27 via Koen as 7 .eml + 5 .docx attachments. Extracted directly into `data/vacancies/VAC-XXX.md`.

If WE+ adds more candidates / requests, the pipeline can re-run.
