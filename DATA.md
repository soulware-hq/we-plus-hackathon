# DATA — what's in `data/`

## Vacancies (`data/vacancies/`)

5 real WE+ vacancies, pulled from the live HR-Technologies API on 2026-04-27.

| ID | Title | Region | Regime |
|----|-------|--------|--------|
| VAC-001 | Java developer | Vlaanderen | Intern (employed) |
| VAC-002 | Cloud engineer (Freelance) | Vlaanderen | Freelance |
| VAC-003 | Java developer (FL) | Vlaanderen | Freelance |
| VAC-004 | Cloud-native developer | Vlaanderen | Intern (employed) |
| VAC-005 | DevOps Engineer | Vlaanderen | Intern (employed) |

Each vacancy has three sections lifted from the original posting:
- **Description** — what the role is
- **Profile** — what they need from you
- **Offer** — what WE+ offers

Index file: `data/vacancies/index.json`.

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

> ⚠️ **The pool is heavy on Privacy/Security + PM/PO**, light on hands-on developers. The 5 vacancies are dev-heavy. Some vacancies will have only a handful of strong matches — that's realistic, that's the actual WE+ situation.

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
1. Source: `~/Downloads/CV's.zip` (zipped raw .docx + .pdf, never committed)
2. Extract markdown via `markitdown` (Microsoft, `pip install markitdown[docx]`)
3. Anonymize via Claude (Opus subagents) using rules in `scripts/anonymize/` (TODO: ship script)
4. Vacancies pulled from `https://api.hr-technologies.com/v1/vacancies` with `X-Client-UUID: e45f3c39-d3d8-4a13-b694-36969ba6f4e6`

If WE+ adds more candidates / vacancies, the pipeline can re-run.
