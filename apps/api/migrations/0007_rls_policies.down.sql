-- Revert RLS policies added in 0007_rls_policies.up.sql
-- Drop policies first, then disable RLS on each table.

DROP POLICY IF EXISTS support_messages_service_role_all ON support_messages;
DROP POLICY IF EXISTS support_tickets_service_role_all ON support_tickets;
DROP POLICY IF EXISTS locations_service_role_all ON locations;
DROP POLICY IF EXISTS faqs_service_role_all ON faqs;
DROP POLICY IF EXISTS app_banners_service_role_all ON app_banners;
DROP POLICY IF EXISTS event_bookings_service_role_all ON event_bookings;
DROP POLICY IF EXISTS event_responses_service_role_all ON event_responses;
DROP POLICY IF EXISTS group_events_service_role_all ON group_events;
DROP POLICY IF EXISTS announcements_service_role_all ON announcements;

ALTER TABLE support_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE faqs DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_banners DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
