#!/usr/bin/env node
/**
 * Test the new Supabase-token-based bridge login.
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
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const EMAIL = process.argv[2] || 'b3lous.ilya@gmail.com';
const PASSWORD = process.argv[3] || 'Admin123!';

async function test() {
  console.log(`=== Testing Supabase-token bridge login: ${EMAIL} ===\n`);

  if (!SUPABASE_URL || !ANON_KEY) {
    console.error('Supabase not configured');
    return;
  }

  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 1: Supabase signInWithPassword
  console.log('Step 1: Supabase signInWithPassword...');
  const { data: sbData, error: sbError } = await anonClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (sbError) {
    console.error('  FAILED:', sbError.message);
    return;
  }

  console.log('  SUCCESS — access_token prefix:', sbData.session.access_token.slice(0, 20) + '...');

  // Step 2: Go backend login with Supabase token
  console.log('\nStep 2: Go backend /api/login with supabase_access_token...');
  console.log('  POST', `${API_URL}/api/login`);

  try {
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        supabase_access_token: sbData.session.access_token,
      }),
    });

    const json = await res.json().catch(() => ({ status: false, message: 'Invalid JSON' }));
    console.log('  response status:', res.status);
    console.log('  response body:', JSON.stringify(json, null, 2));

    if (res.ok && json.status) {
      console.log('\n  BRIDGE LOGIN SUCCESS!');

      // Step 3: Fetch profile with Go JWT
      console.log('\nStep 3: Go backend /api/profile with Go JWT...');
      const profileRes = await fetch(`${API_URL}/api/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${json.data.access_token}`,
          'Accept': 'application/json',
        },
      });
      const profileJson = await profileRes.json().catch(() => ({ status: false, message: 'Invalid JSON' }));
      console.log('  response status:', profileRes.status);
      console.log('  profile role:', profileJson.data?.role);
      console.log('  profile status:', profileJson.data?.status);
    } else {
      console.log('\n  BRIDGE LOGIN FAILED:', json.message || res.statusText);
    }
  } catch (networkErr) {
    console.error('\n  Backend unreachable:', networkErr.message);
    console.log('  (Make sure the Go backend is running on', API_URL + ')');
  }
}

test().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
