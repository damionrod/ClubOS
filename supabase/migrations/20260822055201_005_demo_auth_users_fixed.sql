/*
# Club Management Platform — Demo Auth Users (fixed)

## Overview
Creates 6 demo auth users with known passwords for testing.
All passwords are "DemoClub2025!" (bcrypt hashed via pgcrypto).
Links each user to Demo Sports Club with appropriate roles.

## Demo Users
1. owner@demosportsclub.example — Organisation Owner
2. secretary@demosportsclub.example — Secretary
3. treasurer@demosportsclub.example — Treasurer
4. teammanager@demosportsclub.example — Team Manager
5. readonly@demosportsclub.example — Read Only Administrator
6. platform.admin@clubos.example — Platform Super Admin

All passwords: DemoClub2025!
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Delete existing demo users if any (cleanup for re-runs)
DELETE FROM auth.users WHERE email IN (
  'owner@demosportsclub.example',
  'secretary@demosportsclub.example',
  'treasurer@demosportsclub.example',
  'teammanager@demosportsclub.example',
  'readonly@demosportsclub.example',
  'platform.admin@clubos.example'
);

-- Create auth users
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, is_sso_user, is_anonymous
) VALUES
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'owner@demosportsclub.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"James","last_name":"Wilson"}',
   '', '', false, false
  ),
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'secretary@demosportsclub.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Sarah","last_name":"Connors"}',
   '', '', false, false
  ),
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'treasurer@demosportsclub.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Robert","last_name":"Jones"}',
   '', '', false, false
  ),
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'teammanager@demosportsclub.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"David","last_name":"Thompson"}',
   '', '', false, false
  ),
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'readonly@demosportsclub.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Helen","last_name":"Taylor"}',
   '', '', false, false
  ),
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'platform.admin@clubos.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Platform","last_name":"Admin"}',
   '', '', false, false
  );

-- Link users to Demo Sports Club with roles
INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Organisation Owner'),
  true, 'active'
FROM auth.users u WHERE u.email = 'owner@demosportsclub.example'
ON CONFLICT (organisation_id, user_id) DO NOTHING;

INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Secretary'),
  false, 'active'
FROM auth.users u WHERE u.email = 'secretary@demosportsclub.example'
ON CONFLICT (organisation_id, user_id) DO NOTHING;

INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Treasurer'),
  false, 'active'
FROM auth.users u WHERE u.email = 'treasurer@demosportsclub.example'
ON CONFLICT (organisation_id, user_id) DO NOTHING;

INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Team Manager'),
  false, 'active'
FROM auth.users u WHERE u.email = 'teammanager@demosportsclub.example'
ON CONFLICT (organisation_id, user_id) DO NOTHING;

INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Read Only Administrator'),
  false, 'active'
FROM auth.users u WHERE u.email = 'readonly@demosportsclub.example'
ON CONFLICT (organisation_id, user_id) DO NOTHING;

-- Assign user_roles
INSERT INTO user_roles (organisation_id, user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Organisation Owner')
FROM auth.users u WHERE u.email = 'owner@demosportsclub.example'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (organisation_id, user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Secretary')
FROM auth.users u WHERE u.email = 'secretary@demosportsclub.example'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (organisation_id, user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Treasurer')
FROM auth.users u WHERE u.email = 'treasurer@demosportsclub.example'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (organisation_id, user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Team Manager')
FROM auth.users u WHERE u.email = 'teammanager@demosportsclub.example'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (organisation_id, user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Read Only Administrator')
FROM auth.users u WHERE u.email = 'readonly@demosportsclub.example'
ON CONFLICT DO NOTHING;

-- Set platform admin flag for platform.admin user
UPDATE profiles SET is_platform_admin = true
WHERE email = 'platform.admin@clubos.example';

-- Link the owner's profile to their member record
UPDATE members SET user_id = (
  SELECT id FROM auth.users WHERE email = 'owner@demosportsclub.example'
)
WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND member_number = 'DSC-000001';

-- Link team manager to their member record
UPDATE members SET user_id = (
  SELECT id FROM auth.users WHERE email = 'teammanager@demosportsclub.example'
)
WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND member_number = 'DSC-000005';
