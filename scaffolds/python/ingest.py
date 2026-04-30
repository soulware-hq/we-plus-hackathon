import os
import sys
import json
import uuid
import argparse
from pathlib import Path

from anthropic import Anthropic
from supabase import create_client, Client
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)

SYSTEM_PROMPT_CV = """\
You are an expert technical recruiter at WE+, a Belgian IT consulting firm.
Your task is to extract structured metadata from the following raw CV text.

Return exactly this JSON structure and nothing else:
{
  "name": "Full name of the candidate, or 'Unknown'",
  "primary_role": "A short job title (e.g., 'Senior Java Developer')",
  "years_experience": <integer number of years>,
  "primary_stack": ["Skill1", "Skill2", "Skill3"],
  "languages": ["Dutch", "English", "French"]
}

If you cannot find a value, use a sensible default (e.g. 0 for years, empty arrays, 'Unknown').
"""

SYSTEM_PROMPT_VACANCY = """\
You are an expert technical recruiter at WE+, a Belgian IT consulting firm.
Your task is to extract structured metadata from the following raw job description (vacancy).

Return exactly this JSON structure and nothing else:
{
  "title": "A short job title (e.g., 'Senior Java Developer')",
  "region": "City or Region mentioned",
  "language": "Required languages (e.g., 'NL/EN')",
  "duration": "Contract duration (e.g., '6 months')",
  "end_client": "The end client if mentioned, else 'Unknown'",
  "start": "Expected start date or 'ASAP'"
}

If you cannot find a value, use a sensible default (e.g. 'Unknown').
"""

def get_supabase() -> Client:
    url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if not url or not key:
        sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.")
    return create_client(url, key)

def call_claude(text: str, is_cv: bool) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        sys.exit("ANTHROPIC_API_KEY not set.")

    client = Anthropic(api_key=api_key)
    system_prompt = SYSTEM_PROMPT_CV if is_cv else SYSTEM_PROMPT_VACANCY

    msg = client.messages.create(
        model=os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6"),
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": text}],
    )

    raw = msg.content[0].text.strip()
    
    # Robust JSON extraction
    json_match = re.search(r'(\{.*\})', raw, re.DOTALL)
    if json_match:
        raw = json_match.group(1)
    else:
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

    if not raw:
        return {}
    
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        print("Failed to parse JSON from Claude. Raw output:", file=sys.stderr)
        print(raw, file=sys.stderr)
        sys.exit(1)

def ingest_cv(text: str, override_name: str = None, override_location: str = None):
    print("Extracting metadata with Claude...", file=sys.stderr)
    metadata = call_claude(text, is_cv=True)
    
    supabase = get_supabase()
    cand_id = f"CAND-{uuid.uuid4().hex[:6].upper()}"
    
    name = override_name if override_name else metadata.get("name")
    location = override_location if override_location else metadata.get("location", "Unknown")

    print(f"Saving {cand_id} to Supabase...", file=sys.stderr)
    data = {
        "id": cand_id,
        "name": name,
        "location": location,
        "primary_role": metadata.get("primary_role"),
        "years_experience": metadata.get("years_experience", 0),
        "primary_stack": metadata.get("primary_stack", []),
        "languages": metadata.get("languages", []),
        "description": text
    }
    
    result = supabase.table("candidates").insert(data).execute()
    print(json.dumps({"status": "success", "id": cand_id, "data": data}))

def ingest_vacancy(text: str, override_name: str = None, override_location: str = None):
    print("Extracting metadata with Claude...", file=sys.stderr)
    metadata = call_claude(text, is_cv=False)
    
    supabase = get_supabase()
    vac_id = f"VAC-{uuid.uuid4().hex[:6].upper()}"
    
    title = override_name if override_name else metadata.get("title")
    region = override_location if override_location else metadata.get("region")

    print(f"Saving {vac_id} to Supabase...", file=sys.stderr)
    data = {
        "id": vac_id,
        "title": title,
        "region": region,
        "language": metadata.get("language"),
        "duration": metadata.get("duration"),
        "end_client": metadata.get("end_client"),
        "start": metadata.get("start"),
        "description": text
    }
    
    result = supabase.table("vacancies").insert(data).execute()
    print(json.dumps({"status": "success", "id": vac_id, "data": data}))

def parse_pdf(path: Path) -> str:
    import fitz  # PyMuPDF
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def parse_docx(path: Path) -> str:
    import docx
    doc = docx.Document(path)
    return "\n".join([p.text for p in doc.paragraphs])

def main():
    parser = argparse.ArgumentParser(description="Ingest CV or Vacancy text")
    parser.add_argument("type", choices=["cv", "vacancy"], help="Type of document")
    parser.add_argument("file", help="Path to file to ingest")
    parser.add_argument("--name", help="Override name or title")
    parser.add_argument("--location", help="Override location or region")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        sys.exit(f"File not found: {path}")

    suffix = path.suffix.lower()
    if suffix == ".pdf":
        print(f"Parsing PDF: {path}", file=sys.stderr)
        text = parse_pdf(path)
    elif suffix in [".docx", ".doc"]:
        print(f"Parsing DOCX: {path}", file=sys.stderr)
        text = parse_docx(path)
    else:
        print(f"Reading text file: {path}", file=sys.stderr)
        text = path.read_text(errors='ignore')

    if not text.strip():
        sys.exit("Extracted text is empty.")

    if args.type == "cv":
        ingest_cv(text, override_name=args.name, override_location=args.location)
    else:
        ingest_vacancy(text, override_name=args.name, override_location=args.location)

if __name__ == "__main__":
    main()
