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

async function migrateData() {
  const rootDir = path.join(__dirname, '..');
  
  // 1. Migrate Vacancies
  const vacIndexPath = path.join(rootDir, 'data', 'vacancies', 'index.json');
  if (fs.existsSync(vacIndexPath)) {
    const vacIndex = JSON.parse(fs.readFileSync(vacIndexPath, 'utf-8'));
    
    for (const [id, vac] of Object.entries(vacIndex)) {
      if (id === '_meta') continue;
      
      const mdPath = path.join(rootDir, 'data', 'vacancies', `${id}.md`);
      let description = '';
      if (fs.existsSync(mdPath)) {
        description = fs.readFileSync(mdPath, 'utf-8');
      }
      
      const { error } = await supabase.from('vacancies').upsert({
        id: id,
        title: vac.title || null,
        region: vac.region || null,
        language: vac.language || null,
        duration: vac.duration || null,
        end_client: vac.end_client || null,
        start: vac.start || null,
        description: description
      });
      
      if (error) console.error(`Error upserting vacancy ${id}:`, error);
      else console.log(`Upserted vacancy ${id}`);
    }
  }

  // 2. Migrate Candidates
  const candIndexPath = path.join(rootDir, 'data', 'cvs', 'index.json');
  if (fs.existsSync(candIndexPath)) {
    const candIndex = JSON.parse(fs.readFileSync(candIndexPath, 'utf-8'));
    
    for (const [id, cand] of Object.entries(candIndex)) {
      if (id === '_meta') continue;
      
      const mdPath = path.join(rootDir, 'data', 'cvs', `${id}.md`);
      let description = '';
      if (fs.existsSync(mdPath)) {
        description = fs.readFileSync(mdPath, 'utf-8');
      }
      
      const { error } = await supabase.from('candidates').upsert({
        id: id,
        name: cand.name || null,
        primary_role: cand.primary_role || null,
        years_experience: cand.years_experience || 0,
        primary_stack: cand.primary_stack || [],
        languages: cand.languages || [],
        description: description
      });
      
      if (error) console.error(`Error upserting candidate ${id}:`, error);
      else console.log(`Upserted candidate ${id}`);
    }
  }
  
  console.log("Migration complete!");
}

migrateData();
