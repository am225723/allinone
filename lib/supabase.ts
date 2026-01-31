import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

// Create a chainable mock that returns itself for any method call
function createChainableMock(): any {
  const mock: any = {
    data: null,
    error: { message: 'Supabase not configured' },
  };
  
  const chainable: any = new Proxy({}, {
    get(_, prop) {
      if (prop === 'then') {
        return (resolve: any) => resolve({ data: null, error: { message: 'Supabase not configured' } });
      }
      return (...args: any[]) => chainable;
    }
  });
  
  return chainable;
}

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not configured. Using mock client.');
      return {
        from: () => createChainableMock(),
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
