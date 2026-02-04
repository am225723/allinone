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
  appointmentsToday: number;
  topIcd10: Array<{ code: string; label: string; count: number }>;
}

interface StatCard {
  id: string;
  metricKey: string;
  label: string;
  value: number | string;
  icon: string;
  color: string;
  glowColor: string;
}

const availableMetrics = [
  { key: 'pendingNotes', label: 'Pending Notes', icon: 'edit_note', color: 'from-rose-500/20 to-rose-600/10', glowColor: 'shadow-rose-500/20' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar_month', color: 'from-violet-500/20 to-violet-600/10', glowColor: 'shadow-violet-500/20' },
  { key: 'appointmentsToday', label: 'Appointments Today', icon: 'event_available', color: 'from-purple-500/20 to-purple-600/10', glowColor: 'shadow-purple-500/20' },
  { key: 'totalComms', label: 'Total Comms', icon: 'forum', color: 'from-cyan-500/20 to-cyan-600/10', glowColor: 'shadow-cyan-500/20' },
  { key: 'responseRate', label: 'Response Rate', icon: 'trending_up', color: 'from-emerald-500/20 to-emerald-600/10', glowColor: 'shadow-emerald-500/20' },
  { key: 'unreadEmails', label: 'Unread Emails', icon: 'mark_email_unread', color: 'from-amber-500/20 to-amber-600/10', glowColor: 'shadow-amber-500/20' },
  { key: 'todaysEmails', label: 'Today\'s Emails', icon: 'mail', color: 'from-red-500/20 to-red-600/10', glowColor: 'shadow-red-500/20' },
  { key: 'todaysMessages', label: 'Today\'s Messages', icon: 'sms', color: 'from-orange-500/20 to-orange-600/10', glowColor: 'shadow-orange-500/20' },
  { key: 'todaysCalls', label: 'Today\'s Calls', icon: 'call', color: 'from-teal-500/20 to-teal-600/10', glowColor: 'shadow-teal-500/20' },
  { key: 'activeToday', label: 'Active Today', icon: 'bolt', color: 'from-blue-500/20 to-blue-600/10', glowColor: 'shadow-blue-500/20' },
  { key: 'pendingTasks', label: 'Pending Tasks', icon: 'task_alt', color: 'from-indigo-500/20 to-indigo-600/10', glowColor: 'shadow-indigo-500/20' },
  { key: 'tasksToday', label: 'Tasks Today', icon: 'checklist', color: 'from-pink-500/20 to-pink-600/10', glowColor: 'shadow-pink-500/20' },
  { key: 'highPriority', label: 'High Priority', icon: 'priority_high', color: 'from-red-500/20 to-red-600/10', glowColor: 'shadow-red-500/20' },
];

const defaultCards: StatCard[] = [
  { id: '1', metricKey: 'pendingNotes', label: 'Pending Notes', value: 0, icon: 'edit_note', color: 'from-rose-500/20 to-rose-600/10', glowColor: 'shadow-rose-500/20' },
  { id: '2', metricKey: 'appointments', label: 'Appointments', value: 0, icon: 'calendar_month', color: 'from-violet-500/20 to-violet-600/10', glowColor: 'shadow-violet-500/20' },
  { id: '3', metricKey: 'totalComms', label: 'Total Comms', value: 0, icon: 'forum', color: 'from-cyan-500/20 to-cyan-600/10', glowColor: 'shadow-cyan-500/20' },
  { id: '4', metricKey: 'responseRate', label: 'Response Rate', value: '0%', icon: 'trending_up', color: 'from-emerald-500/20 to-emerald-600/10', glowColor: 'shadow-emerald-500/20' },
];

const STORAGE_KEY = 'dashboard_stat_cards';

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patientStats, setPatientStats] = useState<PatientDashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [statCards, setStatCards] = useState<StatCard[]>(defaultCards);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setStatCards(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading saved cards:', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statCards));
    } catch (e) {
      console.error('Error saving cards:', e);
    }
  }, [statCards]);

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

  function getMetricValue(metricKey: string): number | string {
    switch (metricKey) {
      case 'pendingNotes': return patientStats?.notesPending || 0;
      case 'appointments': return patientStats?.appointmentsThisWeek || 0;
      case 'appointmentsToday': return patientStats?.appointmentsToday || 0;
      case 'totalComms': return stats?.overall.totalCommunications || 0;
      case 'responseRate': return `${stats?.overall.responseRate || 0}%`;
      case 'unreadEmails': return stats?.gmail.unreadEmails || 0;
      case 'todaysEmails': return stats?.gmail.processedToday || 0;
      case 'todaysMessages': return stats?.openphone.todayActivity || 0;
      case 'todaysCalls': return 0;
      case 'activeToday': return stats?.overall.activeToday || 0;
      case 'pendingTasks': return tasks.filter(t => t.status === 'pending').length;
      case 'tasksToday': return tasks.length;
      case 'highPriority': return stats?.gmail.highPriority || 0;
      default: return 0;
    }
  }

  function updateStatCardValues() {
    setStatCards(prev => prev.map(card => ({
      ...card,
      value: getMetricValue(card.metricKey)
    })));
  }

  function addStatCard(metricKey: string) {
    const metric = availableMetrics.find(m => m.key === metricKey);
    if (!metric) return;
    
    const newCard: StatCard = {
      id: Date.now().toString(),
      metricKey: metric.key,
      label: metric.label,
      value: getMetricValue(metric.key),
      icon: metric.icon,
      color: metric.color,
      glowColor: metric.glowColor,
    };
    setStatCards(prev => [...prev, newCard]);
    setShowCardEditor(false);
  }

  function changeCardMetric(cardId: string, metricKey: string) {
    const metric = availableMetrics.find(m => m.key === metricKey);
    if (!metric) return;
    
    setStatCards(prev => prev.map(card => 
      card.id === cardId 
        ? {
            ...card,
            metricKey: metric.key,
            label: metric.label,
            icon: metric.icon,
            color: metric.color,
            glowColor: metric.glowColor,
            value: getMetricValue(metric.key),
          }
        : card
    ));
    setEditingCardId(null);
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
          .slice(0, 5);
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

          {/* Add Card Editor - Above Stat Cards */}
          {showCardEditor && (
            <div className="mb-4 p-4 rounded-2xl bg-[#161b22]/90 backdrop-blur border border-white/10 shadow-xl z-50 relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Choose a metric to add:</h3>
                <button onClick={() => setShowCardEditor(false)} className="p-1 rounded-lg hover:bg-white/10">
                  <span className="material-symbols-outlined text-gray-400 text-lg">close</span>
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {availableMetrics.map((metric) => (
                  <button
                    key={metric.key}
                    onClick={() => addStatCard(metric.key)}
                    className={`flex items-center gap-2 p-3 rounded-xl bg-gradient-to-br ${metric.color} border border-white/10 hover:border-white/20 transition-all text-left`}
                  >
                    <span className="material-symbols-outlined text-white/70">{metric.icon}</span>
                    <span className="text-sm text-white">{metric.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stat Cards with Glow and Edit */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 relative z-20 overflow-visible">
            {statCards.map((card) => (
              <div 
                key={card.id} 
                className={`group relative p-4 rounded-2xl bg-gradient-to-br ${card.color} backdrop-blur-sm border border-white/10 shadow-lg ${card.glowColor} hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
              >
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                  <button
                    onClick={() => setEditingCardId(editingCardId === card.id ? null : card.id)}
                    className="p-1 rounded-lg hover:bg-black/20 transition-all"
                    title="Edit metric"
                  >
                    <span className="material-symbols-outlined text-white/50 text-sm">edit</span>
                  </button>
                  <button
                    onClick={() => removeStatCard(card.id)}
                    className="p-1 rounded-lg hover:bg-black/20 transition-all"
                    title="Remove card"
                  >
                    <span className="material-symbols-outlined text-white/50 text-sm">close</span>
                  </button>
                </div>
                
                {editingCardId === card.id && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-xl bg-[#161b22] border border-white/10 shadow-2xl z-[100]">
                    <p className="text-xs text-gray-400 mb-2 px-2">Change metric:</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {availableMetrics.map((metric) => (
                        <button
                          key={metric.key}
                          onClick={() => changeCardMetric(card.id, metric.key)}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                            card.metricKey === metric.key 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'hover:bg-white/5 text-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">{metric.icon}</span>
                          <span className="text-xs">{metric.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/60 mb-1">{card.label}</p>
                    <p className="text-3xl font-bold text-white">{card.value}</p>
                  </div>
                  <span className="material-symbols-outlined text-white/30 text-2xl">{card.icon}</span>
                </div>
              </div>
            ))}
            
            <button
              onClick={() => setShowCardEditor(!showCardEditor)}
              className="p-4 rounded-2xl border-2 border-dashed border-white/20 hover:border-blue-400/50 hover:bg-blue-400/5 transition-all flex flex-col items-center justify-center gap-2 min-h-[100px]"
            >
              <span className="material-symbols-outlined text-white/40 text-2xl">add</span>
              <span className="text-xs text-white/40">Add Card</span>
            </button>
          </div>

          {/* Mobile New Task Button */}
          <button 
            onClick={() => setShowTaskModal(true)}
            className="lg:hidden flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-500/25 mb-6"
          >
            <span className="material-symbols-outlined">add</span>
            New Task
          </button>

          {/* Integration Cards with Glow */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Quo / SMS Card */}
            {stats && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur border border-orange-500/20 shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center shadow-lg shadow-orange-500/20">
                      <span className="material-symbols-outlined text-orange-400 text-lg">sms</span>
                    </div>
                    <span className="font-semibold text-orange-100">Quo / SMS</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center mb-4">
                  <div>
                    <p className="text-[10px] text-orange-300/50 uppercase">Pending</p>
                    <p className="text-xl font-bold text-white">{stats.openphone.pendingDrafts}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-orange-300/50 uppercase">Approved</p>
                    <p className="text-xl font-bold text-white">{stats.openphone.approvedDrafts}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-orange-300/50 uppercase">Response</p>
                    <p className="text-xl font-bold text-white">{stats.openphone.needsResponse}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-orange-300/50 uppercase">Activity</p>
                    <p className="text-xl font-bold text-white">{stats.openphone.todayActivity}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link 
                    href="/openphone/run"
                    className="py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-medium text-center transition-all shadow-lg shadow-orange-500/20"
                  >
                    Start Run
                  </Link>
                  <Link 
                    href="/openphone/review"
                    className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium text-center transition-colors border border-orange-500/20"
                  >
                    Review Drafts
                  </Link>
                </div>
              </div>
            )}

            {/* Gmail Card */}
            {stats && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/5 backdrop-blur border border-red-500/20 shadow-lg shadow-red-500/10 hover:shadow-red-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center shadow-lg shadow-red-500/20">
                      <span className="material-symbols-outlined text-red-400 text-lg">mail</span>
                    </div>
                    <span className="font-semibold text-red-100">Gmail</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Syncing
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center mb-4">
                  <div>
                    <p className="text-[10px] text-red-300/50 uppercase">Unread</p>
                    <p className="text-xl font-bold text-white">{stats.gmail.unreadEmails}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-red-300/50 uppercase">Drafts</p>
                    <p className="text-xl font-bold text-white">{stats.gmail.pendingDrafts}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-red-300/50 uppercase">Priority</p>
                    <p className="text-xl font-bold text-white">{stats.gmail.highPriority}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-red-300/50 uppercase">Processed</p>
                    <p className="text-xl font-bold text-white">{stats.gmail.processedToday}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link 
                    href="/gmail/triage"
                    className="py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium text-center transition-all shadow-lg shadow-red-500/20"
                  >
                    Start Triage
                  </Link>
                  <Link 
                    href="/gmail/activity"
                    className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium text-center transition-colors border border-red-500/20"
                  >
                    View Activity
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Recent Unified Feed with Glow */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-500/5 to-indigo-500/5 backdrop-blur border border-blue-500/10 shadow-lg shadow-blue-500/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-blue-100">Recent Unified Feed</h2>
              <button className="p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-blue-400/50 text-lg">tune</span>
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
                        ? 'bg-orange-500/20 text-orange-400 shadow-lg shadow-orange-500/20' 
                        : 'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20'
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
              <h2 className="text-sm font-semibold text-violet-300 uppercase tracking-wide">Today's Tasks</h2>
              <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-400">{tasks.length}</span>
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
                    className="block p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 hover:border-violet-500/30 transition-colors shadow-lg shadow-violet-500/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white">{task.title}</p>
                        {task.due_date && (
                          <p className="text-xs text-violet-300/50 mt-1">{formatDueTime(task.due_date)}</p>
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
        <div className="hidden lg:block w-72 fixed right-0 top-0 h-screen bg-gradient-to-b from-[#0d1117]/95 to-[#0a0f18]/95 backdrop-blur border-l border-white/5 p-4 overflow-y-auto">
          {/* New Task Button */}
          <button 
            onClick={() => setShowTaskModal(true)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-500/25 mb-6"
          >
            <span className="material-symbols-outlined">add</span>
            New Task
          </button>

          {/* Today's Tasks with Glow */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-violet-400 uppercase tracking-wide">Today's Tasks</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-400">{tasks.length}</span>
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
                    className="block p-3 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 hover:border-violet-500/30 transition-colors shadow-lg shadow-violet-500/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm">{task.title}</p>
                        {task.due_date && (
                          <p className="text-xs text-violet-300/50 mt-1">{formatDueTime(task.due_date)}</p>
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

          {/* Performance with Glow */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-3">Performance</h3>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-emerald-300/70">Weekly Goal</span>
                <span className="text-sm font-medium text-white">75%</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full shadow-lg shadow-emerald-500/30" style={{ width: '75%' }}></div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.overall.activeToday || 0}</p>
                  <p className="text-xs text-emerald-300/50">Actions</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-emerald-400">+12%</p>
                  <p adminclassName="text-xs text-emerald-300/50">vs last week</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming with Glow */}
          <div>
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide mb-3">Upcoming</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/20 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <div className="text-center">
                    <p className="text-lg font-bold text-cyan-400 leading-none">12</p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">Team Sync</p>
                  <p className="text-xs text-cyan-300/50">10:00 AM - 11:00 AM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
