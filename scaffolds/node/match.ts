/**
 * Minimal matcher starter — Bun/TypeScript.
 *
 * Run:
 *     bun run match.ts VAC-001
 *
 * What it does:
 *     - Reads the vacancy markdown
 *     - Reads all 54 CV summaries from data/cvs/index.json
 *     - Asks Claude to rank the top 5 candidates with reasons
 *
 * What you're expected to improve:
 *     - Read full CV bodies, not just index summaries (better signal, more tokens)
 *     - Add hard-filter logic before LLM call (regime, language, region)
 *     - Output structured JSON, not free text
 *     - Score calibration, anti-signals, motivation text generation
 *     - Make it fast (parallel calls, caching, smaller prompts)
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VAC_DIR = join(REPO, "data", "vacancies");
const CV_DIR = join(REPO, "data", "cvs");

type CandidateMeta = {
  id: string;
  primary_role: string;
  primary_stack: string[];
  years_experience: number | null;
  languages: string[];
  region: string;
  regime: string;
  key_employers: string[];
  summary: string;
};

async function loadVacancy(vacId: string): Promise<string> {
  return await readFile(join(VAC_DIR, `${vacId}.md`), "utf-8");
}

async function loadCandidateIndex(): Promise<Record<string, CandidateMeta>> {
  return JSON.parse(await readFile(join(CV_DIR, "index.json"), "utf-8"));
}

async function match(vacId: string): Promise<string> {
  const vacancy = await loadVacancy(vacId);
  const candidates = await loadCandidateIndex();

  const candidateSummaries = Object.entries(candidates)
    .map(
      ([cid, m]) =>
        `- ${cid}: ${m.summary ?? ""} | role=${m.primary_role} | years=${m.years_experience} | regime=${m.regime} | region=${m.region} | stack=${(m.primary_stack ?? []).slice(0, 5).join(", ")}`,
    )
    .join("\n");

  const prompt = `You are an expert technical recruiter at a Belgian IT consulting firm.
A vacancy just came in. Rank the top 5 candidates from the pool by fit.
For each, give a one-sentence reason. Surface real risks (e.g. missing key tech).

VACANCY:
${vacancy}

CANDIDATE POOL (${Object.keys(candidates).length} consultants, summary only):
${candidateSummaries}

Output as JSON:
{
  "vacancy_id": "${vacId}",
  "matches": [
    {"candidate_id": "CAND-NNN", "score": 0.0-1.0, "reason": "...", "risks": ["..."]}
  ]
}
`;

  const client = new Anthropic();
  const msg = await client.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const block = msg.content[0];
  return block.type === "text" ? block.text : JSON.stringify(block);
}

const vacArg = process.argv[2] ?? "VAC-001";
console.log(await match(vacArg));
