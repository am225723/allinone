'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type Patient = {
  id: string;
  name: string;
  mrn?: string;
  dob?: string;
};

type Appointment = {
  id: string;
  patientName: string;
  mrn?: string;
  dob?: string;
  dateOfService: string;
  appointmentType: string;
  notes?: string;
};

type TemplateSection = {
  name: string;
  required: boolean;
  guidance?: string;
};

type Template = {
  id: string;
  name: string;
  sections: TemplateSection[];
  defaults: {
    tone: 'clinical' | 'concise' | 'balanced';
    detailLevel: 'brief' | 'standard' | 'detailed';
    includeRiskAssessment: boolean;
    includeDiagnosis: boolean;
    includeTreatmentPlan: boolean;
  };
  systemPrompt: string;
  description: string;
  isCustom?: boolean;
};

type UploadedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  content?: string;
  transcript?: string;
  source: 'local' | 'gdrive';
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
};

type NoteVersion = {
  id: string;
  timestamp: Date;
  content: string;
  template: string;
};

type PreflightCheck = {
  section: string;
  status: 'complete' | 'partial' | 'missing';
  missing?: string;
};

type FollowUpQuestion = {
  id: string;
  question: string;
  reason: string;
  targetSection: string;
  priority: 'high' | 'medium' | 'low';
  answer: string;
};

type DiagnosisSuggestion = {
  name: string;
  code?: string;
  rationale: string;
  confidence: 'high' | 'medium' | 'low';
};

const SAMPLE_PATIENTS: Patient[] = [
  { id: 'p1', name: 'Jennie Rivers', mrn: 'MRN-2024-0158', dob: '07/16/1989' },
  { id: 'p2', name: 'Michael Chen', mrn: 'MRN-2024-0203', dob: '03/22/1975' },
  { id: 'p3', name: 'Sarah Martinez', mrn: 'MRN-2024-0087', dob: '11/08/1992' },
  { id: 'p4', name: 'David Thompson', mrn: 'MRN-2024-0312', dob: '06/30/1968' },
  { id: 'p5', name: 'Emily Watson', mrn: 'MRN-2024-0445', dob: '09/14/2001' },
];

const SAMPLE_DRIVE_FILES: DriveFile[] = [
  { id: 'gf1', name: 'Session_Audio_20260203.mp3', mimeType: 'audio/mpeg', modifiedTime: '2026-02-03T10:30:00Z' },
  { id: 'gf2', name: 'Previous_Notes.pdf', mimeType: 'application/pdf', modifiedTime: '2026-02-01T14:20:00Z' },
  { id: 'gf3', name: 'Intake_Form_Scan.pdf', mimeType: 'application/pdf', modifiedTime: '2026-01-28T09:15:00Z' },
  { id: 'gf4', name: 'Video_Session_Recording.mp4', mimeType: 'video/mp4', modifiedTime: '2026-02-02T16:45:00Z' },
];

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'new-client-summary',
    name: 'New Client Summary',
    sections: [
      { name: 'Chief Complaint', required: true, guidance: 'Primary reason for visit' },
      { name: 'History of Present Illness', required: true, guidance: 'Onset, duration, severity, context' },
      { name: 'Mental Status Exam', required: true, guidance: 'Appearance, behavior, mood, affect, thought process' },
      { name: 'Diagnosis', required: false, guidance: 'ICD-10 codes with supporting evidence' },
      { name: 'Treatment Plan', required: false, guidance: 'Goals, interventions, follow-up' },
    ],
    defaults: { tone: 'clinical', detailLevel: 'detailed', includeRiskAssessment: true, includeDiagnosis: true, includeTreatmentPlan: true },
    systemPrompt: 'Generate a comprehensive clinical summary with strong safety rules and traceability. Include evidence-based diagnoses with confidence labels.',
    description: 'Best for new client intake and comprehensive evaluations.',
  },
  {
    id: 'treatment-plan',
    name: 'Treatment Plan',
    sections: [
      { name: 'Goals', required: true, guidance: 'Long-term treatment goals' },
      { name: 'Objectives', required: true, guidance: 'Measurable short-term objectives' },
      { name: 'Interventions', required: true, guidance: 'Therapeutic modalities and techniques' },
      { name: 'Progress Measures', required: false, guidance: 'How progress will be assessed' },
      { name: 'Timeline', required: false, guidance: 'Expected duration and review dates' },
    ],
    defaults: { tone: 'clinical', detailLevel: 'standard', includeRiskAssessment: false, includeDiagnosis: true, includeTreatmentPlan: true },
    systemPrompt: 'Generate a structured treatment plan with clear goals, measurable objectives, and evidence-based interventions.',
    description: 'For creating or updating treatment plans.',
  },
  {
    id: 'intake-note',
    name: 'Intake Note',
    sections: [
      { name: 'Identifying Information', required: true, guidance: 'Demographics and referral source' },
      { name: 'Presenting Problem', required: true, guidance: 'Chief complaint and history of present illness' },
      { name: 'History', required: true, guidance: 'Psychiatric, medical, substance, social, family history' },
      { name: 'Mental Status', required: true, guidance: 'Full mental status examination' },
      { name: 'Risk Assessment', required: true, guidance: 'SI/HI, self-harm, protective factors, safety plan' },
      { name: 'Assessment', required: true, guidance: 'Clinical formulation and diagnoses' },
      { name: 'Plan', required: true, guidance: 'Treatment recommendations and next steps' },
    ],
    defaults: { tone: 'clinical', detailLevel: 'detailed', includeRiskAssessment: true, includeDiagnosis: true, includeTreatmentPlan: true },
    systemPrompt: 'Generate comprehensive intake documentation including Risk Assessment, Diagnosis with supporting evidence, and detailed Treatment Plan with goals and interventions.',
    description: 'Comprehensive intake with treatment planning.',
  },
  {
    id: 'darp-note',
    name: 'DARP Note',
    sections: [
      { name: 'Data', required: true, guidance: 'Objective observations and patient statements' },
      { name: 'Assessment', required: true, guidance: 'Clinical interpretation of data' },
      { name: 'Response', required: true, guidance: 'Patient response to interventions' },
      { name: 'Plan', required: true, guidance: 'Next steps and follow-up' },
    ],
    defaults: { tone: 'concise', detailLevel: 'standard', includeRiskAssessment: false, includeDiagnosis: true, includeTreatmentPlan: false },
    systemPrompt: 'Generate a DARP format note: Data (objective observations), Assessment (clinical interpretation), Response (patient response to treatment), Plan (next steps). Include ICD-10 and CPT code suggestions when enabled.',
    description: 'Standard DARP format with coding suggestions.',
  },
  {
    id: 'progress-note',
    name: 'Progress Note',
    sections: [
      { name: 'Subjective', required: true, guidance: 'Patient-reported symptoms and concerns' },
      { name: 'Objective', required: true, guidance: 'Clinical observations and mental status' },
      { name: 'Assessment', required: true, guidance: 'Clinical interpretation and diagnosis' },
      { name: 'Plan', required: true, guidance: 'Treatment plan updates and next steps' },
    ],
    defaults: { tone: 'concise', detailLevel: 'standard', includeRiskAssessment: false, includeDiagnosis: false, includeTreatmentPlan: false },
    systemPrompt: 'Generate a concise SOAP-style progress note documenting the current session.',
    description: 'Quick session documentation.',
  },
];

export default function NoteAIPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get('appointmentId');

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [linkedPatient, setLinkedPatient] = useState<Patient | null>(null);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedTemplate, setSelectedTemplate] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);

  const [typedNotes, setTypedNotes] = useState('');
  const [clinicianOverrides, setClinicianOverrides] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>(SAMPLE_DRIVE_FILES);
  const [loadingDrive, setLoadingDrive] = useState(false);

  const [tone, setTone] = useState<'clinical' | 'concise' | 'balanced'>('balanced');
  const [detailLevel, setDetailLevel] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [includeRiskAssessment, setIncludeRiskAssessment] = useState(true);
  const [includeDiagnosis, setIncludeDiagnosis] = useState(true);
  const [includeTreatmentPlan, setIncludeTreatmentPlan] = useState(true);

  const [sessionSnapshot, setSessionSnapshot] = useState<string>('');
  const [preflightChecks, setPreflightChecks] = useState<PreflightCheck[]>([]);
  const [riskAssessmentStatus, setRiskAssessmentStatus] = useState<{ status: 'complete' | 'partial' | 'missing'; missing: string[] }>({ status: 'missing', missing: [] });
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState<DiagnosisSuggestion[]>([]);
  const [contradictions, setContradictions] = useState<{ a: string; b: string; reason: string }[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([]);

  const [generating, setGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState('');
  const [noteVersions, setNoteVersions] = useState<NoteVersion[]>([]);

  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateSections, setNewTemplateSections] = useState<TemplateSection[]>([{ name: '', required: true, guidance: '' }]);
  const [newTemplatePrompt, setNewTemplatePrompt] = useState('');

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copilotMode, setCopilotMode] = useState<'preflight' | 'questions'>('preflight');

  useEffect(() => {
    if (appointmentId) {
      setLoading(false);
      const patient = SAMPLE_PATIENTS[0];
      setLinkedPatient(patient);
      setAppointment({
        id: appointmentId,
        patientName: patient.name,
        mrn: patient.mrn,
        dob: patient.dob,
        dateOfService: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        appointmentType: 'Follow-up',
        notes: 'Patient reports improved sleep patterns. Continue current medication regimen.',
      });
    } else {
      setLoading(false);
    }
  }, [appointmentId]);

  const currentTemplate = useMemo(() => templates.find(t => t.id === selectedTemplate), [templates, selectedTemplate]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return SAMPLE_PATIENTS;
    const search = patientSearch.toLowerCase();
    return SAMPLE_PATIENTS.filter(p => 
      p.name.toLowerCase().includes(search) || 
      p.mrn?.toLowerCase().includes(search)
    );
  }, [patientSearch]);

  useEffect(() => {
    if (currentTemplate) {
      setTone(currentTemplate.defaults.tone);
      setDetailLevel(currentTemplate.defaults.detailLevel);
      setIncludeRiskAssessment(currentTemplate.defaults.includeRiskAssessment);
      setIncludeDiagnosis(currentTemplate.defaults.includeDiagnosis);
      setIncludeTreatmentPlan(currentTemplate.defaults.includeTreatmentPlan);
    }
  }, [currentTemplate]);

  function selectPatient(patient: Patient) {
    setLinkedPatient(patient);
    setAppointment({
      id: `manual-${patient.id}`,
      patientName: patient.name,
      mrn: patient.mrn,
      dob: patient.dob,
      dateOfService: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      appointmentType: 'Session',
      notes: '',
    });
    setShowPatientPicker(false);
    setPatientSearch('');
  }

  function unlinkPatient() {
    setLinkedPatient(null);
    setAppointment(null);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles: UploadedFile[] = Array.from(files).map((file, idx) => ({
      id: `file-${Date.now()}-${idx}`,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'queued' as const,
      source: 'local' as const,
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

  function importFromDrive(file: DriveFile) {
    const newFile: UploadedFile = {
      id: `gdrive-${file.id}`,
      name: file.name,
      type: file.mimeType,
      size: 0,
      status: 'queued',
      source: 'gdrive',
    };

    setUploadedFiles(prev => [...prev, newFile]);
    setShowDrivePicker(false);

    setTimeout(() => {
      setUploadedFiles(prev => prev.map(f => f.id === newFile.id ? { ...f, status: 'processing' } : f));
    }, 500);

    setTimeout(() => {
      const isAudioVideo = file.mimeType.startsWith('audio/') || file.mimeType.startsWith('video/');
      setUploadedFiles(prev => prev.map(f => f.id === newFile.id ? {
        ...f,
        status: 'ready',
        content: isAudioVideo ? undefined : `[Extracted text from Google Drive: ${file.name}]`,
        transcript: isAudioVideo ? `[Transcribed content from Google Drive: ${file.name}]` : undefined,
      } : f));
    }, 2500);
  }

  function removeFile(id: string) {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  }

  function updateQuestionAnswer(id: string, answer: string) {
    setFollowUpQuestions(prev => prev.map(q => q.id === id ? { ...q, answer } : q));
  }

  function addNewSection() {
    setNewTemplateSections(prev => [...prev, { name: '', required: false, guidance: '' }]);
  }

  function updateSection(index: number, field: keyof TemplateSection, value: any) {
    setNewTemplateSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  function removeSection(index: number) {
    if (newTemplateSections.length > 1) {
      setNewTemplateSections(prev => prev.filter((_, i) => i !== index));
    }
  }

  function saveNewTemplate() {
    if (!newTemplateName.trim() || newTemplateSections.every(s => !s.name.trim())) return;

    const newTemplate: Template = {
      id: `custom-${Date.now()}`,
      name: newTemplateName,
      description: newTemplateDescription || 'Custom template',
      sections: newTemplateSections.filter(s => s.name.trim()),
      defaults: { tone: 'balanced', detailLevel: 'standard', includeRiskAssessment: true, includeDiagnosis: true, includeTreatmentPlan: true },
      systemPrompt: newTemplatePrompt || 'Generate a clinical note following the template structure.',
      isCustom: true,
    };

    setTemplates(prev => [...prev, newTemplate]);
    setSelectedTemplate(newTemplate.id);
    setShowNewTemplateForm(false);
    setNewTemplateName('');
    setNewTemplateDescription('');
    setNewTemplateSections([{ name: '', required: true, guidance: '' }]);
    setNewTemplatePrompt('');
  }

  function deleteTemplate(id: string) {
    const template = templates.find(t => t.id === id);
    if (!template?.isCustom) return;
    
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedTemplate === id) {
      setSelectedTemplate(DEFAULT_TEMPLATES[0].id);
    }
  }

  async function runCopilot() {
    if (!currentTemplate) return;
    
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1500));

    setSessionSnapshot(`**Presenting Concerns:** Patient reports improved sleep patterns, ongoing anxiety management.

**Key Symptoms:** Anxiety (duration: ongoing, severity: moderate-improving)

**Functioning:** Work functioning maintained, relationships stable

**Medications:** Current medication regimen continued (adherence: good)

**Risk Signals:** No current SI/HI reported`);

    const checks: PreflightCheck[] = currentTemplate.sections.map(section => {
      if (section.name.toLowerCase().includes('diagnosis') && !includeDiagnosis) {
        return { section: section.name, status: 'complete' as const };
      }
      if (section.name.toLowerCase().includes('treatment') && !includeTreatmentPlan) {
        return { section: section.name, status: 'complete' as const };
      }
      if (typedNotes.length > 20) {
        return { section: section.name, status: 'complete' as const };
      }
      return {
        section: section.name,
        status: section.required ? 'partial' as const : 'missing' as const,
        missing: `${section.guidance || 'Additional details needed'}`,
      };
    });
    setPreflightChecks(checks);

    if (includeRiskAssessment) {
      setRiskAssessmentStatus({
        status: 'partial',
        missing: ['Safety plan details', 'Protective factors enumeration'],
      });
    }

    if (includeDiagnosis) {
      setDiagnosisSuggestions([
        { name: 'Generalized Anxiety Disorder', code: 'F41.1', rationale: 'Persistent worry, sleep disturbance, improving with treatment', confidence: 'high' },
        { name: 'Adjustment Disorder with Anxiety', code: 'F43.22', rationale: 'Consider if symptoms are situational', confidence: 'low' },
      ]);
    }

    setContradictions([]);

    const questions: FollowUpQuestion[] = [
      {
        id: 'q1',
        question: 'What specific interventions were used in this session?',
        reason: 'Needed for Response/Plan section documentation',
        targetSection: currentTemplate.sections.find(s => s.name.toLowerCase().includes('response') || s.name.toLowerCase().includes('plan'))?.name || 'Plan',
        priority: 'high',
        answer: '',
      },
      {
        id: 'q2',
        question: 'Were any medication changes discussed?',
        reason: 'Critical for treatment continuity documentation',
        targetSection: 'Plan',
        priority: 'medium',
        answer: '',
      },
      {
        id: 'q3',
        question: 'What is the follow-up interval?',
        reason: 'Required for plan section',
        targetSection: 'Plan',
        priority: 'medium',
        answer: '',
      },
    ];
    setFollowUpQuestions(questions);

    setGenerating(false);
  }

  async function generateNote() {
    if (!currentTemplate) return;
    
    setGenerating(true);
    await new Promise(r => setTimeout(r, 2000));

    const dos = appointment?.dateOfService || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const templateName = currentTemplate.name.toUpperCase();
    const patientName = linkedPatient?.name || appointment?.patientName || '[CLIENT NAME]';
    const mrn = linkedPatient?.mrn || appointment?.mrn || '[NOT REPORTED]';
    const dob = linkedPatient?.dob || appointment?.dob || '[NOT REPORTED]';

    const letterhead = `                                                                                         ${templateName}
                                                    —-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

                                                            Patient Name: ${patientName}          MRN: ${mrn}
                                                            Date of Birth: ${dob} Date of Service: ${dos}
                                                                                           Provider: Douglas Zelisko, M.D.


`;

    const footer = `


    45 S Main St, Suite 111 West Hartford, CT 06107                                         F: 860.318.2085                                     P: 860.615.3629                                      support@drzelisko.com`;

    let content = letterhead;

    currentTemplate.sections.forEach(section => {
      const answersForSection = followUpQuestions
        .filter(q => q.targetSection === section.name && q.answer)
        .map(q => q.answer)
        .join(' ');

      content += `## ${section.name}\n`;
      
      if (section.name.toLowerCase().includes('diagnosis') && includeDiagnosis) {
        content += `Based on clinical evaluation and reported symptoms:

**Primary Diagnosis:** Generalized Anxiety Disorder (F41.1)
- **Confidence Level:** Likely
- **Supporting Evidence:** Persistent worry, difficulty controlling worry, sleep disturbance
- **Duration:** > 6 months
- **Functional Impairment:** Moderate - improving with treatment

`;
      } else if (section.name.toLowerCase().includes('risk') && includeRiskAssessment) {
        content += `**Suicidal Ideation:** Denied
**Homicidal Ideation:** Denied  
**Self-Harm:** No current or recent history
**Risk Level:** Low
**Protective Factors:** Engaged in treatment, social support, future-oriented
**Safety Plan:** Patient aware of crisis resources

`;
      } else if ((section.name.toLowerCase().includes('treatment') || section.name.toLowerCase().includes('plan')) && includeTreatmentPlan) {
        content += `**Modality:** Individual psychotherapy
**Frequency:** Every 4 weeks
**Goals:**
1. Maintain anxiety symptom improvement
2. Continue sleep hygiene practices
3. Build additional coping strategies

**Interventions:** CBT techniques, medication management
**Follow-up:** 4 weeks
${answersForSection ? `\n**Additional Notes:** ${answersForSection}` : ''}

`;
      } else if (section.name === 'Data') {
        content += `Patient presented for ${appointment?.appointmentType || 'session'}. ${typedNotes || appointment?.notes || 'Session conducted as scheduled.'}
${answersForSection ? `\n${answersForSection}` : ''}

`;
      } else if (section.name === 'Assessment') {
        content += `Patient demonstrates continued engagement in treatment with reported improvement in sleep patterns. Current medication regimen appears effective. Anxiety symptoms are being managed appropriately.
${answersForSection ? `\n${answersForSection}` : ''}

`;
      } else if (section.name === 'Response') {
        content += `Patient engaged appropriately in session. Demonstrated insight into symptoms and motivation for continued treatment. Reports satisfaction with current treatment approach.
${answersForSection ? `\n${answersForSection}` : ''}

`;
      } else {
        content += `${typedNotes || '[Documentation based on clinical session]'}
${answersForSection ? `\n${answersForSection}` : ''}

`;
      }
    });

    content += footer;

    const version: NoteVersion = {
      id: `v-${Date.now()}`,
      timestamp: new Date(),
      content,
      template: currentTemplate.name,
    };

    setNoteVersions(prev => [version, ...prev]);
    setGeneratedNote(content);
    setGenerating(false);
  }

  async function saveNote(status: 'draft' | 'final') {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    alert(`Note saved as ${status}!`);
  }

  async function exportToPDF() {
    if (!linkedPatient && !appointment) {
      alert('Please link a patient first to save to their folder.');
      return;
    }

    setExporting(true);
    await new Promise(r => setTimeout(r, 1500));
    setExporting(false);

    const patientName = linkedPatient?.name || appointment?.patientName || 'Unknown';
    const dateStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const folderPath = `/PatientForms/${patientName.replace(/\s+/g, '_')}`;
    const fileName = `${dateStr}_${currentTemplate?.name.replace(/\s+/g, '_')}.pdf`;
    
    alert(`Note exported to Google Drive:\n${folderPath}/${fileName}`);
  }

  if (loading) {
    return (
      <div className="container py-12 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
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

            {/* Patient Info / Link Patient */}
            {linkedPatient || appointment ? (
              <div className="flex flex-wrap gap-4 text-sm text-gray-400 bg-white/5 rounded-lg p-3">
                <span><strong className="text-white">{linkedPatient?.name || appointment?.patientName}</strong></span>
                <span>MRN: {linkedPatient?.mrn || appointment?.mrn || 'N/A'}</span>
                <span>DOB: {linkedPatient?.dob || appointment?.dob}</span>
                <span>DOS: {appointment?.dateOfService}</span>
                {appointment?.appointmentType && <span>{appointment.appointmentType}</span>}
                <button
                  onClick={unlinkPatient}
                  className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">link_off</span>
                  Unlink
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowPatientPicker(true)}
                  className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-white/40 rounded-lg text-gray-400 hover:text-white transition w-full"
                >
                  <span className="material-symbols-outlined">person_add</span>
                  <span>Link to Patient</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowTemplateSettings(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <span className="material-symbols-outlined">settings</span>
            Template Settings
          </button>
        </header>

        {/* Patient Picker Dropdown */}
        {showPatientPicker && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-32" onClick={() => setShowPatientPicker(false)}>
            <div className="bg-[#1a1d24] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-white/10">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">search</span>
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search by name or MRN..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredPatients.map(patient => (
                  <button
                    key={patient.id}
                    onClick={() => selectPatient(patient)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">{patient.name}</div>
                      <div className="text-xs text-gray-500">{patient.mrn} • DOB: {patient.dob}</div>
                    </div>
                  </button>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No patients found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Controls + Inputs */}
          <div className="lg:col-span-3 space-y-4">
            {/* Template Picker (Single Source of Truth) */}
            <div className="card">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">description</span>
                Template
              </h3>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.isCustom ? ' (Custom)' : ''}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">{currentTemplate?.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {currentTemplate?.sections.map(s => (
                  <span
                    key={s.name}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${s.required ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-gray-400'}`}
                  >
                    {s.name}{s.required ? '*' : ''}
                  </span>
                ))}
              </div>
            </div>

            {/* Input Sources */}
            <div className="card">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">edit_note</span>
                Session Inputs
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Typed Notes</label>
                  <textarea
                    value={typedNotes}
                    onChange={(e) => setTypedNotes(e.target.value)}
                    placeholder="Key points, session summary, observations..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[100px] resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Clinician Overrides</label>
                  <textarea
                    value={clinicianOverrides}
                    onChange={(e) => setClinicianOverrides(e.target.value)}
                    placeholder="Special instructions for note generation..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[60px] resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Uploads</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".mp3,.wav,.m4a,.mp4,.mov,.pdf,.docx,.txt,.rtf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 border border-dashed border-white/20 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/40 transition flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">cloud_upload</span>
                      Local
                    </button>
                    <button
                      onClick={() => setShowDrivePicker(true)}
                      className="flex-1 py-2 border border-dashed border-white/20 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/40 transition flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">add_to_drive</span>
                      Drive
                    </button>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {uploadedFiles.map(f => (
                        <div key={f.id} className="flex items-center gap-2 text-xs bg-white/5 rounded px-2 py-1">
                          <span className={`w-2 h-2 rounded-full ${
                            f.status === 'ready' ? 'bg-green-500' :
                            f.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                            f.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                          }`}></span>
                          {f.source === 'gdrive' && <span className="material-symbols-outlined text-xs text-blue-400">add_to_drive</span>}
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
                Settings
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Tone</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      <option value="clinical">Clinical</option>
                      <option value="concise">Concise</option>
                      <option value="balanced">Balanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Detail</label>
                    <select
                      value={detailLevel}
                      onChange={(e) => setDetailLevel(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      <option value="brief">Brief</option>
                      <option value="standard">Standard</option>
                      <option value="detailed">Detailed</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeRiskAssessment} onChange={(e) => setIncludeRiskAssessment(e.target.checked)} className="rounded border-gray-600 text-blue-500 w-3.5 h-3.5" />
                    <span className="text-xs text-gray-300">Include Risk Assessment</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeDiagnosis} onChange={(e) => setIncludeDiagnosis(e.target.checked)} className="rounded border-gray-600 text-blue-500 w-3.5 h-3.5" />
                    <span className="text-xs text-gray-300">Include Diagnosis & Codes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeTreatmentPlan} onChange={(e) => setIncludeTreatmentPlan(e.target.checked)} className="rounded border-gray-600 text-blue-500 w-3.5 h-3.5" />
                    <span className="text-xs text-gray-300">Include Treatment Plan</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={runCopilot}
                disabled={generating}
                className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 disabled:opacity-50 text-white rounded-lg font-medium transition shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Analyzing...</>
                ) : (
                  <><span className="material-symbols-outlined text-lg">psychology</span> Run Copilot</>
                )}
              </button>
              <button
                onClick={generateNote}
                disabled={generating || preflightChecks.length === 0}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-white rounded-lg font-medium transition shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Generating...</>
                ) : (
                  <><span className="material-symbols-outlined text-lg">auto_awesome</span> {generatedNote ? 'Regenerate Note' : 'Generate Note'}</>
                )}
              </button>
            </div>
          </div>

          {/* Middle Column: Copilot Panel */}
          <div className="lg:col-span-4 card min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">smart_toy</span>
                Clinical Copilot
              </h3>
              <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
                <button
                  onClick={() => setCopilotMode('preflight')}
                  className={`px-2 py-1 rounded text-xs transition ${copilotMode === 'preflight' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Pre-flight
                </button>
                <button
                  onClick={() => setCopilotMode('questions')}
                  className={`px-2 py-1 rounded text-xs transition ${copilotMode === 'questions' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Questions
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {preflightChecks.length === 0 && followUpQuestions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-center py-12">
                  <div>
                    <span className="material-symbols-outlined text-4xl mb-3">psychology</span>
                    <p className="text-sm">Click "Run Copilot" to analyze inputs and get pre-flight checks</p>
                  </div>
                </div>
              ) : copilotMode === 'preflight' ? (
                <>
                  {/* Session Snapshot */}
                  {sessionSnapshot && (
                    <div className="p-3 bg-white/5 rounded-lg">
                      <h4 className="text-xs font-medium text-gray-400 mb-2">Session Snapshot</h4>
                      <div className="text-xs text-gray-300 whitespace-pre-wrap">{sessionSnapshot}</div>
                    </div>
                  )}

                  {/* Section Completeness */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-2">Required Elements</h4>
                    <div className="space-y-1">
                      {preflightChecks.map((check, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
                          <span className={`material-symbols-outlined text-sm mt-0.5 ${
                            check.status === 'complete' ? 'text-green-400' :
                            check.status === 'partial' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {check.status === 'complete' ? 'check_circle' : check.status === 'partial' ? 'warning' : 'error'}
                          </span>
                          <div className="flex-1">
                            <span className="text-xs text-white">{check.section}</span>
                            {check.missing && (
                              <p className="text-[10px] text-gray-500 mt-0.5">{check.missing}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Assessment */}
                  {includeRiskAssessment && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-2">Risk Assessment</h4>
                      <div className={`p-2 rounded-lg ${
                        riskAssessmentStatus.status === 'complete' ? 'bg-green-500/10 border border-green-500/30' :
                        riskAssessmentStatus.status === 'partial' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                        'bg-red-500/10 border border-red-500/30'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`material-symbols-outlined text-sm ${
                            riskAssessmentStatus.status === 'complete' ? 'text-green-400' :
                            riskAssessmentStatus.status === 'partial' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {riskAssessmentStatus.status === 'complete' ? 'verified' : 'warning'}
                          </span>
                          <span className="text-xs text-white capitalize">{riskAssessmentStatus.status}</span>
                        </div>
                        {riskAssessmentStatus.missing.length > 0 && (
                          <ul className="text-[10px] text-gray-400 ml-6 list-disc">
                            {riskAssessmentStatus.missing.map((m, i) => <li key={i}>{m}</li>)}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Diagnosis Suggestions */}
                  {includeDiagnosis && diagnosisSuggestions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-2">Dx-Code Suggestions</h4>
                      <div className="space-y-1">
                        {diagnosisSuggestions.map((dx, i) => (
                          <div key={i} className="p-2 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white font-medium">{dx.name}</span>
                              {dx.code && <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">{dx.code}</span>}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                dx.confidence === 'high' ? 'bg-green-500/20 text-green-300' :
                                dx.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-gray-500/20 text-gray-300'
                              }`}>{dx.confidence}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">{dx.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contradictions */}
                  {contradictions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-red-400 mb-2">Contradictions Detected</h4>
                      {contradictions.map((c, i) => (
                        <div key={i} className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-xs text-gray-300">"{c.a}" vs "{c.b}"</p>
                          <p className="text-[10px] text-gray-500 mt-1">{c.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Follow-up Questions with Answer Fields */}
                  <div className="space-y-3">
                    {followUpQuestions.map((q) => (
                      <div key={q.id} className={`p-3 rounded-lg border ${
                        q.priority === 'high' ? 'bg-red-500/5 border-red-500/30' :
                        q.priority === 'medium' ? 'bg-yellow-500/5 border-yellow-500/30' :
                        'bg-white/5 border-white/10'
                      }`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded mr-2 ${
                              q.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                              q.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>{q.priority}</span>
                            <span className="text-[10px] text-gray-500">{q.targetSection}</span>
                          </div>
                        </div>
                        <p className="text-sm text-white mb-1">{q.question}</p>
                        <p className="text-[10px] text-gray-500 mb-2">{q.reason}</p>
                        <textarea
                          value={q.answer}
                          onChange={(e) => updateQuestionAnswer(q.id, e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white resize-none min-h-[50px]"
                        />
                      </div>
                    ))}
                  </div>
                </>
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
                  <span className="text-xs text-gray-500">{noteVersions.length} version{noteVersions.length > 1 ? 's' : ''}</span>
                  <button className="text-xs text-blue-400 hover:text-blue-300">View History</button>
                </div>
              )}
            </div>

            {!generatedNote ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <span className="material-symbols-outlined text-5xl mb-3">edit_note</span>
                  <p className="text-sm">Run Copilot first, then Generate Note</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto mb-4">
                  <textarea
                    value={generatedNote}
                    onChange={(e) => setGeneratedNote(e.target.value)}
                    className="w-full h-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-xs text-gray-200 resize-none font-mono leading-relaxed"
                    style={{ minHeight: '400px' }}
                  />
                </div>

                {/* Section Tools */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-gray-400 hover:text-white hover:bg-white/10 transition">Shorten</button>
                  <button className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-gray-400 hover:text-white hover:bg-white/10 transition">Expand</button>
                  <button className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-gray-400 hover:text-white hover:bg-white/10 transition">More Clinical</button>
                  <button className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-gray-400 hover:text-white hover:bg-white/10 transition">More Concise</button>
                </div>

                {/* Save/Export Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => saveNote('draft')}
                    disabled={saving}
                    className="py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 hover:bg-white/10 transition flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">save</span> Save Draft
                  </button>
                  <button
                    onClick={() => saveNote('final')}
                    disabled={saving}
                    className="py-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 rounded-lg text-xs text-white font-medium transition flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">check_circle</span> Save Final
                  </button>
                </div>
                <button
                  onClick={exportToPDF}
                  disabled={exporting || (!linkedPatient && !appointment)}
                  className="w-full mt-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 rounded-lg text-xs text-white font-medium transition flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Exporting...</>
                  ) : (
                    <><span className="material-symbols-outlined text-base">add_to_drive</span> Save to Patient Folder</>
                  )}
                </button>
                {!linkedPatient && !appointment && (
                  <p className="text-[10px] text-gray-500 text-center mt-1">Link a patient to save to their folder</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Google Drive Picker Modal */}
      {showDrivePicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDrivePicker(false)}>
          <div className="bg-[#1a1d24] border border-white/10 rounded-xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">add_to_drive</span>
                Import from Google Drive
              </h3>
              <button onClick={() => setShowDrivePicker(false)} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {driveFiles.map(file => (
                  <button
                    key={file.id}
                    onClick={() => importFromDrive(file)}
                    className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-lg flex items-center gap-3 transition text-left"
                  >
                    <span className="material-symbols-outlined text-gray-400">
                      {file.mimeType.startsWith('audio/') ? 'audio_file' :
                       file.mimeType.startsWith('video/') ? 'video_file' :
                       file.mimeType.includes('pdf') ? 'picture_as_pdf' : 'description'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{file.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(file.modifiedTime).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-blue-400">download</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Settings Modal */}
      {showTemplateSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowTemplateSettings(false); setShowNewTemplateForm(false); }}>
          <div className="bg-[#1a1d24] border border-white/10 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">
                {showNewTemplateForm ? 'Create New Template' : 'Template Settings'}
              </h3>
              <button onClick={() => { setShowTemplateSettings(false); setShowNewTemplateForm(false); }} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {showNewTemplateForm ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Template Name *</label>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g., Medication Review"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Description</label>
                    <input
                      type="text"
                      value={newTemplateDescription}
                      onChange={(e) => setNewTemplateDescription(e.target.value)}
                      placeholder="Brief description of when to use this template"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-gray-400">Sections *</label>
                      <button
                        onClick={addNewSection}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add Section
                      </button>
                    </div>
                    <div className="space-y-2">
                      {newTemplateSections.map((section, index) => (
                        <div key={index} className="flex gap-2 items-start bg-white/5 rounded-lg p-2">
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={section.name}
                              onChange={(e) => updateSection(index, 'name', e.target.value)}
                              placeholder="Section name"
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                            />
                            <input
                              type="text"
                              value={section.guidance || ''}
                              onChange={(e) => updateSection(index, 'guidance', e.target.value)}
                              placeholder="Guidance (optional)"
                              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                            />
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={section.required}
                                onChange={(e) => updateSection(index, 'required', e.target.checked)}
                                className="rounded border-gray-600 text-blue-500 w-3.5 h-3.5"
                              />
                              <span className="text-xs text-gray-400">Required</span>
                            </label>
                          </div>
                          {newTemplateSections.length > 1 && (
                            <button
                              onClick={() => removeSection(index)}
                              className="text-gray-500 hover:text-red-400 p-1"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">System Prompt (optional)</label>
                    <textarea
                      value={newTemplatePrompt}
                      onChange={(e) => setNewTemplatePrompt(e.target.value)}
                      placeholder="Custom instructions for AI note generation..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map(t => (
                    <div
                      key={t.id}
                      className={`p-3 rounded-lg border transition ${
                        selectedTemplate === t.id ? 'bg-blue-500/10 border-blue-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <button
                          className="flex-1 text-left"
                          onClick={() => setSelectedTemplate(t.id)}
                        >
                          <h4 className="text-sm font-medium text-white flex items-center gap-2">
                            {t.name}
                            {t.isCustom && <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">Custom</span>}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.sections.map(s => (
                              <span key={s.name} className={`text-[10px] px-1.5 py-0.5 rounded ${s.required ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-gray-400'}`}>
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          {selectedTemplate === t.id && (
                            <span className="material-symbols-outlined text-blue-400">check_circle</span>
                          )}
                          {t.isCustom && (
                            <button
                              onClick={() => deleteTemplate(t.id)}
                              className="text-gray-500 hover:text-red-400 p-1"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 flex gap-3">
              {showNewTemplateForm ? (
                <>
                  <button
                    onClick={() => setShowNewTemplateForm(false)}
                    className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveNewTemplate}
                    disabled={!newTemplateName.trim() || newTemplateSections.every(s => !s.name.trim())}
                    className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
                  >
                    Save Template
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowNewTemplateForm(true)}
                    className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    New Template
                  </button>
                  <button
                    onClick={() => setShowTemplateSettings(false)}
                    className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white rounded-lg font-medium transition"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
