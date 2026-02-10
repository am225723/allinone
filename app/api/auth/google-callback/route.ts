import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/gmail/accounts?error=' + encodeURIComponent(error), request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/gmail/accounts?error=no_code', request.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/gmail/accounts?error=oauth_not_configured', request.url));
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const tokenError = await tokenRes.text();
      console.error('Token exchange error:', tokenError);
      return NextResponse.redirect(new URL('/gmail/accounts?error=token_exchange_failed', request.url));
    }

    const tokens = await tokenRes.json();

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(new URL('/gmail/accounts?error=profile_fetch_failed', request.url));
    }

    const profile = await profileRes.json();

    const { error: dbError } = await supabaseServer
      .from('gmail_accounts')
      .upsert({
        email: profile.email,
        name: profile.name || profile.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

    if (dbError) {
      console.error('DB error saving Gmail account:', dbError);
      return NextResponse.redirect(new URL('/gmail/accounts?error=save_failed', request.url));
    }

    return NextResponse.redirect(new URL('/gmail/accounts?success=true', request.url));
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    return NextResponse.redirect(new URL('/gmail/accounts?error=unknown', request.url));
  }
}
