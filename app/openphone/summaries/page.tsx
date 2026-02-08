'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type SummaryRow = {
  id: string;
  run_id: string;
  conversation_id: string;
  contact_name: string;
  phone: string;
  date_range: string;
  summary: string;
  topics: string[];
  needs_response: boolean;
  suppress_response?: boolean;
  last_inbound?: string | null;
  last_outbound?: string | null;
  last_message_at?: string | null;
  needs_response_reason?: string | null;
  created_at: string;
};

type DraftRow = {
  id: string;
  phone: string;
  draft_text: string;
  status: string;
  created_at: string;
};

type ContactSummary = {
  phone: string;
  contact_name: string;
  last_activity_at: string | null;
  conversation_count: number;
  topics: string[];
  needs_response: boolean;
  suppress_response: boolean;
  summary: string;
  rows: SummaryRow[];
  drafts: DraftRow[];
};

function groupByPhone(rows: SummaryRow[], drafts: DraftRow[]): ContactSummary[] {
  const map = new Map<string, SummaryRow[]>();

  for (const r of rows) {
    const key = (r.phone || '').trim();
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const draftMap = new Map<string, DraftRow[]>();
  for (const d of drafts) {
    const key = (d.phone || '').trim();
    if (!key) continue;
    if (!draftMap.has(key)) draftMap.set(key, []);
    draftMap.get(key)!.push(d);
  }

  const out: ContactSummary[] = [];
  const allPhones = new Set([...map.keys(), ...draftMap.keys()]);

  for (const phone of allPhones) {
    const list = map.get(phone) || [];
    const contactDrafts = draftMap.get(phone) || [];

    const sortedByActivity = [...list].sort(
      (a, b) => new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime()
    );

    const name = sortedByActivity.find((r) => (r.contact_name || '').trim())?.contact_name?.trim() || phone;
    const topics = Array.from(new Set(list.flatMap((r) => r.topics || []).filter(Boolean)));
    const needsResponse = list.some((r) => r.needs_response && !r.suppress_response);
    const suppressResponse = list.length > 0 && list.every((r) => !!r.suppress_response);
    const lastActivity = sortedByActivity[0]?.last_message_at || sortedByActivity[0]?.created_at || null;

    out.push({
      phone,
      contact_name: name,
      last_activity_at: lastActivity,
      conversation_count: list.length,
      topics,
      needs_response: needsResponse,
      suppress_response: suppressResponse,
      summary: sortedByActivity[0]?.summary || '',
      rows: sortedByActivity,
      drafts: contactDrafts,
    });
  }

  out.sort((a, b) => {
    if (a.needs_response !== b.needs_response) return a.needs_response ? -1 : 1;
    const at = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
    const bt = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
    return bt - at;
  });

  return out;
}

export default function SummariesPage() {
  const searchParams = useSearchParams();
  const runId = searchParams.get('runId');
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterNeeds, setFilterNeeds] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactSummary | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSuppressionForm, setShowSuppressionForm] = useState(false);
  const [suppressionType, setSuppressionType] = useState<'phone' | 'phrase'>('phone');
  const [suppressionValue, setSuppressionValue] = useState('');
  const [suppressionReason, setSuppressionReason] = useState('');

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [summariesRes, draftsRes] = await Promise.all([
        fetch('/api/openphone/summaries', { cache: 'no-store' }),
        fetch('/api/openphone/drafts', { cache: 'no-store' }),
      ]);
      const summariesJson = await summariesRes.json();
      const draftsJson = await draftsRes.json();
      setRows(summariesJson.data ?? []);
      if (summariesJson.error) setError(summariesJson.error);
      setDrafts(draftsJson.drafts ?? draftsJson.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const contacts = useMemo(() => groupByPhone(rows, drafts), [rows, drafts]);

  const filtered = useMemo(() => {
    let list = contacts;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((c) => 
        c.contact_name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.topics.some(t => t.toLowerCase().includes(q)) ||
        c.summary.toLowerCase().includes(q)
      );
    }
    if (filterNeeds) list = list.filter((c) => c.needs_response);
    return list;
  }, [contacts, query, filterNeeds]);

  const stats = useMemo(() => ({
    total: contacts.length,
    needsResponse: contacts.filter((c) => c.needs_response).length,
    pendingDrafts: drafts.filter(d => d.status === 'pending').length,
    suppressed: contacts.filter((c) => c.suppress_response).length,
  }), [contacts, drafts]);

  async function handleDraftAction(draftId: string, action: 'approve' | 'reject') {
    setActionLoading(draftId);
    try {
      await fetch(`/api/openphone/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      });
      await loadData();
    } catch (e) {
      console.error(`Error ${action}ing draft:`, e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSuppress(phone: string) {
    try {
      await fetch('/api/openphone/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_suppression',
          kind: 'phone',
          value: phone,
          reason: 'Suppressed from summaries page',
        }),
      });
      await loadData();
      setSelectedContact(null);
    } catch (e) {
      console.error('Error suppressing:', e);
    }
  }

  async function handleAddSuppression() {
    if (!suppressionValue.trim()) return;
    try {
      await fetch('/api/openphone/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_suppression',
          kind: suppressionType,
          value: suppressionValue.trim(),
          reason: suppressionReason.trim() || `Suppressed ${suppressionType}`,
        }),
      });
      setSuppressionValue('');
      setSuppressionReason('');
      setShowSuppressionForm(false);
      await loadData();
    } catch (e) {
      console.error('Error adding suppression:', e);
    }
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/openphone" className="btn btn-ghost p-2">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Summaries & Drafts</h1>
            <p className="text-[var(--text-muted)]">View conversation summaries, review drafts, and manage suppressions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => setShowSuppressionForm(!showSuppressionForm)}
          >
            <span className="material-symbols-outlined">block</span>
            Suppressions
          </button>
          <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
            <span className="material-symbols-outlined">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {runId && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <p className="text-emerald-300">Run completed successfully. Showing results below.</p>
        </div>
      )}

      {showSuppressionForm && (
        <div className="card mb-6">
          <h3 className="card-title mb-4">Add Suppression Rule</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">Suppress draft generation for specific phone numbers or text phrases.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              className="input"
              value={suppressionType}
              onChange={(e) => setSuppressionType(e.target.value as 'phone' | 'phrase')}
            >
              <option value="phone">Phone Number</option>
              <option value="phrase">Text Phrase</option>
            </select>
            <input
              className="input"
              placeholder={suppressionType === 'phone' ? '+1234567890' : 'Enter phrase to suppress...'}
              value={suppressionValue}
              onChange={(e) => setSuppressionValue(e.target.value)}
            />
            <input
              className="input"
              placeholder="Reason (optional)"
              value={suppressionReason}
              onChange={(e) => setSuppressionReason(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleAddSuppression}>
              <span className="material-symbols-outlined">add</span>
              Add Rule
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <span className="stat-label">Total Contacts</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(230, 59, 25, 0.3)' }}>
          <span className="stat-label">Needs Response</span>
          <span className="stat-value text-primary">{stats.needsResponse}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Drafts</span>
          <span className="stat-value text-amber-400">{stats.pendingDrafts}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Suppressed</span>
          <span className="stat-value text-[var(--text-muted)]">{stats.suppressed}</span>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">search</span>
              <input
                type="text"
                className="input pl-10"
                placeholder="Search contacts, topics, or keywords..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className={`btn ${filterNeeds ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterNeeds(!filterNeeds)}
            >
              <span className="material-symbols-outlined">priority_high</span>
              Needs Response
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="card flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          <p className="text-[var(--text-muted)] mt-4">Loading summaries...</p>
        </div>
      )}

      {error && (
        <div className="card border-red-500/30 bg-red-500/10">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-red-400">error</span>
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">summarize</span>
          <h3 className="text-xl font-bold mb-2">No summaries found</h3>
          <p className="text-[var(--text-muted)] mb-6">Run a cleanup to generate conversation summaries.</p>
          <Link href="/openphone/run" className="btn btn-primary">
            <span className="material-symbols-outlined">play_arrow</span>
            Start a Run
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((contact) => (
          <button
            key={contact.phone}
            className={`card text-left hover:border-primary/50 transition-colors ${
              contact.needs_response ? 'border-l-4 border-l-primary' : ''
            }`}
            onClick={() => setSelectedContact(contact)}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                {contact.contact_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold truncate">{contact.contact_name}</span>
                  {contact.needs_response && (
                    <span className="badge badge-warning">Needs Response</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{contact.phone}</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-3">{contact.summary}</p>
            {contact.drafts.length > 0 && (
              <div className="flex items-center gap-1 mb-2">
                <span className="material-symbols-outlined text-amber-400 text-sm">draft</span>
                <span className="text-xs text-amber-400">{contact.drafts.filter(d => d.status === 'pending').length} pending draft(s)</span>
              </div>
            )}
            <div className="flex flex-wrap gap-1 mb-3">
              {contact.topics.slice(0, 3).map((topic) => (
                <span key={topic} className="badge">{topic}</span>
              ))}
            </div>
            <div className="text-xs text-gray-500">
              {contact.conversation_count} conversations • Last: {
                contact.last_activity_at 
                  ? new Date(contact.last_activity_at).toLocaleDateString() 
                  : 'Unknown'
              }
            </div>
          </button>
        ))}
      </div>

      {selectedContact && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedContact(null)}
        >
          <div 
            className="card max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="card-header sticky top-0 bg-[var(--surface)] z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                  {selectedContact.contact_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="card-title">{selectedContact.contact_name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{selectedContact.phone}</p>
                </div>
              </div>
              <button 
                className="btn btn-ghost p-2"
                onClick={() => setSelectedContact(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <div className="flex gap-2">
                {selectedContact.needs_response && <span className="badge badge-warning">Needs Response</span>}
                {selectedContact.suppress_response && <span className="badge badge-danger">Suppressed</span>}
                {!selectedContact.needs_response && !selectedContact.suppress_response && <span className="badge badge-success">OK</span>}
              </div>

              {selectedContact.topics.length > 0 && (
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-2">Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.topics.map((topic) => (
                      <span key={topic} className="badge">{topic}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedContact.drafts.length > 0 && (
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-2">Draft Replies ({selectedContact.drafts.length})</p>
                  <div className="space-y-3">
                    {selectedContact.drafts.map((draft) => (
                      <div key={draft.id} className="p-4 rounded-xl border-2 border-amber-500/20 bg-amber-500/5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-amber-400 text-sm">draft</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            draft.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                            draft.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>{draft.status}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap mb-3">{draft.draft_text}</p>
                        {draft.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleDraftAction(draft.id, 'approve')}
                              disabled={actionLoading === draft.id}
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleDraftAction(draft.id, 'reject')}
                              disabled={actionLoading === draft.id}
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-[var(--text-muted)] mb-2">Conversations ({selectedContact.rows.length})</p>
                <div className="space-y-3">
                  {selectedContact.rows.map((row) => (
                    <div key={row.id} className="p-4 bg-[var(--bg-darker)] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{row.date_range}</span>
                        <span className={`badge ${row.needs_response ? 'badge-warning' : 'badge-success'}`}>
                          {row.needs_response ? 'Needs Response' : 'OK'}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] mb-3">{row.summary}</p>
                      {row.last_inbound && (
                        <div className="text-xs bg-black/20 p-2 rounded mb-2">
                          <span className="text-gray-500">Last inbound:</span> {row.last_inbound}
                        </div>
                      )}
                      {row.last_outbound && (
                        <div className="text-xs bg-black/20 p-2 rounded">
                          <span className="text-gray-500">Last outbound:</span> {row.last_outbound}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                {!selectedContact.suppress_response && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleSuppress(selectedContact.phone)}
                  >
                    <span className="material-symbols-outlined">block</span>
                    Suppress This Number
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
