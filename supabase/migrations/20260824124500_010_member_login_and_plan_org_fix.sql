/*
  ClubOS patch 010
  - Ensures the dedicated Member Portal demo login exists and has password DemoClub2025!
  - Repairs Supabase Auth text-token fields for the demo member
  - Links the member login to its profile, organisation role, and DSC-000002 member record
  - Ensures subscription plans are active and available to Create Organisation dropdown
*/
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  member_user_id uuid;
  demo_org_id uuid;
  member_role_id uuid;
BEGIN
  SELECT id INTO member_user_id FROM auth.users WHERE lower(email)='member@demosportsclub.example' LIMIT 1;

  IF member_user_id IS NULL THEN
    member_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
      created_at,updated_at,raw_app_meta_data,raw_user_meta_data,
      confirmation_token,recovery_token,email_change,email_change_token_new,
      email_change_token_current,phone_change,phone_change_token,reauthentication_token,
      is_sso_user,is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',member_user_id,'authenticated','authenticated',
      'member@demosportsclub.example',crypt('DemoClub2025!',gen_salt('bf')),now(),now(),now(),
      '{"provider":"email","providers":["email"]}','{"first_name":"Sarah","last_name":"Connors"}',
      '','','','','','','','',false,false
    );
  ELSE
    UPDATE auth.users SET
      encrypted_password=crypt('DemoClub2025!',gen_salt('bf')),
      email_confirmed_at=COALESCE(email_confirmed_at,now()),
      confirmation_token=COALESCE(confirmation_token,''), recovery_token=COALESCE(recovery_token,''),
      email_change=COALESCE(email_change,''), email_change_token_new=COALESCE(email_change_token_new,''),
      email_change_token_current=COALESCE(email_change_token_current,''), phone_change=COALESCE(phone_change,''),
      phone_change_token=COALESCE(phone_change_token,''), reauthentication_token=COALESCE(reauthentication_token,''),
      updated_at=now()
    WHERE id=member_user_id;
  END IF;

  INSERT INTO profiles(id,email,first_name,last_name,is_platform_admin)
  VALUES(member_user_id,'member@demosportsclub.example','Sarah','Connors',false)
  ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,updated_at=now();

  SELECT id INTO demo_org_id FROM organisations WHERE slug='demo-sports-club' LIMIT 1;
  SELECT id INTO member_role_id FROM roles WHERE organisation_id=demo_org_id AND name='Member' LIMIT 1;

  IF demo_org_id IS NOT NULL AND member_role_id IS NOT NULL THEN
    INSERT INTO organisation_users(organisation_id,user_id,role_id,is_owner,status)
    VALUES(demo_org_id,member_user_id,member_role_id,false,'active')
    ON CONFLICT(organisation_id,user_id) DO UPDATE SET role_id=EXCLUDED.role_id,status='active',is_owner=false,updated_at=now();

    INSERT INTO user_roles(organisation_id,user_id,role_id)
    VALUES(demo_org_id,member_user_id,member_role_id)
    ON CONFLICT(organisation_id,user_id,role_id) DO NOTHING;

    UPDATE members SET user_id=member_user_id,updated_at=now()
    WHERE organisation_id=demo_org_id AND member_number='DSC-000002';
  END IF;
END $$;

UPDATE subscription_plans SET is_active=true WHERE name IN ('Starter','Club','Professional');

SELECT email,email_confirmed_at FROM auth.users WHERE email='member@demosportsclub.example';
SELECT name,price,billing_cycle,is_active FROM subscription_plans ORDER BY sort_order;
