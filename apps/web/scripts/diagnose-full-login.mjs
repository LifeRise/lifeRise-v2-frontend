#!/usr/bin/env node
/**
 * Simulate the full browser login flow for a given email.
 * Tests Supabase auth + Go backend bridge.
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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const EMAIL = process.argv[2] || 'b3lous.ilya@gmail.com';
const PASSWORD = process.argv[3] || 'Admin123!';

async function diagnose() {
  console.log(`=== Full Login Flow Diagnostic: ${EMAIL} ===\n`);

  if (!SUPABASE_URL || !ANON_KEY) {
    console.error('Supabase not configured in env');
    return;
  }

  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 1: Supabase signInWithPassword (as browser would)
  console.log('Step 1: Supabase signInWithPassword...');
  const { data: sbData, error: sbError } = await anonClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (sbError) {
    console.error('  FAILED:', sbError.message, `(code: ${sbError.code}, status: ${sbError.status})`);
    console.log('\nThis means the password in Supabase Auth does not match.');
    return;
  }

  console.log('  SUCCESS — user id:', sbData.user.id);
  console.log('  session expires_at:', sbData.session?.expires_at);

  // Step 2: Go backend login bridge (/api/login)
  console.log('\nStep 2: Go backend login bridge...');
  console.log('  POST', `${API_URL}/api/login`);

  try {
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    const json = await res.json().catch(() => ({ status: false, message: 'Invalid JSON' }));
    console.log('  response status:', res.status);
    console.log('  response body:', JSON.stringify(json, null, 2));

    if (!res.ok || !json.status) {
      console.log('\n  Backend login FAILED:', json.message || res.statusText);
    } else {
      console.log('\n  Backend login SUCCESS — token received');

      // Step 3: Go backend profile fetch (/api/profile)
      console.log('\nStep 3: Go backend profile fetch...');
      const profileRes = await fetch(`${API_URL}/api/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${json.data.access_token}`,
          'Accept': 'application/json',
        },
      });
      const profileJson = await profileRes.json().catch(() => ({ status: false, message: 'Invalid JSON' }));
      console.log('  response status:', profileRes.status);
      console.log('  profile:', JSON.stringify(profileJson, null, 2));
    }
  } catch (networkErr) {
    console.error('\n  Backend unreachable:', networkErr.message);
    console.log('  (This is expected if the Go backend is not running on', API_URL + ')');
  }

  // Step 4: Check public.profiles
  if (SERVICE_ROLE_KEY) {
    console.log('\nStep 4: Check public.profiles...');
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', sbData.user.id)
      .single();

    if (profileErr) {
      console.log('  ERROR:', profileErr.message);
    } else {
      console.log('  role:', profile.role);
      console.log('  approval_status:', profile.approval_status);
      console.log('  email:', profile.email);
    }
  }

  console.log('\n=== Summary ===');
  console.log('Supabase auth: WORKS');
  console.log('If backend is unreachable, the app falls back to Supabase-only login.');
  console.log('In that case the profile is built from user_metadata, which shows:');
  console.log('  user_metadata.role:', sbData.user.user_metadata?.role);
  console.log('  user_metadata.approval_status:', sbData.user.user_metadata?.approval_status);
}

diagnose().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
