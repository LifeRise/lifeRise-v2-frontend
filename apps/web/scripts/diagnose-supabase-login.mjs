#!/usr/bin/env node
/**
 * Diagnose why a specific user can't log in via Supabase.
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

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: false },
});

const EMAIL = process.argv[2] || 'b3lous.ilya@gmail.com';
const PASSWORD = process.argv[3] || 'Admin123!';

async function diagnose() {
  console.log(`Diagnosing: ${EMAIL}\n`);

  // 1. List users and find the target
  const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listErr) {
    console.error('Failed to list users:', listErr.message);
    return;
  }

  const user = listData.users.find((u) => u.email === EMAIL);

  if (!user) {
    console.error(`User ${EMAIL} NOT FOUND in Supabase auth.users`);
    return;
  }

  console.log('Found user in auth.users:');
  console.log('  id:', user.id);
  console.log('  email_confirmed_at:', user.email_confirmed_at);
  console.log('  confirmed_at:', user.confirmed_at);
  console.log('  last_sign_in_at:', user.last_sign_in_at);
  console.log('  created_at:', user.created_at);
  console.log('  user_metadata:', JSON.stringify(user.user_metadata));
  console.log('  app_metadata:', JSON.stringify(user.app_metadata));
  console.log('  role:', user.role);
  console.log('  aud:', user.aud);
  console.log('  banned_until:', user.banned_until);
  console.log('  is_anonymous:', user.is_anonymous);

  // 2. Check profiles table
  const { data: profile, error: profileErr } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileErr) {
    console.log('\nProfile query error:', profileErr.message);
  } else {
    console.log('\nFound profile row:');
    console.log('  role:', profile.role);
    console.log('  approval_status:', profile.approval_status);
    console.log('  email:', profile.email);
  }

  // 3. Try anon login
  console.log('\nAttempting anon-key login...');
  const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (loginErr) {
    console.error('  LOGIN FAILED:', loginErr.message);
    console.error('  status:', loginErr.status);
    console.error('  code:', loginErr.code);
  } else {
    console.log('  LOGIN SUCCESS!');
    console.log('  access_token prefix:', loginData.session?.access_token?.slice(0, 20) + '...');
  }

  // 4. Try with a wrong password to see the same error
  console.log('\nAttempting login with WRONG password (should fail)...');
  const { error: wrongErr } = await anonClient.auth.signInWithPassword({
    email: EMAIL,
    password: 'WrongPassword123!',
  });
  console.log('  Result:', wrongErr ? wrongErr.message : 'unexpected success');
}

diagnose().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
