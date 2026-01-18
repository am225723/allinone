'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  openphone: {
    pendingDrafts: number;
    approvedDrafts: number;
    totalConversations: number;
    needsResponse: number;
    todayActivity: number;
  };
  gmail: {
    unreadEmails: number;
    pendingDrafts: number;
    processedToday: number;
    highPriority: number;
    needsResponse: number;
  };
  overall: {
    totalCommunications: number;
    responseRate: number;
    avgResponseTime: string;
    activeToday: number;
  };
}

interface ActivityItem {
  id: string;
  type: 'openphone' | 'gmail';
  action: string;
  description: string;
  timestamp: string;
  priority?: 'high' | 'normal' | 'low';
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
    loadActivity();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadStats(true);
      loadActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function loadStats(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadActivity() {
    try {
      const res = await fetch('/api/stats?type=activity&limit=10');
      const data = await res.json();
      if (data.ok) {
        setActivity(data.activity);
      }
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  }

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="mt-4 text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Communications Dashboard</h1>
          <p className="text-gray-400 mt-1">Unified view of all your communications</p>
        </div>
        <button
          onClick={() => loadStats()}
          disabled={refreshing}
          className="btn btn-secondary"
        >
          <span className={`material-symbols-outlined ${refreshing ? 'animate-spin' : ''}`}>
            refresh
          </span>
          Refresh
        </button>
      </div>

      {/* Overall Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 uppercase">Total Communications</p>
                <p className="text-3xl font-bold mt-1">{stats.overall.totalCommunications}</p>
              </div>
              <span className="material-symbols-outlined text-5xl text-blue-400">
                forum
              </span>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 uppercase">Response Rate</p>
                <p className="text-3xl font-bold mt-1">{stats.overall.responseRate}%</p>
              </div>
              <span className="material-symbols-outlined text-5xl text-emerald-400">
                trending_up
              </span>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 uppercase">Avg Response Time</p>
                <p className="text-3xl font-bold mt-1">{stats.overall.avgResponseTime}</p>
              </div>
              <span className="material-symbols-outlined text-5xl text-amber-400">
                schedule
              </span>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 uppercase">Active Today</p>
                <p className="text-3xl font-bold mt-1">{stats.overall.activeToday}</p>
              </div>
              <span className="material-symbols-outlined text-5xl text-purple-400">
                today
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Channel Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* OpenPhone Stats */}
        {stats && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">phone</span>
                OpenPhone / SMS
              </h3>
              <Link href="/openphone" className="btn btn-sm btn-secondary">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-400">pending</span>
                  <span className="text-sm">Pending Drafts</span>
                </div>
                <span className="text-xl font-bold">{stats.openphone.pendingDrafts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                  <span className="text-sm">Approved Drafts</span>
                </div>
                <span className="text-xl font-bold">{stats.openphone.approvedDrafts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-400">priority_high</span>
                  <span className="text-sm">Needs Response</span>
                </div>
                <span className="text-xl font-bold">{stats.openphone.needsResponse}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-400">today</span>
                  <span className="text-sm">Today's Activity</span>
                </div>
                <span className="text-xl font-bold">{stats.openphone.todayActivity}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/openphone/run" className="btn btn-primary btn-sm flex-1">
                <span className="material-symbols-outlined">play_arrow</span>
                Start Run
              </Link>
              <Link href="/openphone/review" className="btn btn-secondary btn-sm flex-1">
                <span className="material-symbols-outlined">rate_review</span>
                Review Drafts
              </Link>
            </div>
          </div>
        )}

        {/* Gmail Stats */}
        {stats && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">mail</span>
                Gmail
              </h3>
              <Link href="/gmail" className="btn btn-sm btn-secondary">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-400">mark_email_unread</span>
                  <span className="text-sm">Unread Emails</span>
                </div>
                <span className="text-xl font-bold">{stats.gmail.unreadEmails}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-purple-400">drafts</span>
                  <span className="text-sm">Pending Drafts</span>
                </div>
                <span className="text-xl font-bold">{stats.gmail.pendingDrafts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-400">priority_high</span>
                  <span className="text-sm">High Priority</span>
                </div>
                <span className="text-xl font-bold">{stats.gmail.highPriority}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-400">today</span>
                  <span className="text-sm">Processed Today</span>
                </div>
                <span className="text-xl font-bold">{stats.gmail.processedToday}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/gmail/triage" className="btn btn-primary btn-sm flex-1">
                <span className="material-symbols-outlined">play_arrow</span>
                Start Triage
              </Link>
              <Link href="/gmail/activity" className="btn btn-secondary btn-sm flex-1">
                <span className="material-symbols-outlined">monitoring</span>
                View Activity
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            Recent Activity
          </h3>
        </div>
        {activity.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="material-symbols-outlined text-5xl mb-2">inbox</span>
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
              >
                <span
                  className={`material-symbols-outlined ${
                    item.type === 'openphone' ? 'text-primary' : 'text-blue-400'
                  }`}
                >
                  {item.type === 'openphone' ? 'phone' : 'mail'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-gray-500">{formatTimestamp(item.timestamp)}</p>
                </div>
                {item.priority === 'high' && (
                  <span className="material-symbols-outlined text-red-400 text-sm">
                    priority_high
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Link href="/openphone/run" className="card hover:border-primary/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <span className="material-symbols-outlined text-primary text-3xl">play_arrow</span>
            </div>
            <div>
              <h4 className="font-semibold">Start OpenPhone Run</h4>
              <p className="text-sm text-gray-400">Process SMS conversations</p>
            </div>
          </div>
        </Link>

        <Link href="/gmail/triage" className="card hover:border-blue-400/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-400/20 rounded-xl">
              <span className="material-symbols-outlined text-blue-400 text-3xl">filter_alt</span>
            </div>
            <div>
              <h4 className="font-semibold">Start Email Triage</h4>
              <p className="text-sm text-gray-400">Analyze and organize emails</p>
            </div>
          </div>
        </Link>

        <Link href="/settings" className="card hover:border-gray-400/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-400/20 rounded-xl">
              <span className="material-symbols-outlined text-gray-400 text-3xl">settings</span>
            </div>
            <div>
              <h4 className="font-semibold">Settings</h4>
              <p className="text-sm text-gray-400">Configure your dashboard</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}