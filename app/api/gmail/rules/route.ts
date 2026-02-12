import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('agent_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rules:', error);
      return NextResponse.json({ rules: [] });
    }

    const rules = (data || []).map((r: any) => ({
      id: r.id,
      gmail_account_id: r.gmail_account_id || null,
      type: r.rule_type === 'skip_sender' ? 'sender' :
            r.rule_type === 'skip_subject' ? 'subject' :
            r.rule_type === 'skip_domain' ? 'domain' :
            r.rule_type || 'sender',
      pattern: r.pattern,
      action: 'skip',
      is_enabled: r.is_enabled !== false,
      created_at: r.created_at,
    }));

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Error fetching rules:', error);
    return NextResponse.json({ rules: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, pattern, gmail_account_id } = body;

    if (!pattern) {
      return NextResponse.json({ ok: false, error: 'Pattern is required' }, { status: 400 });
    }

    const rule_type = type === 'sender' ? 'skip_sender' :
                      type === 'subject' ? 'skip_subject' :
                      type === 'domain' ? 'skip_domain' :
                      `skip_${type}`;

    const insertData: any = {
      rule_type,
      pattern: pattern.trim(),
      is_enabled: true,
      created_at: new Date().toISOString(),
    };

    if (gmail_account_id) {
      insertData.gmail_account_id = gmail_account_id;
    }

    const { error } = await supabaseServer
      .from('agent_rules')
      .insert(insertData);

    if (error) {
      console.error('Error creating rule:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error creating rule:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create rule' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, is_enabled } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Rule ID required' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('agent_rules')
      .update({ is_enabled })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to update rule' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Rule ID required' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('agent_rules')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to delete rule' }, { status: 500 });
  }
}
