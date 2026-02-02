'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="flex">
        {/* Main Content Area */}
        <div className="flex-1 p-4 lg:p-6 lg:pr-80">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Command Center</h1>
            <div className="hidden lg:flex items-center gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">search</span>
                <input 
                  type="text" 
                  placeholder="Search activities..."
                  className="pl-10 pr-4 py-2 bg-[#1e1e1e] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 w-64 focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          {/* Stat Cards - 4 columns on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <div className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label">Pending Notes</p>
                  <p className="stat-value">{patientStats?.notesPending || 0}</p>
                </div>
                <span className="material-symbols-outlined text-primary/60 text-xl">edit_note</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label">Appointments</p>
                  <p className="stat-value">{patientStats?.appointmentsThisWeek || 0}</p>
                </div>
                <span className="material-symbols-outlined text-primary/60 text-xl">calendar_month</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label">Total Comms</p>
                  <p className="stat-value">{stats?.overall.totalCommunications || 0}</p>
                </div>
                <span className="material-symbols-outlined text-primary/60 text-xl">forum</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="stat-label">Response Rate</p>
                  <p className="stat-value">{stats?.overall.responseRate || 0}%</p>
                </div>
                <span className="material-symbols-outlined text-primary/60 text-xl">trending_up</span>
              </div>
            </div>
          </div>

          {/* Mobile New Task Button */}
          <Link 
            href="/tasks?new=true"
            className="lg:hidden flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-colors mb-6"
          >
            <span className="material-symbols-outlined">add</span>
            New Task
          </Link>

          {/* Integration Cards - 2 columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
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
                    <p className="text-[10px] text-gray-500 uppercase">Approved</p>
                    <p className="text-xl font-bold text-white">{stats.openphone.approvedDrafts}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Response</p>
                    <p className="text-xl font-bold text-white">{stats.openphone.needsResponse}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Activity</p>
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
                    Review Drafts
                  </Link>
                </div>
              </div>
            )}

            {/* Gmail Card */}
            {stats && (
              <div className="p-4 rounded-xl bg-[#1e1e1e] border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-400">mail</span>
                    <span className="font-semibold text-white">Gmail</span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Syncing
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center mb-4">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Unread</p>
                    <p className="text-xl font-bold text-white">{stats.gmail.unreadEmails}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Drafts</p>
                    <p className="text-xl font-bold text-white">{stats.gmail.pendingDrafts}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Priority</p>
                    <p className="text-xl font-bold text-white">{stats.gmail.highPriority}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Processed</p>
                    <p className="text-xl font-bold text-white">{stats.gmail.processedToday}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link 
                    href="/gmail/triage"
                    className="py-2.5 rounded-lg bg-blue-500 hover:bg-blue-500/90 text-white text-sm font-medium text-center transition-colors"
                  >
                    Start Triage
                  </Link>
                  <Link 
                    href="/gmail/activity"
                    className="py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium text-center transition-colors border border-white/10"
                  >
                    View Activity
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Recent Unified Feed */}
          <div className="rounded-xl bg-[#1e1e1e] border border-white/5 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Unified Feed</h2>
              <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-gray-500 text-lg">tune</span>
              </button>
            </div>
            <div className="space-y-3">
              {activity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="material-symbols-outlined text-3xl mb-2">inbox</span>
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      item.type === 'openphone' 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {item.sender?.charAt(0)?.toUpperCase() || (item.type === 'openphone' ? 'Q' : 'G')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white text-sm">
                          {item.sender || (item.type === 'openphone' ? 'Quo Message' : 'Gmail')}
                        </p>
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">{item.description}</p>
                      <div className="flex gap-1.5 mt-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          item.type === 'openphone' 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {item.type === 'openphone' ? 'SMS' : 'Gmail'}
                        </span>
                        {item.priority === 'high' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                            High Priority
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {formatTime(item.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mobile Tasks Section */}
          <div className="lg:hidden mt-6">
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
        </div>

        {/* Right Sidebar - Desktop Only */}
        <div className="hidden lg:block w-72 fixed right-0 top-0 h-screen bg-[#141414] border-l border-white/5 p-4 overflow-y-auto">
          {/* New Task Button */}
          <Link 
            href="/tasks?new=true"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-colors mb-6"
          >
            <span className="material-symbols-outlined">add</span>
            New Task
          </Link>

          {/* Today's Tasks */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Today's Tasks</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400">{tasks.length}</span>
            </div>
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No pending tasks</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <Link
                    key={task.id}
                    href="/tasks"
                    className="block p-3 rounded-xl bg-[#1e1e1e] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm">{task.title}</p>
                        {task.due_date && (
                          <p className="text-xs text-gray-500 mt-1">{formatDueTime(task.due_date)}</p>
                        )}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getPriorityStyle(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Performance */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Performance</h3>
            <div className="p-3 rounded-xl bg-[#1e1e1e] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Weekly Goal</span>
                <span className="text-sm font-medium text-white">75%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-primary rounded-full" style={{ width: '75%' }}></div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.overall.activeToday || 0}</p>
                  <p className="text-xs text-gray-500">Actions</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-emerald-400">+12%</p>
                  <p className="text-xs text-gray-500">vs last week</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Upcoming</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1e1e1e] border border-white/5">
                <div className="text-center">
                  <p className="text-[10px] text-primary uppercase font-semibold">OCT</p>
                  <p className="text-lg font-bold text-white">12</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">Team Sync</p>
                  <p className="text-xs text-gray-500">10:00 AM - 11:00 AM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
