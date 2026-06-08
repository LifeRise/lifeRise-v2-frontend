-- Migration 0010: public.profiles table
--
-- Creates the Supabase-linked profiles table for the 4-tier RBAC system
-- (resident, vendor, manager, admin). If the table already exists (e.g., from
-- a manual Supabase setup), the role constraint is widened to include 'admin'
-- and RLS policies are upserted idempotently.
--
-- This table is written to by the /api/profile Next.js server route using the
-- Supabase service-role key immediately after supabase.auth.signUp().

CREATE TABLE IF NOT EXISTS profiles (
  id                   uuid        REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email                text        NOT NULL,
  first_name           text,
  last_name            text,
  phone                text,
  role                 text        NOT NULL
                                   CHECK (role IN ('resident', 'vendor', 'manager', 'admin')),
  approval_status      text        NOT NULL DEFAULT 'pending'
                                   CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  onboarding_completed boolean     DEFAULT false,
  ein_tax_id           text,
  description          text,
  avatar_url           text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- If the table pre-existed with a 3-role constraint, widen it to include 'admin'.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('resident', 'vendor', 'manager', 'admin'));

-- Indexes for common query patterns.
CREATE INDEX IF NOT EXISTS idx_profiles_role  ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- service_role (used by /api/profile Next.js route): full access, bypasses RLS.
DROP POLICY IF EXISTS profiles_service_role_all ON profiles;
CREATE POLICY profiles_service_role_all ON profiles
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- authenticated users: read their own row.
DROP POLICY IF EXISTS profiles_owner_select ON profiles;
CREATE POLICY profiles_owner_select ON profiles
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- authenticated users: insert their own row (for confirmed-email flows).
DROP POLICY IF EXISTS profiles_owner_insert ON profiles;
CREATE POLICY profiles_owner_insert ON profiles
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- authenticated users: update their own row (profile edits).
DROP POLICY IF EXISTS profiles_owner_update ON profiles;
CREATE POLICY profiles_owner_update ON profiles
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
