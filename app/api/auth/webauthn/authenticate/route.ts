import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticationOptions, verifyAuthentication, hasAnyRegisteredCredentials, storeChallenge, getAndDeleteChallenge } from '@/lib/webauthn';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkOnly = searchParams.get('checkOnly') === 'true';

    const hasCredentials = await hasAnyRegisteredCredentials();
    if (!hasCredentials) {
      return NextResponse.json({ available: false });
    }

    if (checkOnly) {
      return NextResponse.json({ available: true });
    }

    const options = await getAuthenticationOptions();

    const sessionId = `auth_${crypto.randomUUID()}`;
    await storeChallenge(sessionId, options.challenge, 'authentication');

    return NextResponse.json({ ...options, sessionId, available: true });
  } catch (error) {
    console.error('WebAuthn authentication options error:', error);
    return NextResponse.json({ error: 'Failed to generate authentication options' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { response: credential, sessionId } = body;

    if (!credential || !sessionId) {
      return NextResponse.json({ error: 'Missing credential or session' }, { status: 400 });
    }

    const stored = await getAndDeleteChallenge(sessionId, 'authentication');
    if (!stored) {
      return NextResponse.json({ error: 'Challenge expired or invalid' }, { status: 400 });
    }

    const { verified, userId } = await verifyAuthentication(credential, stored.challenge);

    if (!verified) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, userId });
    
    response.cookies.set('pin_authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    response.cookies.set('user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    response.cookies.set('user_role', 'user', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('WebAuthn authentication verification error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
