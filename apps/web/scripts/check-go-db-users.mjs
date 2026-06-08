#!/usr/bin/env node
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
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function check() {
  console.log('Users table (Go backend):');
  const { data: users, error: uerr } = await adminClient
    .from('users')
    .select('id, first_name, last_name, email, status')
    .ilike('email', '%b3lous%');
  console.log(uerr ? uerr.message : users);

  console.log('\nCustomers table (Go backend):');
  const { data: customers, error: cerr } = await adminClient
    .from('customers')
    .select('id, first_name, last_name, email, status')
    .ilike('email', '%b3lous%');
  console.log(cerr ? cerr.message : customers);

  console.log('\nAll admin-role users:');
  const { data: admins, error: aerr } = await adminClient
    .from('users')
    .select('id, first_name, last_name, email, status, role_id')
    .limit(20);
  console.log(aerr ? aerr.message : admins);
}

check();
