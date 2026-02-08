import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizePrivateKey(k: string) {
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
    const noteId = form.get('noteId') as string | null;
    const clientId = form.get('clientId') as string | null;

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
      fields: 'id,name,webViewLink,webContentLink,size',
    });

    if (created.data.id) {
      try {
        await supabaseServer.from('drive_files').insert({
          note_id: noteId || null,
          client_id: clientId || null,
          drive_file_id: created.data.id,
          file_name: created.data.name || filename,
          mime_type: file.type || 'application/octet-stream',
          web_view_link: created.data.webViewLink || null,
          web_content_link: created.data.webContentLink || null,
          folder_id: folderId || null,
          file_size: buffer.length,
          last_verified_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.error('Failed to track Drive file in database:', dbErr);
      }
    }

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
