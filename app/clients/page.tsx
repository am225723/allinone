'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { invokeFunction } from '@/lib/supabase-functions';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  dob: string | null;
  mrn: string | null;
  status: 'active' | 'inactive' | 'archived';
  primary_phone: string | null;
  primary_email: string | null;
  updated_at: string;
}

interface InboxEvent {
  id: string;
  source: 'quo' | 'gmail';
  kind: 'phone' | 'email';
  value: string | null;
  display_value: string | null;
  occurred_at: string;
  status: 'new' | 'linked' | 'ignored';
}

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState<'clients' | 'inbox'>('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [inboxEvents, setInboxEvents] = useState<InboxEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortBy, setSortBy] = useState('last_name');
  const [inboxSource, setInboxSource] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [inboxCount, setInboxCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeFunction('clients-list', {
        body: { search, status: statusFilter, sort: sortBy, page, pageSize: 25 }
      });
      if (error) throw error;
      if (data?.ok) {
        setClients(data.clients);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch clients');
    }
    setLoading(false);
  }, [search, statusFilter, sortBy, page]);

  const fetchInbox = useCallback(async () => {
    try {
      const { data, error } = await invokeFunction('inbox-list', {
        body: { source: inboxSource === 'all' ? undefined : inboxSource, status: 'new' }
      });
      if (error) throw error;
      if (data?.ok) {
        setInboxEvents(data.events);
        setInboxCount(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch inbox');
    }
  }, [inboxSource]);

  useEffect(() => {
    if (activeTab === 'clients') {
      fetchClients();
    } else {
      fetchInbox();
    }
  }, [activeTab, fetchClients, fetchInbox]);

  const handleExport = async () => {
    try {
      const { data, error } = await invokeFunction('clients-export', {
        body: { status: statusFilter }
      });
      if (error) throw error;
      if (data?.ok && data.csv) {
        const blob = new Blob([data.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return '-';
    if (phone.startsWith('+1') && phone.length === 12) {
      return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Clients</h1>
            <p className="text-gray-400 text-sm">Manage your client database</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add Client
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-lg">upload</span>
              Import
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Export
            </button>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === 'clients' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'inbox' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Inbox
            {inboxCount > 0 && (
              <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                {inboxCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'clients' && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by name, MRN, phone, or email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="last_name">Last Name</option>
                <option value="first_name">First Name</option>
                <option value="updated">Recently Updated</option>
                <option value="last_visit">Last Visit</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-xl">
                <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">person_off</span>
                <p className="text-gray-400">No clients found</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Add Your First Client
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white/5 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Name</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">MRN</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm hidden md:table-cell">DOB</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm hidden lg:table-cell">Phone</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm hidden lg:table-cell">Email</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm hidden xl:table-cell">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map((client) => (
                          <tr 
                            key={client.id} 
                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-4">
                              <Link href={`/clients/${client.id}`} className="block">
                                <span className="text-white font-medium">
                                  {client.last_name}, {client.first_name}
                                </span>
                                {client.preferred_name && (
                                  <span className="text-gray-500 ml-1">
                                    ({client.preferred_name})
                                  </span>
                                )}
                              </Link>
                            </td>
                            <td className="py-3 px-4 text-gray-300">{client.mrn || '-'}</td>
                            <td className="py-3 px-4 text-gray-300 hidden md:table-cell">
                              {formatDate(client.dob)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                client.status === 'active' 
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : client.status === 'inactive'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {client.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-300 hidden lg:table-cell">
                              {formatPhone(client.primary_phone)}
                            </td>
                            <td className="py-3 px-4 text-gray-300 hidden lg:table-cell">
                              {client.primary_email || '-'}
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-sm hidden xl:table-cell">
                              {formatDate(client.updated_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-gray-400">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'inbox' && (
          <InboxTab 
            events={inboxEvents} 
            source={inboxSource} 
            setSource={setInboxSource}
            onRefresh={fetchInbox}
          />
        )}

        {showAddModal && (
          <AddClientModal 
            onClose={() => setShowAddModal(false)} 
            onSuccess={() => { setShowAddModal(false); fetchClients(); }}
          />
        )}

        {showImportModal && (
          <ImportModal 
            onClose={() => setShowImportModal(false)} 
            onSuccess={() => { setShowImportModal(false); fetchClients(); }}
          />
        )}
      </div>
    </div>
  );
}

function InboxTab({ events, source, setSource, onRefresh }: { 
  events: InboxEvent[]; 
  source: string; 
  setSource: (s: string) => void;
  onRefresh: () => void;
}) {
  const [showLinkModal, setShowLinkModal] = useState<InboxEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<InboxEvent | null>(null);

  const handleIgnore = async (eventId: string) => {
    try {
      const { error } = await invokeFunction('inbox-ignore', {
        body: { eventId }
      });
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Failed to ignore event');
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {['all', 'quo', 'gmail'].map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              source === s
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {s === 'all' ? 'All' : s === 'quo' ? 'Quo' : 'Gmail'}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl">
          <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
          <p className="text-gray-400">No unmatched contacts</p>
          <p className="text-gray-500 text-sm mt-1">All identities have been linked or ignored</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div 
              key={event.id}
              className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  event.source === 'quo' ? 'bg-orange-500/20' : 'bg-red-500/20'
                }`}>
                  <span className={`material-symbols-outlined ${
                    event.source === 'quo' ? 'text-orange-400' : 'text-red-400'
                  }`}>
                    {event.source === 'quo' ? 'sms' : 'mail'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-sm ${
                      event.kind === 'phone' ? 'text-blue-400' : 'text-purple-400'
                    }`}>
                      {event.kind === 'phone' ? 'phone' : 'mail'}
                    </span>
                    <span className="text-white font-medium">
                      {event.display_value || event.value || 'Unknown'}
                    </span>
                    {!event.value && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                        Invalid format
                      </span>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm">
                    {new Date(event.occurred_at).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLinkModal(event)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  Link
                </button>
                <button
                  onClick={() => setShowCreateModal(event)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => handleIgnore(event.id)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 text-sm rounded-lg transition-colors"
                >
                  Ignore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showLinkModal && (
        <LinkToClientModal 
          event={showLinkModal}
          onClose={() => setShowLinkModal(null)}
          onSuccess={() => { setShowLinkModal(null); onRefresh(); }}
        />
      )}

      {showCreateModal && (
        <CreateClientFromEventModal 
          event={showCreateModal}
          onClose={() => setShowCreateModal(null)}
          onSuccess={() => { setShowCreateModal(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

function AddClientModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    dob: '',
    mrn: '',
    phone: '',
    email: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { data, error: invokeError } = await invokeFunction('clients-create', {
        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          preferredName: form.preferredName || undefined,
          dob: form.dob || undefined,
          mrn: form.mrn || undefined
        }
      });

      if (invokeError || !data?.ok) {
        setError(data?.error || invokeError?.message || 'Failed to create client');
        setSaving(false);
        return;
      }

      const clientId = data.client.id;

      if (form.phone) {
        const { error: phoneErr } = await invokeFunction('contacts-add', {
          body: { clientId, type: 'phone', value: form.phone, isPrimary: true }
        });
        if (phoneErr) console.error('Failed to add phone:', phoneErr);
      }

      if (form.email) {
        const { error: emailErr } = await invokeFunction('contacts-add', {
          body: { clientId, type: 'email', value: form.email, isPrimary: true }
        });
        if (emailErr) console.error('Failed to add email:', emailErr);
      }

      onSuccess();
    } catch (err) {
      setError('Failed to create client');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl w-full max-w-md border border-white/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Add New Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Preferred Name</label>
            <input
              type="text"
              value={form.preferredName}
              onChange={(e) => setForm({ ...form, preferredName: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">MRN</label>
              <input
                type="text"
                value={form.mrn}
                onChange={(e) => setForm({ ...form, mrn: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LinkToClientModal({ event, onClose, onSuccess }: { 
  event: InboxEvent; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [makePrimary, setMakePrimary] = useState(true);
  const [saving, setSaving] = useState(false);

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
    try {
      const { data, error } = await invokeFunction('inbox-link', {
        body: { eventId: event.id, clientId: selectedClient.id, makePrimary }
      });
      if (error) throw error;
      if (data?.ok) {
        onSuccess();
      }
    } catch (err) {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl w-full max-w-md border border-white/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Link to Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="p-3 bg-white/5 rounded-lg">
            <span className="text-gray-400 text-sm">Linking:</span>
            <span className="text-white ml-2">{event.display_value || event.value}</span>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Search Client</label>
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
            <div className="max-h-48 overflow-y-auto space-y-1">
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

          {selectedClient && (
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={makePrimary}
                onChange={(e) => setMakePrimary(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5"
              />
              Set as primary {event.kind}
            </label>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!selectedClient || saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? 'Linking...' : 'Link Client'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateClientFromEventModal({ event, onClose, onSuccess }: { 
  event: InboxEvent; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    dob: '',
    mrn: ''
  });
  const [makePrimary, setMakePrimary] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { data, error: invokeError } = await invokeFunction('inbox-create-client', {
        body: {
          eventId: event.id,
          client: {
            firstName: form.firstName,
            lastName: form.lastName,
            preferredName: form.preferredName || undefined,
            dob: form.dob || undefined,
            mrn: form.mrn || undefined
          },
          makePrimary
        }
      });

      if (invokeError || !data?.ok) {
        setError(data?.error || invokeError?.message || 'Failed to create client');
        setSaving(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Failed to create client');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl w-full max-w-md border border-white/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Create New Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="p-3 bg-white/5 rounded-lg">
            <span className="text-gray-400 text-sm">Creating from:</span>
            <span className="text-white ml-2">{event.display_value || event.value}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Preferred Name</label>
            <input
              type="text"
              value={form.preferredName}
              onChange={(e) => setForm({ ...form, preferredName: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">MRN</label>
              <input
                type="text"
                value={form.mrn}
                onChange={(e) => setForm({ ...form, mrn: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={makePrimary}
              onChange={(e) => setMakePrimary(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5"
            />
            Set as primary {event.kind}
          </label>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [updateByMrn, setUpdateByMrn] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError('');
    
    const Papa = (await import('papaparse')).default;
    
    Papa.parse(selectedFile, {
      header: true,
      preview: 5,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setPreview(results.data as any[]);
          setHeaders(results.meta.fields || []);
        }
      },
      error: () => {
        setError('Failed to parse CSV file');
      }
    });
  };

  const handleImport = async () => {
    if (!file) return;
    
    setImporting(true);
    setError('');

    try {
      const text = await file.text();
      
      const { data, error: invokeError } = await invokeFunction('clients-import', {
        body: {
          filename: file.name,
          csvText: text,
          updateMatchesByMrn: updateByMrn
        }
      });

      if (invokeError || !data?.ok) {
        setError(data?.error || invokeError?.message || 'Import failed');
      } else {
        setResult(data.summary);
        setFile(null);
        setPreview([]);
        setHeaders([]);
      }
    } catch (err) {
      setError('Failed to import clients');
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const template = 'firstName,lastName,preferredName,dob,mrn,status,phone,phoneLabel,phone2,phone2Label,email,emailLabel,email2,email2Label,addressLine1,addressLine2,city,state,zip,insuranceProvider,insuranceMemberId,emergencyContactName,emergencyContactPhone\nJohn,Doe,Johnny,1990-01-15,MRN001,active,(555) 123-4567,Mobile,(555) 987-6543,Home,john@email.com,Personal,john.work@company.com,Work,123 Main St,Apt 4,New York,NY,10001,Blue Cross,BC123456,Jane Doe,(555) 111-2222';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Import Clients</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {!result ? (
            <>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Download CSV Template
              </button>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Upload CSV File</label>
                <input
                  key={file ? file.name : 'initial'}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
                />
                {file && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-300">Selected: {file.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPreview([]);
                        setHeaders([]);
                        setError('');
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {preview.length > 0 && (
                <>
                  <div>
                    <h3 className="text-sm text-gray-400 mb-2">Preview (first 5 rows)</h3>
                    <div className="overflow-x-auto bg-white/5 rounded-lg">
                      <table className="text-xs">
                        <thead>
                          <tr className="border-b border-white/10">
                            {headers.slice(0, 6).map((h) => (
                              <th key={h} className="px-2 py-1 text-left text-gray-400">{h}</th>
                            ))}
                            {headers.length > 6 && <th className="px-2 py-1 text-gray-400">...</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((row, i) => (
                            <tr key={i} className="border-b border-white/5">
                              {headers.slice(0, 6).map((h) => (
                                <td key={h} className="px-2 py-1 text-white">{row[h] || '-'}</td>
                              ))}
                              {headers.length > 6 && <td className="px-2 py-1 text-gray-400">...</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={updateByMrn}
                      onChange={(e) => setUpdateByMrn(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5"
                    />
                    Update existing clients by MRN
                  </label>
                </>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {importing ? 'Importing...' : 'Import Clients'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">check_circle</span>
              <h3 className="text-lg font-semibold text-white mb-4">Import Complete</h3>
              <div className="grid grid-cols-2 gap-4 text-sm max-w-xs mx-auto">
                <div className="bg-white/5 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-400">{result.created}</div>
                  <div className="text-gray-400">Imported</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{result.updated}</div>
                  <div className="text-gray-400">Updated</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">{result.skipped}</div>
                  <div className="text-gray-400">Skipped</div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-red-400">{result.errors}</div>
                  <div className="text-gray-400">Errors</div>
                </div>
              </div>
              <button
                onClick={onSuccess}
                className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
