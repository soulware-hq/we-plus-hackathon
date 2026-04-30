import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars if we can, or just expect them in process.env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateFollowups() {
  const rootDir = path.join(__dirname, '..');
  const resultsDir = path.join(rootDir, 'scaffolds', 'python', 'results');
  
  if (!fs.existsSync(resultsDir)) {
    console.log("No results directory found");
    return;
  }
  
  const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf-8'));
    if (!data.vacancy_id || !data.matches) continue;
    
    for (const match of data.matches) {
      const { error } = await supabase.from('followups').insert({
        vacancy_id: data.vacancy_id,
        candidate_id: match.candidate_id,
        rank: match.rank,
        score: match.score,
        sub_scores: match.sub_scores,
        reason: match.reason,
        evidence: match.evidence,
        gaps: match.gaps,
        stage: 'Suggested'
      });
      if (error) console.error(`Error inserting follow up for ${match.candidate_id}:`, error);
      else console.log(`Inserted followup for ${data.vacancy_id} - ${match.candidate_id}`);
    }
  }
  console.log("Followup Migration complete!");
}

migrateFollowups();
