/**
 * @vercel Edge Runtime enabled
 */
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { sendTextMessage } from '@/lib/openphone';

export const runtime = 'edge';

export async function POST() {
  try {
    const { data: drafts, error: fetchError } = await supabaseServer
      .from('draft_replies')
      .select('*')
      .eq('status', 'approved');

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: 'No approved drafts to send' });
    }

    let sent = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const draft of drafts) {
      try {
        await sendTextMessage({
          content: draft.draft_text,
          from: draft.from_phone_number_id,
          to: draft.phone,
          userId: draft.user_id,
          setInboxStatus: 'done'
        });

        await supabaseServer
          .from('draft_replies')
          .update({ status: 'sent', updated_at: new Date().toISOString() })
          .eq('id', draft.id);

        sent += 1;
      } catch (e: any) {
        errors.push({ id: draft.id, error: e?.message || 'Failed to send' });
      }
    }

    return NextResponse.json({ ok: true, sent, errors });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}