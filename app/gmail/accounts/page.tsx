'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

interface GmailAccount {
  id: string;
  email: string;
  name?: string;
  connected_at: string;
  last_sync: string;
  status: 'active' | 'disconnected' | 'error';
  is_active: boolean;
}

interface AccountSettings {
  draftsEnabled: boolean;
  signatureMode: 'gmail' | 'custom' | 'none';
  customSignature: string;
  autoLabel: boolean;
  triagePriority: 'all' | 'important_only' | 'none';
  maxDraftsPerRun: number;
  replyPrefix: string;
}

const DEFAULT_SETTINGS: AccountSettings = {
  draftsEnabled: true,
  signatureMode: 'gmail',
  customSignature: '',
  autoLabel: true,
  triagePriority: 'all',
  maxDraftsPerRun: 50,
  replyPrefix: '',
};

export default function GmailAccountsPage() {
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [settingsMap, setSettingsMap] = useState<Record<string, AccountSettings>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/gmail/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async (accountId: string) => {
    if (settingsMap[accountId]) return;
    try {
      const res = await fetch(`/api/gmail/accounts/settings?accountId=${accountId}`);
      const data = await res.json();
      if (data.ok) {
        setSettingsMap(prev => ({ ...prev, [accountId]: data.settings }));
      } else {
        setSettingsMap(prev => ({ ...prev, [accountId]: { ...DEFAULT_SETTINGS } }));
      }
    } catch {
      setSettingsMap(prev => ({ ...prev, [accountId]: { ...DEFAULT_SETTINGS } }));
    }
  };

  const saveSettings = async (accountId: string, updates: Partial<AccountSettings>) => {
    setSavingId(accountId);
    const current = settingsMap[accountId] || DEFAULT_SETTINGS;
    const merged = { ...current, ...updates };
    setSettingsMap(prev => ({ ...prev, [accountId]: merged }));

    try {
      const res = await fetch('/api/gmail/accounts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, ...merged }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveMsg(prev => ({ ...prev, [accountId]: 'Saved' }));
      } else {
        setSaveMsg(prev => ({ ...prev, [accountId]: 'Failed' }));
      }
    } catch {
      setSaveMsg(prev => ({ ...prev, [accountId]: 'Failed' }));
    } finally {
      setSavingId(null);
      setTimeout(() => setSaveMsg(prev => ({ ...prev, [accountId]: '' })), 2000);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/gmail/auth';
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;
    try {
      await fetch(`/api/gmail/accounts/${id}`, { method: 'DELETE' });
      fetchAccounts();
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadSettings(id);
    }
  };

  const getSettings = (id: string) => settingsMap[id] || DEFAULT_SETTINGS;

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href="/gmail" label="Back to Gmail" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gmail Accounts</h1>
          <p className="text-muted mt-1">Manage connected accounts and their AI triage settings</p>
        </div>
        <button onClick={handleConnect} className="btn btn-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-base">add</span>
          Connect Account
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center">
          <span className="material-symbols-outlined text-4xl animate-spin text-gray-400">progress_activity</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">mail</span>
          <h3 className="text-lg font-semibold mb-2">No accounts connected</h3>
          <p className="text-muted mb-4">Connect a Gmail account to start managing your emails</p>
          <button onClick={handleConnect} className="btn btn-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-base">add</span>
            Connect Gmail Account
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => {
            const isExpanded = expandedId === account.id;
            const s = getSettings(account.id);
            const isSaving = savingId === account.id;
            const msg = saveMsg[account.id] || '';

            return (
              <div key={account.id} className="card overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition"
                  onClick={() => toggleExpand(account.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-red-400">mail</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{account.email}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          account.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          account.status === 'error' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {account.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          Connected {new Date(account.connected_at).toLocaleDateString()}
                        </span>
                        {s.draftsEnabled ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">drafts on</span>
                        ) : (
                          <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">drafts off</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`material-symbols-outlined text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/5 p-5 space-y-6 bg-white/[0.01]">
                    {msg && (
                      <div className={`p-2 rounded text-xs text-center ${msg === 'Saved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {msg}
                      </div>
                    )}

                    {/* Draft Creation */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-400 text-base">edit_note</span>
                        Draft Creation
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Create AI Drafts</p>
                            <p className="text-xs text-gray-400">Automatically create draft replies for emails that need a response</p>
                          </div>
                          <button
                            onClick={() => saveSettings(account.id, { draftsEnabled: !s.draftsEnabled })}
                            disabled={isSaving}
                            className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${s.draftsEnabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${s.draftsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Auto-label Emails</p>
                            <p className="text-xs text-gray-400">Apply AI-suggested labels like ai/triaged, ai/draft_created</p>
                          </div>
                          <button
                            onClick={() => saveSettings(account.id, { autoLabel: !s.autoLabel })}
                            disabled={isSaving}
                            className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${s.autoLabel ? 'bg-emerald-500' : 'bg-gray-600'}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${s.autoLabel ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Triage Mode</label>
                          <select
                            value={s.triagePriority}
                            onChange={(e) => saveSettings(account.id, { triagePriority: e.target.value as any })}
                            disabled={isSaving}
                            className="input w-full"
                          >
                            <option value="all">Triage all emails</option>
                            <option value="important_only">Important emails only</option>
                            <option value="none">Skip this account (no triage)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Max Drafts Per Run</label>
                          <input
                            type="number"
                            value={s.maxDraftsPerRun}
                            onChange={(e) => saveSettings(account.id, { maxDraftsPerRun: parseInt(e.target.value) || 10 })}
                            disabled={isSaving}
                            className="input w-full"
                            min={1}
                            max={200}
                          />
                          <p className="text-[10px] text-gray-500 mt-1">Limits how many drafts are created per triage run to avoid overwhelming your inbox</p>
                        </div>
                      </div>
                    </div>

                    {/* Signature Settings */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-400 text-base">signature</span>
                        Email Signature
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Signature Source</label>
                          <select
                            value={s.signatureMode}
                            onChange={(e) => saveSettings(account.id, { signatureMode: e.target.value as any })}
                            disabled={isSaving}
                            className="input w-full"
                          >
                            <option value="gmail">Use Gmail signature (from Gmail settings)</option>
                            <option value="custom">Use custom signature</option>
                            <option value="none">No signature</option>
                          </select>
                        </div>
                        {s.signatureMode === 'custom' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Custom Signature (HTML)</label>
                            <textarea
                              value={s.customSignature}
                              onChange={(e) => setSettingsMap(prev => ({
                                ...prev,
                                [account.id]: { ...s, customSignature: e.target.value }
                              }))}
                              onBlur={() => saveSettings(account.id, { customSignature: s.customSignature })}
                              className="input w-full min-h-[120px] font-mono text-xs resize-y"
                              placeholder="<p>Best regards,<br>Dr. Name</p>"
                            />
                            {s.customSignature && (
                              <div className="mt-2 p-3 bg-white/5 rounded-lg">
                                <p className="text-[10px] text-gray-500 mb-1">Preview:</p>
                                <div className="text-sm text-gray-300" dangerouslySetInnerHTML={{ __html: s.customSignature }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reply Prefix */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-base">format_quote</span>
                        Reply Prefix
                      </h4>
                      <textarea
                        value={s.replyPrefix}
                        onChange={(e) => setSettingsMap(prev => ({
                          ...prev,
                          [account.id]: { ...s, replyPrefix: e.target.value }
                        }))}
                        onBlur={() => saveSettings(account.id, { replyPrefix: s.replyPrefix })}
                        className="input w-full min-h-[60px] text-sm resize-y"
                        placeholder="Optional text added before every AI draft reply (e.g. greeting or disclaimer)"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">This text will be prepended to every AI-generated draft reply for this account</p>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <a
                        href="/gmail/rules"
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                      >
                        <span className="material-symbols-outlined text-base">rule</span>
                        Manage Skip Rules
                      </a>
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                      >
                        <span className="material-symbols-outlined text-base">link_off</span>
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
