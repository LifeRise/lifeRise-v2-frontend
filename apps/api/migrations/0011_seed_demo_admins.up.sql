-- Seed 3 demo admin accounts
-- Password for all: Admin123! (bcrypt hash below)

DO $$
DECLARE
    admin_role_id BIGINT;
    matthew_id BIGINT;
    ilya_id BIGINT;
    sage_id BIGINT;
BEGIN
    -- Get the admin role ID
    SELECT id INTO admin_role_id FROM roles WHERE slug = 'admin' LIMIT 1;

    -- Exit if admin role doesn't exist
    IF admin_role_id IS NULL THEN
        RAISE NOTICE 'Admin role not found, skipping demo admin seed';
        RETURN;
    END IF;

    -- Insert Matthew
    INSERT INTO users (first_name, last_name, email, password, role_id, status, timezone, created_at, updated_at)
    VALUES ('Matthew', 'LifeRise', 'matthew@liferisesolutions.com',
            '$2a$10$uSRJw4KB9NO0gk4Ui7sWhOllqw/thT.YDcGpgTO2FCCNuq/ARzq1i',
            admin_role_id, 'active', 'UTC', NOW(), NOW())
    ON CONFLICT DO NOTHING
    RETURNING id INTO matthew_id;

    -- Insert Ilya
    INSERT INTO users (first_name, last_name, email, password, role_id, status, timezone, created_at, updated_at)
    VALUES ('Ilya', 'B3lous', 'b3lous.ilya@gmail.com',
            '$2a$10$uSRJw4KB9NO0gk4Ui7sWhOllqw/thT.YDcGpgTO2FCCNuq/ARzq1i',
            admin_role_id, 'active', 'UTC', NOW(), NOW())
    ON CONFLICT DO NOTHING
    RETURNING id INTO ilya_id;

    -- Insert The Sage
    INSERT INTO users (first_name, last_name, email, password, role_id, status, timezone, created_at, updated_at)
    VALUES ('The', 'Sage', 'thesage@northstarcoding.com',
            '$2a$10$uSRJw4KB9NO0gk4Ui7sWhOllqw/thT.YDcGpgTO2FCCNuq/ARzq1i',
            admin_role_id, 'active', 'UTC', NOW(), NOW())
    ON CONFLICT DO NOTHING
    RETURNING id INTO sage_id;

    -- Create role assignments (only for newly inserted users)
    IF matthew_id IS NOT NULL THEN
        INSERT INTO user_role_assignments (user_id, role_id, company_id, created_at, updated_at)
        VALUES (matthew_id, admin_role_id, NULL, NOW(), NOW())
        ON CONFLICT DO NOTHING;
    END IF;

    IF ilya_id IS NOT NULL THEN
        INSERT INTO user_role_assignments (user_id, role_id, company_id, created_at, updated_at)
        VALUES (ilya_id, admin_role_id, NULL, NOW(), NOW())
        ON CONFLICT DO NOTHING;
    END IF;

    IF sage_id IS NOT NULL THEN
        INSERT INTO user_role_assignments (user_id, role_id, company_id, created_at, updated_at)
        VALUES (sage_id, admin_role_id, NULL, NOW(), NOW())
        ON CONFLICT DO NOTHING;
    END IF;

END $$;
