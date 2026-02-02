-- Clinical Notes Tables
-- Migration: 006_clinical_notes.sql

-- Note Templates table
CREATE TABLE IF NOT EXISTS note_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Medical',
    sections JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Prompts table for note generation
CREATE TABLE IF NOT EXISTS note_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'Medical',
    created_by UUID REFERENCES comm_users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical Notes table
CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id TEXT,
    patient_name TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    template_id UUID REFERENCES note_templates(id),
    template_name TEXT,
    content JSONB DEFAULT '{}',
    generated_content TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'completed', 'archived')),
    pdf_url TEXT,
    drive_folder_id TEXT,
    created_by UUID REFERENCES comm_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note attachments table for uploaded documents
CREATE TABLE IF NOT EXISTS note_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES clinical_notes(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    file_url TEXT,
    drive_file_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO note_templates (name, description, category, sections) VALUES
('SOAP Note', 'Standard medical documentation format', 'Medical', '["Subjective", "Objective", "Assessment", "Plan"]'),
('Progress Note', 'Follow-up visit documentation', 'Medical', '["Chief Complaint", "History", "Examination", "Diagnosis", "Treatment"]'),
('Initial Assessment', 'First visit comprehensive evaluation', 'Medical', '["Patient History", "Medical History", "Social History", "Review of Systems", "Physical Exam", "Assessment", "Plan"]'),
('Discharge Summary', 'Patient discharge documentation', 'Medical', '["Admission Summary", "Hospital Course", "Discharge Diagnosis", "Discharge Medications", "Follow-up Instructions"]'),
('Therapy Note', 'Mental health session notes', 'Mental Health', '["Session Summary", "Patient Presentation", "Interventions", "Progress", "Next Steps"]')
ON CONFLICT DO NOTHING;

-- Insert default prompts
INSERT INTO note_prompts (name, description, content, category) VALUES
('SOAP Structure', 'Standard SOAP note generation prompt', 'Generate a comprehensive SOAP note based on the provided information. Structure the note with clear sections for Subjective, Objective, Assessment, and Plan. Use professional medical terminology.', 'Medical'),
('Therapy Session', 'Mental health session notes', 'Generate therapy session notes including patient presentation, therapeutic interventions used, progress observations, and recommendations for follow-up.', 'Mental Health')
ON CONFLICT DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_status ON clinical_notes(status);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_date ON clinical_notes(appointment_date);
CREATE INDEX IF NOT EXISTS idx_note_attachments_note ON note_attachments(note_id);
