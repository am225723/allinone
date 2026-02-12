import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    const [settingsResult, suppressionsResult] = await Promise.all([
      supabaseServer
        .from('app_settings')
        .select('*')
        .eq('category', 'openphone')
        .single(),
      supabaseServer
        .from('suppressions')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    const data = settingsResult.data;
    const suppressions = suppressionsResult.data || [];

    return NextResponse.json({
      apiKey: data?.api_key ? '••••••••' : '',
      autoReply: data?.auto_reply || false,
      maxConversations: data?.max_conversations || 25,
      blockedPhones: data?.blocked_phones || '',
      blockedPhrases: data?.blocked_phrases || '',
      customSignature: data?.custom_signature || '',
      suppressions,
    });
  } catch (error) {
    return NextResponse.json({
      apiKey: '',
      autoReply: false,
      maxConversations: 25,
      blockedPhones: '',
      blockedPhrases: '',
      customSignature: '',
      suppressions: [],
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'add_suppression') {
      const { kind, value, reason } = body;
      const { error } = await supabaseServer
        .from('suppressions')
        .insert({
          kind: kind || 'phone',
          value: value,
          reason: reason || '',
          created_at: new Date().toISOString(),
        });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'remove_suppression') {
      const { id } = body;
      const { error } = await supabaseServer
        .from('suppressions')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }
    
    const { error } = await supabaseServer
      .from('app_settings')
      .upsert({
        category: 'openphone',
        auto_reply: body.autoReply,
        max_conversations: body.maxConversations,
        blocked_phones: body.blockedPhones,
        blocked_phrases: body.blockedPhrases,
        custom_signature: body.customSignature,
        updated_at: new Date().toISOString()
      }, { onConflict: 'category' });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to save settings' }, { status: 500 });
  }
}
