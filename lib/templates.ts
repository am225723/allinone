/**
 * Message Templates Service
 * Manages saved response templates for quick replies
 */
import { supabaseServer } from './supabase';

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

const DEFAULT_CATEGORIES: TemplateCategory[] = [
  { id: 'greeting', name: 'Greetings', description: 'Welcome and hello messages', color: '#10B981' },
  { id: 'appointment', name: 'Appointments', description: 'Scheduling and booking', color: '#3B82F6' },
  { id: 'followup', name: 'Follow-ups', description: 'Follow-up and check-in messages', color: '#8B5CF6' },
  { id: 'info', name: 'Information', description: 'General information responses', color: '#F59E0B' },
  { id: 'closing', name: 'Closing', description: 'Thank you and goodbye messages', color: '#EF4444' },
  { id: 'custom', name: 'Custom', description: 'User-created templates', color: '#6B7280' },
];

const DEFAULT_TEMPLATES: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Quick Acknowledgment',
    content: 'Thank you for reaching out! I received your message and will get back to you shortly.',
    category: 'greeting',
    variables: [],
    is_default: true,
    usage_count: 0,
  },
  {
    name: 'Appointment Confirmation',
    content: 'Your appointment is confirmed for {{date}} at {{time}}. Please let me know if you need to reschedule.',
    category: 'appointment',
    variables: ['date', 'time'],
    is_default: true,
    usage_count: 0,
  },
  {
    name: 'Appointment Request',
    content: 'I would be happy to schedule an appointment. What days and times work best for you this week?',
    category: 'appointment',
    variables: [],
    is_default: true,
    usage_count: 0,
  },
  {
    name: 'Follow-up Check',
    content: 'Hi {{name}}, I wanted to follow up on our previous conversation. Is there anything else I can help you with?',
    category: 'followup',
    variables: ['name'],
    is_default: true,
    usage_count: 0,
  },
  {
    name: 'More Information Needed',
    content: 'Thank you for your message. To better assist you, could you please provide more details about {{topic}}?',
    category: 'info',
    variables: ['topic'],
    is_default: true,
    usage_count: 0,
  },
  {
    name: 'Office Hours',
    content: 'Our office hours are Monday-Friday, 9 AM to 5 PM. Feel free to reach out during these times for immediate assistance.',
    category: 'info',
    variables: [],
    is_default: true,
    usage_count: 0,
  },
  {
    name: 'Thank You',
    content: 'Thank you for your time today. Please don\'t hesitate to reach out if you have any questions.',
    category: 'closing',
    variables: [],
    is_default: true,
    usage_count: 0,
  },
];

export async function getTemplates(category?: string): Promise<MessageTemplate[]> {
  let query = supabaseServer
    .from('message_templates')
    .select('*')
    .order('usage_count', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }

  return data || [];
}

export async function getTemplate(id: string): Promise<MessageTemplate | null> {
  const { data, error } = await supabaseServer
    .from('message_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching template:', error);
    return null;
  }

  return data;
}

export async function createTemplate(template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<MessageTemplate | null> {
  const variables = extractVariables(template.content);

  const { data, error } = await supabaseServer
    .from('message_templates')
    .insert({
      ...template,
      variables,
      usage_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating template:', error);
    return null;
  }

  return data;
}

export async function updateTemplate(id: string, updates: Partial<MessageTemplate>): Promise<MessageTemplate | null> {
  const updateData: any = { ...updates, updated_at: new Date().toISOString() };
  
  if (updates.content) {
    updateData.variables = extractVariables(updates.content);
  }

  const { data, error } = await supabaseServer
    .from('message_templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating template:', error);
    return null;
  }

  return data;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const { error } = await supabaseServer
    .from('message_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting template:', error);
    return false;
  }

  return true;
}

export async function useTemplate(id: string, variables?: Record<string, string>): Promise<string | null> {
  const template = await getTemplate(id);
  if (!template) return null;

  await supabaseServer
    .from('message_templates')
    .update({ usage_count: template.usage_count + 1 })
    .eq('id', id);

  let content = template.content;
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
  }

  return content;
}

export function extractVariables(content: string): string[] {
  const matches = content.match(/{{(\w+)}}/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
}

export function fillTemplate(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

export function getCategories(): TemplateCategory[] {
  return DEFAULT_CATEGORIES;
}

export async function initializeDefaultTemplates(): Promise<number> {
  const existing = await getTemplates();
  if (existing.length > 0) return 0;

  let created = 0;
  for (const template of DEFAULT_TEMPLATES) {
    const result = await createTemplate(template);
    if (result) created++;
  }

  return created;
}
