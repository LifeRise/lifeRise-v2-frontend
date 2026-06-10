-- Seed / sync demo accounts into the Go backend so they work on production/live sites.
-- These mirror the frontend mock-auth credentials. Updates existing rows when found.

-- ── Admin ──────────────────────────────────────────────────────────
DO $$
DECLARE
    v_role_id BIGINT;
    v_user_id BIGINT;
BEGIN
    SELECT id INTO v_role_id FROM roles WHERE slug = 'admin';

    SELECT id INTO v_user_id FROM users WHERE email = 'admin@liferise.demo';
    IF FOUND THEN
        UPDATE users SET
            first_name = 'Platform',
            last_name = 'Admin',
            phone = '+1000000000',
            password = '$2a$10$E3wcDQuO3m/20ILwEHg9f.KZ0y34M3Y7naXtKbjO7rykAd.rlpyfu',
            timezone = 'UTC',
            status = 'active',
            role_id = v_role_id,
            email_verified_at = COALESCE(email_verified_at, NOW()),
            updated_at = NOW()
        WHERE id = v_user_id;
    ELSE
        INSERT INTO users (first_name, last_name, email, phone, password, timezone, status, role_id, email_verified_at, created_at, updated_at)
        VALUES ('Platform', 'Admin', 'admin@liferise.demo', '+1000000000',
                '$2a$10$E3wcDQuO3m/20ILwEHg9f.KZ0y34M3Y7naXtKbjO7rykAd.rlpyfu',
                'UTC', 'active', v_role_id, NOW(), NOW(), NOW())
        RETURNING id INTO v_user_id;
    END IF;

    -- Ensure role assignment exists
    IF NOT EXISTS (SELECT 1 FROM user_role_assignments WHERE user_id = v_user_id) THEN
        INSERT INTO user_role_assignments (user_id, role_id, company_id, created_at, updated_at)
        VALUES (v_user_id, v_role_id, NULL, NOW(), NOW());
    END IF;
END $$;

-- ── Demo Company ───────────────────────────────────────────────────
DO $$
DECLARE
    v_company_id BIGINT;
BEGIN
    SELECT id INTO v_company_id FROM companies WHERE slug = 'demo-property';
    IF NOT FOUND THEN
        INSERT INTO companies (name, slug, email, status, type, created_at, updated_at)
        VALUES ('Demo Property Management', 'demo-property', 'contact@demo-property.com', 'active', 'complex', NOW(), NOW())
        RETURNING id INTO v_company_id;
    END IF;
END $$;

-- ── Manager ────────────────────────────────────────────────────────
DO $$
DECLARE
    v_role_id BIGINT;
    v_user_id BIGINT;
    v_company_id BIGINT;
BEGIN
    SELECT id INTO v_role_id FROM roles WHERE slug = 'complex_manager';
    SELECT id INTO v_company_id FROM companies WHERE slug = 'demo-property' LIMIT 1;

    SELECT id INTO v_user_id FROM users WHERE email = 'manager@liferise.demo';
    IF FOUND THEN
        UPDATE users SET
            first_name = 'Admin',
            last_name = 'Manager',
            phone = '+1234567890',
            password = '$2a$10$PwxwYZBjXD2V1cuzU1r8h.jc5aNWXmfpWx7.LIWrjh0xTlXQO1MCm',
            timezone = 'UTC',
            status = 'active',
            role_id = v_role_id,
            email_verified_at = COALESCE(email_verified_at, NOW()),
            updated_at = NOW()
        WHERE id = v_user_id;
    ELSE
        INSERT INTO users (first_name, last_name, email, phone, password, timezone, status, role_id, email_verified_at, created_at, updated_at)
        VALUES ('Admin', 'Manager', 'manager@liferise.demo', '+1234567890',
                '$2a$10$PwxwYZBjXD2V1cuzU1r8h.jc5aNWXmfpWx7.LIWrjh0xTlXQO1MCm',
                'UTC', 'active', v_role_id, NOW(), NOW(), NOW())
        RETURNING id INTO v_user_id;
    END IF;

    -- Upsert role assignment with the demo company
    IF NOT EXISTS (SELECT 1 FROM user_role_assignments WHERE user_id = v_user_id AND role_id = v_role_id) THEN
        INSERT INTO user_role_assignments (user_id, role_id, company_id, created_at, updated_at)
        VALUES (v_user_id, v_role_id, v_company_id, NOW(), NOW());
    ELSE
        UPDATE user_role_assignments
        SET company_id = v_company_id, updated_at = NOW()
        WHERE user_id = v_user_id AND role_id = v_role_id;
    END IF;
END $$;

-- ── Vendor (approved) ──────────────────────────────────────────────
DO $$
DECLARE
    v_role_id BIGINT;
    v_user_id BIGINT;
BEGIN
    SELECT id INTO v_role_id FROM roles WHERE slug = 'service_provider';

    SELECT id INTO v_user_id FROM users WHERE email = 'vendor@liferise.demo';
    IF FOUND THEN
        UPDATE users SET
            first_name = 'Marcus',
            last_name = 'Rivers',
            phone = '+1234567891',
            password = '$2a$10$uxZZt4KUbTguGrUnkgcs/OA/H8DjWP3ykSl/DOaUr991Rsn0slxUS',
            timezone = 'UTC',
            status = 'active',
            role_id = v_role_id,
            settings = '{"ein_tax_id":"12-3456789","description":"Professional cleaning and maintenance services.","approval_status":"approved"}'::jsonb,
            email_verified_at = COALESCE(email_verified_at, NOW()),
            updated_at = NOW()
        WHERE id = v_user_id;
    ELSE
        INSERT INTO users (first_name, last_name, email, phone, password, timezone, status, role_id, settings, email_verified_at, created_at, updated_at)
        VALUES ('Marcus', 'Rivers', 'vendor@liferise.demo', '+1234567891',
                '$2a$10$uxZZt4KUbTguGrUnkgcs/OA/H8DjWP3ykSl/DOaUr991Rsn0slxUS',
                'UTC', 'active', v_role_id,
                '{"ein_tax_id":"12-3456789","description":"Professional cleaning and maintenance services.","approval_status":"approved"}'::jsonb,
                NOW(), NOW(), NOW())
        RETURNING id INTO v_user_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM user_role_assignments WHERE user_id = v_user_id) THEN
        INSERT INTO user_role_assignments (user_id, role_id, company_id, created_at, updated_at)
        VALUES (v_user_id, v_role_id, NULL, NOW(), NOW());
    END IF;
END $$;

-- ── Pending Vendor ─────────────────────────────────────────────────
DO $$
DECLARE
    v_role_id BIGINT;
    v_user_id BIGINT;
BEGIN
    SELECT id INTO v_role_id FROM roles WHERE slug = 'service_provider';

    SELECT id INTO v_user_id FROM users WHERE email = 'pending@liferise.demo';
    IF FOUND THEN
        UPDATE users SET
            first_name = 'Sarah',
            last_name = 'Pending',
            phone = '+1234567892',
            password = '$2a$10$eMYMx131I0cpuAnc0XmTzeri4/hOuGk0MvWZmgGCGVb0P8TIqDq6S',
            timezone = 'UTC',
            status = 'active',
            role_id = v_role_id,
            settings = '{"ein_tax_id":"98-7654321","description":"New wellness provider awaiting approval.","approval_status":"pending"}'::jsonb,
            email_verified_at = COALESCE(email_verified_at, NOW()),
            updated_at = NOW()
        WHERE id = v_user_id;
    ELSE
        INSERT INTO users (first_name, last_name, email, phone, password, timezone, status, role_id, settings, email_verified_at, created_at, updated_at)
        VALUES ('Sarah', 'Pending', 'pending@liferise.demo', '+1234567892',
                '$2a$10$eMYMx131I0cpuAnc0XmTzeri4/hOuGk0MvWZmgGCGVb0P8TIqDq6S',
                'UTC', 'active', v_role_id,
                '{"ein_tax_id":"98-7654321","description":"New wellness provider awaiting approval.","approval_status":"pending"}'::jsonb,
                NOW(), NOW(), NOW())
        RETURNING id INTO v_user_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM user_role_assignments WHERE user_id = v_user_id) THEN
        INSERT INTO user_role_assignments (user_id, role_id, company_id, created_at, updated_at)
        VALUES (v_user_id, v_role_id, NULL, NOW(), NOW());
    END IF;
END $$;

-- ── Resident (customer) ────────────────────────────────────────────
INSERT INTO customers (first_name, last_name, email, phone, password, timezone, status, created_at, updated_at)
VALUES ('Sarah', 'Mitchell', 'resident@liferise.demo', '+1234567893',
        '$2a$10$up2yCyCEFXRAQk5CwmlOBOnUHqPVdNkjS7GIi7P8asxrXQ6PXdPwW',
        'UTC', 'active', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  password = EXCLUDED.password,
  timezone = EXCLUDED.timezone,
  status = EXCLUDED.status,
  updated_at = NOW();
