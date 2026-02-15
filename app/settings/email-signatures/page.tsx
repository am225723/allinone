'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

export default function EmailSignaturesPage() {
  const [signatures, setSignatures] = useState<{[email: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSignatures();
  }, []);

  async function loadSignatures() {
    setLoading(true);
    try {
      // Try to load from localStorage first
      const saved = localStorage.getItem('email_signatures');
      if (saved) {
        setSignatures(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load signatures:', e);
    } finally {
      setLoading(false);
    }
  }

  async function saveSignatures() {
    setSaving(true);
    try {
      localStorage.setItem('email_signatures', JSON.stringify(signatures));
      alert('Signatures saved successfully!');
    } catch (e) {
      alert('Failed to save signatures. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function updateSignature(email: string, signature: string) {
    setSignatures(prev => ({...prev, [email]: signature}));
  }

  function addEmailSignature() {
    const email = prompt('Enter email address:');
    if (email && email.trim()) {
      updateSignature(email.trim(), '');
    }
  }

  function removeSignature(email: string) {
    if (confirm(`Remove signature for ${email}?`)) {
      setSignatures(prev => {
        const newSignatures = {...prev};
        delete newSignatures[email];
        return newSignatures;
      });
    }
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-4xl text-blue-400">progress_activity</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-gray-400 text-3xl">edit_note</span>
            Email Signatures
          </h1>
          <p className="text-gray-400 mt-1">Manage email signatures for each address</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">Email Signature Configuration</h3>
        </div>

        {Object.keys(signatures).length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">mail</span>
            <p>No email signatures configured</p>
            <p className="text-sm mt-1">Add an email to set up a signature</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(signatures).map(([email, signature]) => (
              <div key={email} className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">email</span>
                    <span className="font-medium">{email}</span>
                  </div>
                  <button
                    onClick={() => removeSignature(email)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Remove signature"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
                <textarea
                  value={signature}
                  onChange={(e) => updateSignature(email, e.target.value)}
                  placeholder="Enter email signature..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={4}
                />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={addEmailSignature}
          className="w-full mt-4 py-3 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Add Email Signature
        </button>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSignatures}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? 'Saving...' : 'Save Signatures'}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-blue-400">info</span>
          <div>
            <p className="text-sm text-blue-300 font-medium">About Email Signatures</p>
            <p className="text-sm text-gray-400 mt-1">
              Signatures configured here can be used when automatically drafting email responses. 
              They are stored locally in your browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}