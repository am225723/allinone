import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export interface GmailAccountSettings {
  accountId: string;
  draftsEnabled: boolean;
  signatureMode: 'gmail' | 'custom' | 'none';
  customSignature: string;
  autoLabel: boolean;
  triagePriority: 'all' | 'important_only' | 'none';
  maxDraftsPerRun: number;
  replyPrefix: string;
}

const DEFAULT_SETTINGS: Omit<GmailAccountSettings, 'accountId'> = {
  draftsEnabled: true,
  signatureMode: 'gmail',
  customSignature: '',
  autoLabel: true,
  triagePriority: 'all',
  maxDraftsPerRun: 50,
  replyPrefix: '',
};

function settingsKey(accountId: string) {
  return `gmail_account_settings_${accountId}`;
}

async function loadSettings(accountId: string): Promise<GmailAccountSettings> {
  const { data } = await supabaseServer
    .from('app_settings')
    .select('value')
    .eq('key', settingsKey(accountId))
    .order('updated_at', { ascending: false })
    .limit(1);

  let saved: any = {};
  if (data?.[0]?.value) {
    try {
      saved = typeof data[0].value === 'string' ? JSON.parse(data[0].value) : data[0].value;
    } catch { saved = {}; }
  }

  return { ...DEFAULT_SETTINGS, ...saved, accountId };
}

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ ok: false, error: 'accountId required' }, { status: 400 });
    }

    const settings = await loadSettings(accountId);
    return NextResponse.json({ ok: true, settings });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, ...settingsData } = body;

    if (!accountId) {
      return NextResponse.json({ ok: false, error: 'accountId required' }, { status: 400 });
    }

    const key = settingsKey(accountId);
    const { data: existing } = await supabaseServer
      .from('app_settings')
      .select('id')
      .eq('key', key)
      .order('updated_at', { ascending: false })
      .limit(1);

    const current = await loadSettings(accountId);
    const merged = { ...current, ...settingsData };
    delete (merged as any).accountId;

    const existingId = existing?.[0]?.id;
    if (existingId) {
      const { error } = await supabaseServer
        .from('app_settings')
        .update({ value: merged })
        .eq('id', existingId);
      if (error) {
        await supabaseServer
          .from('app_settings')
          .update({ value: JSON.stringify(merged) })
          .eq('id', existingId);
      }
    } else {
      const { error } = await supabaseServer
        .from('app_settings')
        .insert({ key, value: merged });
      if (error) {
        await supabaseServer
          .from('app_settings')
          .insert({ key, value: JSON.stringify(merged) });
      }
    }

    return NextResponse.json({ ok: true, settings: { ...merged, accountId } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
