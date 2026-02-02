'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  description?: string;
}

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
  sender?: string;
}

interface PatientDashboardStats {
  notesPending: number;
  appointmentsThisWeek: number;
  topIcd10: Array<{ code: string; label: string; count: number }>;
  appointmentsToday: {
    dateLabel: string;
    items: Array<{ time: string; patient: string; type: string }>;
  };
}

export default function DashboardHome() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patientStats, setPatientStats] = useState<PatientDashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadPatientStats();
    loadActivity();
    loadTasks();
    
    const interval = setInterval(() => {
      loadStats(true);
      loadPatientStats(true);
      loadActivity();
      loadTasks();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function loadPatientStats(silent = false) {
    try {
      const res = await fetch('/api/patient-stats');
      const data = await res.json();
      if (data.ok) {
        setPatientStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading patient stats:', error);
    }
  }

  async function loadTasks() {
    try {
      const res = await fetch('/api/tasks?status=pending,in_progress');
      const data = await res.json();
      if (data.ok) {
        const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
        const sorted = (data.tasks || [])
          .sort((a: Task, b: Task) => priorityOrder[a.priority] - priorityOrder[b.priority])
          .slice(0, 3);
        setTasks(sorted);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  async function loadStats(silent = false) {
    if (!silent) setLoading(true);

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
    }
  }

  async function loadActivity() {
    try {
      const res = await fetch('/api/stats?type=activity&limit=5');
      const data = await res.json();
      if (data.ok) {
        setActivity(data.activity);
      }
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function formatDueTime(dueDate: string | null) {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return `Due at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    return `Due ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'normal':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'high': return 'High';
      case 'normal': return 'Med';
      default: return 'Low';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-primary animate-spin">
            progress_activity
          </span>
          <p className="mt-3 text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Stat Cards - 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Pending Notes</p>
              <p className="stat-value">{patientStats?.notesPending || 0}</p>
            </div>
            <span className="material-symbols-outlined text-primary/60 text-2xl">edit_note</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Apps</p>
              <p className="stat-value">{patientStats?.appointmentsThisWeek || 0}</p>
            </div>
            <span className="material-symbols-outlined text-primary/60 text-2xl">calendar_month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Total Comms</p>
              <p className="stat-value">{stats?.overall.totalCommunications || 0}</p>
            </div>
            <span className="material-symbols-outlined text-primary/60 text-2xl">forum</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Response Rate</p>
              <p className="stat-value">{stats?.overall.responseRate || 0}%</p>
            </div>
            <span className="material-symbols-outlined text-primary/60 text-2xl">trending_up</span>
          </div>
        </div>
      </div>

      {/* New Task Button */}
      <Link 
        href="/tasks?new=true"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-colors"
      >
        <span className="material-symbols-outlined">add</span>
        New Task
      </Link>

      {/* Today's Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Today's Tasks</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400">{tasks.length}</span>
        </div>
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <span className="material-symbols-outlined text-3xl mb-2">checklist</span>
              <p className="text-sm">No pending tasks</p>
            </div>
          ) : (
            tasks.map((task) => (
              <Link
                key={task.id}
                href="/tasks"
                className="block p-4 rounded-xl bg-[#1e1e1e] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-gray-500 mt-1">{formatDueTime(task.due_date)}</p>
                    )}
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{task.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg border ${getPriorityStyle(task.priority)}`}>
                    {getPriorityLabel(task.priority)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quo / SMS Card */}
      {stats && (
        <div className="p-4 rounded-xl bg-[#1e1e1e] border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">sms</span>
              <span className="font-semibold text-white">Quo / SMS</span>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Active
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center mb-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Pending</p>
              <p className="text-xl font-bold text-white">{stats.openphone.pendingDrafts}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">OK</p>
              <p className="text-xl font-bold text-white">{stats.openphone.approvedDrafts}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Resp</p>
              <p className="text-xl font-bold text-white">{stats.openphone.needsResponse}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Act</p>
              <p className="text-xl font-bold text-white">{stats.openphone.todayActivity}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link 
              href="/openphone/run"
              className="py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium text-center transition-colors"
            >
              Start Run
            </Link>
            <Link 
              href="/openphone/review"
              className="py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium text-center transition-colors border border-white/10"
            >
              Review
            </Link>
          </div>
        </div>
      )}

      {/* Gmail Card */}
      {stats && (
        <div className="p-4 rounded-xl bg-[#1e1e1e] border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">mail</span>
              <span className="font-semibold text-white">Gmail</span>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Sync
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center mb-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">New</p>
              <p className="text-xl font-bold text-white">{stats.gmail.unreadEmails}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Draft</p>
              <p className="text-xl font-bold text-white">{stats.gmail.pendingDrafts}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Prio</p>
              <p className="text-xl font-bold text-white">{stats.gmail.highPriority}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Done</p>
              <p className="text-xl font-bold text-white">{stats.gmail.processedToday}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link 
              href="/gmail/triage"
              className="py-2.5 rounded-lg bg-blue-500 hover:bg-blue-500/90 text-white text-sm font-medium text-center transition-colors"
            >
              Triage
            </Link>
            <Link 
              href="/gmail/activity"
              className="py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium text-center transition-colors border border-white/10"
            >
              Activity
            </Link>
          </div>
        </div>
      )}

      {/* Recent Unified Feed */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Recent Unified Feed</h2>
        <div className="space-y-2">
          {activity.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <span className="material-symbols-outlined text-3xl mb-2">inbox</span>
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            activity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#1e1e1e] border border-white/5"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  item.type === 'openphone' 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {item.sender?.charAt(0)?.toUpperCase() || (item.type === 'openphone' ? 'Q' : 'G')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white text-sm truncate">
                      {item.sender || (item.type === 'openphone' ? 'Quo Message' : 'Gmail')}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{formatTime(item.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-400 truncate mt-0.5">{item.description}</p>
                  <div className="flex gap-1.5 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      item.type === 'openphone' 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {item.type === 'openphone' ? 'SMS' : 'Gmail'}
                    </span>
                    {item.priority === 'high' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                        Urgent
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dark Mode Toggle - Fixed bottom right */}
      <button className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 w-12 h-12 rounded-full bg-[#1e1e1e] border border-white/10 flex items-center justify-center shadow-lg hover:bg-white/10 transition-colors z-40">
        <span className="material-symbols-outlined text-gray-400">dark_mode</span>
      </button>

      <style jsx>{`
        .stat-card {
          background: #1e1e1e;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px;
        }
        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: white;
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
