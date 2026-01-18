'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Draft {
  id: string;
  phone_number: string;
  draft_reply: string;
  status: string;
  created_at: string;
  summary?: string;
}

export default function ReviewPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkActionResult, setBulkActionResult] = useState<any>(null);

  useEffect(() => {
    loadDrafts();
  }, []);

  async function loadDrafts() {
    setLoading(true);
    try {
      const res = await fetch('/api/openphone/drafts');
      const data = await res.json();
      if (data.ok) {
        setDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleDraft(draftId: string) {
    const newSelected = new Set(selectedDrafts);
    if (newSelected.has(draftId)) {
      newSelected.delete(draftId);
    } else {
      newSelected.add(draftId);
    }
    setSelectedDrafts(newSelected);
  }

  function toggleAll() {
    if (selectedDrafts.size === drafts.length) {
      setSelectedDrafts(new Set());
    } else {
      setSelectedDrafts(new Set(drafts.map(d => d.id)));
    }
  }

  async function handleBulkAction(action: 'approve' | 'reject' | 'delete') {
    if (selectedDrafts.size === 0) return;

    const confirmed = confirm(
      `Are you sure you want to ${action} ${selectedDrafts.size} draft(s)?`
    );
    if (!confirmed) return;

    setBulkActionLoading(true);
    setBulkActionResult(null);

    try {
      const res = await fetch('/api/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ids: Array.from(selectedDrafts),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setBulkActionResult(data.result);
        setSelectedDrafts(new Set());
        await loadDrafts();
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleSingleAction(draftId: string, action: 'approve' | 'reject') {
    try {
      const res = await fetch(`/api/openphone/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      });

      if (res.ok) {
        await loadDrafts();
      }
    } catch (error) {
      console.error(`Error ${action}ing draft:`, error);
    }
  }

  const pendingDrafts = drafts.filter(d => d.status === 'pending');
  const approvedDrafts = drafts.filter(d => d.status === 'approved');

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="mt-4 text-gray-400">Loading drafts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/openphone" className="btn btn-ghost p-2">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Review Drafts</h1>
          <p className="text-gray-400">Review and approve draft replies before sending</p>
        </div>
        <button onClick={loadDrafts} className="btn btn-secondary">
          <span className="material-symbols-outlined">refresh</span>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card bg-amber-500/10 border-amber-500/20">
          <p className="text-sm text-gray-400 uppercase">Pending</p>
          <p className="text-3xl font-bold text-amber-400">{pendingDrafts.length}</p>
        </div>
        <div className="card bg-emerald-500/10 border-emerald-500/20">
          <p className="text-sm text-gray-400 uppercase">Approved</p>
          <p className="text-3xl font-bold text-emerald-400">{approvedDrafts.length}</p>
        </div>
        <div className="card bg-blue-500/10 border-blue-500/20">
          <p className="text-sm text-gray-400 uppercase">Selected</p>
          <p className="text-3xl font-bold text-blue-400">{selectedDrafts.size}</p>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedDrafts.size > 0 && (
        <div className="card mb-6 bg-blue-500/10 border-blue-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-400">check_circle</span>
              <span className="font-medium">{selectedDrafts.size} draft(s) selected</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('approve')}
                disabled={bulkActionLoading}
                className="btn btn-sm btn-primary"
              >
                <span className="material-symbols-outlined">check</span>
                Approve All
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                disabled={bulkActionLoading}
                className="btn btn-sm btn-secondary"
              >
                <span className="material-symbols-outlined">close</span>
                Reject All
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                disabled={bulkActionLoading}
                className="btn btn-sm bg-red-500/20 hover:bg-red-500/30 text-red-400"
              >
                <span className="material-symbols-outlined">delete</span>
                Delete All
              </button>
              <button
                onClick={() => setSelectedDrafts(new Set())}
                className="btn btn-sm btn-ghost"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Result */}
      {bulkActionResult && (
        <div className={`card mb-6 ${
          bulkActionResult.failed > 0 
            ? 'bg-amber-500/10 border-amber-500/30' 
            : 'bg-emerald-500/10 border-emerald-500/30'
        }`}>
          <div className="flex gap-3">
            <span className={`material-symbols-outlined ${
              bulkActionResult.failed > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {bulkActionResult.failed > 0 ? 'warning' : 'check_circle'}
            </span>
            <div className="flex-1">
              <p className="font-medium">
                Bulk Action Complete: {bulkActionResult.success} succeeded, {bulkActionResult.failed} failed
              </p>
              {bulkActionResult.errors.length > 0 && (
                <div className="mt-2 text-sm text-gray-400">
                  {bulkActionResult.errors.map((error: string, idx: number) => (
                    <p key={idx}>• {error}</p>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setBulkActionResult(null)}
              className="btn btn-sm btn-ghost"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Drafts List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Draft Replies</h3>
          {drafts.length > 0 && (
            <button onClick={toggleAll} className="btn btn-sm btn-secondary">
              <span className="material-symbols-outlined">
                {selectedDrafts.size === drafts.length ? 'deselect' : 'select_all'}
              </span>
              {selectedDrafts.size === drafts.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {drafts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <span className="material-symbols-outlined text-6xl mb-4">drafts</span>
            <p className="text-lg">No drafts to review</p>
            <p className="text-sm mt-2">Run a cleanup to generate draft replies</p>
            <Link href="/openphone/run" className="btn btn-primary mt-4">
              <span className="material-symbols-outlined">play_arrow</span>
              Start Run
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedDrafts.has(draft.id)
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 bg-black/20'
                } ${
                  draft.status === 'approved'
                    ? 'opacity-60'
                    : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedDrafts.has(draft.id)}
                    onChange={() => toggleDraft(draft.id)}
                    className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary">phone</span>
                      <span className="font-mono font-medium">{draft.phone_number}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        draft.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400'
                          : draft.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {draft.status}
                      </span>
                    </div>

                    {draft.summary && (
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{draft.summary}</p>
                    )}

                    <div className="bg-black/30 rounded-lg p-3 mb-3">
                      <p className="text-sm whitespace-pre-wrap">{draft.draft_reply}</p>
                    </div>

                    <p className="text-xs text-gray-500">
                      Created {new Date(draft.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Actions */}
                  {draft.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSingleAction(draft.id, 'approve')}
                        className="btn btn-sm btn-primary"
                        title="Approve"
                      >
                        <span className="material-symbols-outlined">check</span>
                      </button>
                      <button
                        onClick={() => handleSingleAction(draft.id, 'reject')}
                        className="btn btn-sm btn-secondary"
                        title="Reject"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Approved Button */}
      {approvedDrafts.length > 0 && (
        <div className="card mt-6 bg-emerald-500/10 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-emerald-300">Ready to Send</p>
              <p className="text-sm text-gray-400">{approvedDrafts.length} approved draft(s) ready to send</p>
            </div>
            <Link href="/openphone" className="btn btn-primary">
              <span className="material-symbols-outlined">send</span>
              Send Approved Drafts
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}