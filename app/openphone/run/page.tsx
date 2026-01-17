'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RunPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/openphone/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to start run');
      }
      
      setResult(json);
    } catch (e: any) {
      setError(e?.message || 'An error occurred');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="container py-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/openphone" className="btn btn-ghost p-2">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Start a Run</h1>
          <p className="text-gray-400">Generate summaries and draft replies for conversations</p>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">settings</span>
            Run Configuration
          </h3>
        </div>

        <div className="space-y-6">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-blue-400">info</span>
              <div className="text-sm">
                <p className="text-blue-300 font-medium mb-1">What happens during a run?</p>
                <ul className="text-gray-400 space-y-1">
                  <li>• Fetches conversations updated within the date range</li>
                  <li>• Generates AI summaries for each conversation</li>
                  <li>• Identifies conversations needing responses</li>
                  <li>• Creates draft replies for review</li>
                  <li>• Nothing is sent without your approval</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              className="btn btn-primary flex-1"
              onClick={handleRun}
              disabled={running}
            >
              {running ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Running...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">play_arrow</span>
                  Start Run
                </>
              )}
            </button>
            <Link href="/openphone/history" className="btn btn-secondary">
              <span className="material-symbols-outlined">history</span>
              View History
            </Link>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card mt-6 border-red-500/30 bg-red-500/10">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-red-400">error</span>
            <div>
              <p className="font-medium text-red-300">Error</p>
              <p className="text-sm text-gray-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="card mt-6 border-emerald-500/30 bg-emerald-500/10">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-emerald-400">check_circle</span>
            <div className="flex-1">
              <p className="font-medium text-emerald-300">Run Completed</p>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Run ID</p>
                  <p className="font-mono text-sm truncate">{result.runId}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Processed</p>
                  <p className="text-lg font-bold">{result.processed}</p>
                </div>
                {result.errorsCount > 0 && (
                  <div className="bg-black/20 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase">Errors</p>
                    <p className="text-lg font-bold text-red-400">{result.errorsCount}</p>
                  </div>
                )}
                {result.nextPageToken && (
                  <div className="bg-black/20 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-gray-400 uppercase">Status</p>
                    <p className="text-amber-400">More conversations available - run again to continue</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-3">
                <Link href="/openphone/review" className="btn btn-primary btn-sm">
                  Review Drafts
                </Link>
                <Link href="/openphone/summaries" className="btn btn-secondary btn-sm">
                  View Summaries
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="card mt-6">
        <h3 className="card-title mb-4">Quick Tips</h3>
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-primary text-lg">lightbulb</span>
            <p>Start with a smaller date range (1-3 days) for your first run to test the system.</p>
          </div>
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-primary text-lg">lightbulb</span>
            <p>Runs process up to 25 conversations at a time. If there are more, you can resume the run.</p>
          </div>
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-primary text-lg">lightbulb</span>
            <p>After a run completes, review the drafts before sending any messages.</p>
          </div>
        </div>
      </div>
    </div>
  );
}