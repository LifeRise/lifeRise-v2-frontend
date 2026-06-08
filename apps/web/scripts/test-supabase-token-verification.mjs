#!/usr/bin/env node
/**
 * Test direct Supabase token verification via REST API.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf-8');
    raw.split('\n').forEach((line) => {
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      }
    });
  } catch {
    // ignore
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.argv[2] || 'b3lous.ilya@gmail.com';
const PASSWORD = process.argv[3] || 'Admin123!';

async function test() {
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Anon Key prefix:', ANON_KEY?.slice(0, 20) + '...');

  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sbData, error: sbError } = await anonClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (sbError) {
    console.error('Supabase login failed:', sbError.message);
    return;
  }

  console.log('\nSupabase login OK. Token prefix:', sbData.session.access_token.slice(0, 20) + '...');

  // Direct call to Supabase /auth/v1/user
  console.log('\nCalling', `${SUPABASE_URL}/auth/v1/user`);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sbData.session.access_token}`,
      'apikey': ANON_KEY,
    },
  });

  const json = await res.json().catch(() => ({ message: 'Invalid JSON' }));
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(json, null, 2));
}

test().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
