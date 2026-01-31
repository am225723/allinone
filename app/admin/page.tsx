'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  usage_count: number;
}

interface SystemStats {
  totalRuns: number;
  totalSummaries: number;
  totalDrafts: number;
  totalEmails: number;
  pendingDrafts: number;
  approvedDrafts: number;
}

interface RunHistory {
  id: string;
  started_at: string;
  completed_at: string;
  status: string;
  conversations_processed: number;
  drafts_generated: number;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'notifications' | 'templates' | 'exports' | 'settings' | 'logs'>('overview');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [runHistory, setRunHistory] = useState<RunHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    url: '',
  });
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    category: 'general',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    loadSystemStats();
    loadTemplates();
    loadRunHistory();
    loadPin();
  }, []);

  async function loadPin() {
    try {
      const res = await fetch('/api/settings/pin');
      const data = await res.json();
      if (data.ok) {
        setCurrentPin(data.pin || '123456');
      }
    } catch (error) {
      console.error('Error loading PIN:', error);
    }
  }

  async function updatePin() {
    if (!newPin || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      setMessage({ type: 'error', text: 'PIN must be 4-6 digits' });
      return;
    }

    setPinLoading(true);
    try {
      const res = await fetch('/api/settings/pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      });
      const data = await res.json();

      if (data.ok) {
        setMessage({ type: 'success', text: 'PIN updated successfully!' });
        setCurrentPin(newPin);
        setNewPin('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update PIN' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update PIN' });
    } finally {
      setPinLoading(false);
    }
  }

  async function loadSystemStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data) {
        setSystemStats({
          totalRuns: data.openphone?.runs || 0,
          totalSummaries: data.openphone?.summaries || 0,
          totalDrafts: data.openphone?.pending_drafts + data.openphone?.approved_drafts || 0,
          totalEmails: data.gmail?.processed_today || 0,
          pendingDrafts: data.openphone?.pending_drafts || 0,
          approvedDrafts: data.openphone?.approved_drafts || 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadRunHistory() {
    try {
      const res = await fetch('/api/openphone/runs');
      const data = await res.json();
      if (data.ok) {
        setRunHistory(data.runs?.slice(0, 10) || []);
      }
    } catch (error) {
      console.error('Error loading run history:', error);
    }
  }

  async function loadTemplates() {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.ok) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  async function sendNotification(e: React.FormEvent) {
    e.preventDefault();
    setSendingNotification(true);
    setMessage(null);

    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_PUSH_API_SECRET || '',
        },
        body: JSON.stringify({
          type: 'custom',
          title: notificationForm.title,
          message: notificationForm.message,
          url: notificationForm.url || undefined,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setMessage({ type: 'success', text: 'Notification sent successfully!' });
        setNotificationForm({ title: '', message: '', url: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send notification' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send notification' });
    } finally {
      setSendingNotification(false);
    }
  }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });
      const data = await res.json();

      if (data.ok) {
        setMessage({ type: 'success', text: 'Template created successfully!' });
        setNewTemplate({ name: '', content: '', category: 'general' });
        loadTemplates();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create template' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to create template' });
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.ok) {
        setMessage({ type: 'success', text: 'Template deleted!' });
        loadTemplates();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete template' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete template' });
    }
  }

  function downloadExport(type: string, format: string) {
    const url = `/api/export?type=${type}&format=${format}`;
    window.open(url, '_blank');
  }

  async function triggerManualRun(type: 'openphone' | 'gmail' | 'summary') {
    setLoading(true);
    setMessage(null);

    try {
      let endpoint = '';
      switch (type) {
        case 'openphone':
          endpoint = '/api/cron/openphone-cleanup';
          break;
        case 'gmail':
          endpoint = '/api/cron/gmail-triage';
          break;
        case 'summary':
          endpoint = '/api/cron/daily-summary';
          break;
      }

      const res = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
        },
      });
      const data = await res.json();

      if (data.ok) {
        setMessage({ type: 'success', text: `${type} job triggered successfully!` });
        loadSystemStats();
        loadRunHistory();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to trigger job' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to trigger job' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <Link href="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mb-2">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
          Admin Dashboard
        </h1>
        <p className="text-gray-400 mt-1">System management, notifications, templates, and exports</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {(['overview', 'notifications', 'templates', 'exports', 'settings', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
          >
            <span className="material-symbols-outlined">
              {tab === 'overview' ? 'dashboard' : 
               tab === 'notifications' ? 'notifications' : 
               tab === 'templates' ? 'description' : 
               tab === 'exports' ? 'download' : 
               tab === 'settings' ? 'settings' : 'article'}
            </span>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-blue-400">play_circle</span>
                <div>
                  <p className="text-2xl font-bold">{systemStats?.totalRuns || 0}</p>
                  <p className="text-sm text-gray-400">Total Runs</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-emerald-400">summarize</span>
                <div>
                  <p className="text-2xl font-bold">{systemStats?.totalSummaries || 0}</p>
                  <p className="text-sm text-gray-400">Summaries</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-amber-400">edit_note</span>
                <div>
                  <p className="text-2xl font-bold">{systemStats?.pendingDrafts || 0}</p>
                  <p className="text-sm text-gray-400">Pending Drafts</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-purple-400">mail</span>
                <div>
                  <p className="text-2xl font-bold">{systemStats?.totalEmails || 0}</p>
                  <p className="text-sm text-gray-400">Emails Today</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="card-title mb-4">Manual Triggers</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => triggerManualRun('openphone')}
                  className="w-full p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors text-left flex items-center justify-between"
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-400">sms</span>
                    <div>
                      <p className="font-medium">OpenPhone Cleanup</p>
                      <p className="text-sm text-gray-400">Process new conversations</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
                <button 
                  onClick={() => triggerManualRun('gmail')}
                  className="w-full p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors text-left flex items-center justify-between"
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-400">mail</span>
                    <div>
                      <p className="font-medium">Gmail Triage</p>
                      <p className="text-sm text-gray-400">Process unread emails</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
                <button 
                  onClick={() => triggerManualRun('summary')}
                  className="w-full p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors text-left flex items-center justify-between"
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-400">summarize</span>
                    <div>
                      <p className="font-medium">Generate Daily Summary</p>
                      <p className="text-sm text-gray-400">Create today's activity report</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title mb-4">Recent Runs</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {runHistory.length > 0 ? runHistory.map((run) => (
                  <div key={run.id} className="p-3 bg-black/20 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(run.started_at).toLocaleDateString()} {new Date(run.started_at).toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {run.conversations_processed} conversations, {run.drafts_generated} drafts
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${run.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {run.status}
                    </span>
                  </div>
                )) : (
                  <p className="text-gray-400 text-center py-8">No runs yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="card-title mb-4">Send Push Notification</h3>
            <form onSubmit={sendNotification} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  className="input w-full"
                  placeholder="Notification title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Message</label>
                <textarea
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  className="input w-full"
                  rows={3}
                  placeholder="Notification message"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">URL (optional)</label>
                <input
                  type="url"
                  value={notificationForm.url}
                  onChange={(e) => setNotificationForm({ ...notificationForm, url: e.target.value })}
                  className="input w-full"
                  placeholder="https://..."
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={sendingNotification}>
                {sendingNotification ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined">send</span>
                )}
                {sendingNotification ? 'Sending...' : 'Send Notification'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">Quick Notifications</h3>
            <div className="space-y-3">
              <button
                onClick={() => setNotificationForm({
                  title: 'Drafts Ready for Review',
                  message: 'You have new draft responses waiting for your approval.',
                  url: '/openphone/review',
                })}
                className="w-full p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-400">rate_review</span>
                  <div>
                    <p className="font-medium">Drafts Ready</p>
                    <p className="text-sm text-gray-400">Notify about pending drafts</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setNotificationForm({
                  title: 'Urgent: New Messages',
                  message: 'You have urgent messages that require immediate attention.',
                  url: '/',
                })}
                className="w-full p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-400">priority_high</span>
                  <div>
                    <p className="font-medium">Urgent Alert</p>
                    <p className="text-sm text-gray-400">Notify about urgent messages</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setNotificationForm({
                  title: 'Daily Summary Available',
                  message: 'Your daily communications summary is ready to view.',
                  url: '/admin',
                })}
                className="w-full p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-400">summarize</span>
                  <div>
                    <p className="font-medium">Daily Summary</p>
                    <p className="text-sm text-gray-400">Notify about daily summary</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="card-title mb-4">Create Template</h3>
            <form onSubmit={createTemplate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="input w-full"
                  placeholder="Template name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="input w-full"
                >
                  <option value="general">General</option>
                  <option value="greeting">Greeting</option>
                  <option value="appointment">Appointment</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="confirmation">Confirmation</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Content</label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  className="input w-full"
                  rows={4}
                  placeholder="Use {{name}}, {{date}}, {{time}}, {{company}} for variables"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Creating...' : 'Create Template'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">Existing Templates ({templates.length})</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {templates.map((template) => (
                <div key={template.id} className="p-3 bg-black/20 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{template.category} | Used {template.usage_count} times</p>
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2">{template.content}</p>
                    </div>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-center text-gray-400 py-8">No templates yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'exports' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="card-title mb-4">Summaries</h3>
            <div className="flex gap-2">
              <button onClick={() => downloadExport('summaries', 'csv')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">table_chart</span>
                CSV
              </button>
              <button onClick={() => downloadExport('summaries', 'json')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">data_object</span>
                JSON
              </button>
              <button onClick={() => downloadExport('summaries', 'html')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">picture_as_pdf</span>
                PDF
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">Draft Replies</h3>
            <div className="flex gap-2">
              <button onClick={() => downloadExport('drafts', 'csv')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">table_chart</span>
                CSV
              </button>
              <button onClick={() => downloadExport('drafts', 'json')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">data_object</span>
                JSON
              </button>
              <button onClick={() => downloadExport('drafts', 'html')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">picture_as_pdf</span>
                PDF
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">Email Logs</h3>
            <div className="flex gap-2">
              <button onClick={() => downloadExport('emails', 'csv')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">table_chart</span>
                CSV
              </button>
              <button onClick={() => downloadExport('emails', 'json')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">data_object</span>
                JSON
              </button>
              <button onClick={() => downloadExport('emails', 'html')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">picture_as_pdf</span>
                PDF
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">Activity Log</h3>
            <div className="flex gap-2">
              <button onClick={() => downloadExport('activity', 'csv')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">table_chart</span>
                CSV
              </button>
              <button onClick={() => downloadExport('activity', 'json')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">data_object</span>
                JSON
              </button>
              <button onClick={() => downloadExport('activity', 'html')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">picture_as_pdf</span>
                PDF
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">Daily Summary</h3>
            <div className="flex gap-2">
              <button onClick={() => downloadExport('daily_summary', 'csv')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">table_chart</span>
                CSV
              </button>
              <button onClick={() => downloadExport('daily_summary', 'json')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">data_object</span>
                JSON
              </button>
              <button onClick={() => downloadExport('daily_summary', 'html')} className="btn btn-secondary flex-1">
                <span className="material-symbols-outlined">picture_as_pdf</span>
                PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="card-title mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">pin</span>
              App PIN Management
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-black/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium">Current PIN</p>
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showPin ? 'visibility_off' : 'visibility'}
                    </span>
                    {showPin ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <code className="text-2xl font-mono tracking-widest text-primary">
                    {showPin ? currentPin : '••••••'.slice(0, currentPin.length || 6)}
                  </code>
                </div>
              </div>

              <div className="p-4 bg-black/20 rounded-lg">
                <p className="font-medium mb-3">Change PIN</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Enter new 4-6 digit PIN"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input flex-1"
                  />
                  <button
                    onClick={updatePin}
                    disabled={pinLoading || newPin.length < 4}
                    className="btn btn-primary"
                  >
                    {pinLoading ? (
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    ) : (
                      'Update'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Users need this PIN to access the app</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">System Configuration</h3>
            <div className="space-y-4">
              <div className="p-4 bg-black/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">OpenPhone Integration</p>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">Connected</span>
                </div>
                <p className="text-sm text-gray-400">API key configured for receiving SMS/voice data</p>
              </div>
              <div className="p-4 bg-black/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Gmail Integration</p>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">Connected</span>
                </div>
                <p className="text-sm text-gray-400">OAuth configured for email processing</p>
              </div>
              <div className="p-4 bg-black/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Perplexity AI</p>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">Connected</span>
                </div>
                <p className="text-sm text-gray-400">AI service for draft generation</p>
              </div>
              <div className="p-4 bg-black/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">OneSignal Push</p>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">Connected</span>
                </div>
                <p className="text-sm text-gray-400">Push notifications enabled</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">Scheduled Jobs</h3>
            <div className="space-y-4">
              <div className="p-4 bg-black/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">OpenPhone Cleanup</p>
                  <span className="text-sm text-gray-400">Daily @ 6 AM UTC</span>
                </div>
                <p className="text-sm text-gray-400">Processes new conversations and generates drafts</p>
              </div>
              <div className="p-4 bg-black/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Gmail Triage</p>
                  <span className="text-sm text-gray-400">Every 4 hours</span>
                </div>
                <p className="text-sm text-gray-400">Triages unread emails using AI rules</p>
              </div>
              <div className="p-4 bg-black/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Daily Summary</p>
                  <span className="text-sm text-gray-400">Daily @ 8 AM UTC</span>
                </div>
                <p className="text-sm text-gray-400">Generates daily activity summary</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="card">
          <h3 className="card-title mb-4">System Logs</h3>
          <div className="bg-black/30 rounded-lg p-4 font-mono text-sm max-h-[500px] overflow-y-auto">
            <p className="text-gray-400">[{new Date().toISOString()}] Admin panel accessed</p>
            <p className="text-gray-400">[{new Date().toISOString()}] System stats loaded</p>
            <p className="text-emerald-400">[{new Date().toISOString()}] All services operational</p>
          </div>
        </div>
      )}
    </div>
  );
}
