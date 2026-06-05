'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mockAuth, seedMockData } from '@/lib/auth/mock-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let browserClient: SupabaseClient | null = null;

function createMockClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    seedMockData();
  }

  return {
    auth: mockAuth,
    from: () => {
      throw new Error('Mock client: use mock-auth helpers directly for DB operations');
    },
  } as unknown as SupabaseClient;
}

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  if (!supabaseUrl || !supabaseAnonKey) {
    browserClient = createMockClient();
    return browserClient;
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
