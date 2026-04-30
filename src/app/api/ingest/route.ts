import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let type: string | null = null;
    let text: string | null = null;
    let file: File | null = null;
    let nameOverride: string | null = null;
    let locationOverride: string | null = null;
    let extension = '.txt';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      type = formData.get('type') as string;
      text = formData.get('text') as string;
      file = formData.get('file') as File;
      nameOverride = formData.get('name') as string;
      locationOverride = formData.get('location') as string;
      
      if (file) {
        const name = file.name;
        extension = path.extname(name);
      }
    } else {
      const body = await req.json();
      type = body.type;
      text = body.text;
      nameOverride = body.name;
      locationOverride = body.location;
    }

    if (!type || (!text && !file)) {
      return NextResponse.json({ error: "Missing type, text, or file" }, { status: 400 });
    }

    if (type !== 'cv' && type !== 'vacancy') {
      return NextResponse.json({ error: "Invalid type. Must be 'cv' or 'vacancy'" }, { status: 400 });
    }

    // Write text or file to a temporary file
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }
    
    const tmpFile = path.join(tmpDir, `upload_${Date.now()}${extension}`);
    
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(tmpFile, buffer);
    } else if (text) {
      fs.writeFileSync(tmpFile, text, 'utf-8');
    }

    // Run the Python ingest script
    const pyDir = path.join(process.cwd(), 'scaffolds', 'python');
    let cmd = `uv run ingest.py ${type} "${tmpFile}"`;
    if (nameOverride) cmd += ` --name "${nameOverride.replace(/"/g, '\\"')}"`;
    if (locationOverride) cmd += ` --location "${locationOverride.replace(/"/g, '\\"')}"`;

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: pyDir,
      env: { ...process.env } // inherit PATH and Next.js envs
    });

    // Cleanup the temporary file
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }

    // Try to find the JSON output in the script's stdout
    const lines = stdout.split('\n');
    let resultJson = null;
    for (const line of lines) {
      if (line.startsWith('{') && line.includes('"status": "success"')) {
        try {
          resultJson = JSON.parse(line);
          break;
        } catch (e) {
          // ignore parsing error
        }
      }
    }

    if (!resultJson) {
      console.error("Python stderr:", stderr);
      return NextResponse.json({ error: "Ingestion script failed or returned invalid output", stderr }, { status: 500 });
    }

    return NextResponse.json(resultJson);

  } catch (error: any) {
    console.error("Failed to ingest data:", error);
    return NextResponse.json({ error: "Failed to ingest data", details: error.message }, { status: 500 });
  }
}
