-- Admin dashboard entities + company type discriminator
-- Idempotent, fully reversible.

-- 1. companies.type discriminator + backfill
ALTER TABLE companies ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'complex' CHECK (type IN ('complex','vendor','affiliate'));
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type);

-- Backfill: vendor if referenced by services; complex otherwise (default already covers it)
UPDATE companies SET type = CASE
  WHEN EXISTS (
    SELECT 1 FROM services
    WHERE services.company_id = companies.id
      AND services.deleted_at IS NULL
  ) THEN 'vendor'
  ELSE 'complex'
END;

-- 2. announcements
CREATE TABLE IF NOT EXISTS announcements (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NULL,
    author_user_id BIGINT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    audience VARCHAR(20) NOT NULL CHECK (audience IN ('all','residents','vendors')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('normal','urgent')),
    published_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_announcements_company_id ON announcements(company_id);
CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(audience);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON announcements(published_at);
CREATE INDEX IF NOT EXISTS idx_announcements_deleted_at ON announcements(deleted_at);
ALTER TABLE announcements ADD CONSTRAINT fk_announcements_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE announcements ADD CONSTRAINT fk_announcements_author FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. group_events
CREATE TABLE IF NOT EXISTS group_events (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    location JSONB NULL,
    capacity INTEGER NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('scheduled','cancelled','completed')),
    created_by BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_group_events_company_id ON group_events(company_id);
CREATE INDEX IF NOT EXISTS idx_group_events_start_at ON group_events(start_at);
CREATE INDEX IF NOT EXISTS idx_group_events_status ON group_events(status);
CREATE INDEX IF NOT EXISTS idx_group_events_deleted_at ON group_events(deleted_at);
ALTER TABLE group_events ADD CONSTRAINT fk_group_events_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- 4. event_responses
CREATE TABLE IF NOT EXISTS event_responses (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    response VARCHAR(20) NOT NULL CHECK (response IN ('going','maybe','declined')),
    responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_event_responses_event_id ON event_responses(event_id);
CREATE INDEX IF NOT EXISTS idx_event_responses_customer_id ON event_responses(customer_id);
ALTER TABLE event_responses ADD CONSTRAINT fk_event_responses_event FOREIGN KEY (event_id) REFERENCES group_events(id) ON DELETE CASCADE;
ALTER TABLE event_responses ADD CONSTRAINT fk_event_responses_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- 5. event_bookings
CREATE TABLE IF NOT EXISTS event_bookings (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending','accepted','active','cancelled','rejected','completed')),
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_event_bookings_event_id ON event_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_customer_id ON event_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_status ON event_bookings(status);
CREATE INDEX IF NOT EXISTS idx_event_bookings_deleted_at ON event_bookings(deleted_at);
ALTER TABLE event_bookings ADD CONSTRAINT fk_event_bookings_event FOREIGN KEY (event_id) REFERENCES group_events(id) ON DELETE CASCADE;
ALTER TABLE event_bookings ADD CONSTRAINT fk_event_bookings_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- 6. app_banners
CREATE TABLE IF NOT EXISTS app_banners (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    target_url VARCHAR(500) NULL,
    audience VARCHAR(20) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_app_banners_active ON app_banners(active);
CREATE INDEX IF NOT EXISTS idx_app_banners_sort_order ON app_banners(sort_order);

-- 7. faqs
CREATE TABLE IF NOT EXISTS faqs (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(active);
CREATE INDEX IF NOT EXISTS idx_faqs_deleted_at ON faqs(deleted_at);

-- 8. locations
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('region','city','neighborhood')),
    parent_id BIGINT NULL,
    lat NUMERIC(10,7) NULL,
    lng NUMERIC(10,7) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);
CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_id);
ALTER TABLE locations ADD CONSTRAINT fk_locations_parent FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE SET NULL;
