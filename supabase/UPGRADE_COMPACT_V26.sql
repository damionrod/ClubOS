
BEGIN;

-- ClubOS Compact v26
-- Creates real membership applications for self-signups and repairs existing
-- pending member accounts that have no application record.

-- Self-signup does not require a membership type, so an application may initially
-- have no membership type. The administrator chooses it during review/approval.
ALTER TABLE public.membership_applications
  ALTER COLUMN membership_type_id DROP NOT NULL;

-- Prevent duplicate applications for the same pending member.
CREATE UNIQUE INDEX IF NOT EXISTS membership_applications_resulting_member_unique
  ON public.membership_applications(resulting_member_id)
  WHERE resulting_member_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- Replace signup trigger so it creates:
-- Auth user -> profile -> organisation link -> pending member -> application
-- Team/subscription remain optional and are handled later.
-- ---------------------------------------------------------------------------
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
  -- Profile
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

  SELECT r.id
  INTO v_role_id
  FROM public.roles r
  WHERE r.organisation_id = v_org_id
    AND lower(r.name) = 'member'
  ORDER BY r.is_default DESC, r.sort_order, r.created_at
  LIMIT 1;

  -- Organisation access
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

  IF v_role_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.user_roles (organisation_id, user_id, role_id)
      VALUES (v_org_id, NEW.id, v_role_id)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'ClubOS user_roles link failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  -- Pending member record
  BEGIN
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
      )
      RETURNING id INTO v_member_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ClubOS member creation failed for %: %', NEW.id, SQLERRM;
    v_member_id := NULL;
  END;

  -- Membership application
  IF v_member_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.membership_applications (
        organisation_id,
        membership_type_id,
        first_name,
        last_name,
        email,
        country,
        status,
        submitted_at,
        resulting_member_id,
        custom_field_data
      )
      SELECT
        v_org_id,
        NULL,
        m.first_name,
        m.last_name,
        m.email,
        m.country,
        'submitted',
        now(),
        m.id,
        jsonb_build_object('source', 'self_signup')
      FROM public.members m
      WHERE m.id = v_member_id
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'ClubOS application creation failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- Backfill existing pending self-signup members that do not yet have an
-- application. This includes accounts already created under v24/v25.
-- ---------------------------------------------------------------------------
INSERT INTO public.membership_applications (
  organisation_id,
  membership_type_id,
  first_name,
  last_name,
  email,
  mobile,
  date_of_birth,
  address_line1,
  address_line2,
  city,
  region,
  postcode,
  country,
  status,
  submitted_at,
  resulting_member_id,
  custom_field_data
)
SELECT
  m.organisation_id,
  NULL,
  m.first_name,
  m.last_name,
  m.email,
  m.mobile,
  m.date_of_birth,
  m.address_line1,
  m.address_line2,
  m.city,
  m.region,
  m.postcode,
  m.country,
  'submitted',
  COALESCE(m.created_at, now()),
  m.id,
  jsonb_build_object('source', 'self_signup_backfill')
FROM public.members m
JOIN auth.users u ON u.id = m.user_id
WHERE m.status = 'pending'
  AND NOT EXISTS (
    SELECT 1
    FROM public.membership_applications a
    WHERE a.resulting_member_id = m.id
  );

COMMIT;

-- Verification
SELECT
  a.email,
  a.status AS application_status,
  a.submitted_at,
  m.member_number,
  m.status AS member_status,
  o.trading_name AS organisation
FROM public.membership_applications a
LEFT JOIN public.members m ON m.id = a.resulting_member_id
LEFT JOIN public.organisations o ON o.id = a.organisation_id
ORDER BY a.created_at DESC
LIMIT 20;
