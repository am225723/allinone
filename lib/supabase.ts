import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

// Lazy initialization to avoid build-time errors
function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseKey) {
      // Return a mock client for build time
      console.warn('Supabase credentials not configured. Using mock client.');
      return {
        from: () => ({
          select: () => Promise.resolve({ data: [], error: null }),
          insert: () => Promise.resolve({ data: null, error: null }),
          update: () => Promise.resolve({ data: null, error: null }),
          delete: () => Promise.resolve({ data: null, error: null }),
          upsert: () => Promise.resolve({ data: null, error: null }),
          eq: () => ({ select: () => Promise.resolve({ data: [], error: null }), single: () => Promise.resolve({ data: null, error: null }), maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
          in: () => ({ or: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
          order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      } as unknown as SupabaseClient;
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseInstance;
}

// Server-side Supabase client (use in API routes and server components)
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// Function to create a new client instance (useful for server components)
export function createSupabaseServer() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export default supabaseServer;