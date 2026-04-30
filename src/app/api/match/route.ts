import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vacancyId, candidateIds, limit = 3 } = body;

    if (!vacancyId) {
      return NextResponse.json({ error: "vacancyId is required" }, { status: 400 });
    }

    const pythonBin = process.cwd() + '/scaffolds/python/.venv/bin/python3';
    const scriptPath = process.cwd() + '/scaffolds/python/match.py';
    const outPath = process.cwd() + `/scaffolds/python/results/${vacancyId}.json`;

    let command = `${pythonBin} ${scriptPath} ${vacancyId} --out ${outPath} --top ${limit}`;
    
    if (candidateIds && Array.isArray(candidateIds) && candidateIds.length > 0) {
      command += ` --candidates ${candidateIds.join(',')}`;
    }

    // Execute the python matching script
    const { stdout, stderr } = await execAsync(command, { cwd: process.cwd() });
    console.log("Python output:", stdout);
    if (stderr) console.error("Python stderr:", stderr);

    // Read the result
    if (existsSync(outPath)) {
      const resultData = JSON.parse(readFileSync(outPath, 'utf-8'));
      return NextResponse.json(resultData);
    } else {
      return NextResponse.json({ error: "Failed to generate matches" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Match API error:", error);
    return NextResponse.json({ error: error.message || "Match execution failed" }, { status: 500 });
  }
}
