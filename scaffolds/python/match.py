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

CRITICAL INSTRUCTIONS:
1. DEDUPLICATE: The pool contains duplicates (same person, different formats). Identify them based on name, employers, and timelines. If you see two candidates that are obviously the same person, pick the BEST match and ignore the other. NEVER return the same person twice in your top 3.
2. ROBUSTNESS: Be resilient to broken text formatting (e.g. "Informat on Secur ty Off cer"). Schema drift is real.
3. TACIT EXPERIENCE: Look for tacit signals (e.g., "Led a team through M&A" shows seniority) instead of just keyword grepping.
4. CALIBRATION: Spread your scores realistically (e.g., 40-95%). Not everyone is a 92. If no candidate is a strong fit, score them low and output realistic reasoning.
5. RANK: You MUST return exactly {top_n} candidates (if there are at least that many eligible unique persons). Rank them accordingly.
6. VOLUME: If you cannot find {top_n} good candidates, return as many as are reasonably close matches, but try to hit the target.

SCORING WEIGHTS:
  • Skill match (0-10)        — recent stack vs. requirements. Penalise generic language ("dynamic team player" with no projects).
  • Experience level (0-10)   — seniority / years align with vacancy.
  • Industry relevance (0-10) — recent projects in similar sector.

RETURN — valid JSON only, no markdown fences, no prose outside the object:
{{
  "vacancy_id": "VAC-XXX",
  "matches": [
    {{
      "rank": 1,
      "candidate_id": "CAND-NNN",
      "name": "Extract Name from CV or use ID",
      "score": 0.85,
      "sub_scores": {{
        "skills": 8,
        "seniority": 9,
        "industry": 8
      }},
      "evidence": [
        "EXACT QUOTE FROM CV showing skill (e.g., 'Led migration to Spring Boot in 2023')",
        "EXACT QUOTE FROM CV showing industry experience"
      ],
      "gaps": [
        "Missing AWS certification",
        "No recent React projects"
      ],
      "reason": "One-sentence sharp justification why they match. NO FLUFF. STRAIGHT TO THE POINT.",
      "motivation_nl": "1 paragraph Dutch, client-ready, paste-able into a response email. No candidate name."
    }}
  ]
}}
Return exactly {top_n} matches, sorted by score descending."""


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
import os
from supabase import create_client, Client

def get_supabase() -> Client:
    url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if not url or not key:
        sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.")
    return create_client(url, key)

def load_vacancy(vac_id: str) -> str:
    supabase = get_supabase()
    response = supabase.table("vacancies").select("description").eq("id", vac_id).execute()
    if not response.data:
        sys.exit(f"Vacancy {vac_id} not found in database")
    return response.data[0].get("description", "") or ""


def load_index() -> dict:
    supabase = get_supabase()
    response = supabase.table("candidates").select("*").execute()
    
    index = {}
    for cand in response.data:
        # Reconstruct the meta dictionary layout expected by the script
        index[cand["id"]] = {
            "name": cand.get("name"),
            "primary_role": cand.get("primary_role"),
            "years_experience": cand.get("years_experience"),
            "primary_stack": cand.get("primary_stack", []),
            "languages": cand.get("languages", []),
            "description": cand.get("description", "")
        }
    return index


def load_cv_body(cid: str) -> str | None:
    # We already fetched 'description' in load_index, but to preserve the API signature:
    supabase = get_supabase()
    response = supabase.table("candidates").select("description").eq("id", cid).execute()
    if not response.data:
        return None
    return response.data[0].get("description", "")


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
def call_claude(vacancy_text: str, vac_id: str, candidate_blocks: str, result_limit: int = 3) -> dict:
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
    
    # Inject top_n into the system prompt
    current_system_prompt = SYSTEM_PROMPT.format(top_n=result_limit)

    msg = client.messages.create(
        model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6"),
        max_tokens=4096,
        system=[
            {
                "type": "text",
                "text": current_system_prompt,
                "cache_control": {"type": "ephemeral"},  # cache system prompt
            }
        ],
        messages=[{"role": "user", "content": user_content}],
    )

    raw = msg.content[0].text.strip()
    
    # Robust JSON extraction: look for the outermost curly braces
    import re
    json_match = re.search(r'(\{.*\})', raw, re.DOTALL)
    if json_match:
        raw = json_match.group(1)
    else:
        # Fallback to the original logic if regex fails
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

    if not raw:
        raise ValueError("Claude returned an empty response")

    return json.loads(raw)


# ── Main ──────────────────────────────────────────────────────────────────────
def match(vac_id: str, use_full_cvs: bool = False, target_candidates: list[str] = None, result_limit: int = 3) -> dict:
    vacancy_text = load_vacancy(vac_id)
    index = load_index()
    
    if target_candidates:
        # Filter pool to only selected candidates
        index = {k: v for k, v in index.items() if k in target_candidates}
        if not index:
            sys.exit(f"None of the requested candidates {target_candidates} were found in index.")

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
    result = call_claude(vacancy_text, vac_id, candidate_context, result_limit=result_limit)

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
    parser.add_argument("--candidates", help="Comma-separated candidate IDs to include (restricts pool)")
    parser.add_argument("--top", type=int, default=3, help="Number of top candidates to return (default: 3)")
    parser.add_argument("--list", action="store_true",
                        help="List available vacancy IDs and exit")
    args = parser.parse_args()

    if args.list:
        ids = sorted(p.stem for p in VAC_DIR.glob("VAC-*.md"))
        print("\n".join(ids))
        return

    target_cands = None
    if args.candidates:
        target_cands = [c.strip() for c in args.candidates.split(",") if c.strip()]

    result = match(args.vacancy_id, use_full_cvs=args.full, target_candidates=target_cands, result_limit=args.top)
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
