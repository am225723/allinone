'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
}

const defaultTemplates: NoteTemplate[] = [
  { id: '1', name: 'SOAP Note', description: 'Standard medical documentation format', sections: ['Subjective', 'Objective', 'Assessment', 'Plan'] },
  { id: '2', name: 'Progress Note', description: 'Follow-up visit documentation', sections: ['Chief Complaint', 'History', 'Examination', 'Diagnosis', 'Treatment'] },
  { id: '3', name: 'Initial Assessment', description: 'First visit comprehensive evaluation', sections: ['Patient History', 'Medical History', 'Social History', 'Review of Systems', 'Physical Exam', 'Assessment', 'Plan'] },
  { id: '4', name: 'Discharge Summary', description: 'Patient discharge documentation', sections: ['Admission Summary', 'Hospital Course', 'Discharge Diagnosis', 'Discharge Medications', 'Follow-up Instructions'] },
  { id: '5', name: 'Therapy Note', description: 'Mental health session notes', sections: ['Session Summary', 'Patient Presentation', 'Interventions', 'Progress', 'Next Steps'] },
];

function CreateNoteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams.get('template');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const driveInputRef = useRef<HTMLInputElement>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);
  const [patientName, setPatientName] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState('');
  const [noteContent, setNoteContent] = useState<Record<string, string>>({});

  useEffect(() => {
    if (templateId) {
      const template = defaultTemplates.find(t => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);
        const initialContent: Record<string, string> = {};
        template.sections.forEach(section => {
          initialContent[section] = '';
        });
        setNoteContent(initialContent);
      }
    }
  }, [templateId]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      setUploadedFiles(prev => [...prev, ...Array.from(files)]);
    }
  }

  function removeFile(index: number) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function generateNote() {
    if (!selectedTemplate) return;
    setGenerating(true);

    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const generated = `# ${selectedTemplate.name}\n\n**Patient:** ${patientName}\n**Date:** ${appointmentDate}\n\n` +
      selectedTemplate.sections.map(section => `## ${section}\n\n${noteContent[section] || '[Generated content would appear here based on uploaded documents]'}\n`).join('\n');
    
    setGeneratedNote(generated);
    setGenerating(false);
  }

  async function downloadPDF() {
    // Create printable content and trigger download
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Clinical Note - ${patientName}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
              h2 { color: #333; margin-top: 20px; }
              p { margin: 10px 0; }
            </style>
          </head>
          <body>
            ${generatedNote.replace(/\n/g, '<br>').replace(/##/g, '<h2>').replace(/#/g, '<h1>')}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  async function uploadToClientFolder() {
    alert('PDF will be uploaded to the client folder. This feature requires Google Drive integration.');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f18] via-[#0d1420] to-[#0f1a2e] p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/notes" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-gray-400">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Create Clinical Note</h1>
            <p className="text-gray-400 text-sm mt-1">
              {selectedTemplate ? `Using: ${selectedTemplate.name}` : 'Select a template to get started'}
            </p>
          </div>
        </div>

        {/* Template Selection */}
        {!selectedTemplate && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Select Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {defaultTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    const initialContent: Record<string, string> = {};
                    template.sections.forEach(section => {
                      initialContent[section] = '';
                    });
                    setNoteContent(initialContent);
                  }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 hover:border-cyan-500/40 transition-all text-left"
                >
                  <h3 className="font-semibold text-white">{template.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTemplate && (
          <>
            {/* Patient Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter patient name"
                  className="w-full px-4 py-3 bg-[#161b22] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Appointment Date</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#161b22] border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Document Upload */}
            <div className="mb-6 p-5 rounded-2xl bg-[#161b22]/80 border border-white/10">
              <h3 className="font-semibold text-white mb-4">Upload Documents</h3>
              <p className="text-sm text-gray-400 mb-4">Upload audio recordings, transcripts, or documents to generate the note</p>
              
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">upload_file</span>
                  Upload Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.mp3,.wav,.m4a"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <button
                  onClick={() => driveInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">cloud_upload</span>
                  From Drive
                </button>
                <input
                  ref={driveInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-cyan-400">description</span>
                        <span className="text-sm text-white">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button onClick={() => removeFile(index)} className="p-1 hover:bg-white/10 rounded-lg">
                        <span className="material-symbols-outlined text-gray-400 text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Note Sections */}
            <div className="mb-6">
              <h3 className="font-semibold text-white mb-4">Note Sections</h3>
              <div className="space-y-4">
                {selectedTemplate.sections.map((section) => (
                  <div key={section} className="p-4 rounded-2xl bg-[#161b22]/80 border border-white/10">
                    <label className="block text-sm font-medium text-cyan-400 mb-2">{section}</label>
                    <textarea
                      value={noteContent[section] || ''}
                      onChange={(e) => setNoteContent(prev => ({ ...prev, [section]: e.target.value }))}
                      placeholder={`Enter ${section.toLowerCase()} notes...`}
                      rows={4}
                      className="w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={generateNote}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">auto_awesome</span>
                    Generate Note with AI
                  </>
                )}
              </button>
            </div>

            {/* Generated Note */}
            {generatedNote && (
              <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-emerald-100">Generated Note</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadPDF}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      Download PDF
                    </button>
                    <button
                      onClick={uploadToClientFolder}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">cloud_upload</span>
                      Upload to Folder
                    </button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono">{generatedNote}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CreateNotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f18] via-[#0d1420] to-[#0f1a2e]">
        <span className="material-symbols-outlined text-5xl text-cyan-400 animate-spin">progress_activity</span>
      </div>
    }>
      <CreateNoteContent />
    </Suspense>
  );
}
