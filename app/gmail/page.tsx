'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface GmailAccount {
  email: string;
  name: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  sync_error: string | null;
}

interface GmailStats {
  connectedAccounts: number;
  emailsProcessed: number;
  highPriority: number;
  lastTriage: string | null;
}

export default function GmailPage() {
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [stats, setStats] = useState<GmailStats>({ connectedAccounts: 0, emailsProcessed: 0, highPriority: 0, lastTriage: null });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  async function loadData() {
    setLoading(true);
    try {
      const [syncRes, statsRes] = await Promise.all([
        fetch('/api/gmail/sync'),
        fetch('/api/stats'),
      ]);
      const syncData = await syncRes.json();
      const statsData = await statsRes.json();

      if (syncData.ok) setAccounts(syncData.accounts || []);

      if (statsData.ok && statsData.stats?.gmail) {
        setStats({
          connectedAccounts: syncData.accounts?.length || 0,
          emailsProcessed: statsData.stats.gmail.processed || 0,
          highPriority: statsData.stats.gmail.highPriority || 0,
          lastTriage: statsData.stats.gmail.lastTriage || null,
        });
      } else {
        setStats(prev => ({ ...prev, connectedAccounts: syncData.accounts?.length || 0 }));
      }

      try {
        const activityRes = await fetch('/api/gmail/activity?limit=4');
        const activityData = await activityRes.json();
        if (activityData.data) setRecentActivity(activityData.data);
      } catch (e) {}
    } catch (error) {
      console.error('Error loading Gmail data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleSyncNow() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        const synced = data.accounts?.filter((a: any) => a.status === 'ok').length || 0;
        const errors = data.accounts?.filter((a: any) => a.status === 'error').length || 0;
        setSyncResult(`Synced ${synced} account(s)${errors > 0 ? `, ${errors} error(s)` : ''}`);
        await loadData();
      } else {
        setSyncResult(data.error || 'Sync failed');
      }
    } catch (err) {
      setSyncResult('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  function formatTimeAgo(dateStr: string | null) {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-400 text-3xl">mail</span>
            Gmail Communications
          </h1>
          <p className="text-gray-400 mt-1">Triage emails, manage drafts, and configure automation rules</p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-secondary"
            onClick={handleSyncNow}
            disabled={syncing}
          >
            <span className={`material-symbols-outlined ${syncing ? 'animate-spin' : ''}`}>
              {syncing ? 'progress_activity' : 'sync'}
            </span>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <a href="/api/gmail/auth" className="btn btn-primary">
            <span className="material-symbols-outlined">add</span>
            Connect Gmail
          </a>
        </div>
      </div>

      {syncResult && (
        <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400 text-sm">info</span>
          <span className="text-sm text-blue-300">{syncResult}</span>
          <button className="ml-auto text-blue-400/50 hover:text-blue-400" onClick={() => setSyncResult(null)}>
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {accounts.some(a => a.sync_error) && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-red-400 text-sm">warning</span>
            <span className="text-sm font-medium text-red-300">Sync Issues</span>
          </div>
          {accounts.filter(a => a.sync_error).map(a => (
            <p key={a.email} className="text-xs text-red-300/70">{a.email}: {a.sync_error}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-label">Connected Inboxes</span>
          <span className="stat-value">{loading ? '...' : stats.connectedAccounts}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Emails Processed</span>
          <span className="stat-value text-blue-400">{loading ? '...' : stats.emailsProcessed}</span>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <span className="stat-label">High Priority</span>
          <span className="stat-value text-red-400">{loading ? '...' : stats.highPriority}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Last Sync</span>
          <span className="stat-value text-sm">
            {loading ? '...' : formatTimeAgo(accounts.find(a => a.last_sync_at)?.last_sync_at || null)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/gmail/triage" className="card hover:border-blue-500/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <span className="material-symbols-outlined text-blue-400 text-2xl">filter_alt</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Run Triage</h3>
              <p className="text-gray-400 text-sm">Scan recent emails, analyze priority, and create draft replies automatically.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-blue-400 text-sm font-medium">
            Start triage
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        <Link href="/gmail/activity" className="card hover:border-blue-500/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
              <span className="material-symbols-outlined text-emerald-400 text-2xl">monitoring</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Activity Log</h3>
              <p className="text-gray-400 text-sm">View processed emails, their summaries, and draft status.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-emerald-400 text-sm font-medium">
            View activity
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        <Link href="/gmail/rules" className="card hover:border-blue-500/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
              <span className="material-symbols-outlined text-purple-400 text-2xl">rule</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Manage Rules</h3>
              <p className="text-gray-400 text-sm">Configure skip rules for senders or subjects to customize triage behavior.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-purple-400 text-sm font-medium">
            Manage rules
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        <Link href="/gmail/accounts" className="card hover:border-blue-500/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
              <span className="material-symbols-outlined text-amber-400 text-2xl">account_circle</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Connected Accounts</h3>
              <p className="text-gray-400 text-sm">Manage connected Gmail accounts and their settings.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-amber-400 text-sm font-medium">
            Manage accounts
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>

        <a
          href="https://mail.google.com/mail/u/0/#drafts"
          target="_blank"
          rel="noreferrer"
          className="card hover:border-blue-500/50 transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center group-hover:bg-gray-500/30 transition-colors">
              <span className="material-symbols-outlined text-gray-400 text-2xl">open_in_new</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Open Gmail Drafts</h3>
              <p className="text-gray-400 text-sm">Review and send drafts directly in Gmail.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-gray-400 text-sm font-medium">
            Open Gmail
            <span className="material-symbols-outlined text-lg ml-1">open_in_new</span>
          </div>
        </a>

        <Link href="/gmail/settings" className="card hover:border-blue-500/50 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center group-hover:bg-gray-500/30 transition-colors">
              <span className="material-symbols-outlined text-gray-400 text-2xl">settings</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Settings</h3>
              <p className="text-gray-400 text-sm">Configure scheduling, lookback period, and other Gmail settings.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-gray-400 text-sm font-medium">
            Manage settings
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </div>
        </Link>
      </div>

      <div className="card mt-8">
        <h3 className="card-title mb-6">How Gmail Triage Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-blue-400 text-3xl">link</span>
            </div>
            <h4 className="font-bold mb-2">1. Connect Gmail</h4>
            <p className="text-sm text-gray-400">OAuth keeps credentials secure and easy to revoke anytime.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-emerald-400 text-3xl">auto_awesome</span>
            </div>
            <h4 className="font-bold mb-2">2. Run Triage</h4>
            <p className="text-sm text-gray-400">AI analyzes emails, assigns priority, and creates draft replies.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-purple-400 text-3xl">send</span>
            </div>
            <h4 className="font-bold mb-2">3. Review & Send</h4>
            <p className="text-sm text-gray-400">Review drafts in Gmail and send when ready. You stay in control.</p>
          </div>
        </div>
      </div>

      <div className="card mt-8">
        <div className="card-header">
          <h3 className="card-title">Recent Email Activity</h3>
          <Link href="/gmail/activity" className="btn btn-ghost btn-sm">
            View All
          </Link>
        </div>
        <div className="space-y-3">
          {recentActivity.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2">mail</span>
              <p>No recent email activity. Run a triage to process emails.</p>
            </div>
          )}
          {recentActivity.map((item: any, i: number) => (
            <div key={item.id || i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                <span className="material-symbols-outlined">mail</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{item.from_address || 'Unknown'}</span>
                </div>
                <p className="text-sm text-gray-400 truncate">{item.subject || 'No subject'}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-2">
                  <span className={`badge ${
                    item.priority === 'high' ? 'badge-danger' :
                    item.priority === 'normal' ? 'badge-info' : ''
                  }`}>
                    {item.priority || 'normal'}
                  </span>
                  {item.draft_created && <span className="badge badge-success">Draft</span>}
                </div>
                {item.created_at && (
                  <span className="text-xs text-gray-500">{formatTimeAgo(item.created_at)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
