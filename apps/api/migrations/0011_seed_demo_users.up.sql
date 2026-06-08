-- Seed demo accounts into the Go backend so they work on production/live sites.
-- These mirror the frontend mock-auth credentials.

-- ── Admin ──────────────────────────────────────────────────────────
INSERT INTO users (first_name, last_name, email, phone, password, timezone, status, role_id, created_at, updated_at)
SELECT 'Platform', 'Admin', 'admin@liferise.demo', '+1000000000',
       '$2a$10$E3wcDQuO3m/20ILwEHg9f.KZ0y34M3Y7naXtKbjO7rykAd.rlpyfu',
       'UTC', 'active', r.id, NOW(), NOW()
FROM roles r
WHERE r.slug = 'admin'
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email = 'admin@liferise.demo');

INSERT INTO user_role_assignments (user_id, role_id, company_id, created_at, updated_at)
SELECT u.id, u.role_id, NULL, NOW(), NOW()
FROM users u
WHERE u.email = 'admin@liferise.demo'
  AND NOT EXISTS (SELECT 1 FROM user_role_assignments ura WHERE ura.user_id = u.id);

-- ── Manager ────────────────────────────────────────────────────────
INSERT INTO users (first_name, last_name, email, phone, password, timezone, status, role_id, created_at, updated_at)
SELECT 'Admin', 'Manager', 'manager@liferise.demo', '+1234567890',
       '$2a$10$PwxwYZBjXD2V1cuzU1r8h.jc5aNWXmfpWx7.LIWrjh0xTlXQO1MCm',
       'UTC', 'active', r.id, NOW(), NOW()
FROM roles r
WHERE r.slug = 'complex_manager'
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email = 'manager@liferise.demo');

INSERT INTO user_role_assignments (user_id, role_id, company_id, created_at, updated_at)
SELECT u.id, u.role_id, NULL, NOW(), NOW()
FROM users u
WHERE u.email = 'manager@liferise.demo'
  AND NOT EXISTS (SELECT 1 FROM user_role_assignments ura WHERE ura.user_id = u.id);

-- ── Vendor (approved) ──────────────────────────────────────────────
INSERT INTO users (first_name, last_name, email, phone, password, timezone, status, role_id, settings, created_at, updated_at)
SELECT 'Marcus', 'Rivers', 'vendor@liferise.demo', '+1234567891',
       '$2a$10$uxZZt4KUbTguGrUnkgcs/OA/H8DjWP3ykSl/DOaUr991Rsn0slxUS',
       'UTC', 'active', r.id,
       '{"ein_tax_id":"12-3456789","description":"Professional cleaning and maintenance services.","approval_status":"approved"}',
       NOW(), NOW()
FROM roles r
WHERE r.slug = 'service_provider'
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email = 'vendor@liferise.demo');

INSERT INTO user_role_assignments (user_id, role_id, company_id, created_at, updated_at)
SELECT u.id, u.role_id, NULL, NOW(), NOW()
FROM users u
WHERE u.email = 'vendor@liferise.demo'
  AND NOT EXISTS (SELECT 1 FROM user_role_assignments ura WHERE ura.user_id = u.id);

-- ── Pending Vendor ─────────────────────────────────────────────────
INSERT INTO users (first_name, last_name, email, phone, password, timezone, status, role_id, settings, created_at, updated_at)
SELECT 'Sarah', 'Pending', 'pending@liferise.demo', '+1234567892',
       '$2a$10$eMYMx131I0cpuAnc0XmTzeri4/hOuGk0MvWZmgGCGVb0P8TIqDq6S',
       'UTC', 'active', r.id,
       '{"ein_tax_id":"98-7654321","description":"New wellness provider awaiting approval.","approval_status":"pending"}',
       NOW(), NOW()
FROM roles r
WHERE r.slug = 'service_provider'
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email = 'pending@liferise.demo');

INSERT INTO user_role_assignments (user_id, role_id, company_id, created_at, updated_at)
SELECT u.id, u.role_id, NULL, NOW(), NOW()
FROM users u
WHERE u.email = 'pending@liferise.demo'
  AND NOT EXISTS (SELECT 1 FROM user_role_assignments ura WHERE ura.user_id = u.id);

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
