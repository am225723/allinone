'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TriagePage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookbackDays, setLookbackDays] = useState(14);

  async function handleTriage() {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/gmail/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookbackDays }),
      });
      const json = await res.json();
      
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to run triage');
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
        <Link href="/gmail" className="btn btn-ghost p-2">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Email Triage</h1>
          <p className="text-gray-400">Scan and analyze recent emails automatically</p>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">filter_alt</span>
            Triage Configuration
          </h3>
        </div>

        <div className="space-y-6">
          {/* Lookback Period */}
          <div className="field">
            <label className="label">Lookback Period (Days)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="30"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-lg font-bold w-12 text-center">{lookbackDays}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Scan emails from the last {lookbackDays} days
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-blue-400">info</span>
              <div className="text-sm">
                <p className="text-blue-300 font-medium mb-1">What happens during triage?</p>
                <ul className="text-gray-400 space-y-1">
                  <li>• Scans inbox emails from the lookback period</li>
                  <li>• AI analyzes each email for priority and intent</li>
                  <li>• Creates draft replies for emails needing responses</li>
                  <li>• Applies labels for organization</li>
                  <li>• Skips already-processed emails (no duplicates)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              className="btn btn-primary flex-1"
              onClick={handleTriage}
              disabled={running}
            >
              {running ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Running Triage...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">play_arrow</span>
                  Start Triage
                </>
              )}
            </button>
            <Link href="/gmail/activity" className="btn btn-secondary">
              <span className="material-symbols-outlined">monitoring</span>
              View Activity
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
              <p className="font-medium text-emerald-300">Triage Completed</p>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Accounts</p>
                  <p className="text-lg font-bold">{result.accounts}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Processed</p>
                  <p className="text-lg font-bold">{result.processed}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Drafts Created</p>
                  <p className="text-lg font-bold text-emerald-400">{result.draftsCreated}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Skipped (Rules)</p>
                  <p className="text-lg font-bold text-amber-400">{result.skippedByRule}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Skipped (Duplicate)</p>
                  <p className="text-lg font-bold text-gray-400">{result.skippedDuplicate}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Lookback</p>
                  <p className="text-lg font-bold">{result.lookbackDays} days</p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <a 
                  href="https://mail.google.com/mail/u/0/#drafts" 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  <span className="material-symbols-outlined">open_in_new</span>
                  Review Drafts in Gmail
                </a>
                <Link href="/gmail/activity" className="btn btn-secondary btn-sm">
                  View Activity Log
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
            <span className="material-symbols-outlined text-blue-400 text-lg">lightbulb</span>
            <p>Start with the default 14-day lookback for your first triage run.</p>
          </div>
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-blue-400 text-lg">lightbulb</span>
            <p>Set up skip rules for newsletters and automated emails to reduce noise.</p>
          </div>
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-blue-400 text-lg">lightbulb</span>
            <p>Drafts are created in Gmail - review and send them directly from there.</p>
          </div>
        </div>
      </div>
    </div>
  );
}