-- Remove demo admin accounts
DELETE FROM user_role_assignments
WHERE user_id IN (
    SELECT id FROM users WHERE email IN (
        'matthew@liferisesolutions.com',
        'b3lous.ilya@gmail.com',
        'thesage@northstarcoding.com'
    )
);

DELETE FROM users
WHERE email IN (
    'matthew@liferisesolutions.com',
    'b3lous.ilya@gmail.com',
    'thesage@northstarcoding.com'
);
