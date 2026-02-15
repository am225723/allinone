'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [clearing, setClearing] = useState(false);

  const handleClearStatistics = async () => {
    if (!confirm('Are you sure you want to clear all email processing statistics? This cannot be undone.')) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch('/api/settings/clear-statistics', { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        alert('Statistics cleared successfully!');
      } else {
        alert('Failed to clear statistics: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to clear statistics. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  const settingsGroups = [
    {
      title: 'Account',
      icon: 'person',
      color: 'text-primary',
      items: [
        { name: 'Profile', description: 'Manage your account details', href: '/settings/profile', icon: 'account_circle' },
        { name: 'Email Signatures', description: 'Configure email signatures for responses', href: '/settings/email-signatures', icon: 'edit_note' },
        { name: 'Notifications', description: 'Configure notification preferences', href: '/settings/notifications', icon: 'notifications' },
        { name: 'Security', description: 'PIN and session management', href: '/settings/security', icon: 'lock' },
      ]
    },
    {
      title: 'Practice',
      icon: 'local_hospital',
      color: 'text-emerald-400',
      items: [
        { name: 'Appointment Types', description: 'Manage types, durations, and revenue tracking', href: '/settings/appointment-types', icon: 'event_note' },
        { name: 'Locations', description: 'Manage practice locations for appointments', href: '/settings/locations', icon: 'location_on' },
        { name: 'Calendars', description: 'Connect and manage iCal calendars', href: '/settings/calendars', icon: 'calendar_month' },
      ]
    },
    {
      title: 'Integrations',
      icon: 'hub',
      color: 'text-blue-400',
      items: [
        { name: 'All Integrations', description: 'Manage connected services', href: '/settings/integrations', icon: 'extension' },
        { name: 'OpenPhone', description: 'Voice and SMS settings', href: '/openphone/settings', icon: 'call' },
        { name: 'Gmail Accounts', description: 'Connected email accounts', href: '/gmail/accounts', icon: 'mail' },
      ]
    },
    {
      title: 'Administration',
      icon: 'admin_panel_settings',
      color: 'text-purple-400',
      items: [
        { name: 'Admin Panel', description: 'System administration', href: '/admin', icon: 'dashboard' },
        { name: 'User Management', description: 'Manage users and permissions', href: '/admin?tab=users', icon: 'group' },
        { name: 'Export Data', description: 'Download reports and data', href: '/admin?tab=exports', icon: 'download' },
      ]
    }
  ];

  return (
    <div className="container py-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <span className="material-symbols-outlined text-gray-400 text-3xl">settings</span>
          Settings
        </h1>
        <p className="text-gray-400 mt-1">Configure your unified communications dashboard</p>
      </div>

      <div className="space-y-6">
        {settingsGroups.map((group) => (
          <div key={group.title} className="card">
            <div className="card-header">
              <h3 className="card-title flex items-center gap-2">
                <span className={`material-symbols-outlined ${group.color}`}>{group.icon}</span>
                {group.title}
              </h3>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className="flex items-center justify-between p-4 bg-surface-darker rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-muted group-hover:text-primary transition-colors">
                        {item.icon}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-muted group-hover:text-white transition-colors">
                    chevron_right
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="card border-red-500/30">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2 text-red-400">
              <span className="material-symbols-outlined">warning</span>
              Danger Zone
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl">
              <div>
                <p className="font-medium">Clear Statistics</p>
                <p className="text-sm text-gray-400">Clear all email processing statistics and activity logs</p>
              </div>
              <button 
                className="btn btn-danger btn-sm" 
                onClick={handleClearStatistics}
                disabled={clearing}
              >
                {clearing ? 'Clearing...' : 'Clear Statistics'}
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl">
              <div>
                <p className="font-medium">Clear All Data</p>
                <p className="text-sm text-gray-400">Delete all runs, summaries, and drafts</p>
              </div>
              <button className="btn btn-danger btn-sm">Clear Data</button>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-xl">
              <div>
                <p className="font-medium">Disconnect All Accounts</p>
                <p className="text-sm text-gray-400">Remove all connected Gmail accounts</p>
              </div>
              <button className="btn btn-danger btn-sm">Disconnect</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
