
BEGIN;

-- ClubOS Compact v25
-- Repairs existing signup accounts that were created successfully in Supabase Auth
-- but were not linked to their selected organisation, and replaces the signup
-- trigger so optional member-record errors cannot roll back organisation access.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_role_id uuid;
  v_member_number text;
  v_country text;
BEGIN
  -- 1. Profile: keep this isolated so later optional work cannot roll it back.
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ClubOS profile creation failed for %: %', NEW.id, SQLERRM;
  END;

  -- 2. Read selected organisation from signup metadata.
  BEGIN
    v_org_id := NULLIF(NEW.raw_user_meta_data->>'organisation_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_org_id := NULL;
  END;

  IF v_org_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organisations o WHERE o.id = v_org_id
  ) THEN
    RETURN NEW;
  END IF;

  -- 3. Find the Member role if available. Organisation access does not depend on it.
  SELECT r.id
    INTO v_role_id
  FROM public.roles r
  WHERE r.organisation_id = v_org_id
    AND lower(r.name) = 'member'
  ORDER BY r.is_default DESC, r.sort_order, r.created_at
  LIMIT 1;

  -- 4. CRITICAL: organisation link. Keep this in its own block.
  BEGIN
    INSERT INTO public.organisation_users
      (organisation_id, user_id, role_id, is_owner, status)
    VALUES
      (v_org_id, NEW.id, v_role_id, false, 'active')
    ON CONFLICT (organisation_id, user_id) DO UPDATE
    SET role_id = COALESCE(EXCLUDED.role_id, public.organisation_users.role_id),
        status = 'active',
        updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ClubOS organisation link failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
  END;

  -- 5. Secondary role mapping is useful but must never remove organisation access.
  IF v_role_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.user_roles (organisation_id, user_id, role_id)
      VALUES (v_org_id, NEW.id, v_role_id)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'ClubOS user_roles link failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  -- 6. Member record is optional at signup and isolated from access creation.
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.organisation_id = v_org_id
        AND m.user_id = NEW.id
    ) THEN
      v_member_number := 'M-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 10));

      SELECT CASE
               WHEN o.country = 'NZ' THEN 'New Zealand'
               ELSE o.country
             END
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ClubOS member creation failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------
-- REPAIR ACCOUNTS ALREADY CREATED BY THE v24 SIGNUP FLOW
-- ------------------------------------------------------------

-- Ensure profiles exist for auth users that selected an organisation.
INSERT INTO public.profiles (id, email, first_name, last_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', ''),
  COALESCE(u.raw_user_meta_data->>'last_name', '')
FROM auth.users u
WHERE NULLIF(u.raw_user_meta_data->>'organisation_id', '') IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    first_name = CASE
      WHEN COALESCE(public.profiles.first_name, '') = '' THEN EXCLUDED.first_name
      ELSE public.profiles.first_name
    END,
    last_name = CASE
      WHEN COALESCE(public.profiles.last_name, '') = '' THEN EXCLUDED.last_name
      ELSE public.profiles.last_name
    END,
    updated_at = now();

-- Restore organisation access from the organisation selected during signup.
INSERT INTO public.organisation_users (
  organisation_id,
  user_id,
  role_id,
  is_owner,
  status
)
SELECT
  o.id,
  u.id,
  (
    SELECT r.id
    FROM public.roles r
    WHERE r.organisation_id = o.id
      AND lower(r.name) = 'member'
    ORDER BY r.is_default DESC, r.sort_order, r.created_at
    LIMIT 1
  ),
  false,
  'active'
FROM auth.users u
JOIN public.organisations o
  ON o.id::text = u.raw_user_meta_data->>'organisation_id'
WHERE NULLIF(u.raw_user_meta_data->>'organisation_id', '') IS NOT NULL
ON CONFLICT (organisation_id, user_id) DO UPDATE
SET role_id = COALESCE(EXCLUDED.role_id, public.organisation_users.role_id),
    status = 'active',
    updated_at = now();

-- Restore user_roles where a Member role exists.
INSERT INTO public.user_roles (organisation_id, user_id, role_id)
SELECT
  ou.organisation_id,
  ou.user_id,
  ou.role_id
FROM public.organisation_users ou
JOIN auth.users u ON u.id = ou.user_id
WHERE ou.role_id IS NOT NULL
  AND NULLIF(u.raw_user_meta_data->>'organisation_id', '') IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;


-- Verification: after running the migration, this query should show the newly
-- created account with organisation and active status.
SELECT
  u.email,
  o.trading_name AS organisation,
  r.name AS role,
  ou.status
FROM auth.users u
LEFT JOIN public.organisation_users ou ON ou.user_id = u.id
LEFT JOIN public.organisations o ON o.id = ou.organisation_id
LEFT JOIN public.roles r ON r.id = ou.role_id
WHERE NULLIF(u.raw_user_meta_data->>'organisation_id', '') IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 20;
