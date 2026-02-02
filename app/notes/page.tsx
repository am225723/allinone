'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabaseFunctions } from '@/lib/supabase-functions';

interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Note {
  id: string;
  patient_name: string;
  appointment_date: string;
  template_used: string;
  status: 'draft' | 'completed' | 'pending_review';
  created_at: string;
}

export default function NotesPage() {
  const [templates, setTemplates] = useState<NoteTemplate[]>([
    { id: '1', name: 'SOAP Note', description: 'Standard medical documentation format', category: 'Medical' },
    { id: '2', name: 'Progress Note', description: 'Follow-up visit documentation', category: 'Medical' },
    { id: '3', name: 'Initial Assessment', description: 'First visit comprehensive evaluation', category: 'Medical' },
    { id: '4', name: 'Discharge Summary', description: 'Patient discharge documentation', category: 'Medical' },
    { id: '5', name: 'Therapy Note', description: 'Mental health session notes', category: 'Mental Health' },
  ]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
    loadNotes();
  }, []);

  async function loadTemplates() {
    try {
      const { data, error } = await supabaseFunctions.noteTemplates.list();
      if (!error && data?.ok && data.templates?.length > 0) {
        setTemplates(data.templates.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          category: t.category || 'Medical'
        })));
      }
    } catch (e) {
      console.error('Error loading templates:', e);
    }
  }

  async function loadNotes() {
    try {
      const { data, error } = await supabaseFunctions.notes.list({ limit: 20 });
      if (!error && data?.ok) {
        setNotes(data.notes || []);
      }
    } catch (e) {
      console.error('Error loading notes:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f18] via-[#0d1420] to-[#0f1a2e] p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Clinical Notes</h1>
            <p className="text-gray-400 text-sm mt-1">Create and manage clinical documentation</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/notes/prompts"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10"
            >
              <span className="material-symbols-outlined text-lg">tune</span>
              Manage Prompts
            </Link>
            <Link
              href="/notes/create"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium transition-all shadow-lg shadow-cyan-500/20"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Create Note
            </Link>
          </div>
        </div>

        {/* Template Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-cyan-100 mb-4">Note Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Link
                key={template.id}
                href={`/notes/create?template=${template.id}`}
                className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 hover:border-cyan-500/40 transition-all shadow-lg shadow-cyan-500/5 hover:shadow-cyan-500/10"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{template.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400">
                    {template.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="material-symbols-outlined text-cyan-400 text-sm">description</span>
                  <span className="text-xs text-cyan-400">Use Template</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Notes */}
        <div>
          <h2 className="text-lg font-semibold text-cyan-100 mb-4">Recent Notes</h2>
          {notes.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-[#161b22]/50 border border-white/10">
              <span className="material-symbols-outlined text-4xl text-gray-500 mb-3">description</span>
              <p className="text-gray-400">No notes created yet</p>
              <p className="text-sm text-gray-500 mt-1">Create your first clinical note above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-2xl bg-[#161b22]/80 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">{note.patient_name}</h3>
                      <p className="text-sm text-gray-400">
                        {note.template_used} - {new Date(note.appointment_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      note.status === 'completed' 
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : note.status === 'draft'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {note.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
