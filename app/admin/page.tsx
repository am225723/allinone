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

interface PushDevice {
  id: string;
  player_id: string;
  device_type: string;
  created_at: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'templates' | 'exports'>('notifications');
  const [templates, setTemplates] = useState<Template[]>([]);
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

  useEffect(() => {
    loadTemplates();
  }, []);

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

  return (
    <div className="container py-6">
      <div className="mb-6">
        <Link href="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mb-2">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-gray-400 mt-1">Manage notifications, templates, and exports</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`btn ${activeTab === 'notifications' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <span className="material-symbols-outlined">notifications</span>
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <span className="material-symbols-outlined">description</span>
          Templates
        </button>
        <button
          onClick={() => setActiveTab('exports')}
          className={`btn ${activeTab === 'exports' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <span className="material-symbols-outlined">download</span>
          Exports
        </button>
      </div>

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
        </div>
      )}
    </div>
  );
}
