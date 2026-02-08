import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const accountEmail = body.email;

    let query = supabaseServer
      .from('gmail_accounts')
      .select('*')
      .eq('is_active', true);

    if (accountEmail) {
      query = query.eq('email', accountEmail);
    }

    const { data: accounts, error: accountsError } = await query;

    if (accountsError) throw accountsError;
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ ok: false, error: 'No active Gmail accounts found' }, { status: 404 });
    }

    const results: any[] = [];

    for (const account of accounts) {
      try {
        let accessToken = account.access_token;

        if (account.token_expiry && new Date(account.token_expiry) < new Date()) {
          if (account.refresh_token) {
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

            if (clientId && clientSecret) {
              const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  client_id: clientId,
                  client_secret: clientSecret,
                  refresh_token: account.refresh_token,
                  grant_type: 'refresh_token',
                }),
              });

              if (tokenRes.ok) {
                const tokens = await tokenRes.json();
                accessToken = tokens.access_token;

                await supabaseServer
                  .from('gmail_accounts')
                  .update({
                    access_token: tokens.access_token,
                    token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                    sync_error: null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', account.id);
              } else {
                const errorText = await tokenRes.text();
                await supabaseServer
                  .from('gmail_accounts')
                  .update({
                    sync_error: `Token refresh failed: ${errorText}`,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', account.id);
                results.push({ email: account.email, status: 'error', error: 'Token refresh failed' });
                continue;
              }
            }
          } else {
            await supabaseServer
              .from('gmail_accounts')
              .update({
                sync_error: 'No refresh token - re-authorization required',
                updated_at: new Date().toISOString(),
              })
              .eq('id', account.id);
            results.push({ email: account.email, status: 'error', error: 'Re-authorization required' });
            continue;
          }
        }

        const messagesRes = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=is:unread in:inbox',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!messagesRes.ok) {
          const errText = await messagesRes.text();
          await supabaseServer
            .from('gmail_accounts')
            .update({
              sync_error: `Gmail API error: ${messagesRes.status}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', account.id);
          results.push({ email: account.email, status: 'error', error: errText });
          continue;
        }

        const messagesData = await messagesRes.json();
        const messageCount = messagesData.messages?.length || 0;

        await supabaseServer
          .from('gmail_accounts')
          .update({
            last_sync_at: new Date().toISOString(),
            sync_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id);

        results.push({
          email: account.email,
          status: 'ok',
          unreadCount: messageCount,
          lastSync: new Date().toISOString(),
        });
      } catch (err: any) {
        results.push({ email: account.email, status: 'error', error: err?.message });
      }
    }

    return NextResponse.json({ ok: true, accounts: results });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data: accounts, error } = await supabaseServer
      .from('gmail_accounts')
      .select('email, name, is_active, last_sync_at, sync_error, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, accounts: accounts || [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
