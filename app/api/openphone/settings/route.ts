import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    const { data } = await supabaseServer
      .from('app_settings')
      .select('*')
      .eq('category', 'openphone')
      .single();

    return NextResponse.json({
      apiKey: data?.api_key ? '••••••••' : '',
      autoReply: data?.auto_reply || false,
      maxConversations: data?.max_conversations || 25,
      blockedPhones: data?.blocked_phones || '',
      blockedPhrases: data?.blocked_phrases || '',
      customSignature: data?.custom_signature || ''
    });
  } catch (error) {
    return NextResponse.json({
      apiKey: '',
      autoReply: false,
      maxConversations: 25,
      blockedPhones: '',
      blockedPhrases: '',
      customSignature: ''
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
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
