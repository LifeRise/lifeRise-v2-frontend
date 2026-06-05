-- Remove seeded roles and permissions
DELETE FROM `role_permissions` WHERE `created_at` >= (SELECT MIN(`created_at`) FROM `roles`);
DELETE FROM `permissions`;
DELETE FROM `roles`;
