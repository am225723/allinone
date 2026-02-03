'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type Appointment = {
  id: string;
  patientName: string;
  mrn?: string;
  dob?: string;
  dateOfService: string;
  appointmentType: string;
  notes?: string;
};

type NoteTemplate = {
  id: string;
  name: string;
  sections: string[];
};

type PromptProfile = {
  id: string;
  name: string;
  systemPrompt: string;
  outputFormat: 'markdown' | 'plain';
  notes?: string;
};

type UploadedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  content?: string;
  transcript?: string;
};

type NoteVersion = {
  id: string;
  timestamp: Date;
  content: string;
  template: string;
  promptProfile: string;
};

const TEMPLATES: NoteTemplate[] = [
  { id: 'new-client-summary', name: 'New Client Summary', sections: ['Chief Complaint', 'History of Present Illness', 'Mental Status Exam', 'Diagnosis', 'Treatment Plan'] },
  { id: 'treatment-plan', name: 'Treatment Plan', sections: ['Goals', 'Objectives', 'Interventions', 'Progress Measures', 'Timeline'] },
  { id: 'intake-note', name: 'Intake Note', sections: ['Identifying Information', 'Presenting Problem', 'History', 'Mental Status', 'Assessment', 'Plan'] },
  { id: 'darp-note', name: 'DARP Note', sections: ['Data', 'Assessment', 'Response', 'Plan'] },
  { id: 'progress-note', name: 'Progress Note', sections: ['Subjective', 'Objective', 'Assessment', 'Plan'] },
];

const DEFAULT_PROFILES: PromptProfile[] = [
  {
    id: 'client-summary-v1',
    name: 'Client Summary + Clinical Report',
    systemPrompt: 'Generate a comprehensive clinical summary with strong safety rules and traceability. Include evidence-based diagnoses with confidence labels.',
    outputFormat: 'markdown',
    notes: 'Best for new client intake and comprehensive evaluations.',
  },
  {
    id: 'darp-generator-v2',
    name: 'DARP Note Generator v2',
    systemPrompt: 'Generate a DARP format note: Data (objective observations), Assessment (clinical interpretation), Response (patient response to treatment), Plan (next steps). Include ICD-10 and CPT code suggestions.',
    outputFormat: 'markdown',
    notes: 'Standard DARP format with coding suggestions.',
  },
  {
    id: 'intake-treatment-v1',
    name: 'Intake / Treatment Plan',
    systemPrompt: 'Generate intake documentation including Risk Assessment, Diagnosis with supporting evidence, and detailed Treatment Plan with goals and interventions.',
    outputFormat: 'markdown',
    notes: 'Comprehensive intake with treatment planning.',
  },
];

export default function NoteAIPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get('appointmentId');

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0].id);
  const [selectedProfile, setSelectedProfile] = useState<string>(DEFAULT_PROFILES[0].id);
  const [profiles, setProfiles] = useState<PromptProfile[]>(DEFAULT_PROFILES);

  const [typedNotes, setTypedNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tone, setTone] = useState<'clinical' | 'concise' | 'balanced'>('balanced');
  const [detailLevel, setDetailLevel] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [includeRiskAssessment, setIncludeRiskAssessment] = useState(true);
  const [includeDiagnosis, setIncludeDiagnosis] = useState(true);
  const [includeTreatmentPlan, setIncludeTreatmentPlan] = useState(true);
  const [includeTranscript, setIncludeTranscript] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState('');
  const [noteVersions, setNoteVersions] = useState<NoteVersion[]>([]);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);

  const [activeSourceTab, setActiveSourceTab] = useState<'typed' | 'uploads' | 'transcripts' | 'extracted'>('typed');
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PromptProfile | null>(null);

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (appointmentId) {
      setLoading(false);
      setAppointment({
        id: appointmentId,
        patientName: 'Jennie Rivers',
        mrn: 'MRN-2024-0158',
        dob: '1989-07-16',
        dateOfService: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        appointmentType: 'Follow-up',
        notes: 'Patient reports improved sleep patterns. Continue current medication regimen.',
      });
    } else {
      setLoading(false);
      setError('No appointment selected');
    }
  }, [appointmentId]);

  const currentTemplate = useMemo(() => TEMPLATES.find(t => t.id === selectedTemplate), [selectedTemplate]);
  const currentProfile = useMemo(() => profiles.find(p => p.id === selectedProfile), [profiles, selectedProfile]);

  const hasTranscripts = uploadedFiles.some(f => f.transcript && f.status === 'ready');

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles: UploadedFile[] = Array.from(files).map((file, idx) => ({
      id: `file-${Date.now()}-${idx}`,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'queued' as const,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach((uf) => {
      setTimeout(() => {
        setUploadedFiles(prev => prev.map(f => f.id === uf.id ? { ...f, status: 'processing' } : f));
      }, 500);
      setTimeout(() => {
        const isAudioVideo = uf.type.startsWith('audio/') || uf.type.startsWith('video/');
        setUploadedFiles(prev => prev.map(f => f.id === uf.id ? {
          ...f,
          status: 'ready',
          content: isAudioVideo ? undefined : `[Extracted text from ${uf.name}]`,
          transcript: isAudioVideo ? `[Transcribed content from ${uf.name}]` : undefined,
        } : f));
      }, 2000 + Math.random() * 1000);
    });
  }

  function removeFile(id: string) {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  }

  async function generateNote() {
    setGenerating(true);
    setClarifyingQuestions([]);

    await new Promise(r => setTimeout(r, 2000));

    const template = currentTemplate;
    const profile = currentProfile;
    const dos = appointment?.dateOfService || new Date().toLocaleDateString();

    const letterhead = `**${template?.name?.toUpperCase() || 'CLINICAL NOTE'}**

**Patient Name:** ${appointment?.patientName || '[NOT REPORTED]'}    **MRN:** ${appointment?.mrn || '[NOT REPORTED]'}
**Date of Birth:** ${appointment?.dob || '[NOT REPORTED]'}    **Date of Service:** ${dos}
**Provider:** Douglas Zelisko, M.D.
45 S Main St, Suite 111 West Hartford, CT 06107    F: 860.318.2085    P: 860.615.3629    support@drzelisko.com

---

`;

    let content = letterhead;

    if (template?.id === 'darp-note') {
      content += `## Data
Patient presented for ${appointment?.appointmentType || 'follow-up'} visit. ${typedNotes || 'No additional notes provided.'}

## Assessment
Based on the clinical presentation and reported symptoms, the patient demonstrates ${includeDiagnosis ? 'continued management of presenting concerns' : 'stable baseline functioning'}.

${includeDiagnosis ? `**Provisional Diagnosis:** Generalized Anxiety Disorder (F41.1)
**Confidence:** Likely
**Supporting Evidence:** Patient reports ongoing worry, difficulty relaxing, and improved sleep with current treatment.` : ''}

## Response
Patient engaged appropriately in session. Demonstrated insight into symptoms and motivation for continued treatment.

## Plan
- Continue current medication regimen
- Follow-up in 4 weeks
- ${includeTreatmentPlan ? 'Maintain cognitive behavioral strategies discussed' : 'Continue monitoring symptoms'}
`;
    } else {
      template?.sections.forEach(section => {
        content += `## ${section}\n`;
        if (section.toLowerCase().includes('diagnosis') && includeDiagnosis) {
          content += `Based on clinical evaluation and reported symptoms:

**Primary Diagnosis:** Generalized Anxiety Disorder (F41.1)
- **Confidence Level:** Likely
- **Supporting Evidence:** Persistent worry, difficulty controlling worry, restlessness, fatigue
- **Duration:** > 6 months
- **Functional Impairment:** Moderate - affecting work and relationships

`;
        } else if (section.toLowerCase().includes('risk') && includeRiskAssessment) {
          content += `**Suicidal Ideation:** Denied
**Homicidal Ideation:** Denied  
**Self-Harm:** No current or recent history
**Risk Level:** Low
**Rationale:** Patient denies SI/HI, has protective factors including social support and engagement in treatment.

`;
        } else if (section.toLowerCase().includes('treatment') && includeTreatmentPlan) {
          content += `**Modality:** Individual psychotherapy
**Frequency:** Weekly x 8 sessions, then bi-weekly
**Goals:**
1. Reduce anxiety symptoms by 50% as measured by GAD-7
2. Improve sleep quality to 7+ hours per night
3. Develop 3 effective coping strategies

**Interventions:** CBT techniques, relaxation training, psychoeducation
**Follow-up:** 4 weeks

`;
        } else {
          content += `[Content for ${section} based on clinical documentation]\n\n`;
        }
      });
    }

    const version: NoteVersion = {
      id: `v-${Date.now()}`,
      timestamp: new Date(),
      content,
      template: template?.name || '',
      promptProfile: profile?.name || '',
    };

    setNoteVersions(prev => [version, ...prev]);
    setGeneratedNote(content);

    if (!typedNotes && uploadedFiles.length === 0) {
      setClarifyingQuestions([
        'What was the primary focus of this session?',
        'Any medication changes to document?',
        'Were safety assessments completed?',
      ]);
    }

    setGenerating(false);
  }

  async function saveNote(status: 'draft' | 'final') {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    alert(`Note saved as ${status}!`);
  }

  async function exportToPDF() {
    setExporting(true);
    await new Promise(r => setTimeout(r, 1500));
    setExporting(false);
    alert('Note exported to Google Drive: /PatientForms/Jennie Rivers/02032026_Note.pdf');
  }

  function addNewProfile() {
    const newProfile: PromptProfile = {
      id: `profile-${Date.now()}`,
      name: 'New Profile',
      systemPrompt: 'Enter your custom prompt here...',
      outputFormat: 'markdown',
      notes: '',
    };
    setProfiles(prev => [...prev, newProfile]);
    setEditingProfile(newProfile);
  }

  function saveProfile(profile: PromptProfile) {
    setProfiles(prev => prev.map(p => p.id === profile.id ? profile : p));
    setEditingProfile(null);
  }

  function deleteProfile(id: string) {
    if (profiles.length <= 1) return;
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (selectedProfile === id) {
      setSelectedProfile(profiles[0].id);
    }
  }

  if (loading) {
    return (
      <div className="container py-12 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="container py-12">
        <div className="card max-w-md mx-auto text-center">
          <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error</span>
          <h2 className="text-xl font-semibold text-white mb-2">No Appointment Selected</h2>
          <p className="text-gray-400 mb-6">Please select an appointment from the calendar to generate a clinical note.</p>
          <button
            onClick={() => router.push('/patients')}
            className="btn btn-primary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Calendar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="container py-6">
        {/* Header */}
        <header className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div className="flex-1 min-w-[300px]">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => router.push('/patients')}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h1 className="text-2xl font-bold text-white">Clinical Note Generator</h1>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 bg-white/5 rounded-lg p-3">
              <span><strong className="text-white">{appointment.patientName}</strong></span>
              <span>{appointment.dateOfService}</span>
              <span>{appointment.appointmentType}</span>
              {appointment.notes && <span className="text-gray-500 truncate max-w-[200px]">{appointment.notes}</span>}
            </div>
          </div>
          <button
            onClick={() => setShowPromptSettings(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <span className="material-symbols-outlined">settings</span>
            Prompt Settings
          </button>
        </header>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Controls */}
          <div className="lg:col-span-3 space-y-4">
            {/* Template Picker */}
            <div className="card">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">description</span>
                Note Template
              </h3>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                {TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Sections: {currentTemplate?.sections.join(', ')}
              </p>
            </div>

            {/* Prompt Profile */}
            <div className="card">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">psychology</span>
                Prompt Profile
              </h3>
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {currentProfile?.notes && (
                <p className="text-xs text-gray-500 mt-2">{currentProfile.notes}</p>
              )}
            </div>

            {/* Input Sources */}
            <div className="card">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">upload_file</span>
                Input Sources
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Typed Notes</label>
                  <textarea
                    value={typedNotes}
                    onChange={(e) => setTypedNotes(e.target.value)}
                    placeholder="Paste key points, session summary..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[80px] resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Upload Files</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".mp3,.wav,.m4a,.mp4,.mov,.pdf,.docx,.txt,.rtf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 border border-dashed border-white/20 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/40 transition flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">cloud_upload</span>
                    Audio, Video, PDF, Docs
                  </button>
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {uploadedFiles.map(f => (
                        <div key={f.id} className="flex items-center gap-2 text-xs bg-white/5 rounded px-2 py-1">
                          <span className={`w-2 h-2 rounded-full ${
                            f.status === 'ready' ? 'bg-green-500' :
                            f.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                            f.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                          }`}></span>
                          <span className="flex-1 truncate text-gray-300">{f.name}</span>
                          <button onClick={() => removeFile(f.id)} className="text-gray-500 hover:text-red-400">
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Generation Settings */}
            <div className="card">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-400">tune</span>
                Generation Settings
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="clinical">More Clinical</option>
                    <option value="concise">More Concise</option>
                    <option value="balanced">Balanced</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Detail Level</label>
                  <select
                    value={detailLevel}
                    onChange={(e) => setDetailLevel(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="brief">Brief</option>
                    <option value="standard">Standard</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeRiskAssessment}
                      onChange={(e) => setIncludeRiskAssessment(e.target.checked)}
                      className="rounded border-gray-600 text-blue-500"
                    />
                    <span className="text-sm text-gray-300">Include Risk Assessment</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDiagnosis}
                      onChange={(e) => setIncludeDiagnosis(e.target.checked)}
                      className="rounded border-gray-600 text-blue-500"
                    />
                    <span className="text-sm text-gray-300">Include Diagnosis & Codes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTreatmentPlan}
                      onChange={(e) => setIncludeTreatmentPlan(e.target.checked)}
                      className="rounded border-gray-600 text-blue-500"
                    />
                    <span className="text-sm text-gray-300">Include Treatment Plan</span>
                  </label>
                  {hasTranscripts && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTranscript}
                        onChange={(e) => setIncludeTranscript(e.target.checked)}
                        className="rounded border-gray-600 text-blue-500"
                      />
                      <span className="text-sm text-gray-300">Include Transcript</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateNote}
              disabled={generating}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-white rounded-lg font-medium transition shadow-lg flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">auto_awesome</span>
                  {generatedNote ? 'Regenerate Note' : 'Generate Note'}
                </>
              )}
            </button>

            {/* Clarifying Questions */}
            {clarifyingQuestions.length > 0 && (
              <div className="card border-yellow-500/30">
                <h3 className="text-sm font-medium text-yellow-400 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined">help</span>
                  Clarifications Needed
                </h3>
                <ul className="space-y-2">
                  {clarifyingQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-yellow-500">•</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Center Column: Source Content */}
          <div className="lg:col-span-4 card min-h-[600px] flex flex-col">
            <div className="flex gap-1 mb-4 border-b border-white/10 pb-2 overflow-x-auto">
              {(['typed', 'uploads', 'transcripts', 'extracted'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveSourceTab(tab)}
                  className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition ${
                    activeSourceTab === tab
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab === 'typed' && 'Typed Notes'}
                  {tab === 'uploads' && `Uploads (${uploadedFiles.length})`}
                  {tab === 'transcripts' && 'Transcripts'}
                  {tab === 'extracted' && 'Extracted Text'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeSourceTab === 'typed' && (
                <div className="text-sm text-gray-300 whitespace-pre-wrap">
                  {typedNotes || <span className="text-gray-500 italic">No typed notes yet. Add notes in the left panel.</span>}
                </div>
              )}
              {activeSourceTab === 'uploads' && (
                <div className="space-y-2">
                  {uploadedFiles.length === 0 ? (
                    <span className="text-gray-500 italic text-sm">No files uploaded.</span>
                  ) : (
                    uploadedFiles.map(f => (
                      <div key={f.id} className="p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-gray-400">
                            {f.type.startsWith('audio/') ? 'audio_file' :
                             f.type.startsWith('video/') ? 'video_file' :
                             f.type.includes('pdf') ? 'picture_as_pdf' : 'description'}
                          </span>
                          <span className="text-sm text-white font-medium">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded ${
                            f.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                            f.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                            f.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {f.status}
                          </span>
                          <span className="text-gray-500">{(f.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {activeSourceTab === 'transcripts' && (
                <div className="text-sm text-gray-300">
                  {uploadedFiles.filter(f => f.transcript).length === 0 ? (
                    <span className="text-gray-500 italic">No transcripts available. Upload audio or video files to generate transcripts.</span>
                  ) : (
                    uploadedFiles.filter(f => f.transcript).map(f => (
                      <div key={f.id} className="mb-4">
                        <h4 className="text-xs text-gray-400 mb-1">{f.name}</h4>
                        <p className="whitespace-pre-wrap">{f.transcript}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
              {activeSourceTab === 'extracted' && (
                <div className="text-sm text-gray-300 whitespace-pre-wrap">
                  {uploadedFiles.filter(f => f.content).length === 0 && !typedNotes ? (
                    <span className="text-gray-500 italic">No extracted text. Add notes or upload documents.</span>
                  ) : (
                    <>
                      {typedNotes && <div className="mb-4">{typedNotes}</div>}
                      {uploadedFiles.filter(f => f.content).map(f => (
                        <div key={f.id} className="mb-4">
                          <h4 className="text-xs text-gray-400 mb-1">From: {f.name}</h4>
                          <p>{f.content}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Note Output */}
          <div className="lg:col-span-5 card min-h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">article</span>
                Generated Note
              </h3>
              {noteVersions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {noteVersions.length} version{noteVersions.length > 1 ? 's' : ''}
                  </span>
                  <button className="text-xs text-blue-400 hover:text-blue-300">View History</button>
                </div>
              )}
            </div>

            {!generatedNote ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <span className="material-symbols-outlined text-5xl mb-3">edit_note</span>
                  <p>Click "Generate Note" to create a clinical note</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto mb-4">
                  <textarea
                    value={generatedNote}
                    onChange={(e) => setGeneratedNote(e.target.value)}
                    className="w-full h-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-200 resize-none font-mono leading-relaxed"
                    style={{ minHeight: '400px' }}
                  />
                </div>

                {/* Section Tools */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition">
                    Shorten
                  </button>
                  <button className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition">
                    Expand
                  </button>
                  <button className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition">
                    More Clinical
                  </button>
                  <button className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition">
                    More Concise
                  </button>
                </div>

                {/* Save/Export Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => saveNote('draft')}
                    disabled={saving}
                    className="py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">save</span>
                    Save Draft
                  </button>
                  <button
                    onClick={() => saveNote('final')}
                    disabled={saving}
                    className="py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 rounded-lg text-sm text-white font-medium transition flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Save Final
                  </button>
                </div>
                <button
                  onClick={exportToPDF}
                  disabled={exporting}
                  className="w-full mt-3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-lg text-sm text-white font-medium transition flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">cloud_upload</span>
                      Export PDF to Google Drive
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Settings Modal */}
      {showPromptSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPromptSettings(false)}>
          <div className="bg-[#1a1d24] border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Prompt Settings</h3>
              <button onClick={() => setShowPromptSettings(false)} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {editingProfile ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Profile Name</label>
                    <input
                      value={editingProfile.name}
                      onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">System Prompt</label>
                    <textarea
                      value={editingProfile.systemPrompt}
                      onChange={(e) => setEditingProfile({ ...editingProfile, systemPrompt: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[150px] resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Output Format</label>
                    <select
                      value={editingProfile.outputFormat}
                      onChange={(e) => setEditingProfile({ ...editingProfile, outputFormat: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="markdown">Markdown</option>
                      <option value="plain">Plain Text</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Notes (internal)</label>
                    <input
                      value={editingProfile.notes || ''}
                      onChange={(e) => setEditingProfile({ ...editingProfile, notes: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => saveProfile(editingProfile)}
                      className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
                    >
                      Save Profile
                    </button>
                    <button
                      onClick={() => setEditingProfile(null)}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {profiles.map(p => (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border transition cursor-pointer ${
                        selectedProfile === p.id
                          ? 'bg-blue-500/10 border-blue-500/50'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                      onClick={() => setSelectedProfile(p.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-medium text-white">{p.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">{p.notes}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingProfile(p); }}
                            className="p-1 text-gray-400 hover:text-white"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          {profiles.length > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }}
                              className="p-1 text-gray-400 hover:text-red-400"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addNewProfile}
                    className="w-full py-2 border border-dashed border-white/20 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/40 transition flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">add</span>
                    Add New Profile
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => setShowPromptSettings(false)}
                className="w-full py-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white rounded-lg font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
