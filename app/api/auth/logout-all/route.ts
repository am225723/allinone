import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  // Since we use stateless cookie authentication, we cannot invalidate other sessions without a database change.
  // This endpoint simulates "Logout All" by clearing the current session cookies.
  // In a real implementation with session tracking, this would invalidate all tokens for the user.

  const response = NextResponse.json({ ok: true, message: 'All devices logged out (local session cleared)' });

  response.cookies.delete('pin_authenticated');
  response.cookies.delete('admin_authenticated');
  response.cookies.delete('user_id');
  response.cookies.delete('user_role');

  return response;
}
