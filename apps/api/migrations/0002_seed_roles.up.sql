-- Seed system roles and permissions
-- Matches Laravel's RBAC configuration for 8+ distinct user roles.

INSERT INTO roles (name, slug, description, level, created_at, updated_at) VALUES
('Super Admin', 'admin', 'Full system access across all companies and resources.', 100, NOW(), NOW()),
('Sales', 'sales', 'Global read-mostly access for sales operations.', 80, NOW(), NOW()),
('PMO', 'pmo', 'Global read-mostly access for project management office.', 70, NOW(), NOW()),
('Complex Manager', 'complex_manager', 'Company-scoped manager with broad company permissions.', 60, NOW(), NOW()),
('Company Staff', 'company_staff', 'Company-scoped staff with limited operational permissions.', 40, NOW(), NOW()),
('Service Provider', 'service_provider', 'Self + company scoped access for vendor operations.', 30, NOW(), NOW()),
('Customer', 'customer', 'Self-only access for end-user mobile app operations.', 10, NOW(), NOW()),
('API Consumer', 'api_consumer', 'Scoped token access for third-party integrations.', 5, NOW(), NOW());

INSERT INTO permissions (name, slug, module, description, created_at, updated_at) VALUES
('View Dashboard', 'dashboard.view', 'dashboard', 'Access admin dashboard.', NOW(), NOW()),
('Manage Users', 'users.manage', 'user', 'Create, update, delete users.', NOW(), NOW()),
('View Users', 'users.view', 'user', 'View user listings and profiles.', NOW(), NOW()),
('Manage Customers', 'customers.manage', 'customer', 'Create, update, delete customers.', NOW(), NOW()),
('View Customers', 'customers.view', 'customer', 'View customer listings and profiles.', NOW(), NOW()),
('Manage Companies', 'companies.manage', 'company', 'Create, update, delete companies.', NOW(), NOW()),
('View Companies', 'companies.view', 'company', 'View company listings.', NOW(), NOW()),
('Manage Services', 'services.manage', 'service', 'Create, update, delete services.', NOW(), NOW()),
('View Services', 'services.view', 'service', 'View service listings.', NOW(), NOW()),
('Manage Bookings', 'bookings.manage', 'booking', 'Create, update, delete bookings.', NOW(), NOW()),
('View Bookings', 'bookings.view', 'booking', 'View booking listings.', NOW(), NOW()),
('Manage Payments', 'payments.manage', 'payment', 'Process refunds and release payments.', NOW(), NOW()),
('View Payments', 'payments.view', 'payment', 'View payment records.', NOW(), NOW()),
('Manage Promo Codes', 'promos.manage', 'promo', 'Create and manage promo codes.', NOW(), NOW()),
('View Reports', 'reports.view', 'report', 'Access analytics and reports.', NOW(), NOW()),
('Manage Settings', 'settings.manage', 'setting', 'Update system settings.', NOW(), NOW()),
('Send Notifications', 'notifications.send', 'notification', 'Send push and email notifications.', NOW(), NOW()),
('Manage Roles', 'roles.manage', 'rbac', 'Create and assign roles.', NOW(), NOW()),
('View Roles', 'roles.view', 'rbac', 'View roles and permissions.', NOW(), NOW()),
('API Full Access', 'api.full', 'api', 'Full API access for integrations.', NOW(), NOW());

-- Role-Permission assignments
-- Super Admin gets everything
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'admin';

-- Sales gets read-mostly global permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'sales'
  AND p.slug IN ('dashboard.view','users.view','customers.view','companies.view',
                 'services.view','bookings.view','payments.view','reports.view');

-- PMO gets read-mostly global permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'pmo'
  AND p.slug IN ('dashboard.view','users.view','customers.view','companies.view',
                 'services.view','bookings.view','payments.view','reports.view');

-- Complex Manager gets broad company-scoped permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'complex_manager'
  AND p.slug IN ('dashboard.view','users.view','customers.view','companies.view',
                 'services.manage','services.view','bookings.manage','bookings.view',
                 'payments.view','promos.manage','reports.view','notifications.send');

-- Company Staff gets limited operational permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'company_staff'
  AND p.slug IN ('dashboard.view','customers.view','services.view',
                 'bookings.manage','bookings.view','payments.view');

-- Service Provider gets self + company scoped permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'service_provider'
  AND p.slug IN ('dashboard.view','services.manage','services.view',
                 'bookings.manage','bookings.view','payments.view');

-- Customer gets self-only permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'customer'
  AND p.slug IN ('bookings.view','payments.view');

-- API Consumer gets scoped API access
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'api_consumer'
  AND p.slug IN ('api.full');
