/**
 * POST /api/profile
 *
 * Server-side route that upserts a row into public.profiles using the Supabase
 * service-role key (bypasses RLS). Called by auth-service.ts immediately after
 * supabase.auth.signUp() so that profile data is persisted to the public schema
 * for all 4 portal tiers (resident, vendor, manager, admin).
 *
 * The service-role key is never exposed to the browser — it lives only here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

type ProfileRole = 'resident' | 'vendor' | 'manager' | 'admin';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface ProfilePayload {
  id: string; // UUID from auth.users
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: ProfileRole;
  approval_status: ApprovalStatus;
  ein_tax_id?: string | null;
  description?: string | null;
}

const VALID_ROLES: readonly ProfileRole[] = ['resident', 'vendor', 'manager', 'admin'];
const VALID_STATUSES: readonly ApprovalStatus[] = ['pending', 'approved', 'rejected'];

export async function POST(req: NextRequest) {
  // Supabase URL not set — running in mock/offline mode, nothing to persist.
  if (!supabaseUrl) {
    return NextResponse.json({ ok: true, note: 'supabase_not_configured' });
  }

  // Service-role key is required for server-side writes that bypass RLS.
  if (!serviceRoleKey) {
    console.warn(
      '[api/profile] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'Profile row will not be inserted — add a DB trigger as fallback.'
    );
    return NextResponse.json({ ok: true, note: 'service_role_key_missing' });
  }

  let body: Partial<ProfilePayload>;
  try {
    body = (await req.json()) as Partial<ProfilePayload>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    id,
    email,
    first_name,
    last_name,
    phone,
    role,
    approval_status,
    ein_tax_id,
    description,
  } = body;

  if (!id || !email || !role) {
    return NextResponse.json(
      { error: 'Missing required fields: id, email, role' },
      { status: 400 }
    );
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
  }

  // Default approval_status: vendors start pending, everyone else is approved.
  const resolvedStatus: ApprovalStatus =
    approval_status && VALID_STATUSES.includes(approval_status)
      ? approval_status
      : role === 'vendor'
        ? 'pending'
        : 'approved';

  // Service-role client — bypasses RLS, server-side only.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.from('profiles').upsert(
    {
      id,
      email,
      first_name: first_name ?? '',
      last_name: last_name ?? '',
      phone: phone ?? '',
      role,
      approval_status: resolvedStatus,
      onboarding_completed: false,
      ein_tax_id: ein_tax_id ?? null,
      description: description ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('[api/profile] Supabase upsert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
