-- Revert 0013: Unlink demo manager from company
UPDATE user_role_assignments
SET company_id = NULL, updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'manager@liferise.demo')
  AND role_id = (SELECT id FROM roles WHERE slug = 'complex_manager');
