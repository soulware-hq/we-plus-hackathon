"""
Candidate matcher — WE+ Hackathon.

Usage:
    uv run match.py VAC-001                      # top 3, summaries only (fast)
    uv run match.py VAC-001 --full               # full CV bodies (better signal)
    uv run match.py VAC-001 --full --out out.json
    uv run match.py VAC-001 --list               # list all 11 vacancy IDs
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

REPO = Path(__file__).resolve().parents[2]
VAC_DIR = REPO / "data" / "vacancies"
CV_DIR = REPO / "data" / "cvs"

# ── Hard filter requirements per vacancy ─────────────────────────────────────
# lang_dutch       : candidate must have Dutch B2+ (required for NL-team roles)
# lang_dutch_c2    : candidate must have Dutch native/C1/C2 (Vlaamse Overheid etc.)
# lang_english     : candidate must have English
# lang_fr_or_nl    : candidate must have French OR Dutch (used for VAC-011)
# region_ok        : list of acceptable candidate regions (None = no filter)
VACANCY_HARD_REQS: dict[str, dict] = {
    "VAC-001": {"lang_dutch": True,
                "region_ok": ["Antwerpen", "Vlaams-Brabant", "Brussel", "Limburg",
                              "Oost-Vlaanderen", "West-Vlaanderen", "Belgium"]},
    "VAC-002": {"lang_dutch": True},
    "VAC-003": {"lang_english": True},
    "VAC-004": {"lang_dutch": True,
                "region_ok": ["Limburg", "Antwerpen", "Vlaams-Brabant", "Belgium"]},
    "VAC-005": {},   # NL/FR/EN all acceptable — no language hard-filter
    "VAC-006": {"lang_dutch_c2": True},
    "VAC-007": {"lang_dutch_c2": True},
    "VAC-008": {"lang_english": True},
    "VAC-009": {"lang_dutch_c2": True},
    "VAC-010": {"lang_dutch_c2": True},
    "VAC-011": {"lang_english": True, "lang_fr_or_nl": True},
}

SYSTEM_PROMPT = """\
You are an expert technical recruiter at WE+, a Belgian IT consulting firm.
Rank the ELIGIBLE candidates (already hard-filtered) by fit for the given vacancy.

SCORING WEIGHTS (use as mental framework):
  • Skill match        50 % — recent stack vs. hard/soft requirements
                               PENALISE skills listed but not shown in any project last 5 y
  • Experience level   30 % — seniority / years align with vacancy level
  • Industry relevance 20 % — recent projects in similar sector or problem space

ANTI-SIGNALS (penalise heavily):
  • Skill in stack but no project cites it in last 5 years
  • Heavy career change with short runway in required domain
  • Severe over- or under-qualification

RETURN — valid JSON only, no markdown fences, no prose outside the object:
{
  "vacancy_id": "VAC-XXX",
  "matches": [
    {
      "candidate_id": "CAND-NNN",
      "score": 0.00,
      "reason": "≤2 sentences, cite employer + year. E.g. '4y Java/Spring; at Nike since 01/2025 on SAP S4 migration — Spring Boot daily. Dutch native.'",
      "risks": ["specific risk, e.g. 'No Hibernate project visible since 2020'"],
      "motivation_nl": "1 paragraph Dutch, client-ready, paste-able into a response email. No candidate name."
    }
  ]
}
Return exactly 3 matches. Score 0.0–1.0."""


# ── Language helpers ──────────────────────────────────────────────────────────
def _langs(meta: dict) -> list[str]:
    return [str(l).lower() for l in meta.get("languages", [])]


def has_dutch(meta: dict) -> bool:
    """B2 or better Dutch."""
    bad = ("a1", "a2", "basic", "elementary", "beginner", "notions")
    return any(
        ("dutch" in l or "nederlands" in l)
        and not any(b in l for b in bad)
        for l in _langs(meta)
    )


def has_dutch_c2(meta: dict) -> bool:
    """Native / C1 / C2 / fluent Dutch."""
    good = ("native", "moeder", "c2", "c1", "fluent", "business", "proficient")
    return any(
        ("dutch" in l or "nederlands" in l) and any(g in l for g in good)
        for l in _langs(meta)
    )


def has_english(meta: dict) -> bool:
    return any("english" in l for l in _langs(meta))


def has_french(meta: dict) -> bool:
    return any("french" in l or "français" in l or "fr)" in l for l in _langs(meta))


# ── Hard filter ───────────────────────────────────────────────────────────────
def apply_hard_filter(cid: str, meta: dict, reqs: dict) -> tuple[bool, str | None]:
    """Return (passes, rejection_reason)."""
    region = (meta.get("region") or "unknown").strip()

    if reqs.get("lang_dutch") and not has_dutch(meta):
        return False, f"Dutch B2+ required; candidate languages: {meta.get('languages', [])}"

    if reqs.get("lang_dutch_c2") and not has_dutch_c2(meta):
        return False, f"Dutch C2 required; candidate languages: {meta.get('languages', [])}"

    if reqs.get("lang_english") and not has_english(meta):
        return False, f"English required; not found in: {meta.get('languages', [])}"

    if reqs.get("lang_fr_or_nl"):
        if not (has_french(meta) or has_dutch(meta)):
            return False, "French or Dutch required; neither found"

    if reqs.get("region_ok"):
        accepted = [r.lower() for r in reqs["region_ok"]]
        cand_region = region.lower()
        if cand_region not in ("unknown", "other", "belgium", "netherlands") \
                and cand_region not in accepted:
            return False, f"Region '{region}' outside acceptable area"

    return True, None


# ── Data loaders ──────────────────────────────────────────────────────────────
def load_vacancy(vac_id: str) -> str:
    path = VAC_DIR / f"{vac_id}.md"
    if not path.exists():
        sys.exit(f"Vacancy {vac_id} not found at {path}")
    return path.read_text()


def load_index() -> dict:
    return json.loads((CV_DIR / "index.json").read_text())


def load_cv_body(cid: str) -> str | None:
    path = CV_DIR / f"{cid}.md"
    return path.read_text() if path.exists() else None


def build_candidate_block(cid: str, meta: dict, full_text: str | None) -> str:
    lines = [
        f"=== {cid} ===",
        f"Role: {meta.get('primary_role')} | {meta.get('years_experience')}y | "
        f"{meta.get('region')} | {meta.get('regime')}",
        f"Languages: {', '.join(meta.get('languages', []))}",
        f"Stack: {', '.join(meta.get('primary_stack', []))}",
        f"Key employers: {', '.join(meta.get('key_employers', []))}",
        f"Summary: {meta.get('summary', '')}",
    ]
    if full_text:
        # Include full body but cap at 3 000 chars to control token usage
        lines.append("\n[Full CV — excerpt]\n" + full_text[:3000])
    return "\n".join(lines)


# ── Claude call ───────────────────────────────────────────────────────────────
def call_claude(vacancy_text: str, vac_id: str, candidate_blocks: str) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        sys.exit(
            "ANTHROPIC_API_KEY not set.\n"
            "Copy .env.example → .env and add your key, then re-run."
        )

    client = Anthropic(api_key=api_key)

    user_content = (
        f"VACANCY ({vac_id}):\n{vacancy_text}\n\n"
        f"ELIGIBLE CANDIDATES:\n{candidate_blocks}"
    )

    msg = client.messages.create(
        model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6"),
        max_tokens=4096,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},  # cache system prompt
            }
        ],
        messages=[{"role": "user", "content": user_content}],
    )

    raw = msg.content[0].text.strip()
    # Strip accidental markdown fences if the model added them
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

    return json.loads(raw)


# ── Main ──────────────────────────────────────────────────────────────────────
def match(vac_id: str, use_full_cvs: bool = False) -> dict:
    vacancy_text = load_vacancy(vac_id)
    index = load_index()
    reqs = VACANCY_HARD_REQS.get(vac_id, {})

    # Step 1 — hard filter
    passed: list[str] = []
    filtered_out: list[dict] = []
    for cid, meta in index.items():
        ok, reason = apply_hard_filter(cid, meta, reqs)
        if ok:
            passed.append(cid)
        else:
            filtered_out.append({"candidate_id": cid, "reason": reason})

    print(
        f"[{vac_id}] pool={len(index)}  passed={len(passed)}  filtered={len(filtered_out)}",
        file=sys.stderr,
    )

    if not passed:
        sys.exit("All candidates were filtered out — check VACANCY_HARD_REQS.")

    # Step 2 — build context for each eligible candidate
    blocks = []
    for cid in passed:
        meta = index[cid]
        full_text = load_cv_body(cid) if use_full_cvs else None
        blocks.append(build_candidate_block(cid, meta, full_text))

    candidate_context = "\n\n".join(blocks)

    # Step 3 — LLM ranking
    result = call_claude(vacancy_text, vac_id, candidate_context)

    # Step 4 — enrich output
    result["generated_at"] = datetime.now(timezone.utc).isoformat()
    result["pool_size"] = len(index)
    result["eligible_count"] = len(passed)
    result["hard_filtered_count"] = len(filtered_out)
    result["filtered_out"] = filtered_out

    return result


# ── CLI ───────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="WE+ candidate matcher")
    parser.add_argument("vacancy_id", nargs="?", default="VAC-001",
                        help="Vacancy ID, e.g. VAC-001 (default: VAC-001)")
    parser.add_argument("--full", action="store_true",
                        help="Use full CV markdown bodies (better signal, more tokens)")
    parser.add_argument("--out", metavar="PATH",
                        help="Write JSON output to file instead of stdout")
    parser.add_argument("--list", action="store_true",
                        help="List available vacancy IDs and exit")
    args = parser.parse_args()

    if args.list:
        ids = sorted(p.stem for p in VAC_DIR.glob("VAC-*.md"))
        print("\n".join(ids))
        return

    result = match(args.vacancy_id, use_full_cvs=args.full)
    output = json.dumps(result, indent=2, ensure_ascii=False)

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(output)
        print(f"Written to {out_path}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
