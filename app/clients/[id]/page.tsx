'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { invokeFunction } from '@/lib/supabase-functions';

interface Contact {
  id: string;
  type: 'phone' | 'email';
  value: string;
  label: string | null;
  is_primary: boolean;
  is_verified: boolean;
  source: string;
}

interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  dob: string | null;
  mrn: string | null;
  status: 'active' | 'inactive' | 'archived';
  last_visit_at: string | null;
  notes_internal: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  insurance_provider: string | null;
  insurance_member_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
  contacts: Contact[];
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'demographics' | 'contacts' | 'insurance' | 'notes'>('demographics');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeFunction('clients-get', {
        body: { id: clientId }
      });
      if (error) throw error;
      if (data?.ok) {
        setClient(data.client);
      }
    } catch (err) {
      console.error('Failed to fetch client');
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await invokeFunction('clients-status', {
        body: { id: clientId, status: newStatus }
      });
      if (error) throw error;
      fetchClient();
    } catch (err) {
      console.error('Failed to update status');
    }
  };

  const handleSetPrimary = async (contactId: string) => {
    try {
      const { error } = await invokeFunction('contacts-update', {
        body: { contactId, isPrimary: true }
      });
      if (error) throw error;
      fetchClient();
    } catch (err) {
      console.error('Failed to set primary');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      const { error } = await invokeFunction('contacts-delete', {
        body: { contactId }
      });
      if (error) throw error;
      fetchClient();
    } catch (err) {
      console.error('Failed to delete contact');
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.startsWith('+1') && phone.length === 12) {
      return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">person_off</span>
          <p className="text-gray-400">Client not found</p>
          <Link href="/clients" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">
            Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  const phones = client.contacts.filter(c => c.type === 'phone');
  const emails = client.contacts.filter(c => c.type === 'email');

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/clients" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-4">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to Clients
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">
                  {client.first_name} {client.last_name}
                </h1>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  client.status === 'active' 
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : client.status === 'inactive'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {client.status}
                </span>
              </div>
              {client.preferred_name && (
                <p className="text-gray-400">Goes by "{client.preferred_name}"</p>
              )}
              {client.mrn && (
                <p className="text-gray-500 text-sm">MRN: {client.mrn}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/noteai?clientId=${client.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-lg">edit_note</span>
                Start Note
              </Link>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit
              </button>
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-lg">more_vert</span>
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-[#1c2128] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {client.status !== 'active' && (
                    <button
                      onClick={() => handleStatusChange('active')}
                      className="w-full text-left px-4 py-2 text-gray-300 hover:bg-white/10 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                      Set Active
                    </button>
                  )}
                  {client.status !== 'inactive' && (
                    <button
                      onClick={() => handleStatusChange('inactive')}
                      className="w-full text-left px-4 py-2 text-gray-300 hover:bg-white/10 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-yellow-400">pause_circle</span>
                      Set Inactive
                    </button>
                  )}
                  {client.status !== 'archived' && (
                    <button
                      onClick={() => handleStatusChange('archived')}
                      className="w-full text-left px-4 py-2 text-gray-300 hover:bg-white/10 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-gray-400">archive</span>
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-lg w-fit">
          {(['demographics', 'contacts', 'insurance', 'notes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md transition-colors capitalize ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-white/5 rounded-xl p-6">
          {activeTab === 'demographics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm text-gray-400 mb-1">Full Name</h3>
                <p className="text-white">{client.first_name} {client.last_name}</p>
              </div>
              <div>
                <h3 className="text-sm text-gray-400 mb-1">Preferred Name</h3>
                <p className="text-white">{client.preferred_name || '-'}</p>
              </div>
              <div>
                <h3 className="text-sm text-gray-400 mb-1">Date of Birth</h3>
                <p className="text-white">{formatDate(client.dob)}</p>
              </div>
              <div>
                <h3 className="text-sm text-gray-400 mb-1">MRN</h3>
                <p className="text-white">{client.mrn || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm text-gray-400 mb-1">Address</h3>
                <p className="text-white">
                  {client.address_line1 ? (
                    <>
                      {client.address_line1}
                      {client.address_line2 && <>, {client.address_line2}</>}
                      {(client.city || client.state || client.zip) && (
                        <br />
                      )}
                      {client.city}{client.city && client.state ? ', ' : ''}{client.state} {client.zip}
                    </>
                  ) : '-'}
                </p>
              </div>
              <div>
                <h3 className="text-sm text-gray-400 mb-1">Last Visit</h3>
                <p className="text-white">{formatDate(client.last_visit_at)}</p>
              </div>
              <div>
                <h3 className="text-sm text-gray-400 mb-1">Client Since</h3>
                <p className="text-white">{formatDate(client.created_at)}</p>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Phone Numbers</h3>
                <button
                  onClick={() => setShowAddContactModal(true)}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Add Contact
                </button>
              </div>
              
              {phones.length === 0 ? (
                <p className="text-gray-500">No phone numbers</p>
              ) : (
                <div className="space-y-2">
                  {phones.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-400">phone</span>
                        <div>
                          <p className="text-white">{formatPhone(contact.value)}</p>
                          <p className="text-gray-500 text-sm">
                            {contact.label || 'Phone'}
                            {contact.is_primary && <span className="text-blue-400 ml-2">Primary</span>}
                            <span className="text-gray-600 ml-2">via {contact.source}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!contact.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(contact.id)}
                            className="text-gray-400 hover:text-white text-sm"
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="text-lg font-semibold text-white mt-8">Email Addresses</h3>
              {emails.length === 0 ? (
                <p className="text-gray-500">No email addresses</p>
              ) : (
                <div className="space-y-2">
                  {emails.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-purple-400">mail</span>
                        <div>
                          <p className="text-white">{contact.value}</p>
                          <p className="text-gray-500 text-sm">
                            {contact.label || 'Email'}
                            {contact.is_primary && <span className="text-blue-400 ml-2">Primary</span>}
                            <span className="text-gray-600 ml-2">via {contact.source}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!contact.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(contact.id)}
                            className="text-gray-400 hover:text-white text-sm"
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'insurance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm text-gray-400 mb-1">Insurance Provider</h3>
                  <p className="text-white">{client.insurance_provider || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm text-gray-400 mb-1">Member ID</h3>
                  <p className="text-white">{client.insurance_member_id || '-'}</p>
                </div>
              </div>
              
              <hr className="border-white/10" />
              
              <h3 className="text-lg font-semibold text-white">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm text-gray-400 mb-1">Name</h3>
                  <p className="text-white">{client.emergency_contact_name || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm text-gray-400 mb-1">Phone</h3>
                  <p className="text-white">{client.emergency_contact_phone || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <NotesTab client={client} onUpdate={fetchClient} />
          )}
        </div>

        {showEditModal && (
          <EditClientModal 
            client={client}
            onClose={() => setShowEditModal(false)} 
            onSuccess={() => { setShowEditModal(false); fetchClient(); }}
          />
        )}

        {showAddContactModal && (
          <AddContactModal 
            clientId={client.id}
            onClose={() => setShowAddContactModal(false)} 
            onSuccess={() => { setShowAddContactModal(false); fetchClient(); }}
          />
        )}
      </div>
    </div>
  );
}

function NotesTab({ client, onUpdate }: { client: ClientData; onUpdate: () => void }) {
  const [notes, setNotes] = useState(client.notes_internal || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await invokeFunction('clients-update', {
        body: { id: client.id, notesInternal: notes }
      });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save notes');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Internal Notes</h3>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-emerald-400 text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">check</span>
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
          >
            {saving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add internal notes about this client..."
        className="w-full h-48 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      <p className="text-gray-500 text-sm">These notes are internal and not shared with the client.</p>
    </div>
  );
}

function EditClientModal({ client, onClose, onSuccess }: { 
  client: ClientData; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    firstName: client.first_name,
    lastName: client.last_name,
    preferredName: client.preferred_name || '',
    dob: client.dob || '',
    mrn: client.mrn || '',
    addressLine1: client.address_line1 || '',
    addressLine2: client.address_line2 || '',
    city: client.city || '',
    state: client.state || '',
    zip: client.zip || '',
    insuranceProvider: client.insurance_provider || '',
    insuranceMemberId: client.insurance_member_id || '',
    emergencyContactName: client.emergency_contact_name || '',
    emergencyContactPhone: client.emergency_contact_phone || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { data, error: invokeError } = await invokeFunction('clients-update', {
        body: { id: client.id, ...form }
      });

      if (invokeError || !data?.ok) {
        setError(data?.error || invokeError?.message || 'Failed to update client');
        setSaving(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Failed to update client');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl w-full max-w-lg border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Edit Client</h2>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Preferred Name</label>
              <input
                type="text"
                value={form.preferredName}
                onChange={(e) => setForm({ ...form, preferredName: e.target.value })}
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
            <label className="block text-sm text-gray-400 mb-1">Date of Birth</label>
            <input
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <hr className="border-white/10" />

          <div>
            <label className="block text-sm text-gray-400 mb-1">Address Line 1</label>
            <input
              type="text"
              value={form.addressLine1}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Address Line 2</label>
            <input
              type="text"
              value={form.addressLine2}
              onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">ZIP</label>
              <input
                type="text"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <hr className="border-white/10" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Insurance Provider</label>
              <input
                type="text"
                value={form.insuranceProvider}
                onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Member ID</label>
              <input
                type="text"
                value={form.insuranceMemberId}
                onChange={(e) => setForm({ ...form, insuranceMemberId: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Emergency Contact Name</label>
              <input
                type="text"
                value={form.emergencyContactName}
                onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Emergency Contact Phone</label>
              <input
                type="text"
                value={form.emergencyContactPhone}
                onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

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
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddContactModal({ clientId, onClose, onSuccess }: { 
  clientId: string; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    type: 'phone' as 'phone' | 'email',
    value: '',
    label: '',
    isPrimary: false
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { data, error: invokeError } = await invokeFunction('contacts-add', {
        body: { 
          clientId, 
          type: form.type, 
          value: form.value,
          label: form.label || undefined,
          isPrimary: form.isPrimary
        }
      });

      if (invokeError || !data?.ok) {
        setError(data?.error || invokeError?.message || 'Failed to add contact');
        setSaving(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Failed to add contact');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl w-full max-w-md border border-white/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Add Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'phone' | 'email' })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {form.type === 'phone' ? 'Phone Number' : 'Email Address'} *
            </label>
            <input
              type={form.type === 'phone' ? 'tel' : 'email'}
              required
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.type === 'phone' ? '(555) 123-4567' : 'email@example.com'}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Label</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder={form.type === 'phone' ? 'Mobile, Home, Work...' : 'Personal, Work...'}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-white/5"
            />
            Set as primary {form.type}
          </label>

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
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
