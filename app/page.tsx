'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QuickTaskModal from '@/components/QuickTaskModal';

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

interface StatCard {
  id: string;
  label: string;
  value: number | string;
  icon: string;
  color: string;
  glowColor: string;
}

const defaultStatCards: StatCard[] = [
  { id: '1', label: 'Pending Notes', value: 0, icon: 'edit_note', color: 'from-rose-500/20 to-rose-600/10', glowColor: 'shadow-rose-500/20' },
  { id: '2', label: 'Appointments', value: 0, icon: 'calendar_month', color: 'from-violet-500/20 to-violet-600/10', glowColor: 'shadow-violet-500/20' },
  { id: '3', label: 'Total Comms', value: 0, icon: 'forum', color: 'from-cyan-500/20 to-cyan-600/10', glowColor: 'shadow-cyan-500/20' },
  { id: '4', label: 'Response Rate', value: '0%', icon: 'trending_up', color: 'from-emerald-500/20 to-emerald-600/10', glowColor: 'shadow-emerald-500/20' },
];

const availableMetrics = [
  { key: 'pendingNotes', label: 'Pending Notes', icon: 'edit_note', color: 'from-rose-500/20 to-rose-600/10', glowColor: 'shadow-rose-500/20' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar_month', color: 'from-violet-500/20 to-violet-600/10', glowColor: 'shadow-violet-500/20' },
  { key: 'totalComms', label: 'Total Comms', icon: 'forum', color: 'from-cyan-500/20 to-cyan-600/10', glowColor: 'shadow-cyan-500/20' },
  { key: 'responseRate', label: 'Response Rate', icon: 'trending_up', color: 'from-emerald-500/20 to-emerald-600/10', glowColor: 'shadow-emerald-500/20' },
  { key: 'unreadEmails', label: 'Unread Emails', icon: 'mark_email_unread', color: 'from-amber-500/20 to-amber-600/10', glowColor: 'shadow-amber-500/20' },
  { key: 'activeToday', label: 'Active Today', icon: 'bolt', color: 'from-blue-500/20 to-blue-600/10', glowColor: 'shadow-blue-500/20' },
  { key: 'pendingTasks', label: 'Pending Tasks', icon: 'task_alt', color: 'from-orange-500/20 to-orange-600/10', glowColor: 'shadow-orange-500/20' },
  { key: 'highPriority', label: 'High Priority', icon: 'priority_high', color: 'from-red-500/20 to-red-600/10', glowColor: 'shadow-red-500/20' },
];

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patientStats, setPatientStats] = useState<PatientDashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [statCards, setStatCards] = useState<StatCard[]>(defaultStatCards);

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

  useEffect(() => {
    if (stats || patientStats) {
      updateStatCardValues();
    }
  }, [stats, patientStats, tasks]);

  function updateStatCardValues() {
    setStatCards(prev => prev.map(card => {
      let value: number | string = 0;
      switch (card.label) {
        case 'Pending Notes': value = patientStats?.notesPending || 0; break;
        case 'Appointments': value = patientStats?.appointmentsThisWeek || 0; break;
        case 'Total Comms': value = stats?.overall.totalCommunications || 0; break;
        case 'Response Rate': value = `${stats?.overall.responseRate || 0}%`; break;
        case 'Unread Emails': value = stats?.gmail.unreadEmails || 0; break;
        case 'Active Today': value = stats?.overall.activeToday || 0; break;
        case 'Pending Tasks': value = tasks.length; break;
        case 'High Priority': value = stats?.gmail.highPriority || 0; break;
        default: value = 0;
      }
      return { ...card, value };
    }));
  }

  function addStatCard(metricKey: string) {
    const metric = availableMetrics.find(m => m.key === metricKey);
    if (!metric) return;
    
    const newCard: StatCard = {
      id: Date.now().toString(),
      label: metric.label,
      value: 0,
      icon: metric.icon,
      color: metric.color,
      glowColor: metric.glowColor,
    };
    setStatCards(prev => [...prev, newCard]);
    setShowCardEditor(false);
  }

  function removeStatCard(id: string) {
    setStatCards(prev => prev.filter(card => card.id !== id));
  }

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117]">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-blue-400 animate-spin">
            progress_activity
          </span>
          <p className="mt-3 text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f18] via-[#0d1420] to-[#0f1a2e]">
      <QuickTaskModal 
        isOpen={showTaskModal} 
        onClose={() => setShowTaskModal(false)}
        onTaskCreated={loadTasks}
      />

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
                  className="pl-10 pr-4 py-2.5 bg-[#161b22]/80 backdrop-blur border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 w-64 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Stat Cards with Glow */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            {statCards.map((card) => (
              <div 
                key={card.id} 
                className={`group relative p-4 rounded-2xl bg-gradient-to-br ${card.color} backdrop-blur-sm border border-white/10 shadow-lg ${card.glowColor} hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
              >
                <button
                  onClick={() => removeStatCard(card.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-black/20 transition-all"
                >
                  <span className="material-symbols-outlined text-white/50 text-sm">close</span>
                </button>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/60 mb-1">{card.label}</p>
                    <p className="text-3xl font-bold text-white">{card.value}</p>
                  </div>
                  <span className="material-symbols-outlined text-white/30 text-2xl">{card.icon}</span>
                </div>
              </div>
            ))}
            
            {/* Add Card Button */}
            <button
              onClick={() => setShowCardEditor(!showCardEditor)}
              className="p-4 rounded-2xl border-2 border-dashed border-white/20 hover:border-blue-400/50 hover:bg-blue-400/5 transition-all flex flex-col items-center justify-center gap-2 min-h-[100px]"
            >
              <span className="material-symbols-outlined text-white/40 text-2xl">add</span>
              <span className="text-xs text-white/40">Add Card</span>
            </button>
          </div>

          {/* Card Editor Dropdown */}
          {showCardEditor && (
            <div className="mb-6 p-4 rounded-2xl bg-[#161b22]/90 backdrop-blur border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-3">Choose a metric to add:</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {availableMetrics.map((metric) => (
                  <button
                    key={metric.key}
                    onClick={() => addStatCard(metric.key)}
                    className="flex items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-blue-400">{metric.icon}</span>
                    <span className="text-sm text-white">{metric.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mobile New Task Button */}
          <button 
            onClick={() => setShowTaskModal(true)}
            className="lg:hidden flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-500/25 mb-6"
          >
            <span className="material-symbols-outlined">add</span>
            New Task
          </button>

          {/* Integration Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Quo / SMS Card */}
            {stats && (
              <div className="p-5 rounded-2xl bg-[#161b22]/80 backdrop-blur border border-white/10 shadow-lg shadow-orange-500/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-orange-400 text-lg">sms</span>
                    </div>
                    <span className="font-semibold text-white">Quo / SMS</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
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
                    className="py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium text-center transition-all shadow-lg shadow-blue-500/20"
                  >
                    Start Run
                  </Link>
                  <Link 
                    href="/openphone/review"
                    className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium text-center transition-colors border border-white/10"
                  >
                    Review Drafts
                  </Link>
                </div>
              </div>
            )}

            {/* Gmail Card */}
            {stats && (
              <div className="p-5 rounded-2xl bg-[#161b22]/80 backdrop-blur border border-white/10 shadow-lg shadow-red-500/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-red-400 text-lg">mail</span>
                    </div>
                    <span className="font-semibold text-white">Gmail</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
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
                    className="py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium text-center transition-all shadow-lg shadow-blue-500/20"
                  >
                    Start Triage
                  </Link>
                  <Link 
                    href="/gmail/activity"
                    className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium text-center transition-colors border border-white/10"
                  >
                    View Activity
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Recent Unified Feed */}
          <div className="rounded-2xl bg-[#161b22]/80 backdrop-blur border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Unified Feed</h2>
              <button className="p-1.5 rounded-xl hover:bg-white/5 transition-colors">
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
                        ? 'bg-orange-500/20 text-orange-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {item.sender?.charAt(0)?.toUpperCase() || (item.type === 'openphone' ? 'Q' : 'G')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm">
                        {item.sender || (item.type === 'openphone' ? 'Quo Message' : 'Gmail')}
                      </p>
                      <p className="text-sm text-gray-400 mt-0.5">{item.description}</p>
                      <div className="flex gap-1.5 mt-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${
                          item.type === 'openphone' 
                            ? 'bg-orange-500/20 text-orange-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {item.type === 'openphone' ? 'SMS' : 'Gmail'}
                        </span>
                        {item.priority === 'high' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-400">
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
              <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-400">{tasks.length}</span>
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
                    className="block p-4 rounded-2xl bg-[#161b22]/80 border border-white/10 hover:border-white/20 transition-colors"
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
        <div className="hidden lg:block w-72 fixed right-0 top-0 h-screen bg-[#0d1117]/90 backdrop-blur border-l border-white/5 p-4 overflow-y-auto">
          {/* New Task Button */}
          <button 
            onClick={() => setShowTaskModal(true)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-500/25 mb-6"
          >
            <span className="material-symbols-outlined">add</span>
            New Task
          </button>

          {/* Today's Tasks */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Today's Tasks</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-400">{tasks.length}</span>
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
                    className="block p-3 rounded-2xl bg-[#161b22]/80 border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm">{task.title}</p>
                        {task.due_date && (
                          <p className="text-xs text-gray-500 mt-1">{formatDueTime(task.due_date)}</p>
                        )}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-lg border ${getPriorityStyle(task.priority)}`}>
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
            <div className="p-4 rounded-2xl bg-[#161b22]/80 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Weekly Goal</span>
                <span className="text-sm font-medium text-white">75%</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 rounded-full" style={{ width: '75%' }}></div>
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
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#161b22]/80 border border-white/10">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-400 leading-none">12</p>
                  </div>
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
    </div>
  );
}
