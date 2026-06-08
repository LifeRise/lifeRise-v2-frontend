-- Row-Level Security policies for the 7 new admin-dashboard tables.
-- The Go backend connects with a privileged role (service_role / owner) that
-- BYPASSES RLS, so these policies function as a defence-in-depth layer for any
-- direct Supabase client access using the anon or authenticated roles.
--
-- Strategy:
--   • Enable RLS on every new table.
--   • Grant unrestricted access to the database owner / service_role.
--   • Deny everything else by default (no additional permissive policies).
--   This is a "default-deny, service-role-only" posture.

-- ── announcements ──────────────────────────────────────────────
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcements_service_role_all ON announcements;
CREATE POLICY announcements_service_role_all ON announcements
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── group_events ───────────────────────────────────────────────
ALTER TABLE group_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_events_service_role_all ON group_events;
CREATE POLICY group_events_service_role_all ON group_events
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── event_responses ────────────────────────────────────────────
ALTER TABLE event_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_responses_service_role_all ON event_responses;
CREATE POLICY event_responses_service_role_all ON event_responses
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── event_bookings ─────────────────────────────────────────────
ALTER TABLE event_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_bookings_service_role_all ON event_bookings;
CREATE POLICY event_bookings_service_role_all ON event_bookings
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── app_banners ────────────────────────────────────────────────
ALTER TABLE app_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_banners_service_role_all ON app_banners;
CREATE POLICY app_banners_service_role_all ON app_banners
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── faqs ───────────────────────────────────────────────────────
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS faqs_service_role_all ON faqs;
CREATE POLICY faqs_service_role_all ON faqs
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── locations ──────────────────────────────────────────────────
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS locations_service_role_all ON locations;
CREATE POLICY locations_service_role_all ON locations
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── support_tickets / support_messages ─────────────────────────
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_service_role_all ON support_tickets;
CREATE POLICY support_tickets_service_role_all ON support_tickets
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_messages_service_role_all ON support_messages;
CREATE POLICY support_messages_service_role_all ON support_messages
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
