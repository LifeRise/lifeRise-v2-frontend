-- Migration 0012: Add authenticated read policies for manager portal tables
--
-- Enables direct Supabase queries from the browser for admin CRUD reads
-- while keeping write operations restricted to service_role (used by Go backend
-- and Next.js server routes).

-- ── announcements ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS announcements_authenticated_select ON announcements;
CREATE POLICY announcements_authenticated_select ON announcements
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

-- ── group_events ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS group_events_authenticated_select ON group_events;
CREATE POLICY group_events_authenticated_select ON group_events
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

-- ── event_bookings ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS event_bookings_authenticated_select ON event_bookings;
CREATE POLICY event_bookings_authenticated_select ON event_bookings
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

-- ── event_responses ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS event_responses_authenticated_select ON event_responses;
CREATE POLICY event_responses_authenticated_select ON event_responses
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

-- ── support_tickets ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS support_tickets_authenticated_select ON support_tickets;
CREATE POLICY support_tickets_authenticated_select ON support_tickets
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

-- ── feedbacks ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS feedbacks_authenticated_select ON feedbacks;
CREATE POLICY feedbacks_authenticated_select ON feedbacks
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

-- ── waitlist_entries ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS waitlist_entries_authenticated_select ON waitlist_entries;
CREATE POLICY waitlist_entries_authenticated_select ON waitlist_entries
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

-- ── bookings ──────────────────────────────────────────────────────────────────
-- Bookings has no RLS at all currently. Enable it with a manager read policy.
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookings_service_role_all ON bookings;
CREATE POLICY bookings_service_role_all ON bookings
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS bookings_authenticated_select ON bookings;
CREATE POLICY bookings_authenticated_select ON bookings
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);
