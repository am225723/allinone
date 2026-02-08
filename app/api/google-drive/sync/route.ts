import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';

function normalizePrivateKey(k: string) {
  return k.replace(/\\n/g, '\n');
}

export async function GET() {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!email || !privateKey) {
      return NextResponse.json({ ok: false, error: 'Google Drive not configured' }, { status: 400 });
    }

    const { data: files, error } = await supabaseServer
      .from('drive_files')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!files || files.length === 0) {
      return NextResponse.json({ ok: true, total: 0, verified: 0, missing: 0, files: [] });
    }

    const auth = new google.auth.JWT({
      email,
      key: normalizePrivateKey(privateKey),
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    let verified = 0;
    let missing = 0;
    const results: any[] = [];

    for (const file of files) {
      try {
        const driveFile = await drive.files.get({
          fileId: file.drive_file_id,
          fields: 'id,name,trashed,modifiedTime',
        });

        if (driveFile.data.trashed) {
          missing++;
          await supabaseServer
            .from('drive_files')
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq('id', file.id);
          results.push({ id: file.id, name: file.file_name, status: 'deleted' });
        } else {
          verified++;
          await supabaseServer
            .from('drive_files')
            .update({ last_verified_at: new Date().toISOString() })
            .eq('id', file.id);
          results.push({ id: file.id, name: file.file_name, status: 'ok' });
        }
      } catch (err: any) {
        if (err?.code === 404) {
          missing++;
          await supabaseServer
            .from('drive_files')
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq('id', file.id);
          results.push({ id: file.id, name: file.file_name, status: 'not_found' });
        } else {
          results.push({ id: file.id, name: file.file_name, status: 'error', error: err?.message });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      total: files.length,
      verified,
      missing,
      files: results,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
