import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient && supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

type FunctionName =
  | 'stats'
  | 'search'
  | 'notifications'
  | 'bulk-actions'
  | 'ai-analyze'
  | 'openphone-summaries'
  | 'openphone-drafts'
  | 'openphone-approve'
  | 'openphone-reject'
  | 'openphone-run'
  | 'openphone-runs'
  | 'openphone-send-approved'
  | 'openphone-settings'
  | 'gmail-activity'
  | 'gmail-triage'
  | 'gmail-accounts'
  | 'gmail-settings'
  | 'gmail-rules'
  | 'notes'
  | 'notes-generate'
  | 'notes-templates'
  | 'notes-prompts'
  | 'tasks'
  | 'tasks-ai'
  | 'patient-stats'
  | 'templates'
  | 'export'
  | 'admin-users'
  | 'push-register'
  | 'push-send'
  | 'cron-daily-summary'
  | 'cron-openphone-cleanup';

interface InvokeOptions {
  body?: Record<string, any>;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
}

export async function invokeFunction<T = any>(
  functionName: FunctionName,
  options: InvokeOptions = {}
): Promise<{ data: T | null; error: Error | null }> {
  const client = getSupabaseClient();
  
  if (!client) {
    console.warn('Supabase client not configured, falling back to API route');
    return fallbackToApiRoute<T>(functionName, options);
  }

  try {
    const { data, error } = await client.functions.invoke(functionName, {
      body: options.body,
      headers: options.headers,
      method: options.method,
    });

    if (error) {
      throw error;
    }

    return { data: data as T, error: null };
  } catch (err) {
    console.warn(`Edge function ${functionName} failed, falling back to API route:`, err);
    return fallbackToApiRoute<T>(functionName, options);
  }
}

async function fallbackToApiRoute<T>(
  functionName: FunctionName,
  options: InvokeOptions
): Promise<{ data: T | null; error: Error | null }> {
  const apiPath = functionNameToApiPath(functionName);
  
  try {
    const fetchOptions: RequestInit = {
      method: options.method || (options.body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (options.body && fetchOptions.method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(apiPath, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

function functionNameToApiPath(functionName: FunctionName): string {
  const mappings: Record<FunctionName, string> = {
    'stats': '/api/stats',
    'search': '/api/search',
    'notifications': '/api/notifications',
    'bulk-actions': '/api/bulk-actions',
    'ai-analyze': '/api/ai/analyze',
    'openphone-summaries': '/api/openphone/summaries',
    'openphone-drafts': '/api/openphone/drafts',
    'openphone-approve': '/api/openphone/approve',
    'openphone-reject': '/api/openphone/reject',
    'openphone-run': '/api/openphone/run',
    'openphone-runs': '/api/openphone/runs',
    'openphone-send-approved': '/api/openphone/send-approved',
    'openphone-settings': '/api/openphone/settings',
    'gmail-activity': '/api/gmail/activity',
    'gmail-triage': '/api/gmail/triage',
    'gmail-accounts': '/api/gmail/accounts',
    'gmail-settings': '/api/gmail/settings',
    'gmail-rules': '/api/gmail/rules',
    'notes': '/api/notes',
    'notes-generate': '/api/notes/generate',
    'notes-templates': '/api/notes/templates',
    'notes-prompts': '/api/notes/prompts',
    'tasks': '/api/tasks',
    'tasks-ai': '/api/tasks/ai',
    'patient-stats': '/api/patient-stats',
    'templates': '/api/templates',
    'export': '/api/export',
    'admin-users': '/api/admin/users',
    'push-register': '/api/push/register',
    'push-send': '/api/push/send',
    'cron-daily-summary': '/api/cron/daily-summary',
    'cron-openphone-cleanup': '/api/cron/openphone-cleanup',
  };

  return mappings[functionName] || `/api/${functionName.replace(/-/g, '/')}`;
}

export const supabaseFunctions = {
  stats: {
    get: (params?: { type?: string; limit?: number; days?: number }) =>
      invokeFunction('stats', { body: params, method: 'GET' }),
  },
  
  search: {
    query: (params: { q: string; type?: string; limit?: number }) =>
      invokeFunction('search', { body: params }),
  },
  
  notifications: {
    list: (params?: { limit?: number; type?: string }) =>
      invokeFunction('notifications', { body: params, method: 'GET' }),
    markRead: (ids: string[]) =>
      invokeFunction('notifications', { body: { ids, action: 'markRead' }, method: 'PATCH' }),
  },
  
  notes: {
    list: (params?: { status?: string; limit?: number; offset?: number }) =>
      invokeFunction('notes', { body: params, method: 'GET' }),
    get: (id: string) =>
      invokeFunction('notes', { body: { id }, method: 'GET' }),
    create: (data: { patient_name: string; patient_id?: string; template_id?: string; content: string; status?: string }) =>
      invokeFunction('notes', { body: data, method: 'POST' }),
    update: (id: string, data: Record<string, any>) =>
      invokeFunction('notes', { body: { id, ...data }, method: 'PATCH' }),
    delete: (id: string) =>
      invokeFunction('notes', { body: { id }, method: 'DELETE' }),
    generate: (data: { template_id?: string; prompt_id?: string; patient_info?: Record<string, any>; additional_context?: string; uploaded_documents?: any[] }) =>
      invokeFunction('notes-generate', { body: data, method: 'POST' }),
  },
  
  noteTemplates: {
    list: () =>
      invokeFunction('notes-templates', { method: 'GET' }),
    get: (id: string) =>
      invokeFunction('notes-templates', { body: { id }, method: 'GET' }),
    create: (data: { name: string; description?: string; category?: string; structure: string }) =>
      invokeFunction('notes-templates', { body: data, method: 'POST' }),
    update: (id: string, data: Record<string, any>) =>
      invokeFunction('notes-templates', { body: { id, ...data }, method: 'PATCH' }),
    delete: (id: string) =>
      invokeFunction('notes-templates', { body: { id }, method: 'DELETE' }),
  },
  
  notePrompts: {
    list: () =>
      invokeFunction('notes-prompts', { method: 'GET' }),
    get: (id: string) =>
      invokeFunction('notes-prompts', { body: { id }, method: 'GET' }),
    create: (data: { name: string; description?: string; system_prompt: string; category?: string }) =>
      invokeFunction('notes-prompts', { body: data, method: 'POST' }),
    update: (id: string, data: Record<string, any>) =>
      invokeFunction('notes-prompts', { body: { id, ...data }, method: 'PATCH' }),
    delete: (id: string) =>
      invokeFunction('notes-prompts', { body: { id }, method: 'DELETE' }),
  },
  
  tasks: {
    list: (params?: { status?: string; priority?: string; assignee?: string; limit?: number; offset?: number }) =>
      invokeFunction('tasks', { body: params, method: 'GET' }),
    get: (id: string) =>
      invokeFunction('tasks', { body: { id }, method: 'GET' }),
    create: (data: { title: string; description?: string; status?: string; priority?: string; due_date?: string; assignee?: string; checklist?: any[]; tags?: string[] }) =>
      invokeFunction('tasks', { body: data, method: 'POST' }),
    update: (id: string, data: Record<string, any>) =>
      invokeFunction('tasks', { body: { id, ...data }, method: 'PATCH' }),
    delete: (id: string) =>
      invokeFunction('tasks', { body: { id }, method: 'DELETE' }),
    ai: {
      suggestSubtasks: (title: string, description?: string) =>
        invokeFunction('tasks-ai', { body: { action: 'suggest-subtasks', title, description }, method: 'POST' }),
      estimateTime: (title: string, description?: string) =>
        invokeFunction('tasks-ai', { body: { action: 'estimate-time', title, description }, method: 'POST' }),
      prioritize: () =>
        invokeFunction('tasks-ai', { body: { action: 'prioritize' }, method: 'POST' }),
      generateDescription: (title: string, context?: string) =>
        invokeFunction('tasks-ai', { body: { action: 'generate-description', title, context }, method: 'POST' }),
    },
  },
  
  patientStats: {
    get: () =>
      invokeFunction('patient-stats', { method: 'GET' }),
  },
  
  templates: {
    list: (params?: { category?: string }) =>
      invokeFunction('templates', { body: params, method: 'GET' }),
    get: (id: string) =>
      invokeFunction('templates', { body: { id }, method: 'GET' }),
    create: (data: { name: string; content: string; category?: string; variables?: string[] }) =>
      invokeFunction('templates', { body: data, method: 'POST' }),
    update: (id: string, data: Record<string, any>) =>
      invokeFunction('templates', { body: { id, ...data }, method: 'PATCH' }),
    delete: (id: string) =>
      invokeFunction('templates', { body: { id }, method: 'DELETE' }),
    incrementUsage: (id: string) =>
      invokeFunction('templates', { body: { id, increment_usage: true }, method: 'PATCH' }),
  },
  
  export: {
    get: (params: { type: string; format?: string; startDate?: string; endDate?: string }) =>
      invokeFunction('export', { body: params, method: 'GET' }),
  },
  
  adminUsers: {
    list: () =>
      invokeFunction('admin-users', { method: 'GET' }),
    create: (data: { name: string; pin: string; role?: string }) =>
      invokeFunction('admin-users', { body: data, method: 'POST' }),
    update: (id: string, data: Record<string, any>) =>
      invokeFunction('admin-users', { body: { id, ...data }, method: 'PATCH' }),
    delete: (id: string) =>
      invokeFunction('admin-users', { body: { id }, method: 'DELETE' }),
  },
  
  gmail: {
    accounts: {
      list: () =>
        invokeFunction('gmail-accounts', { method: 'GET' }),
      get: (id: string) =>
        invokeFunction('gmail-accounts', { body: { id }, method: 'GET' }),
      delete: (id: string) =>
        invokeFunction('gmail-accounts', { body: { id }, method: 'DELETE' }),
    },
    settings: {
      get: () =>
        invokeFunction('gmail-settings', { method: 'GET' }),
      update: (settings: Record<string, any>) =>
        invokeFunction('gmail-settings', { body: { settings }, method: 'POST' }),
    },
    rules: {
      list: (accountId?: string) =>
        invokeFunction('gmail-rules', { body: accountId ? { account_id: accountId } : undefined, method: 'GET' }),
      create: (data: { gmail_account_id: string; rule_type: string; pattern: string; is_enabled?: boolean }) =>
        invokeFunction('gmail-rules', { body: data, method: 'POST' }),
      update: (id: string, data: Record<string, any>) =>
        invokeFunction('gmail-rules', { body: { id, ...data }, method: 'PATCH' }),
      delete: (id: string) =>
        invokeFunction('gmail-rules', { body: { id }, method: 'DELETE' }),
    },
    activity: {
      list: (params?: { limit?: number }) =>
        invokeFunction('gmail-activity', { body: params, method: 'GET' }),
    },
    triage: (params?: { lookbackDays?: number }) =>
      invokeFunction('gmail-triage', { body: params, method: 'POST' }),
  },
  
  openphone: {
    summaries: {
      list: (params?: { limit?: number; offset?: number; needs_response?: boolean }) =>
        invokeFunction('openphone-summaries', { body: params, method: 'GET' }),
    },
    drafts: {
      list: (params?: { status?: string; limit?: number }) =>
        invokeFunction('openphone-drafts', { body: params, method: 'GET' }),
      update: (id: string, data: Record<string, any>) =>
        invokeFunction('openphone-drafts', { body: { id, ...data }, method: 'PATCH' }),
    },
    approve: (id: string) =>
      invokeFunction('openphone-approve', { body: { id }, method: 'POST' }),
    reject: (id: string) =>
      invokeFunction('openphone-reject', { body: { id }, method: 'POST' }),
    sendApproved: (id: string) =>
      invokeFunction('openphone-send-approved', { body: { id }, method: 'POST' }),
    run: (params?: { automated?: boolean }) =>
      invokeFunction('openphone-run', { body: params, method: 'POST' }),
    runs: {
      list: (params?: { limit?: number }) =>
        invokeFunction('openphone-runs', { body: params, method: 'GET' }),
    },
    settings: {
      get: () =>
        invokeFunction('openphone-settings', { method: 'GET' }),
      update: (settings: Record<string, any>, suppressions?: any[]) =>
        invokeFunction('openphone-settings', { body: { settings, suppressions }, method: 'POST' }),
    },
  },
  
  ai: {
    analyze: (data: { action: string; text: string; context?: Record<string, any> }) =>
      invokeFunction('ai-analyze', { body: data, method: 'POST' }),
  },
  
  bulkActions: {
    execute: (data: { action: string; ids: string[]; type?: string }) =>
      invokeFunction('bulk-actions', { body: data, method: 'POST' }),
  },
  
  push: {
    register: (data: { player_id: string; user_id?: string; device_type?: string; device_name?: string }, apiKey: string) =>
      invokeFunction('push-register', { body: data, headers: { 'x-api-key': apiKey }, method: 'POST' }),
    send: (data: { title: string; message: string; url?: string; player_ids?: string[]; include_external_user_ids?: string[]; data?: Record<string, any> }, authHeader: string) =>
      invokeFunction('push-send', { body: data, headers: { Authorization: authHeader }, method: 'POST' }),
  },
};

export default supabaseFunctions;
