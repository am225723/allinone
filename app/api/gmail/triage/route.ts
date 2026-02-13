import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import {
  listAllGmailAccounts,
  getOAuthClientForAccount,
  gmailFromAuth,
  listRecentInboxMessages,
  getMessage,
  decodeBody,
  getHeader,
  ensureLabels,
  modifyMessageLabels,
  createDraftReply,
  getGmailSignature,
} from '@/lib/gmail';
import { analyzeEmail } from '@/lib/ai';

const DEFAULT_LOOKBACK_DAYS = 14;

interface AccountSettings {
  draftsEnabled: boolean;
  signatureMode: string;
  customSignature: string;
  autoLabel: boolean;
  triagePriority: string;
  maxDraftsPerRun: number;
  replyPrefix: string;
}

async function loadAccountSettings(accountId: string): Promise<AccountSettings> {
  const defaults: AccountSettings = {
    draftsEnabled: true,
    signatureMode: 'gmail',
    customSignature: '',
    autoLabel: true,
    triagePriority: 'all',
    maxDraftsPerRun: 50,
    replyPrefix: '',
  };

  try {
    const { data } = await supabaseServer
      .from('app_settings')
      .select('value')
      .eq('key', `gmail_account_settings_${accountId}`)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (data?.[0]?.value) {
      const saved = typeof data[0].value === 'string' ? JSON.parse(data[0].value) : data[0].value;
      return { ...defaults, ...saved };
    }
  } catch (e) {
    console.error('Failed loading account settings:', e);
  }
  return defaults;
}

const SUMMARY_SUBJECT_MARKERS: string[] = [
  'AI Email Summary',
  'Inbox Summary',
  'AI Gmail Agent Summary',
];

function extractEmailAddress(fromHeader: string): string {
  const m = fromHeader.match(/<([^>]+)>/);
  if (m?.[1]) return m[1].trim().toLowerCase();
  return fromHeader.trim().toLowerCase();
}

function shouldSkipBySummarySubject(subject: string) {
  const s = (subject || '').toLowerCase();
  return SUMMARY_SUBJECT_MARKERS.some((m) => s.includes(m.toLowerCase()));
}

type AgentRule = {
  id: string;
  gmail_account_id: string | null;
  rule_type: 'skip_sender' | 'skip_subject' | 'skip_domain';
  pattern: string;
  is_enabled: boolean;
};

function matchRules(params: {
  fromEmail: string;
  subject: string;
  rules: AgentRule[];
}): { skip: boolean; reason: string } {
  const from = params.fromEmail.toLowerCase();
  const subject = (params.subject || '').toLowerCase();
  const domain = from.includes('@') ? from.split('@')[1] : '';

  const enabled = params.rules.filter((r) => r.is_enabled);

  const senderRule = enabled.find(
    (r) => r.rule_type === 'skip_sender' && r.pattern.trim().toLowerCase() === from
  );
  if (senderRule) {
    return { skip: true, reason: `Skipped (rule): sender "${from}"` };
  }

  const domainRule = enabled.find(
    (r) => r.rule_type === 'skip_domain' && domain.endsWith(r.pattern.trim().toLowerCase())
  );
  if (domainRule) {
    return { skip: true, reason: `Skipped (rule): domain "${domain}" matched "${domainRule.pattern}"` };
  }

  const subjRule = enabled.find(
    (r) =>
      r.rule_type === 'skip_subject' &&
      subject.includes(r.pattern.trim().toLowerCase())
  );
  if (subjRule) {
    return {
      skip: true,
      reason: `Skipped (rule): subject matched "${subjRule.pattern}"`,
    };
  }

  return { skip: false, reason: '' };
}

async function getRulesForAccount(gmailAccountId: string): Promise<AgentRule[]> {
  const { data, error } = await supabaseServer
    .from('agent_rules')
    .select('id,gmail_account_id,rule_type,pattern,is_enabled')
    .eq('is_enabled', true)
    .or(`gmail_account_id.eq.${gmailAccountId},gmail_account_id.is.null`);

  if (error) {
    console.error('Failed loading agent rules', error);
    return [];
  }

  return (data || []) as AgentRule[];
}

async function alreadyProcessed(gmailAccountId: string, gmailMessageId: string) {
  const { data, error } = await supabaseServer
    .from('email_logs')
    .select('id')
    .eq('gmail_account_id', gmailAccountId)
    .eq('gmail_message_id', gmailMessageId)
    .limit(1);

  if (error) {
    console.error('Failed checking duplicates', error);
    return true;
  }

  return (data || []).length > 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const lookbackDays = body.lookbackDays || DEFAULT_LOOKBACK_DAYS;

    const accounts = await listAllGmailAccounts();
    if (!accounts.length) {
      return NextResponse.json({
        ok: true,
        lookbackDays,
        accounts: 0,
        processed: 0,
        draftsCreated: 0,
        skippedByRule: 0,
        skippedDuplicate: 0,
      });
    }

    let sentimentReport = '';
    try {
      const { data: profileData } = await supabaseServer
        .from('app_settings')
        .select('value')
        .eq('key', 'user_profile_extra')
        .order('updated_at', { ascending: false })
        .limit(1);
      if (profileData?.[0]?.value) {
        const extra = typeof profileData[0].value === 'string'
          ? JSON.parse(profileData[0].value)
          : profileData[0].value;
        sentimentReport = extra.sentimentReport || '';
      }
    } catch (e) {
      console.error('Failed loading sentiment report:', e);
    }

    let processed = 0;
    let draftsCreated = 0;
    let skippedByRule = 0;
    let skippedDuplicate = 0;

    for (const account of accounts) {
      const acctSettings = await loadAccountSettings(account.id);

      if (acctSettings.triagePriority === 'none') {
        continue;
      }

      const { oauth2Client } = await getOAuthClientForAccount(account.id);
      const gmail = gmailFromAuth(oauth2Client);

      const rules = await getRulesForAccount(account.id);
      let signatureHtml = '';
      if (acctSettings.signatureMode === 'custom' && acctSettings.customSignature?.trim()) {
        signatureHtml = acctSettings.customSignature;
      } else if (acctSettings.signatureMode !== 'none') {
        signatureHtml = await getGmailSignature(oauth2Client);
      }

      let accountDraftsCreated = 0;

      const msgs = await listRecentInboxMessages(gmail, lookbackDays);
      if (!msgs.length) continue;

      const labelNames = ['ai/triaged', 'ai/draft_created', 'ai/no_draft'];
      const nameToId = await ensureLabels(gmail, labelNames);

      for (const m of msgs) {
        if (!m.id) continue;

        const dup = await alreadyProcessed(account.id, m.id);
        if (dup) {
          skippedDuplicate += 1;
          continue;
        }

        const full = await getMessage(gmail, m.id);
        const headers = full.payload?.headers || [];
        const msgLabelIds: string[] = full.labelIds || [];

        if (acctSettings.triagePriority === 'important_only') {
          const isImportant = msgLabelIds.includes('IMPORTANT');
          if (!isImportant) {
            processed += 1;
            continue;
          }
        }

        const subject = getHeader(headers, 'Subject', '(no subject)');
        const fromHeader = getHeader(headers, 'From', '');
        const fromEmail = extractEmailAddress(fromHeader);

        if (shouldSkipBySummarySubject(subject)) {
          await supabaseServer.from('email_logs').insert({
            gmail_account_id: account.id,
            gmail_message_id: m.id,
            subject,
            from_address: fromHeader,
            summary: 'Skipped: summary email (excluded from triage).',
            needs_response: false,
            priority: 'low',
            draft_created: false,
          });
          continue;
        }

        const ruleResult = matchRules({ fromEmail, subject, rules });
        if (ruleResult.skip) {
          skippedByRule += 1;

          await supabaseServer.from('email_logs').insert({
            gmail_account_id: account.id,
            gmail_message_id: m.id,
            subject,
            from_address: fromHeader,
            summary: ruleResult.reason,
            needs_response: false,
            priority: 'low',
            draft_created: false,
          });

          if (acctSettings.autoLabel !== false) {
            const add = [nameToId['ai/triaged'], nameToId['ai/no_draft']].filter(Boolean) as string[];
            if (add.length) await modifyMessageLabels(gmail, m.id, add);
          }

          processed += 1;
          continue;
        }

        const body = decodeBody(full) || '';
        const triage = await analyzeEmail({
          from: fromHeader,
          to: account.email || '',
          subject,
          body,
          sentimentReport,
        });

        const proposed = (triage.proposed_labels || []).slice(0, 4);
        const labelNamesForEmail = ['ai/triaged', ...proposed];
        const labelMap = await ensureLabels(gmail, labelNamesForEmail);
        const labelIds = Object.values(labelMap);

        let draftCreated = false;

        const canCreateDraft = acctSettings.draftsEnabled !== false
          && accountDraftsCreated < (acctSettings.maxDraftsPerRun || 50);

        if (canCreateDraft && triage.needs_response && triage.draft_reply?.trim()) {
          const replyText = acctSettings.replyPrefix
            ? `${acctSettings.replyPrefix}\n\n${triage.draft_reply}`
            : triage.draft_reply;

          try {
            await createDraftReply(gmail, full, replyText, signatureHtml);
            draftCreated = true;
            draftsCreated += 1;
            accountDraftsCreated += 1;
          } catch (e) {
            console.error('Failed creating draft', e);
            draftCreated = false;
          }
        }

        await supabaseServer.from('email_logs').insert({
          gmail_account_id: account.id,
          gmail_message_id: m.id,
          subject,
          from_address: fromHeader,
          summary: triage.summary || '',
          needs_response: !!triage.needs_response,
          priority: triage.priority || 'normal',
          draft_created: draftCreated,
        });

        if (acctSettings.autoLabel !== false) {
          const addLabels = [
            ...labelIds,
            draftCreated ? nameToId['ai/draft_created'] : nameToId['ai/no_draft'],
          ].filter(Boolean) as string[];

          if (addLabels.length) {
            try {
              await modifyMessageLabels(gmail, m.id, addLabels);
            } catch (e) {
              console.error('Failed modifying labels', e);
            }
          }
        }

        processed += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      lookbackDays,
      accounts: accounts.length,
      processed,
      draftsCreated,
      skippedByRule,
      skippedDuplicate,
    });
  } catch (error: any) {
    console.error('Error running triage job', error);
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Internal error',
    }, { status: 500 });
  }
}