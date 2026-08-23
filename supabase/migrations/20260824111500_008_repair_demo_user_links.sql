/*
# Repair demo user -> organisation links

Safe to run after 001-007. This does not recreate auth users. It repairs
profiles, organisation_users, user_roles and member links using the CURRENT
auth.users IDs so a re-created demo login remains attached to Demo Sports Club.
*/

DO $$
DECLARE
  demo_org_id uuid;
BEGIN
  SELECT id INTO demo_org_id
  FROM organisations
  WHERE slug = 'demo-sports-club'
     OR lower(trading_name) = 'demo sports club'
     OR lower(legal_name) = 'demo sports club incorporated'
  ORDER BY created_at
  LIMIT 1;

  IF demo_org_id IS NULL THEN
    RAISE EXCEPTION 'Demo Sports Club organisation could not be found';
  END IF;

  -- Ensure profiles match the current auth.users IDs.
  INSERT INTO profiles (id, email, first_name, last_name, is_platform_admin)
  SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'first_name', 'Demo'),
    COALESCE(u.raw_user_meta_data->>'last_name', 'User'),
    (u.email = 'platform.admin@clubos.example')
  FROM auth.users u
  WHERE u.email IN (
    'owner@demosportsclub.example',
    'secretary@demosportsclub.example',
    'treasurer@demosportsclub.example',
    'teammanager@demosportsclub.example',
    'readonly@demosportsclub.example',
    'member@demosportsclub.example',
    'platform.admin@clubos.example'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_platform_admin = profiles.is_platform_admin OR EXCLUDED.is_platform_admin,
    updated_at = now();

  -- Upsert all club-facing demo users against the current auth/profile IDs.
  INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
  SELECT
    demo_org_id,
    p.id,
    r.id,
    (p.email = 'owner@demosportsclub.example'),
    'active'
  FROM profiles p
  JOIN roles r
    ON r.organisation_id = demo_org_id
   AND r.name = CASE p.email
     WHEN 'owner@demosportsclub.example' THEN 'Organisation Owner'
     WHEN 'secretary@demosportsclub.example' THEN 'Secretary'
     WHEN 'treasurer@demosportsclub.example' THEN 'Treasurer'
     WHEN 'teammanager@demosportsclub.example' THEN 'Team Manager'
     WHEN 'readonly@demosportsclub.example' THEN 'Read Only Administrator'
     WHEN 'member@demosportsclub.example' THEN 'Member'
   END
  WHERE p.email IN (
    'owner@demosportsclub.example',
    'secretary@demosportsclub.example',
    'treasurer@demosportsclub.example',
    'teammanager@demosportsclub.example',
    'readonly@demosportsclub.example',
    'member@demosportsclub.example'
  )
  ON CONFLICT (organisation_id, user_id) DO UPDATE SET
    role_id = EXCLUDED.role_id,
    is_owner = EXCLUDED.is_owner,
    status = 'active',
    updated_at = now();

  INSERT INTO user_roles (organisation_id, user_id, role_id)
  SELECT ou.organisation_id, ou.user_id, ou.role_id
  FROM organisation_users ou
  WHERE ou.organisation_id = demo_org_id
    AND ou.role_id IS NOT NULL
  ON CONFLICT (organisation_id, user_id, role_id) DO NOTHING;

  -- Attach representative member records to their current login IDs.
  UPDATE members
  SET user_id = (SELECT id FROM profiles WHERE email = 'owner@demosportsclub.example' LIMIT 1),
      updated_at = now()
  WHERE organisation_id = demo_org_id AND member_number = 'DSC-000001';

  UPDATE members
  SET user_id = (SELECT id FROM profiles WHERE email = 'member@demosportsclub.example' LIMIT 1),
      updated_at = now()
  WHERE organisation_id = demo_org_id AND member_number = 'DSC-000002';

  UPDATE members
  SET user_id = (SELECT id FROM profiles WHERE email = 'teammanager@demosportsclub.example' LIMIT 1),
      updated_at = now()
  WHERE organisation_id = demo_org_id AND member_number = 'DSC-000005';
END $$;

-- Verification result: all existing demo logins should appear here with their club role.
SELECT
  p.email,
  o.trading_name AS organisation,
  r.name AS role,
  ou.is_owner,
  ou.status
FROM organisation_users ou
JOIN profiles p ON p.id = ou.user_id
JOIN organisations o ON o.id = ou.organisation_id
LEFT JOIN roles r ON r.id = ou.role_id
WHERE p.email IN (
  'owner@demosportsclub.example',
  'secretary@demosportsclub.example',
  'treasurer@demosportsclub.example',
  'teammanager@demosportsclub.example',
  'readonly@demosportsclub.example',
  'member@demosportsclub.example'
)
ORDER BY p.email;
