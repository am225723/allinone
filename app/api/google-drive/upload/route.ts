import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export const runtime = 'nodejs';

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizePrivateKey(k: string) {
  // Handles keys pasted into env vars with escaped newlines
  return k.replace(/\\n/g, '\n');
}

export async function POST(req: Request) {
  try {
    const email = requiredEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const privateKey = normalizePrivateKey(requiredEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'));

    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file (multipart field: file)' }, { status: 400 });
    }

    const folderId = (form.get('folderId') as string) || process.env.GOOGLE_DRIVE_FOLDER_ID || undefined;
    const filename = (form.get('filename') as string) || file.name || 'upload';

    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const buffer = Buffer.from(await file.arrayBuffer());
    const media = {
      mimeType: file.type || 'application/octet-stream',
      body: Readable.from(buffer),
    };

    const requestBody: any = { name: filename };
    if (folderId) requestBody.parents = [folderId];

    const created = await drive.files.create({
      requestBody,
      media,
      fields: 'id,name,webViewLink,webContentLink',
    });

    return NextResponse.json({
      id: created.data.id,
      name: created.data.name,
      webViewLink: created.data.webViewLink,
      webContentLink: created.data.webContentLink,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Google Drive upload failed' },
      { status: 500 }
    );
  }
}
