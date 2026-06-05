-- Reverse FK order drop

ALTER TABLE locations DROP CONSTRAINT IF EXISTS fk_locations_parent;
DROP TABLE IF EXISTS locations;

DROP TABLE IF EXISTS faqs;

DROP TABLE IF EXISTS app_banners;

ALTER TABLE event_bookings DROP CONSTRAINT IF EXISTS fk_event_bookings_customer;
ALTER TABLE event_bookings DROP CONSTRAINT IF EXISTS fk_event_bookings_event;
DROP TABLE IF EXISTS event_bookings;

ALTER TABLE event_responses DROP CONSTRAINT IF EXISTS fk_event_responses_customer;
ALTER TABLE event_responses DROP CONSTRAINT IF EXISTS fk_event_responses_event;
DROP TABLE IF EXISTS event_responses;

ALTER TABLE group_events DROP CONSTRAINT IF EXISTS fk_group_events_company;
DROP TABLE IF EXISTS group_events;

ALTER TABLE announcements DROP CONSTRAINT IF EXISTS fk_announcements_author;
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS fk_announcements_company;
DROP TABLE IF EXISTS announcements;

DROP INDEX IF EXISTS idx_companies_type;
ALTER TABLE companies DROP COLUMN IF EXISTS type;
