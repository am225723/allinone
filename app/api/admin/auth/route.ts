import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_COOKIE_NAME = 'admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000;

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || '';
}

function getAdminEmails(): string[] {
  const emails = process.env.ADMIN_EMAILS || '';
  return emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

function createSessionToken(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return Buffer.from(`${timestamp}:${random}`).toString('base64');
}

function isSessionValid(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [timestamp] = decoded.split(':');
    const tokenTime = parseInt(timestamp, 10);
    return Date.now() - tokenTime < SESSION_DURATION;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    const adminPassword = getAdminPassword();
    const adminEmails = getAdminEmails();

    if (!adminPassword) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Admin authentication not configured' 
      }, { status: 500 });
    }

    const emailLower = email?.toLowerCase().trim();
    const isValidEmail = adminEmails.length === 0 || adminEmails.includes(emailLower);
    const isValidPassword = password === adminPassword;

    if (!isValidEmail || !isValidPassword) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Invalid credentials' 
      }, { status: 401 });
    }

    const token = createSessionToken();
    const sessionValue = `${token}|${emailLower}`;

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });

    return NextResponse.json({ 
      ok: true, 
      email: emailLower 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return NextResponse.json({ isAdmin: false });
  }

  try {
    const [token, email] = sessionCookie.value.split('|');
    if (isSessionValid(token)) {
      return NextResponse.json({ isAdmin: true, email });
    }
  } catch {
    return NextResponse.json({ isAdmin: false });
  }

  return NextResponse.json({ isAdmin: false });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
