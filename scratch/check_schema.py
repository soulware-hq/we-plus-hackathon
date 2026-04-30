import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase = create_client(url, key)

try:
    # Try to fetch one record to see columns
    res = supabase.table("candidates").select("*").limit(1).execute()
    if res.data:
        print("Columns in candidates:", list(res.data[0].keys()))
    else:
        print("No data in candidates table to inspect columns.")
except Exception as e:
    print("Error inspecting candidates table:", e)

try:
    # Try to fetch one record from vacancies to see columns
    res = supabase.table("vacancies").select("*").limit(1).execute()
    if res.data:
        print("Columns in vacancies:", list(res.data[0].keys()))
    else:
        print("No data in vacancies table to inspect columns.")
except Exception as e:
    print("Error inspecting vacancies table:", e)
