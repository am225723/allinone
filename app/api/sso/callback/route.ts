import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production-use-32-char-min';
const ALLOWED_CLIENT_SITES = process.env.ALLOWED_CLIENT_SITES?.split(',') || ['https://matthew.integrativepsychiatry.xyz'];

/**
 * SSO Callback Endpoint
 * 
 * This endpoint handles SSO authentication from client sites.
 * It verifies the JWT token, creates a session, and redirects to the dashboard.
 * 
 * Flow:
 * 1. Client site generates JWT with user info
 * 2. Browser redirects to this endpoint with token
 * 3. This endpoint verifies JWT signature and client site
 * 4. Finds or creates user in database
 * 5. Creates session cookie
 * 6. Redirects to dashboard
 */

export async function GET(request: NextRequest) {
  try {
    // Get token from URL query parameter
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL('/?error=no_token', request.url)
      );
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('JWT verification failed:', error);
      return NextResponse.redirect(
        new URL('/?error=invalid_token', request.url)
      );
    }

    // Verify client site is allowed
    const clientSite = decoded.clientSite || decoded.origin;
    if (!ALLOWED_CLIENT_SITES.includes(clientSite)) {
      console.error('Unauthorized client site:', clientSite);
      return NextResponse.redirect(
        new URL('/?error=unauthorized_client', request.url)
      );
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return NextResponse.redirect(
        new URL('/?error=server_error', request.url)
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find or create user
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', decoded.email)
      .single();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      
      // Update user info if needed
      if (existingUser.name !== decoded.name) {
        await supabase
          .from('users')
          .update({
            name: decoded.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: decoded.email,
          name: decoded.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError || !newUser) {
        console.error('Failed to create user:', createError);
        return NextResponse.redirect(
          new URL('/?error=user_creation_failed', request.url)
        );
      }

      userId = newUser.id;
    }

    // Create session cookie
    // In production, you should use Supabase Auth or a proper session management system
    // For now, we'll use a simple session cookie
    const sessionData = {
      userId,
      email: decoded.email,
      name: decoded.name,
      createdAt: new Date().toISOString()
    };

    const sessionCookie = JSON.stringify(sessionData);
    const encodedSession = Buffer.from(sessionCookie).toString('base64');

    const response = NextResponse.redirect(new URL('/', request.url));

    // Set HttpOnly cookie (more secure)
    response.cookies.set('session', encodedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('SSO callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=server_error', request.url)
    );
  }
}