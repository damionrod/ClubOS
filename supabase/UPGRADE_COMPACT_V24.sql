BEGIN;

-- ClubOS Compact v24
-- Simplifies public account creation. Team/subscription selection is intentionally
-- NOT handled during signup; it happens later through the member/team workflow.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_role_id uuid;
  v_member_id uuid;
  v_member_number text;
  v_country text;
BEGIN
  -- Always create/update the profile first.
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = now();

  -- Organisation is the only club selection required at account creation.
  BEGIN
    v_org_id := NULLIF(NEW.raw_user_meta_data->>'organisation_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_org_id := NULL;
  END;

  -- If no valid active organisation was supplied, preserve the auth/profile
  -- account instead of throwing an Auth database error.
  IF v_org_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.organisations o
       WHERE o.id = v_org_id
         AND o.status = 'active'
     )
  THEN
    RETURN NEW;
  END IF;

  SELECT r.id
  INTO v_role_id
  FROM public.roles r
  WHERE r.organisation_id = v_org_id
    AND lower(r.name) = 'member'
  ORDER BY r.is_default DESC, r.sort_order
  LIMIT 1;

  INSERT INTO public.organisation_users
    (organisation_id, user_id, role_id, is_owner, status)
  VALUES
    (v_org_id, NEW.id, v_role_id, false, 'active')
  ON CONFLICT (organisation_id, user_id) DO UPDATE
  SET role_id = COALESCE(EXCLUDED.role_id, public.organisation_users.role_id),
      status = 'active',
      updated_at = now();

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (organisation_id, user_id, role_id)
    VALUES (v_org_id, NEW.id, v_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT m.id
  INTO v_member_id
  FROM public.members m
  WHERE m.organisation_id = v_org_id
    AND m.user_id = NEW.id
  LIMIT 1;

  IF v_member_id IS NULL THEN
    v_member_number := 'M-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 10));

    SELECT CASE WHEN o.country = 'NZ' THEN 'New Zealand' ELSE o.country END
    INTO v_country
    FROM public.organisations o
    WHERE o.id = v_org_id;

    INSERT INTO public.members (
      organisation_id,
      user_id,
      member_number,
      first_name,
      last_name,
      email,
      status,
      joined_date,
      member_since,
      country
    )
    VALUES (
      v_org_id,
      NEW.id,
      v_member_number,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.email,
      'pending',
      CURRENT_DATE,
      CURRENT_DATE,
      v_country
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Do not allow a non-critical ClubOS profile/linking problem to make
  -- Supabase Auth fail with "Database error saving new user".
  RAISE WARNING 'ClubOS handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Ensure the auth trigger points at the current function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
