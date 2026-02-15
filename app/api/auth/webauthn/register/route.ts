import { NextRequest, NextResponse } from 'next/server';
import { getRegistrationOptions, verifyAndSaveRegistration, storeChallenge, getAndDeleteChallenge } from '@/lib/webauthn';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const isAuthenticated = cookieStore.get('pin_authenticated')?.value === 'true';

    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Reject registration for default user
    if (userId === 'default') {
      return NextResponse.json({ 
        error: 'Biometric authentication requires a proper user account. Please create a user account through admin settings.' 
      }, { status: 400 });
    }

    const userName = userId === 'default' ? 'User' : `User ${userId}`;
    const options = await getRegistrationOptions(userId, userName);

    const sessionId = `reg_${userId}_${crypto.randomUUID()}`;
    await storeChallenge(sessionId, options.challenge, 'registration', userId);

    return NextResponse.json({ ...options, sessionId });
  } catch (error) {
    console.error('WebAuthn registration options error:', error);
    return NextResponse.json({ error: 'Failed to generate registration options' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const isAuthenticated = cookieStore.get('pin_authenticated')?.value === 'true';

    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { response: credential, deviceName, sessionId } = body;

    if (!credential || !sessionId) {
      return NextResponse.json({ error: 'Missing credential response or session' }, { status: 400 });
    }

    const stored = await getAndDeleteChallenge(sessionId, 'registration');
    if (!stored) {
      return NextResponse.json({ error: 'Challenge expired or invalid' }, { status: 400 });
    }

    if (stored.userId !== userId) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 400 });
    }

    await verifyAndSaveRegistration(userId, credential, stored.challenge, deviceName);

    return NextResponse.json({ success: true, message: 'Biometric registered successfully' });
  } catch (error) {
    console.error('WebAuthn registration verification error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
