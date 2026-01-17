'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Draft = {
  id: string;
  conversation_id: string;
  phone: string;
  from_phone_number_id: string;
  user_id: string | null;
  draft_text: string;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  created_at: string;
};

type ContactUpdate = {
  id: string;
  phone: string;
  inferred_name: string;
  source_message_id: string | null;
  rationale: string | null;
  created_at: string;
};

export default function ReviewPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [contactUpdates, setContactUpdates] = useState<ContactUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Draft['status']>('pending');
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [editText, setEditText] = useState('');

  const visible = useMemo(() => {
    if (filter === 'all') return drafts;
    return drafts.filter(d => d.status === filter);
  }, [drafts, filter]);

  const counts = useMemo(() => ({
    pending: drafts.filter(d => d.status === 'pending').length,
    approved: drafts.filter(d => d.status === 'approved').length,
    rejected: drafts.filter(d => d.status === 'rejected').length,
    sent: drafts.filter(d => d.status === 'sent').length,
  }), [drafts]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/openphone/drafts', { cache: 'no-store' });
      const json = await res.json();
      setDrafts(json.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }

  async function refreshContactUpdates() {
    setLoadingUpdates(true);
    try {
      const res = await fetch('/api/openphone/contact-updates', { cache: 'no-store' });
      const json = await res.json();
      setContactUpdates(json.data ?? []);
    } catch (e: any) {
      console.error('Failed to load contact updates:', e);
    } finally {
      setLoadingUpdates(false);
    }
  }

  useEffect(() => { refresh(); refreshContactUpdates(); }, []);

  async function action(path: string, id: string, body?: any) {
    await fetch(path, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ id, ...body }) 
    });
    await refresh();
    setSelectedDraft(null);
  }

  async function contactAction(path: string, id: string) {
    await fetch(path, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ id }) 
    });
    await refreshContactUpdates();
  }

  async function sendApproved() {
    await fetch('/api/openphone/send-approved', { method: 'POST' });
    await refresh();
  }

  function openEdit(draft: Draft) {
    setSelectedDraft(draft);
    setEditText(draft.draft_text);
  }

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/openphone" className="btn btn-ghost p-2">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Review Queue
              {counts.pending > 0 && (
                <span className="badge badge-primary">{counts.pending}</span>
              )}
            </h1>
            <p className="text-gray-400">Approve, reject, or edit draft replies before sending</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={refresh} disabled={loading}>
            <span className="material-symbols-outlined">refresh</span>
            Refresh
          </button>
          <button 
            className="btn btn-success" 
            onClick={sendApproved}
            disabled={counts.approved === 0}
          >
            <span className="material-symbols-outlined">send</span>
            Send All Approved ({counts.approved})
          </button>
        </div>
      </div>

      {/* Contact Updates Section */}
      {contactUpdates.length > 0 && (
        <div className="card mb-6 border-blue-500/30">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">person_add</span>
              Contact Updates
              <span className="badge badge-info">{contactUpdates.length}</span>
            </h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Review suggested names for unknown contacts before they are added.
          </p>
          <div className="space-y-3">
            {contactUpdates.map(update => (
              <div key={update.id} className="flex items-center justify-between p-4 bg-surface-darker rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{update.inferred_name}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-gray-400">{update.phone}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{update.rationale || 'Name inferred from message context'}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => contactAction('/api/openphone/contacts/approve', update.id)}
                  >
                    Approve
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => contactAction('/api/openphone/contacts/deny', update.id)}
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-surface-darker rounded-xl">
        {(['pending', 'approved', 'rejected', 'sent', 'all'] as const).map(f => (
          <button
            key={f}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === f 
                ? 'bg-surface-dark text-white shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && counts[f] > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                f === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                f === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                f === 'rejected' ? 'bg-red-500/20 text-red-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div className="card flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          <p className="text-gray-400 mt-4">Loading drafts...</p>
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

      {/* Empty State */}
      {!loading && visible.length === 0 && (
        <div className="card text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">inbox</span>
          <h3 className="text-xl font-bold mb-2">No drafts found</h3>
          <p className="text-gray-400 mb-6">
            {filter === 'pending' 
              ? 'No pending drafts to review. Start a new run to generate drafts.'
              : `No ${filter} drafts found.`}
          </p>
          <Link href="/openphone/run" className="btn btn-primary">
            <span className="material-symbols-outlined">play_arrow</span>
            Start a Run
          </Link>
        </div>
      )}

      {/* Drafts List */}
      <div className="space-y-4">
        {visible.map(draft => (
          <div 
            key={draft.id} 
            className={`card ${
              draft.status === 'pending' ? 'border-l-4 border-l-amber-500' :
              draft.status === 'approved' ? 'border-l-4 border-l-emerald-500' :
              draft.status === 'rejected' ? 'border-l-4 border-l-red-500' :
              'border-l-4 border-l-blue-500'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-lg">{draft.phone}</span>
                  <span className={`badge ${
                    draft.status === 'pending' ? 'badge-warning' :
                    draft.status === 'approved' ? 'badge-success' :
                    draft.status === 'rejected' ? 'badge-danger' :
                    'badge-info'
                  }`}>
                    {draft.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Conversation: {draft.conversation_id}</p>
                  <p>Created: {new Date(draft.created_at).toLocaleString()}</p>
                </div>
              </div>
              
              {draft.status === 'pending' && (
                <div className="flex gap-2">
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => action('/api/openphone/approve', draft.id)}
                  >
                    <span className="material-symbols-outlined text-lg">check</span>
                    Approve
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEdit(draft)}
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                    Edit
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => action('/api/openphone/reject', draft.id)}
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                    Reject
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-surface-darker rounded-xl">
              <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
                Draft Reply
              </p>
              <p className="whitespace-pre-wrap">{draft.draft_text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {selectedDraft && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDraft(null)}
        >
          <div 
            className="card max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="card-header">
              <h3 className="card-title">Edit Draft</h3>
              <button 
                className="btn btn-ghost p-2"
                onClick={() => setSelectedDraft(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-400">
                <p>Phone: {selectedDraft.phone}</p>
                <p>Conversation: {selectedDraft.conversation_id}</p>
              </div>
              
              <div className="field">
                <label className="label">Draft Text</label>
                <textarea
                  className="input min-h-[200px]"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setSelectedDraft(null)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => action('/api/openphone/rewrite', selectedDraft.id, { text: editText })}
                >
                  Save & Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}