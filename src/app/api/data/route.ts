import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const dataDir = join(process.cwd(), 'data');
    
    // Read CVs
    const cvsIndex = join(dataDir, 'cvs', 'index.json');
    const cvsData = JSON.parse(readFileSync(cvsIndex, 'utf-8'));
    
    // Read Vacancies
    const vacIndex = join(dataDir, 'vacancies', 'index.json');
    const vacData = JSON.parse(readFileSync(vacIndex, 'utf-8'));
    
    return NextResponse.json({
      candidates: cvsData,
      vacancies: vacData
    });
  } catch (error) {
    console.error("Failed to read data:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
