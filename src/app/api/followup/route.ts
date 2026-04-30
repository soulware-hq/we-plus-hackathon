import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data: followups, error } = await supabase.from('followups').select('*, candidates(name)');
    
    if (error) throw error;
    
    // Group by vacancy_id to match original JSON structure
    const groupedResults: Record<string, any> = {};
    
    for (const f of followups) {
      if (!groupedResults[f.vacancy_id]) {
        groupedResults[f.vacancy_id] = {
          vacancy_id: f.vacancy_id,
          matches: [],
          generated_at: f.created_at
        };
      }
      
      groupedResults[f.vacancy_id].matches.push({
        id: f.id,
        rank: f.rank,
        candidate_id: f.candidate_id,
        name: f.candidates?.name || f.candidate_id,
        score: f.score,
        sub_scores: f.sub_scores,
        evidence: f.evidence,
        gaps: f.gaps,
        reason: f.reason,
        stage: f.stage
      });
    }
    
    // Convert object back to array
    const allResults = Object.values(groupedResults);
    
    return NextResponse.json({ results: allResults });
  } catch (error) {
    console.error("Failed to read follow up data from Supabase:", error);
    return NextResponse.json({ error: "Failed to load follow up data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vacancy_id, candidate_id, rank, score, sub_scores, reason, evidence, gaps, stage } = body;

    if (!vacancy_id || !candidate_id) {
      return NextResponse.json({ error: "Missing vacancy_id or candidate_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('followups')
      .insert([{
        vacancy_id,
        candidate_id,
        rank,
        score,
        sub_scores,
        reason,
        evidence,
        gaps,
        stage: stage || 'Suggested'
      }])
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Failed to save follow up:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
