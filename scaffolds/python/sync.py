import json
import os
import re

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DASHBOARD_PATH = os.path.join(BASE_DIR, "dashboard.html")
CVS_INDEX = os.path.join(BASE_DIR, "data", "cvs", "index.json")
VAC_INDEX = os.path.join(BASE_DIR, "data", "vacancies", "index.json")
RESULTS_DIR = os.path.join(BASE_DIR, "scaffolds", "python", "results")

def update_dashboard():
    print(f"Syncing data into {DASHBOARD_PATH}...")
    
    # 1. Load Data
    with open(CVS_INDEX, "r") as f:
        candidates = json.load(f)
    
    with open(VAC_INDEX, "r") as f:
        vacancies = json.load(f)
        
    # 2. Aggregrate Results
    match_results = {}
    if os.path.exists(RESULTS_DIR):
        for filename in os.listdir(RESULTS_DIR):
            if filename.endswith(".json"):
                with open(os.path.join(RESULTS_DIR, filename), "r") as f:
                    data = json.load(f)
                    match_results[data["vacancy_id"]] = data["matches"]

    # 3. Read Dashboard
    with open(DASHBOARD_PATH, "r") as f:
        content = f.read()

    # 4. Replace Candidates
    content = replace_marker(content, "CANDIDATES", f"const CANDIDATES = {json.dumps(candidates, indent=2)};")
    
    # 5. Replace Vacancies
    content = replace_marker(content, "VACANCIES", f"const VACANCIES = {json.dumps(vacancies, indent=2)};")
    
    # 6. Replace Matches
    content = replace_marker(content, "MATCHES", f"const MATCH_RESULTS = {json.dumps(match_results, indent=2)};")

    # 7. Write back
    with open(DASHBOARD_PATH, "w") as f:
        f.write(content)
    
    print("✅ Dashboard synced successfully!")

def replace_marker(content, marker_name, replacement):
    start_marker = f"/* SYNC_MARKER:{marker_name}_START */"
    end_marker = f"/* SYNC_MARKER:{marker_name}_END */"
    
    pattern = re.compile(re.escape(start_marker) + ".*?" + re.escape(end_marker), re.DOTALL)
    match = pattern.search(content)
    
    if not match:
        print(f"⚠️ Warning: Marker {marker_name} not found.")
        return content
        
    return content[:match.start()] + f"{start_marker}\n{replacement}\n{end_marker}" + content[match.end():]

if __name__ == "__main__":
    update_dashboard()
