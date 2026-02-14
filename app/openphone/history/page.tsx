'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Run = {
  id: string;
  start_date: string;
  end_date: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  checkpoint: any;
  created_at: string;
  updated_at: string;
};

export default function HistoryPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRuns() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/openphone/runs', { cache: 'no-store' });
      const json = await res.json();
      setRuns(json.data ?? []);
      if (json.error) setError(json.error);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRuns(); }, []);

  function getStatusBadge(status: Run['status']) {
    switch (status) {
      case 'running':
        return <span className="badge badge-info">Running</span>;
      case 'paused':
        return <span className="badge badge-warning">Paused</span>;
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'failed':
        return <span className="badge badge-danger">Failed</span>;
      default:
        return <span className="badge">{status}</span>;
    }
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
            <h1 className="text-2xl font-bold">Run History</h1>
            <p className="text-gray-400">View past runs and their status</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={loadRuns} disabled={loading}>
            <span className="material-symbols-outlined">refresh</span>
            Refresh
          </button>
          <Link href="/openphone/run" className="btn btn-primary">
            <span className="material-symbols-outlined">play_arrow</span>
            New Run
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          <p className="text-gray-400 mt-4">Loading runs...</p>
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
      {!loading && runs.length === 0 && (
        <div className="card text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">history</span>
          <h3 className="text-xl font-bold mb-2">No runs yet</h3>
          <p className="text-gray-400 mb-6">Start your first run to generate conversation summaries.</p>
          <Link href="/openphone/run" className="btn btn-primary">
            <span className="material-symbols-outlined">play_arrow</span>
            Start a Run
          </Link>
        </div>
      )}

      {/* Runs Table */}
      {!loading && runs.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Date Range</th>
                  <th>Status</th>
                  <th>Processed</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <span className="font-mono text-sm">{run.id.slice(0, 8)}...</span>
                    </td>
                    <td>
                      {run.start_date} → {run.end_date}
                    </td>
                    <td>{getStatusBadge(run.status)}</td>
                    <td>
                      {run.checkpoint?.processed ?? 0}
                      {run.checkpoint?.errors?.length > 0 && (
                        <span className="text-red-400 ml-2">
                          ({run.checkpoint.errors.length} errors)
                        </span>
                      )}
                    </td>
                    <td className="text-gray-400">
                      {new Date(run.created_at).toLocaleString()}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link 
                          href={`/openphone/summaries?runId=${run.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          View
                        </Link>
                        {run.status === 'paused' && (
                          <button className="btn btn-primary btn-sm">
                            Resume
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Run Details Cards (Mobile-friendly alternative) */}
      <div className="md:hidden space-y-4 mt-6">
        {runs.map((run) => (
          <div key={run.id} className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-sm">{run.id.slice(0, 8)}...</span>
              {getStatusBadge(run.status)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Date Range</span>
                <span>{run.start_date} → {run.end_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Processed</span>
                <span>{run.checkpoint?.processed ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created</span>
                <span>{new Date(run.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Link 
                href={`/openphone/summaries?runId=${run.id}`}
                className="btn btn-secondary btn-sm flex-1"
              >
                View Summaries
              </Link>
              {run.status === 'paused' && (
                <button className="btn btn-primary btn-sm flex-1">
                  Resume
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}