import { NextRequest, NextResponse } from 'next/server';
import { getUserCredentials, deleteCredential } from '@/lib/webauthn';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const isAuthenticated = cookieStore.get('pin_authenticated')?.value === 'true';

    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const credentials = await getUserCredentials(userId);
    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('Get credentials error:', error);
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const isAuthenticated = cookieStore.get('pin_authenticated')?.value === 'true';

    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get('id');

    if (!credentialId) {
      return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 });
    }

    await deleteCredential(userId, parseInt(credentialId, 10));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete credential error:', error);
    return NextResponse.json({ error: 'Failed to delete credential' }, { status: 500 });
  }
}
