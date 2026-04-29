import sys
import os
import subprocess

def main():
    if len(sys.argv) < 2:
        print("Usage: python run.py VAC-00X")
        print("This will run the AI matching for the vacancy and sync the dashboard.")
        sys.exit(1)
        
    vac_id = sys.argv[1]
    
    # 1. Run Match
    print(f"🚀 Running AI Match for {vac_id}...")
    venv_python = "scaffolds/python/.venv/bin/python3"
    out_path = f"scaffolds/python/results/{vac_id}.json"
    match_cmd = [venv_python, "scaffolds/python/match.py", vac_id, "--out", out_path]
    
    # 1a. Handle optional candidates
    if "--candidates" in sys.argv:
        try:
            idx = sys.argv.index("--candidates")
            cands = sys.argv[idx+1]
            match_cmd.extend(["--candidates", cands])
        except IndexError:
            print("Error: --candidates requires a comma-separated list of IDs")
            sys.exit(1)
    try:
        subprocess.run(match_cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Match failed for {vac_id}")
        sys.exit(1)
        
    # 2. Run Sync
    print(f"🔄 Syncing results to dashboard...")
    sync_cmd = ["python3", "scaffolds/python/sync.py"]
    try:
        subprocess.run(sync_cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Sync failed")
        sys.exit(1)
        
    print(f"✨ Success! Dashboard updated with matches for {vac_id}")

if __name__ == "__main__":
    main()
