'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { invokeFunction } from '@/lib/supabase-functions';

interface ClientMatchBannerProps {
  source: 'quo' | 'gmail';
  identifier: string;
  onClientLinked?: (clientId: string) => void;
}

interface MatchResult {
  matched: boolean;
  clientId?: string;
  eventId?: string;
  clientName?: string;
}

export default function ClientMatchBanner({ source, identifier, onClientLinked }: ClientMatchBannerProps) {
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    const checkMatch = async () => {
      if (!identifier) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const functionName = source === 'quo' ? 'integrations-quo-inbound' : 'integrations-gmail-inbound';
        const body = source === 'quo' ? { phone: identifier } : { email: identifier };

        const { data, error } = await invokeFunction(functionName as any, { body });

        if (error) throw error;
        if (data?.ok) {
          if (data.matched && data.clientId) {
            const { data: clientData } = await invokeFunction('clients-get', {
              body: { id: data.clientId }
            });
            setMatchResult({
              matched: true,
              clientId: data.clientId,
              clientName: clientData?.client 
                ? `${clientData.client.first_name} ${clientData.client.last_name}`
                : 'Unknown'
            });
          } else {
            setMatchResult({
              matched: false,
              eventId: data.eventId
            });
          }
        }
      } catch (err) {
        console.error('Failed to check client match');
      }
      setLoading(false);
    };

    checkMatch();
  }, [source, identifier]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-gray-400 text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        Checking client...
      </div>
    );
  }

  if (!matchResult) {
    return null;
  }

  if (matchResult.matched && matchResult.clientId) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
          <span className="text-emerald-400 text-sm">
            Linked to: <span className="font-medium">{matchResult.clientName}</span>
          </span>
        </div>
        <Link
          href={`/clients/${matchResult.clientId}`}
          className="text-emerald-400 hover:text-emerald-300 text-sm flex items-center gap-1"
        >
          View
          <span className="material-symbols-outlined text-lg">open_in_new</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-400 text-lg">warning</span>
          <span className="text-orange-400 text-sm">Not linked to a client</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLinkModal(true)}
            className="text-orange-400 hover:text-orange-300 text-sm px-2 py-1 bg-orange-500/20 rounded"
          >
            Link
          </button>
          <Link
            href={`/clients?tab=inbox`}
            className="text-gray-400 hover:text-gray-300 text-sm px-2 py-1 bg-white/10 rounded"
          >
            View Inbox
          </Link>
        </div>
      </div>

      {showLinkModal && matchResult.eventId && (
        <QuickLinkModal
          eventId={matchResult.eventId}
          source={source}
          identifier={identifier}
          onClose={() => setShowLinkModal(false)}
          onSuccess={(clientId) => {
            setShowLinkModal(false);
            setMatchResult({ matched: true, clientId });
            onClientLinked?.(clientId);
          }}
        />
      )}
    </>
  );
}

function QuickLinkModal({ eventId, source, identifier, onClose, onSuccess }: {
  eventId: string;
  source: 'quo' | 'gmail';
  identifier: string;
  onClose: () => void;
  onSuccess: (clientId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newClient, setNewClient] = useState({ firstName: '', lastName: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const searchClients = async () => {
      if (!search.trim()) {
        setClients([]);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await invokeFunction('clients-list', {
          body: { search, pageSize: 10 }
        });
        if (error) throw error;
        if (data?.ok) {
          setClients(data.clients);
        }
      } catch (err) {}
      setLoading(false);
    };

    const debounce = setTimeout(searchClients, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleLink = async () => {
    if (!selectedClient) return;
    setSaving(true);
    setError('');
    try {
      const { data, error: invokeError } = await invokeFunction('inbox-link', {
        body: { eventId, clientId: selectedClient.id, makePrimary: true }
      });
      if (invokeError || !data?.ok) {
        setError(data?.error || invokeError?.message || 'Failed to link');
      } else {
        onSuccess(selectedClient.id);
      }
    } catch (err) {
      setError('Failed to link client');
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!newClient.firstName || !newClient.lastName) {
      setError('First and last name are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data, error: invokeError } = await invokeFunction('inbox-create-client', {
        body: { 
          eventId, 
          client: newClient,
          makePrimary: true
        }
      });
      if (invokeError || !data?.ok) {
        setError(data?.error || invokeError?.message || 'Failed to create client');
      } else {
        onSuccess(data.client.id);
      }
    } catch (err) {
      setError('Failed to create client');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl w-full max-w-md border border-white/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            {showCreate ? 'Create New Client' : 'Link to Client'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-3 bg-white/5 rounded-lg">
            <span className="text-gray-400 text-sm">
              {source === 'quo' ? 'Phone' : 'Email'}:
            </span>
            <span className="text-white ml-2">{identifier}</span>
          </div>

          {!showCreate ? (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Search Existing Client</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or MRN..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {loading && (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              )}

              {clients.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedClient?.id === client.id
                          ? 'bg-blue-600/20 border border-blue-500'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <span className="text-white font-medium">
                        {client.last_name}, {client.first_name}
                      </span>
                      {client.mrn && (
                        <span className="text-gray-400 ml-2 text-sm">MRN: {client.mrn}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowCreate(true)}
                className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 flex items-center gap-2"
              >
                <span className="material-symbols-outlined">add</span>
                Create New Client
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={newClient.firstName}
                    onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={newClient.lastName}
                    onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Back to search
              </button>
            </>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={showCreate ? handleCreate : handleLink}
              disabled={saving || (!showCreate && !selectedClient)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : showCreate ? 'Create & Link' : 'Link Client'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
