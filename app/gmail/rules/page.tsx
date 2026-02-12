'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

interface Rule {
  id: string;
  gmail_account_id: string | null;
  type: 'sender' | 'subject' | 'domain';
  pattern: string;
  action: string;
  is_enabled: boolean;
  created_at: string;
}

interface GmailAccount {
  id: string;
  email: string;
}

export default function GmailRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRule, setShowNewRule] = useState(false);
  const [newRule, setNewRule] = useState({ type: 'sender', pattern: '', gmail_account_id: '' });
  const [tab, setTab] = useState<'email' | 'sms'>('email');
  const [suppressions, setSuppressions] = useState<any[]>([]);
  const [suppressionLoading, setSuppressionLoading] = useState(false);
  const [showNewSuppression, setShowNewSuppression] = useState(false);
  const [newSuppression, setNewSuppression] = useState({ kind: 'phone', value: '', reason: '' });

  useEffect(() => {
    fetchRules();
    fetchAccounts();
    fetchSuppressions();
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

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/gmail/sync');
      if (res.ok) {
        const data = await res.json();
        setAccounts((data.accounts || []).map((a: any) => ({ id: a.id, email: a.email })));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchSuppressions = async () => {
    setSuppressionLoading(true);
    try {
      const res = await fetch('/api/openphone/settings');
      if (res.ok) {
        const data = await res.json();
        setSuppressions(data.suppressions || []);
      }
    } catch (error) {
      console.error('Error fetching suppressions:', error);
    } finally {
      setSuppressionLoading(false);
    }
  };

  const createRule = async () => {
    if (!newRule.pattern.trim()) return;
    try {
      const payload: any = {
        type: newRule.type,
        pattern: newRule.pattern.trim(),
      };
      if (newRule.gmail_account_id) {
        payload.gmail_account_id = newRule.gmail_account_id;
      }

      const res = await fetch('/api/gmail/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewRule({ type: 'sender', pattern: '', gmail_account_id: '' });
        setShowNewRule(false);
        fetchRules();
      }
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  const toggleRule = async (id: string, currentEnabled: boolean) => {
    try {
      await fetch('/api/gmail/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_enabled: !currentEnabled })
      });
      fetchRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
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

  const createSuppression = async () => {
    if (!newSuppression.value.trim()) return;
    try {
      const res = await fetch('/api/openphone/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_suppression',
          kind: newSuppression.kind,
          value: newSuppression.value.trim(),
          reason: newSuppression.reason.trim() || undefined,
        })
      });
      if (res.ok) {
        setNewSuppression({ kind: 'phone', value: '', reason: '' });
        setShowNewSuppression(false);
        fetchSuppressions();
      }
    } catch (error) {
      console.error('Error creating suppression:', error);
    }
  };

  const deleteSuppression = async (id: string) => {
    if (!confirm('Remove this suppression?')) return;
    try {
      await fetch('/api/openphone/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_suppression', id })
      });
      fetchSuppressions();
    } catch (error) {
      console.error('Error deleting suppression:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sender': return 'person';
      case 'domain': return 'language';
      case 'subject': return 'subject';
      default: return 'rule';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sender': return 'bg-blue-500/20 text-blue-400';
      case 'domain': return 'bg-purple-500/20 text-purple-400';
      case 'subject': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getSuppressionIcon = (kind: string) => {
    switch (kind) {
      case 'phone': return 'phone_disabled';
      case 'conversation': return 'chat_bubble';
      case 'phrase': return 'text_fields';
      default: return 'block';
    }
  };

  return (
    <div className="container py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href="/gmail" label="Back to Gmail" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Skip & Filter Rules</h1>
          <p className="text-muted mt-1">Configure what to skip during email triage and SMS processing</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 p-1 bg-surface-darker rounded-xl">
        <button
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            tab === 'email' ? 'bg-surface-dark text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setTab('email')}
        >
          <span className="material-symbols-outlined text-sm">mail</span>
          Email Rules
        </button>
        <button
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            tab === 'sms' ? 'bg-surface-dark text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setTab('sms')}
        >
          <span className="material-symbols-outlined text-sm">sms</span>
          SMS Suppressions
        </button>
      </div>

      {tab === 'email' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowNewRule(true)} className="btn btn-primary">
              <span className="material-symbols-outlined">add</span>
              Add Email Rule
            </button>
          </div>

          {showNewRule && (
            <div className="card p-6 mb-6 border-blue-500/20">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">add_circle</span>
                Create Email Skip Rule
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Rule Type</label>
                  <select
                    value={newRule.type}
                    onChange={(e) => setNewRule({ ...newRule, type: e.target.value as any })}
                    className="input w-full"
                  >
                    <option value="sender">Skip by Sender Email</option>
                    <option value="domain">Skip by Domain</option>
                    <option value="subject">Skip by Subject Keyword</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {newRule.type === 'sender' && 'Exact email match (e.g. noreply@example.com)'}
                    {newRule.type === 'domain' && 'Skip all emails from this domain (e.g. marketing.com)'}
                    {newRule.type === 'subject' && 'Skip emails containing this text in subject'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Pattern</label>
                  <input
                    type="text"
                    value={newRule.pattern}
                    onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                    className="input w-full"
                    placeholder={
                      newRule.type === 'sender' ? 'noreply@example.com' :
                      newRule.type === 'domain' ? 'marketing.com' :
                      'unsubscribe'
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Apply to Account</label>
                  <select
                    value={newRule.gmail_account_id}
                    onChange={(e) => setNewRule({ ...newRule, gmail_account_id: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">All Accounts (Global)</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.email}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={createRule} className="btn btn-primary" disabled={!newRule.pattern.trim()}>
                  <span className="material-symbols-outlined">check</span>
                  Create Rule
                </button>
                <button onClick={() => setShowNewRule(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="card p-8 text-center">
              <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="card p-8 text-center text-muted">
              <span className="material-symbols-outlined text-5xl mb-4">rule</span>
              <h3 className="text-lg font-semibold mb-2">No email rules configured</h3>
              <p className="text-sm text-gray-400 mb-4">Add rules to automatically skip newsletters, automated emails, or specific senders during triage.</p>
              <button onClick={() => setShowNewRule(true)} className="btn btn-primary">
                <span className="material-symbols-outlined">add</span>
                Add Your First Rule
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className={`card flex items-center gap-4 ${!rule.is_enabled ? 'opacity-50' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getTypeColor(rule.type)}`}>
                    <span className="material-symbols-outlined">{getTypeIcon(rule.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(rule.type)}`}>
                        {rule.type === 'sender' ? 'Sender' : rule.type === 'domain' ? 'Domain' : 'Subject'}
                      </span>
                      {rule.gmail_account_id ? (
                        <span className="text-xs text-gray-500">
                          {accounts.find(a => a.id === rule.gmail_account_id)?.email || 'Specific account'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">All accounts</span>
                      )}
                    </div>
                    <p className="font-mono text-sm truncate">{rule.pattern}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleRule(rule.id, rule.is_enabled)}
                      className={`w-10 h-5 rounded-full transition-colors ${rule.is_enabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${rule.is_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card mt-6 bg-blue-500/5 border-blue-500/10">
            <h4 className="text-sm font-semibold text-blue-400 mb-3">Built-in Email Skips</h4>
            <div className="text-sm text-gray-400 space-y-1.5">
              <p>Triage automatically skips these without needing a rule:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-500">
                <li>Emails with subject containing &quot;AI Email Summary&quot;</li>
                <li>Emails with subject containing &quot;Inbox Summary&quot;</li>
                <li>Emails with subject containing &quot;AI Gmail Agent Summary&quot;</li>
                <li>Previously processed emails (duplicate detection)</li>
              </ul>
            </div>
          </div>
        </>
      )}

      {tab === 'sms' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowNewSuppression(true)} className="btn btn-primary">
              <span className="material-symbols-outlined">add</span>
              Add SMS Suppression
            </button>
          </div>

          {showNewSuppression && (
            <div className="card p-6 mb-6 border-orange-500/20">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-400">add_circle</span>
                Create SMS Suppression Rule
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={newSuppression.kind}
                    onChange={(e) => setNewSuppression({ ...newSuppression, kind: e.target.value })}
                    className="input w-full"
                  >
                    <option value="phone">Block Phone Number</option>
                    <option value="phrase">Block by Phrase</option>
                    <option value="conversation">Block Conversation ID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Value</label>
                  <input
                    type="text"
                    value={newSuppression.value}
                    onChange={(e) => setNewSuppression({ ...newSuppression, value: e.target.value })}
                    className="input w-full"
                    placeholder={
                      newSuppression.kind === 'phone' ? '+1234567890' :
                      newSuppression.kind === 'phrase' ? 'spam keyword' :
                      'conversation-id'
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Reason (optional)</label>
                  <input
                    type="text"
                    value={newSuppression.reason}
                    onChange={(e) => setNewSuppression({ ...newSuppression, reason: e.target.value })}
                    className="input w-full"
                    placeholder="Why are you blocking this?"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={createSuppression} className="btn btn-primary" disabled={!newSuppression.value.trim()}>
                  <span className="material-symbols-outlined">check</span>
                  Create Suppression
                </button>
                <button onClick={() => setShowNewSuppression(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {suppressionLoading ? (
            <div className="card p-8 text-center">
              <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
            </div>
          ) : suppressions.length === 0 ? (
            <div className="card p-8 text-center text-muted">
              <span className="material-symbols-outlined text-5xl mb-4">block</span>
              <h3 className="text-lg font-semibold mb-2">No SMS suppressions configured</h3>
              <p className="text-sm text-gray-400 mb-4">Add phone numbers, conversation IDs, or phrases to skip during Quo message processing.</p>
              <button onClick={() => setShowNewSuppression(true)} className="btn btn-primary">
                <span className="material-symbols-outlined">add</span>
                Add Your First Suppression
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {suppressions.map((sup: any) => (
                <div key={sup.id} className="card flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    sup.kind === 'phone' ? 'bg-red-500/20 text-red-400' :
                    sup.kind === 'phrase' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    <span className="material-symbols-outlined">{getSuppressionIcon(sup.kind)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        sup.kind === 'phone' ? 'bg-red-500/20 text-red-400' :
                        sup.kind === 'phrase' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {sup.kind}
                      </span>
                    </div>
                    <p className="font-mono text-sm truncate">{sup.value}</p>
                    {sup.reason && <p className="text-xs text-gray-500 mt-0.5">{sup.reason}</p>}
                  </div>
                  <button onClick={() => deleteSuppression(sup.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="card mt-6 bg-orange-500/5 border-orange-500/10">
            <h4 className="text-sm font-semibold text-orange-400 mb-3">How SMS Suppression Works</h4>
            <div className="text-sm text-gray-400 space-y-1.5">
              <ul className="list-disc list-inside space-y-1 text-gray-500">
                <li><strong>Phone:</strong> Skip processing messages from this phone number</li>
                <li><strong>Phrase:</strong> Skip any conversation transcript containing this text</li>
                <li><strong>Conversation:</strong> Skip a specific Quo conversation by its ID</li>
                <li>Blocklist phones and phrases from environment variables are also checked</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
