---
name: weplus-talentmatch-context
description: Core context, rules, and architecture guidelines for the WE+ TalentMatch AI Dashboard.
---

# WE+ TalentMatch AI Dashboard - Context & Rules

This project is an AI-powered recruitment dashboard developed for a WE+ consultancy hackathon. The platform matches consulting candidates to client vacancies using structured AI reasoning, offering a premium UI to consultants.

## 🏛️ Architecture & Stack
- **Frontend**: Next.js 16 (App Router), React, TypeScript.
- **Styling**: CSS Modules (`page.module.css`) with a dark, premium, glassmorphism aesthetic. No Tailwind unless explicitly requested.
- **Backend / AI Engine**: 
  - Next.js API Routes (`src/app/api/...`) that orchestrate requests.
  - Python (`scaffolds/python/match.py`) utilizing the **Anthropic API** for heavy lifting and LLM inference.
- **Data Layer**: 
  - File-based database. 
  - Candidates: `data/cvs/*.md` and `data/cvs/index.json`.
  - Vacancies: `data/vacancies/*.md` and `data/vacancies/index.json`.
  - Match Results: Saved locally as `scaffolds/python/results/*.json`.

## 🎨 UI/UX Guidelines
- **Aesthetic**: Premium, sleek, dark mode, glassmorphism UI. Avoid bright white backgrounds. Use the established CSS variables (`--glass-bg`, `--glass-border`, `--primary`, `--cta`).
- **Layouts**: 
  - Sidebar for navigation between "Vacancies", "Candidates", and "Follow Up" tabs.
  - Kanban Board for tracking candidates through stages (Suggested, Interviewing, Offered, Rejected).
- **Interactions**: Highly responsive filtering. Filters should search through names, skills, and full markdown text of CVs.

## 🧠 AI Matching Rules (`match.py`)
When modifying the matching engine, adhere to these strict prompt engineering rules:
1. **Schema Drift**: The matching prompt must handle various CV structures (table-based, chronological, project-by-project). Do not assume a uniform schema.
2. **Deduplication**: Never list the same candidate twice in a match. Some CVs exist in multiple formats (e.g., Privatum template vs. LinkedIn export) but belong to the same person.
3. **Structured Outputs**: The AI must return valid JSON containing:
   - `rank` (integer)
   - `score` (overall match percentage)
   - `sub_scores` (Skills, Seniority, Industry out of 10)
   - `reason` (A short justification)
   - `evidence` (Exact, verbatim quotes extracted from the CV to defend the score)
   - `gaps` (Callouts of missing requirements or dealbreakers)
4. **Resilience**: The matcher must survive poor formatting (e.g., weird character spacing like "Informat on Secur ty Off cer") without failing.

## 📁 Key Directories
- `src/app/page.tsx`: The primary dashboard UI, housing the Sidebar, Data details, Match Results, and Kanban views.
- `src/app/api/data/route.ts`: Fetches base vacancies and CVs, including injecting `.md` descriptions.
- `src/app/api/match/route.ts`: API endpoint that executes `match.py`.
- `src/app/api/followup/route.ts`: API endpoint that retrieves historical match `.json` results for the Kanban board.
- `scaffolds/python/results/`: Local cache directory for AI output.

## 🛠️ Git & Deployment
- The primary remote for this hackathon is **`crew1`**: `https://github.com/weplus-benelux/crew1.git`.
- When pushing updates, ALWAYS use: `git push crew1 main -f` to ensure the correct repository is updated.
