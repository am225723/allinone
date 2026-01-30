/**
 * API Route: OpenPhone Run
 * Executes OpenPhone conversation cleanup
 * @vercel Edge Runtime enabled
 */
import { NextRequest, NextResponse } from 'next/server';
import { listConversations, listMessages } from '@/lib/openphone';
import { summarizeForCleanup, extractExplicitNameWithReason } from '@/lib/ai';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

function isoStart(d: string) { 
  return new Date(d + 'T00:00:00.000Z').toISOString(); 
}

function isoEnd(d: string) { 
  return new Date(d + 'T23:59:59.999Z').toISOString(); 
}

function pickLast(messages: any[], direction: 'incoming' | 'outgoing') {
  const filtered = messages.filter(m => m.direction === direction && typeof m.text === 'string' && m.text.trim() !== '');
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return filtered[filtered.length - 1];
}

function shouldSuppressByEnv(phone: string, transcript: string) {
  const phones = (process.env.RESPONSE_BLOCKLIST_PHONES ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (phones.includes(phone)) return { suppress: true, reason: 'Phone is blocklisted (env)' };

  const phrases = (process.env.RESPONSE_BLOCKLIST_PHRASES ?? '').split(',').map(s => s.trim()).filter(Boolean);
  for (const ph of phrases) {
    if (ph && transcript.toLowerCase().includes(ph.toLowerCase())) {
      return { suppress: true, reason: `Transcript contains blocked phrase: ${ph}` };
    }
  }
  return { suppress: false as const, reason: '' };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, resumeRunId } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const sb = supabaseServer;
    const maxPerRun = Number(process.env.MAX_CONVERSATIONS_PER_RUN ?? '25');

    const startIso = isoStart(startDate);
    const endIso = isoEnd(endDate);

    let runId = resumeRunId ?? null;
    let checkpoint: any = null;

    if (runId) {
      const r = await sb.from('runs').select('*').eq('id', runId).single();
      checkpoint = r.data?.checkpoint ?? null;
    } else {
      const created = await sb.from('runs')
        .insert({ start_date: startDate, end_date: endDate, status: 'running', checkpoint: null })
        .select('id')
        .single();
      runId = created.data!.id;
    }

    let processed = 0;
    let errors: Array<{ conversationId?: string; step: string; message: string }> = [];

    try {
      const convPage = await listConversations({
        updatedAfter: startIso,
        updatedBefore: endIso,
        maxResults: Math.min(100, maxPerRun),
        pageToken: checkpoint?.pageToken ?? null
      });

      for (const convo of convPage.data ?? []) {
        if (processed >= maxPerRun) break;
        if (convo.deletedAt) continue;

        const participant = convo.participants?.[0];
        if (!participant) continue;

        try {
          // Fetch messages
          let pageToken: string | null = null;
          const rawMessages: any[] = [];
          while (true) {
            const page = await listMessages({
              phoneNumberId: convo.phoneNumberId,
              participants: [participant],
              createdAfter: startIso,
              createdBefore: endIso,
              pageToken
            });
            rawMessages.push(...(page.data ?? []));
            if (!page.nextPageToken) break;
            pageToken = page.nextPageToken;
            if (rawMessages.length > 500) break;
          }

          const IGNORE_TEXT = "Thank you for reaching out to Dr. Zelisko's office. I am currently assisting another patient and want to provide you with the same focused attention. So we can best prepare to assist you, please reply with your name and a brief reason for your call. We will be in touch as soon as we are available.";
          const all = rawMessages.filter(m => {
            const t = (m.text || '').replace(/\s+/g, ' ').trim();
            return t !== IGNORE_TEXT;
          });

          const transcript = all
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map(m => `[${m.createdAt}] ${m.direction === 'incoming' ? 'IN' : 'OUT'}: ${m.text}`)
            .join('\n');

          // Suppression checks
          let suppressed = false;
          let suppressReason = '';

          const dbSup = await sb.from('suppressions')
            .select('kind,value,reason')
            .in('kind', ['phone', 'conversation'])
            .or(`value.eq.${participant},value.eq.${convo.id}`)
            .limit(20);
          
          if (dbSup.data && dbSup.data.length > 0) {
            suppressed = true;
            suppressReason = dbSup.data[0].reason || `Suppressed by ${dbSup.data[0].kind}`;
          } else {
            const envSup = shouldSuppressByEnv(participant, transcript);
            suppressed = envSup.suppress;
            suppressReason = envSup.reason;

            if (!suppressed) {
              const phraseRows = await sb.from('suppressions').select('value,reason').eq('kind', 'phrase').limit(200);
              for (const row of phraseRows.data ?? []) {
                const v = String(row.value || '').trim();
                if (v && transcript.toLowerCase().includes(v.toLowerCase())) {
                  suppressed = true;
                  suppressReason = row.reason || `Transcript contains blocked phrase: ${v}`;
                  break;
                }
              }
            }
          }

          const lastIn = pickLast(all, 'incoming');
          const lastOut = pickLast(all, 'outgoing');
          const lastAt = (all.length ? all.map(m => m.createdAt).sort().slice(-1)[0] : null);

          const s = await summarizeForCleanup(transcript || '(no messages in window)');
          const explicitMatch = extractExplicitNameWithReason(transcript);
          const inferredName = (s.explicitName ?? explicitMatch?.name ?? null)?.trim() || null;
          const inferredReason = s.explicitName
            ? 'Name inferred from explicit mention in message'
            : explicitMatch?.reason ?? null;
          const isUnknown = !convo.name || String(convo.name).toLowerCase().includes('unknown');

          const needs = !!s.needsResponse && !suppressed;
          const needsReason = suppressed 
            ? `Suppressed: ${suppressReason}` 
            : (needs ? 'Inbound message appears to require a response' : 'No response needed');

          if (isUnknown && inferredName) {
            const existingContact = await sb.from('contact_map').select('contact_id').eq('phone', participant).maybeSingle();
            if (!existingContact.data?.contact_id) {
              await sb.from('contact_update_suggestions').upsert({
                phone: participant,
                inferred_name: inferredName,
                source_message_id: lastIn?.id ?? null,
                rationale: inferredReason ?? 'Name inferred from message text',
                status: 'pending'
              }, { onConflict: 'phone,inferred_name,source_message_id' });
            }
          }

          // Store summary
          await sb.from('summaries').insert({
            run_id: runId,
            conversation_id: convo.id,
            contact_name: convo.name ?? 'Unknown Contact',
            phone: participant,
            date_range: s.dateRange || `${startDate} → ${endDate}`,
            summary: s.summary,
            topics: Array.isArray(s.topics) ? s.topics : [],
            needs_response: needs,
            suppress_response: suppressed,
            last_inbound: lastIn?.text ?? null,
            last_outbound: lastOut?.text ?? null,
            last_message_at: lastAt ? new Date(lastAt).toISOString() : null,
            needs_response_reason: needsReason
          });

          // Create draft if needed
          if (needs) {
            const fallback = lastIn?.text
              ? `Thanks for reaching out — I got your message. Can you share a bit more detail (or confirm your preferred time) so I can help?`
              : `Thanks for reaching out — I can help. What's the best next step on your end?`;

            const draftText = (typeof s.draftReply === 'string' && s.draftReply.trim().length > 0) 
              ? s.draftReply.trim() 
              : fallback;

            await sb.from('draft_replies').insert({
              run_id: runId,
              conversation_id: convo.id,
              phone: participant,
              from_phone_number_id: convo.phoneNumberId,
              user_id: null,
              draft_text: draftText,
              status: 'pending',
              suppressed: false
            });
          }

          processed += 1;
        } catch (e: any) {
          errors.push({ conversationId: convo.id, step: 'conversation', message: e?.message ?? String(e) });
        }
      }

      const newCheckpoint = {
        pageToken: convPage.nextPageToken ?? null,
        processed,
        errors,
        lastProcessedAt: new Date().toISOString()
      };

      const status = convPage.nextPageToken ? 'paused' : 'completed';
      await sb.from('runs')
        .update({ status, checkpoint: newCheckpoint, updated_at: new Date().toISOString() })
        .eq('id', runId);

      return NextResponse.json({ 
        runId, 
        processed, 
        nextPageToken: convPage.nextPageToken ?? null, 
        errorsCount: errors.length 
      });
    } catch (e: any) {
      const failCheckpoint = {
        pageToken: checkpoint?.pageToken ?? null,
        processed,
        errors: [...errors, { step: 'run', message: e?.message ?? String(e) }],
        lastProcessedAt: new Date().toISOString()
      };

      await sb.from('runs')
        .update({ status: 'failed', checkpoint: failCheckpoint, updated_at: new Date().toISOString() })
        .eq('id', runId);

      throw e;
    }
  } catch (error: any) {
    console.error('Run error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}