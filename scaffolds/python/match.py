"""Minimal matcher starter — Python.

Run:
    uv run match.py VAC-001

What it does:
    - Reads the vacancy markdown
    - Reads all 54 CV summaries from data/cvs/index.json
    - Asks Claude to rank the top 5 candidates with reasons

What you're expected to improve:
    - Read full CV bodies, not just index summaries (better signal, more tokens)
    - Add hard-filter logic before LLM call (regime, language, region)
    - Output structured JSON, not free text
    - Score calibration, anti-signals, motivation text generation
    - Make it fast (parallel calls, caching, smaller prompts)
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

REPO = Path(__file__).resolve().parents[2]
VAC_DIR = REPO / "data" / "vacancies"
CV_DIR = REPO / "data" / "cvs"


def load_vacancy(vac_id: str) -> str:
    return (VAC_DIR / f"{vac_id}.md").read_text()


def load_candidate_index() -> dict:
    return json.loads((CV_DIR / "index.json").read_text())


def match(vac_id: str) -> str:
    vacancy = load_vacancy(vac_id)
    candidates = load_candidate_index()

    # Compact one-liner per candidate (cheap prompt)
    candidate_summaries = "\n".join(
        f"- {cid}: {meta.get('summary', '')} | role={meta.get('primary_role')} | "
        f"years={meta.get('years_experience')} | regime={meta.get('regime')} | "
        f"region={meta.get('region')} | stack={', '.join(meta.get('primary_stack', [])[:5])}"
        for cid, meta in candidates.items()
    )

    prompt = f"""You are an expert technical recruiter at a Belgian IT consulting firm.
A vacancy just came in. Rank the top 5 candidates from the pool by fit.
For each, give a one-sentence reason. Surface real risks (e.g. missing key tech).

VACANCY:
{vacancy}

CANDIDATE POOL ({len(candidates)} consultants, summary only):
{candidate_summaries}

Output as JSON:
{{
  "vacancy_id": "{vac_id}",
  "matches": [
    {{"candidate_id": "CAND-NNN", "score": 0.0-1.0, "reason": "...", "risks": ["..."]}}
  ]
}}
"""

    client = Anthropic()
    msg = client.messages.create(
        model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5"),
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


if __name__ == "__main__":
    vac = sys.argv[1] if len(sys.argv) > 1 else "VAC-001"
    print(match(vac))
