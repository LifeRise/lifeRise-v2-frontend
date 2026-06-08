#!/usr/bin/env node
/**
 * Seed missing admin accounts into the Go backend users table.
 * Mirrors apps/api/migrations/0011_seed_demo_admins.up.sql
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
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMINS = [
  { first_name: 'Matthew', last_name: 'LifeRise', email: 'matthew@liferisesolutions.com', password: '$2a$10$uSRJw4KB9NO0gk4Ui7sWhOllqw/thT.YDcGpgTO2FCCNuq/ARzq1i' },
  { first_name: 'Ilya', last_name: 'B3lous', email: 'b3lous.ilya@gmail.com', password: '$2a$10$uSRJw4KB9NO0gk4Ui7sWhOllqw/thT.YDcGpgTO2FCCNuq/ARzq1i' },
  { first_name: 'The', last_name: 'Sage', email: 'thesage@northstarcoding.com', password: '$2a$10$uSRJw4KB9NO0gk4Ui7sWhOllqw/thT.YDcGpgTO2FCCNuq/ARzq1i' },
];

async function seed() {
  // Get admin role id
  const { data: role, error: roleErr } = await adminClient
    .from('roles')
    .select('id')
    .eq('slug', 'admin')
    .single();

  if (roleErr || !role) {
    console.error('Admin role not found:', roleErr?.message);
    return;
  }

  const adminRoleId = role.id;

  for (const a of ADMINS) {
    // Check if exists
    const { data: existing } = await adminClient
      .from('users')
      .select('id')
      .eq('email', a.email)
      .single();

    if (existing) {
      console.log(`[${a.email}] Already exists, skipping`);
      continue;
    }

    // Insert user
    const { data: user, error: userErr } = await adminClient
      .from('users')
      .insert({
        first_name: a.first_name,
        last_name: a.last_name,
        email: a.email,
        password: a.password,
        role_id: adminRoleId,
        status: 'active',
        timezone: 'UTC',
      })
      .select('id')
      .single();

    if (userErr) {
      console.error(`[${a.email}] Insert failed:`, userErr.message);
      continue;
    }

    // Create role assignment
    const { error: assignErr } = await adminClient
      .from('user_role_assignments')
      .insert({
        user_id: user.id,
        role_id: adminRoleId,
        company_id: null,
      });

    if (assignErr) {
      console.error(`[${a.email}] Role assignment failed:`, assignErr.message);
    } else {
      console.log(`[${a.email}] Created (id=${user.id})`);
    }
  }
}

seed().catch(console.error);
