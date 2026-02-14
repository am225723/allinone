'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type EmailLog = {
  id: string;
  gmail_account_id: string;
  gmail_message_id: string;
  subject: string;
  from_address: string;
  summary: string;
  needs_response: boolean;
  priority: 'high' | 'normal' | 'low';
  draft_created: boolean;
  created_at: string;
  inbox_email?: string;
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'drafts' | 'high'>('all');

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gmail/activity', { cache: 'no-store' });
      const json = await res.json();
      setLogs(json.data ?? []);
      if (json.error) setError(json.error);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLogs(); }, []);

  const filtered = logs.filter(log => {
    if (filter === 'drafts') return log.draft_created;
    if (filter === 'high') return log.priority === 'high';
    return true;
  });

  const stats = {
    total: logs.length,
    drafts: logs.filter(l => l.draft_created).length,
    high: logs.filter(l => l.priority === 'high').length,
  };

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/gmail" className="btn btn-ghost p-2">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Activity Log</h1>
            <p className="text-gray-400">View processed emails and their triage results</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={loadLogs} disabled={loading}>
            <span className="material-symbols-outlined">refresh</span>
            Refresh
          </button>
          <Link href="/gmail/triage" className="btn btn-primary">
            <span className="material-symbols-outlined">filter_alt</span>
            Run Triage
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <span className="stat-label">Total Processed</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Drafts Created</span>
          <span className="stat-value text-emerald-400">{stats.drafts}</span>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <span className="stat-label">High Priority</span>
          <span className="stat-value text-red-400">{stats.high}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-surface-darker rounded-xl">
        {(['all', 'drafts', 'high'] as const).map(f => (
          <button
            key={f}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === f 
                ? 'bg-surface-dark text-white shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All Emails' : f === 'drafts' ? 'With Drafts' : 'High Priority'}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-400">progress_activity</span>
          <p className="text-gray-400 mt-4">Loading activity...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card border-red-500/30 bg-red-500/10">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-red-400">error</span>
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="card text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">inbox</span>
          <h3 className="text-xl font-bold mb-2">No activity yet</h3>
          <p className="text-gray-400 mb-6">Run email triage to start processing emails.</p>
          <Link href="/gmail/triage" className="btn btn-primary">
            <span className="material-symbols-outlined">filter_alt</span>
            Run Triage
          </Link>
        </div>
      )}

      {/* Activity List */}
      <div className="space-y-3">
        {filtered.map((log) => (
          <div 
            key={log.id} 
            className={`card ${
              log.priority === 'high' ? 'border-l-4 border-l-red-500' :
              log.draft_created ? 'border-l-4 border-l-emerald-500' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                log.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                log.draft_created ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                <span className="material-symbols-outlined">mail</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{log.from_address}</span>
                  <span className={`badge ${
                    log.priority === 'high' ? 'badge-danger' :
                    log.priority === 'normal' ? 'badge-info' : ''
                  }`}>
                    {log.priority}
                  </span>
                  {log.draft_created && (
                    <span className="badge badge-success">Draft</span>
                  )}
                </div>
                <p className="text-sm font-medium mb-1 truncate">{log.subject}</p>
                <p className="text-sm text-gray-400 line-clamp-2">{log.summary}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                  {log.inbox_email && <span>• {log.inbox_email}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}