-- Remove demo accounts
DELETE FROM user_role_assignments WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'admin@liferise.demo',
    'manager@liferise.demo',
    'vendor@liferise.demo',
    'pending@liferise.demo'
  )
);

DELETE FROM users WHERE email IN (
  'admin@liferise.demo',
  'manager@liferise.demo',
  'vendor@liferise.demo',
  'pending@liferise.demo'
);

DELETE FROM customers WHERE email = 'resident@liferise.demo';
