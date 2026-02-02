'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  created_at: string;
}

export default function NotePromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([
    { id: '1', name: 'SOAP Structure', description: 'Standard SOAP note generation prompt', content: 'Generate a SOAP note...', category: 'Medical', created_at: new Date().toISOString() },
    { id: '2', name: 'Therapy Session', description: 'Mental health session notes', content: 'Generate therapy notes...', category: 'Mental Health', created_at: new Date().toISOString() },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: '', description: '', content: '', category: 'Medical' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addPrompt() {
    if (!newPrompt.name || !newPrompt.content) return;
    
    const prompt: Prompt = {
      id: Date.now().toString(),
      name: newPrompt.name,
      description: newPrompt.description,
      content: newPrompt.content,
      category: newPrompt.category,
      created_at: new Date().toISOString(),
    };
    setPrompts(prev => [...prev, prompt]);
    setNewPrompt({ name: '', description: '', content: '', category: 'Medical' });
    setShowAddModal(false);
  }

  function deletePrompt(id: string) {
    if (confirm('Are you sure you want to delete this prompt?')) {
      setPrompts(prev => prev.filter(p => p.id !== id));
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setNewPrompt(prev => ({
          ...prev,
          content: content,
          name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
        }));
      };
      reader.readAsText(file);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f18] via-[#0d1420] to-[#0f1a2e] p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/notes" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-gray-400">arrow_back</span>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Note Prompts</h1>
            <p className="text-gray-400 text-sm mt-1">Manage AI prompts for note generation</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-medium transition-all shadow-lg shadow-violet-500/20"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Prompt
          </button>
        </div>

        {/* Prompts List */}
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="p-5 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 shadow-lg shadow-violet-500/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white">{prompt.name}</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-400">
                      {prompt.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{prompt.description}</p>
                  <div className="p-3 rounded-xl bg-[#0d1117] border border-white/10">
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono line-clamp-3">
                      {prompt.content}
                    </pre>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setEditingId(prompt.id)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-gray-400">edit</span>
                  </button>
                  <button
                    onClick={() => deletePrompt(prompt.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-red-400">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {prompts.length === 0 && (
          <div className="text-center py-12 rounded-2xl bg-[#161b22]/50 border border-white/10">
            <span className="material-symbols-outlined text-4xl text-gray-500 mb-3">psychology</span>
            <p className="text-gray-400">No prompts created yet</p>
            <p className="text-sm text-gray-500 mt-1">Add your first AI prompt for note generation</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-lg bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Add New Prompt</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                <span className="material-symbols-outlined text-gray-400">close</span>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Prompt Name</label>
                <input
                  type="text"
                  value={newPrompt.name}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., SOAP Note Generator"
                  className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
                <input
                  type="text"
                  value={newPrompt.description}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the prompt"
                  className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Category</label>
                <select
                  value={newPrompt.category}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                >
                  <option value="Medical">Medical</option>
                  <option value="Mental Health">Mental Health</option>
                  <option value="General">General</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-400">Prompt Content</label>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">upload</span>
                    Upload File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <textarea
                  value={newPrompt.content}
                  onChange={(e) => setNewPrompt(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter the AI prompt content..."
                  rows={8}
                  className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 resize-none font-mono text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={addPrompt}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-medium transition-all"
                >
                  Add Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
