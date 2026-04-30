import { NextResponse } from 'next/server';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const resultsDir = join(process.cwd(), 'scaffolds', 'python', 'results');
    
    if (!existsSync(resultsDir)) {
      return NextResponse.json({ results: [] });
    }

    const files = readdirSync(resultsDir).filter(file => file.endsWith('.json'));
    
    const allResults = [];
    
    for (const file of files) {
      const filePath = join(resultsDir, file);
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        // Make sure it has a vacancy_id to be a valid result
        if (data.vacancy_id) {
          allResults.push(data);
        }
      } catch (e) {
        console.error(`Failed to parse ${file}`, e);
      }
    }
    
    return NextResponse.json({ results: allResults });
  } catch (error) {
    console.error("Failed to read follow up data:", error);
    return NextResponse.json({ error: "Failed to load follow up data" }, { status: 500 });
  }
}
