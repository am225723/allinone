'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

interface Rule {
  id: string;
  type: 'sender' | 'subject' | 'label';
  pattern: string;
  action: 'skip' | 'urgent' | 'archive';
  created_at: string;
}

export default function GmailRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRule, setShowNewRule] = useState(false);
  const [newRule, setNewRule] = useState({ type: 'sender', pattern: '', action: 'skip' });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/gmail/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    if (!newRule.pattern) return;
    try {
      await fetch('/api/gmail/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });
      setNewRule({ type: 'sender', pattern: '', action: 'skip' });
      setShowNewRule(false);
      fetchRules();
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await fetch(`/api/gmail/rules?id=${id}`, { method: 'DELETE' });
      fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  return (
    <div className="container py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href="/gmail" label="Back to Gmail" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Triage Rules</h1>
          <p className="text-muted mt-1">Configure automatic email processing rules</p>
        </div>
        <button onClick={() => setShowNewRule(true)} className="btn btn-primary">
          <span className="material-symbols-outlined">add</span>
          Add Rule
        </button>
      </div>

      {showNewRule && (
        <div className="card p-6 mb-6">
          <h3 className="font-semibold mb-4">Create New Rule</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rule Type</label>
              <select
                value={newRule.type}
                onChange={(e) => setNewRule({ ...newRule, type: e.target.value as any })}
                className="input w-full"
              >
                <option value="sender">Sender Email</option>
                <option value="subject">Subject Contains</option>
                <option value="label">Gmail Label</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Pattern</label>
              <input
                type="text"
                value={newRule.pattern}
                onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                className="input w-full"
                placeholder={newRule.type === 'sender' ? 'email@example.com' : 'keyword'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Action</label>
              <select
                value={newRule.action}
                onChange={(e) => setNewRule({ ...newRule, action: e.target.value as any })}
                className="input w-full"
              >
                <option value="skip">Skip (don't triage)</option>
                <option value="urgent">Mark as Urgent</option>
                <option value="archive">Auto-archive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={createRule} className="btn btn-primary">Create Rule</button>
            <button onClick={() => setShowNewRule(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
          </div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <span className="material-symbols-outlined text-5xl mb-4">rule</span>
            <p>No rules configured yet. Add a rule to automate email processing.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 font-medium text-gray-400">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Pattern</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Action</th>
                <th className="text-right py-3 px-4 font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs">
                      {rule.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">{rule.pattern}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      rule.action === 'skip' ? 'bg-gray-500/20 text-gray-400' :
                      rule.action === 'urgent' ? 'bg-red-500/20 text-red-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {rule.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => deleteRule(rule.id)} className="btn btn-secondary btn-sm text-red-400">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
