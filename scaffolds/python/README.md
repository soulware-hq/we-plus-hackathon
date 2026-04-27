# Python scaffold

Stack: `uv` + `anthropic` SDK.

## Setup

```bash
# install uv if you don't have it
curl -LsSf https://astral.sh/uv/install.sh | sh

# from this dir
cp ../../.env.example ../../.env
# edit ../../.env, paste ANTHROPIC_API_KEY

# run
uv run match.py VAC-001
```

## Files

- `pyproject.toml` — deps (`anthropic`, `python-dotenv`)
- `match.py` — minimal starter (~50 lines)

## Where to go next

`match.py` is intentionally bare — it reads the *summaries* from `index.json` (cheap), not full CV bodies. To get better matches, read `data/cvs/CAND-*.md` for the candidates that pass your hard filters, then re-rank with the full content.

Other ideas: parallel calls (use `anthropic.AsyncAnthropic`), caching, embedding-based pre-filter, motivation text generation.
