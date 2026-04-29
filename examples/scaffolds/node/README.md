# Node scaffold

Stack: `bun` + `@anthropic-ai/sdk`.

## Setup

```bash
# install bun if you don't have it
curl -fsSL https://bun.sh/install | bash

# from this dir
bun install
cp ../../.env.example ../../.env
# edit ../../.env, paste ANTHROPIC_API_KEY

# run
bun run match.ts VAC-001
```

## Files

- `package.json` — deps (`@anthropic-ai/sdk`, `dotenv`)
- `match.ts` — minimal starter (~70 lines)

## Where to go next

`match.ts` is intentionally bare — it reads the *summaries* from `index.json` (cheap), not full CV bodies. To get better matches, read `data/cvs/CAND-*.md` for the candidates that pass your hard filters, then re-rank with the full content.

Other ideas: parallel calls (`Promise.all`), Vercel deploy with API route, embedding-based pre-filter, motivation text generation.
