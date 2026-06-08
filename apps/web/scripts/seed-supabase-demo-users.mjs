#!/usr/bin/env node
/**
 * Seed Supabase with demo accounts so they appear in auth.users + public.profiles.
 *
 * Run from apps/web/:
 *   node --env-file=.env.local scripts/seed-supabase-demo-users.mjs
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// ── Load env from .env.local (Node 20+ --env-file is preferred, but fallback here) ──
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
    // .env.local not found or unreadable — rely on process.env
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nRun with: node --env-file=.env.local scripts/seed-supabase-demo-users.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_USERS = [
  {
    email: 'admin@liferise.demo',
    password: 'Admin123!',
    user_metadata: { first_name: 'Platform', last_name: 'Admin' },
    profile: {
      first_name: 'Platform',
      last_name: 'Admin',
      phone: '+1000000000',
      role: 'admin',
      approval_status: 'approved',
      onboarding_completed: true,
    },
  },
  {
    email: 'matthew@liferisesolutions.com',
    password: 'Admin123!',
    user_metadata: { first_name: 'Matthew', last_name: 'LifeRise' },
    profile: {
      first_name: 'Matthew',
      last_name: 'LifeRise',
      phone: '+1000000001',
      role: 'admin',
      approval_status: 'approved',
      onboarding_completed: true,
    },
  },
  {
    email: 'b3lous.ilya@gmail.com',
    password: 'Admin123!',
    user_metadata: { first_name: 'Ilya', last_name: 'B3lous' },
    profile: {
      first_name: 'Ilya',
      last_name: 'B3lous',
      phone: '+1000000002',
      role: 'admin',
      approval_status: 'approved',
      onboarding_completed: true,
    },
  },
  {
    email: 'thesage@northstarcoding.com',
    password: 'Admin123!',
    user_metadata: { first_name: 'The', last_name: 'Sage' },
    profile: {
      first_name: 'The',
      last_name: 'Sage',
      phone: '+1000000003',
      role: 'admin',
      approval_status: 'approved',
      onboarding_completed: true,
    },
  },
  {
    email: 'manager@liferise.demo',
    password: 'Manager123!',
    user_metadata: { first_name: 'Admin', last_name: 'Manager' },
    profile: {
      first_name: 'Admin',
      last_name: 'Manager',
      phone: '+1234567890',
      role: 'manager',
      approval_status: 'approved',
      onboarding_completed: true,
    },
  },
  {
    email: 'vendor@liferise.demo',
    password: 'Vendor123!',
    user_metadata: { first_name: 'Marcus', last_name: 'Rivers' },
    profile: {
      first_name: 'Marcus',
      last_name: 'Rivers',
      phone: '+1234567891',
      role: 'vendor',
      approval_status: 'approved',
      onboarding_completed: true,
      ein_tax_id: '12-3456789',
      description: 'Professional cleaning and maintenance services.',
    },
  },
  {
    email: 'pending@liferise.demo',
    password: 'Pending123!',
    user_metadata: { first_name: 'Sarah', last_name: 'Pending' },
    profile: {
      first_name: 'Sarah',
      last_name: 'Pending',
      phone: '+1234567892',
      role: 'vendor',
      approval_status: 'pending',
      onboarding_completed: false,
      ein_tax_id: '98-7654321',
      description: 'New wellness provider awaiting approval.',
    },
  },
  {
    email: 'resident@liferise.demo',
    password: 'Resident123!',
    user_metadata: { first_name: 'Sarah', last_name: 'Mitchell' },
    profile: {
      first_name: 'Sarah',
      last_name: 'Mitchell',
      phone: '+1234567893',
      role: 'resident',
      approval_status: 'approved',
      onboarding_completed: true,
    },
  },
];

async function seed() {
  console.log(`Seeding ${DEMO_USERS.length} demo users into Supabase…\n`);

  for (const demo of DEMO_USERS) {
    // 1. Create (or upsert) the auth user
    const { data: existingList, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listErr) {
      console.error(`[${demo.email}] Failed to list users:`, listErr.message);
      continue;
    }

    const existing = existingList.users.find((u) => u.email === demo.email);
    let userId = existing?.id;

    if (existing) {
      console.log(`[${demo.email}] User already exists (${existing.id}). Updating password & metadata…`);
      const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password: demo.password,
        email_confirm: true,
        user_metadata: demo.user_metadata,
      });
      if (updateErr) {
        console.error(`[${demo.email}] Update failed:`, updateErr.message);
        continue;
      }
    } else {
      console.log(`[${demo.email}] Creating new user…`);
      const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
        email: demo.email,
        password: demo.password,
        email_confirm: true,
        user_metadata: demo.user_metadata,
      });
      if (createErr) {
        console.error(`[${demo.email}] Creation failed:`, createErr.message);
        continue;
      }
      userId = createData.user.id;
      console.log(`[${demo.email}] Created (${userId}).`);
    }

    // 2. Upsert the public.profiles row
    const { error: profileErr } = await supabase.from('profiles').upsert(
      {
        id: userId,
        email: demo.email,
        first_name: demo.profile.first_name,
        last_name: demo.profile.last_name,
        phone: demo.profile.phone,
        role: demo.profile.role,
        approval_status: demo.profile.approval_status,
        onboarding_completed: demo.profile.onboarding_completed ?? false,
        ein_tax_id: demo.profile.ein_tax_id ?? null,
        description: demo.profile.description ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileErr) {
      console.error(`[${demo.email}] Profile upsert failed:`, profileErr.message);
    } else {
      console.log(`[${demo.email}] Profile upserted OK.\n`);
    }
  }

  console.log('Done.');
}

seed().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
