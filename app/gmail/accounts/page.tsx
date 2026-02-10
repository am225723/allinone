'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

interface GmailAccount {
  id: string;
  email: string;
  connected_at: string;
  last_sync: string;
  status: 'active' | 'disconnected' | 'error';
}

export default function GmailAccountsPage() {
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = a  wait fetch('/api/gmail/accounts');
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

  return (
    <div className="container py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href="/gmail" label="Back to Gmail" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gmail Accounts</h1>
          <p className="text-muted mt-1">Manage connected Gmail accounts</p>
        </div>
        <button onClick={handleConnect} className="btn btn-primary">
          <span className="material-symbols-outlined">add</span>
          Connect Account
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center">
          <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-muted mb-4">mail</span>
          <h3 className="text-lg font-semibold mb-2">No accounts connected</h3>
          <p className="text-muted mb-4">Connect a Gmail account to start managing your emails</p>
          <button onClick={handleConnect} className="btn btn-primary">
            <span className="material-symbols-outlined">add</span>
            Connect Gmail Account
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-400">mail</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{account.email}</h3>
                    <p className="text-sm text-muted">
                      Connected {new Date(account.connected_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    account.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    account.status === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {account.status}
                  </span>
                  <button 
                    onClick={() => handleDisconnect(account.id)}
                    className="btn btn-secondary text-red-400"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
