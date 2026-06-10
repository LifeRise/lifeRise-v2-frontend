-- Migration 0013: Link demo manager to a demo company
-- Fixes the 403 Forbidden for manager@liferise.demo when accessing the dashboard.

DO $$
DECLARE
    v_company_id BIGINT;
    v_user_id BIGINT;
    v_role_id BIGINT;
BEGIN
    -- Create a demo company if none exists
    SELECT id INTO v_company_id FROM companies WHERE slug = 'demo-property';
    IF NOT FOUND THEN
        INSERT INTO companies (name, slug, email, status, type, created_at, updated_at)
        VALUES ('Demo Property Management', 'demo-property', 'contact@demo-property.com', 'active', 'complex', NOW(), NOW())
        RETURNING id INTO v_company_id;
    END IF;

    -- Find the demo manager user
    SELECT id INTO v_user_id FROM users WHERE email = 'manager@liferise.demo';
    IF NOT FOUND THEN
        RAISE NOTICE 'Demo manager user not found, skipping';
        RETURN;
    END IF;

    -- Find the complex_manager role
    SELECT id INTO v_role_id FROM roles WHERE slug = 'complex_manager';
    IF NOT FOUND THEN
        RAISE NOTICE 'complex_manager role not found, skipping';
        RETURN;
    END IF;

    -- Update the manager's role assignment to point to the demo company
    UPDATE user_role_assignments
    SET company_id = v_company_id, updated_at = NOW()
    WHERE user_id = v_user_id
      AND role_id = v_role_id;

    -- If no row was updated, insert one
    IF NOT FOUND THEN
        INSERT INTO user_role_assignments (user_id, role_id, company_id, created_at, updated_at)
        VALUES (v_user_id, v_role_id, v_company_id, NOW(), NOW());
    END IF;
END $$;
