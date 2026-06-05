-- LifeRise Database Baseline
-- Migrated from MySQL/Laravel schema to PostgreSQL/Supabase.
-- Preserves all column names, indexes, foreign keys, and generated columns.

CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NULL,
    level INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON roles(deleted_at);

CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    module VARCHAR(100) NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_permissions_deleted_at ON permissions(deleted_at);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(255) NULL,
    last_name VARCHAR(255) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    password VARCHAR(255) NOT NULL,
    role_id BIGINT NULL,
    email_verified_at TIMESTAMP NULL,
    phone_verified_at TIMESTAMP NULL,
    email_unique_if_verified VARCHAR(255) GENERATED ALWAYS AS (CASE WHEN email_verified_at IS NULL THEN NULL ELSE email END) STORED,
    phone_unique_if_verified VARCHAR(50) GENERATED ALWAYS AS (CASE WHEN email_verified_at IS NULL THEN NULL ELSE phone END) STORED,
    timezone VARCHAR(100) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en',
    avatar VARCHAR(500) NULL,
    status VARCHAR(50) DEFAULT 'active',
    remember_token VARCHAR(100) NULL,
    last_login_at TIMESTAMP NULL,
    settings JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_verified_unique ON users(email_unique_if_verified);
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_verified_unique ON users(phone_unique_if_verified);
ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS user_role_assignments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    company_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ura_user_id ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ura_role_id ON user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_ura_company_id ON user_role_assignments(company_id);
ALTER TABLE user_role_assignments ADD CONSTRAINT fk_ura_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_role_assignments ADD CONSTRAINT fk_ura_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS user_otps (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_uo_user_id ON user_otps(user_id);
ALTER TABLE user_otps ADD CONSTRAINT fk_uo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS password_resets (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    code VARCHAR(10) NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pr_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_pr_token ON password_resets(token);

CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(255) NULL,
    last_name VARCHAR(255) NULL,
    email VARCHAR(255) NULL UNIQUE,
    phone VARCHAR(50) NULL,
    password VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMP NULL,
    phone_verified_at TIMESTAMP NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en',
    avatar VARCHAR(500) NULL,
    status VARCHAR(50) DEFAULT 'active',
    referral_code VARCHAR(50) NULL UNIQUE,
    referred_by BIGINT NULL,
    settings JSONB NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
ALTER TABLE customers ADD CONSTRAINT fk_customers_referred_by FOREIGN KEY (referred_by) REFERENCES customers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS customer_otps (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_co_customer_id ON customer_otps(customer_id);
ALTER TABLE customer_otps ADD CONSTRAINT fk_co_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    legal_name VARCHAR(255) NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    website VARCHAR(500) NULL,
    logo VARCHAR(500) NULL,
    description TEXT NULL,
    address JSONB NULL,
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    owner_id BIGINT NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at);
ALTER TABLE companies ADD CONSTRAINT fk_companies_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS company_users (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    joined_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cu_company_id ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_cu_user_id ON company_users(user_id);
ALTER TABLE company_users ADD CONSTRAINT fk_cu_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE company_users ADD CONSTRAINT fk_cu_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE company_users ADD CONSTRAINT fk_cu_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS service_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NULL,
    icon VARCHAR(500) NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    parent_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_sc_parent_id ON service_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_sc_deleted_at ON service_categories(deleted_at);
ALTER TABLE service_categories ADD CONSTRAINT fk_sc_parent FOREIGN KEY (parent_id) REFERENCES service_categories(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NULL,
    provider_id BIGINT NOT NULL,
    category_id BIGINT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NULL,
    short_description VARCHAR(500) NULL,
    price NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    duration INTEGER NOT NULL,
    buffer_time INTEGER DEFAULT 0,
    max_participants INTEGER DEFAULT 1,
    images JSONB NULL,
    location_type VARCHAR(50) DEFAULT 'provider',
    status VARCHAR(50) DEFAULT 'active',
    is_featured BOOLEAN DEFAULT FALSE,
    avg_rating NUMERIC(3,2) NULL,
    total_reviews INTEGER DEFAULT 0,
    settings JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_services_company_id ON services(company_id);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_deleted_at ON services(deleted_at);
ALTER TABLE services ADD CONSTRAINT fk_services_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE services ADD CONSTRAINT fk_services_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE services ADD CONSTRAINT fk_services_category FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    booking_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    service_provider_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    company_id BIGINT NULL,
    status VARCHAR(50) NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NULL,
    final_price NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT NULL,
    customer_notes TEXT NULL,
    provider_notes TEXT NULL,
    cancellation_reason TEXT NULL,
    cancelled_by VARCHAR(50) NULL,
    cancelled_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    confirmed_at TIMESTAMP NULL,
    promo_code_id BIGINT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    location JSONB NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_provider_id ON bookings(service_provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_company_id ON bookings(company_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at);
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_provider FOREIGN KEY (service_provider_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS available_slots (
    id BIGSERIAL PRIMARY KEY,
    service_provider_id BIGINT NOT NULL,
    service_id BIGINT NULL,
    company_id BIGINT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_rule_id BIGINT NULL,
    booked_by_booking_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_as_provider_id ON available_slots(service_provider_id);
CREATE INDEX IF NOT EXISTS idx_as_service_id ON available_slots(service_id);
CREATE INDEX IF NOT EXISTS idx_as_company_id ON available_slots(company_id);
CREATE INDEX IF NOT EXISTS idx_as_date ON available_slots(date);
CREATE INDEX IF NOT EXISTS idx_as_is_available ON available_slots(is_available);
CREATE INDEX IF NOT EXISTS idx_as_deleted_at ON available_slots(deleted_at);
ALTER TABLE available_slots ADD CONSTRAINT fk_as_provider FOREIGN KEY (service_provider_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE available_slots ADD CONSTRAINT fk_as_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
ALTER TABLE available_slots ADD CONSTRAINT fk_as_booking FOREIGN KEY (booked_by_booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS booking_available_slots (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    available_slot_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bas_booking_id ON booking_available_slots(booking_id);
CREATE INDEX IF NOT EXISTS idx_bas_slot_id ON booking_available_slots(available_slot_id);
ALTER TABLE booking_available_slots ADD CONSTRAINT fk_bas_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
ALTER TABLE booking_available_slots ADD CONSTRAINT fk_bas_slot FOREIGN KEY (available_slot_id) REFERENCES available_slots(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS booking_reschedule_records (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    old_date DATE NOT NULL,
    new_date DATE NOT NULL,
    old_start_time TIME NOT NULL,
    new_start_time TIME NOT NULL,
    old_end_time TIME NOT NULL,
    new_end_time TIME NOT NULL,
    rescheduled_by BIGINT NOT NULL,
    reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_brr_booking_id ON booking_reschedule_records(booking_id);
ALTER TABLE booking_reschedule_records ADD CONSTRAINT fk_brr_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS waitlist_entries (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    desired_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'waiting',
    notified_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_we_customer_id ON waitlist_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_we_service_id ON waitlist_entries(service_id);
CREATE INDEX IF NOT EXISTS idx_we_provider_id ON waitlist_entries(provider_id);
ALTER TABLE waitlist_entries ADD CONSTRAINT fk_we_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE waitlist_entries ADD CONSTRAINT fk_we_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS favorites (
    id BIGSERIAL PRIMARY KEY,
    customerId BIGINT NOT NULL,
    serviceId BIGINT NULL,
    providerId BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_favorites_customerId ON favorites(customerId);
CREATE INDEX IF NOT EXISTS idx_favorites_serviceId ON favorites(serviceId);
CREATE INDEX IF NOT EXISTS idx_favorites_providerId ON favorites(providerId);
CREATE UNIQUE INDEX IF NOT EXISTS favorites_unique ON favorites(customerId, serviceId, providerId);
ALTER TABLE favorites ADD CONSTRAINT fk_favorites_customer FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE favorites ADD CONSTRAINT fk_favorites_service FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE;
ALTER TABLE favorites ADD CONSTRAINT fk_favorites_provider FOREIGN KEY (providerId) REFERENCES users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS stripe_payments (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NULL,
    customer_id BIGINT NULL,
    user_id BIGINT NULL,
    stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_charge_id VARCHAR(255) NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    platform_fee NUMERIC(10,2) NULL,
    vendor_amount NUMERIC(10,2) NULL,
    released_at TIMESTAMP NULL,
    description TEXT NULL,
    billing_details JSONB NULL,
    metadata JSONB NULL,
    failure_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_sp_booking_id ON stripe_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_sp_customer_id ON stripe_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_sp_status ON stripe_payments(status);
CREATE INDEX IF NOT EXISTS idx_sp_deleted_at ON stripe_payments(deleted_at);
ALTER TABLE stripe_payments ADD CONSTRAINT fk_sp_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS user_stripe_connects (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    stripe_account_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    requirements_due JSONB NULL,
    country VARCHAR(2) NULL,
    default_currency VARCHAR(3) NULL,
    onboarding_link VARCHAR(500) NULL,
    onboarding_completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_usc_user_id ON user_stripe_connects(user_id);
CREATE INDEX IF NOT EXISTS idx_usc_stripe_account_id ON user_stripe_connects(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_usc_deleted_at ON user_stripe_connects(deleted_at);
ALTER TABLE user_stripe_connects ADD CONSTRAINT fk_usc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS stripe_refunds (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    stripe_refund_id VARCHAR(255) NOT NULL UNIQUE,
    amount NUMERIC(10,2) NOT NULL,
    reason VARCHAR(255) NULL,
    status VARCHAR(50) NOT NULL,
    stripe_response JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sr_payment_id ON stripe_refunds(payment_id);
ALTER TABLE stripe_refunds ADD CONSTRAINT fk_sr_payment FOREIGN KEY (payment_id) REFERENCES stripe_payments(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS webhook_idempotencies (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wi_event_id ON webhook_idempotencies(event_id);

CREATE TABLE IF NOT EXISTS feedbacks (
    id BIGSERIAL PRIMARY KEY,
    serviceProviderId BIGINT NOT NULL,
    bookingId BIGINT NULL,
    customerId BIGINT NOT NULL,
    serviceId BIGINT NULL,
    serviceDate TIMESTAMP NULL,
    rating NUMERIC(3,2) NULL,
    review TEXT NULL,
    images JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fb_serviceProviderId ON feedbacks(serviceProviderId);
CREATE INDEX IF NOT EXISTS idx_fb_bookingId ON feedbacks(bookingId);
CREATE INDEX IF NOT EXISTS idx_fb_customerId ON feedbacks(customerId);
ALTER TABLE feedbacks ADD CONSTRAINT fk_fb_provider FOREIGN KEY (serviceProviderId) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE feedbacks ADD CONSTRAINT fk_fb_booking FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE SET NULL;
ALTER TABLE feedbacks ADD CONSTRAINT fk_fb_customer FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE;
