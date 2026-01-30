import { cookies } from 'next/headers';

const ADMIN_COOKIE_NAME = 'admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || '';
}

export function getAdminEmails(): string[] {
  const emails = process.env.ADMIN_EMAILS || '';
  return emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

export function createSessionToken(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return Buffer.from(`${timestamp}:${random}`).toString('base64');
}

export function isSessionValid(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [timestamp] = decoded.split(':');
    const tokenTime = parseInt(timestamp, 10);
    return Date.now() - tokenTime < SESSION_DURATION;
  } catch {
    return false;
  }
}

export async function getAdminSession(): Promise<{ isAdmin: boolean; email?: string }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);
  
  if (!sessionCookie?.value) {
    return { isAdmin: false };
  }

  try {
    const [token, email] = sessionCookie.value.split('|');
    if (isSessionValid(token)) {
      return { isAdmin: true, email };
    }
  } catch {
    return { isAdmin: false };
  }

  return { isAdmin: false };
}
