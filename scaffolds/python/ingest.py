import json
import os
import sys
import anthropic
from dotenv import load_dotenv

load_dotenv()

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CVS_INDEX = os.path.join(BASE_DIR, "data", "cvs", "index.json")
VAC_INDEX = os.path.join(BASE_DIR, "data", "vacancies", "index.json")

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def ingest_cv(file_path):
    print(f"Ingesting CV: {file_path}")
    with open(file_path, "r") as f:
        content = f.read()
    
    prompt = f"""
    Extract structured data from this CV for a Talent Matching system.
    Return ONLY a JSON object matching this schema:
    {{
        "id": "CAND-XXX",
        "primary_role": "Title",
        "years_experience": int,
        "primary_stack": ["Skill1", "Skill2"],
        "region": "City/Region",
        "languages": ["Language1", "Language2"],
        "summary": "Short 1-2 sentence summary",
        "key_employers": ["Company1", "Company2"]
    }}
    
    CV Content:
    {content}
    """
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=1000,
        messages=[{{"role": "user", "content": prompt}}]
    )
    
    data = json.loads(response.content[0].text)
    
    # Load index
    with open(CVS_INDEX, "r") as f:
        index = json.load(f)
    
    # Update index
    index[data["id"]] = data
    
    with open(CVS_INDEX, "w") as f:
        json.dump(index, f, indent=2)
        
    print(f"✅ CV {data['id']} ingested into index.json")

def ingest_vacancy(file_path):
    print(f"Ingesting Vacancy: {file_path}")
    with open(file_path, "r") as f:
        content = f.read()
    
    prompt = f"""
    Extract structured data from this Job Description.
    Return ONLY a JSON object matching this schema:
    {{
        "id": "VAC-XXX",
        "title": "Job Title",
        "client": "Company Name",
        "location": "City",
        "full_description": "The complete markdown text of the job description"
    }}
    
    JD Content:
    {content}
    """
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=2000,
        messages=[{{"role": "user", "content": prompt}}]
    )
    
    data = json.loads(response.content[0].text)
    
    # Load index
    with open(VAC_INDEX, "r") as f:
        index = json.load(f)
    
    # Update index
    index[data["id"]] = data
    
    with open(VAC_INDEX, "w") as f:
        json.dump(index, f, indent=2)
        
    print(f"✅ Vacancy {data['id']} ingested into index.json")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python ingest.py [cv|vac] [path_to_md]")
        sys.exit(1)
    
    mode = sys.argv[1]
    path = sys.argv[2]
    
    if mode == "cv":
        ingest_cv(path)
    elif mode == "vac":
        ingest_vacancy(path)
    else:
        print("Invalid mode. Use 'cv' or 'vac'.")
