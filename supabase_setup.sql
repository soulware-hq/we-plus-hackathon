-- Create the Vacancies table
CREATE TABLE vacancies (
  id TEXT PRIMARY KEY,
  title TEXT,
  region TEXT,
  language TEXT,
  duration TEXT,
  end_client TEXT,
  start TEXT,
  description TEXT
);

-- Create the Candidates table
CREATE TABLE candidates (
  id TEXT PRIMARY KEY,
  primary_role TEXT,
  years_experience INTEGER,
  primary_stack TEXT[],
  languages TEXT[],
  description TEXT,
  name TEXT,
  location TEXT
);

-- Create the Follow up table (for Kanban board state and AI matching scores)
CREATE TABLE followups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vacancy_id TEXT REFERENCES vacancies(id),
  candidate_id TEXT REFERENCES candidates(id),
  rank INTEGER,
  score FLOAT,
  sub_scores JSONB,
  reason TEXT,
  evidence JSONB,
  gaps JSONB,
  stage TEXT DEFAULT 'Suggested',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Optional: Setup Row Level Security (RLS)
-- If this is a quick hackathon, you can disable RLS or just create an open policy for the anon key.
-- Run these to allow public read/write (ONLY DO THIS FOR A HACKATHON/PROTOTYPE! NOT SECURE FOR PRODUCTION)
ALTER TABLE vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for vacancies" ON vacancies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for candidates" ON candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for followups" ON followups FOR ALL USING (true) WITH CHECK (true);
