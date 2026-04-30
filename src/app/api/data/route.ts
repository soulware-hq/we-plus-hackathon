import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Fetch data from Supabase
    const { data: candidatesTable, error: candError } = await supabase.from('candidates').select('*');
    const { data: vacanciesTable, error: vacError } = await supabase.from('vacancies').select('*');

    if (candError) throw candError;
    if (vacError) throw vacError;

    // Reconstruct the expected object structure
    const cvsData: Record<string, any> = { _meta: { source: "Supabase Database" } };
    for (const cand of candidatesTable) {
      cvsData[cand.id] = {
        name: cand.name,
        primary_role: cand.primary_role,
        years_experience: cand.years_experience,
        primary_stack: cand.primary_stack,
        languages: cand.languages,
        description: cand.description
      };
    }

    const vacData: Record<string, any> = { _meta: { source: "Supabase Database" } };
    for (const vac of vacanciesTable) {
      vacData[vac.id] = {
        title: vac.title,
        region: vac.region,
        language: vac.language,
        duration: vac.duration,
        end_client: vac.end_client,
        start: vac.start,
        description: vac.description
      };
    }
    
    return NextResponse.json({
      candidates: cvsData,
      vacancies: vacData
    });
  } catch (error) {
    console.error("Failed to read data from Supabase:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
