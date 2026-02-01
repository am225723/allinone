import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  const configured = !!(email && key);

  return NextResponse.json({
    configured,
    hasFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
  });
}
