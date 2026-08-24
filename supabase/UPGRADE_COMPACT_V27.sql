
BEGIN;

-- ClubOS Compact v27
-- Fixes self-signup routing data:
--   * Member-role self-signups remain pending until admin approval.
--   * Missing member records are created.
--   * Missing membership applications are created.
--   * Future signups create both records automatically.
-- Team and subscription are still selected later.

ALTER TABLE public.membership_applications
  ALTER COLUMN membership_type_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS membership_applications_resulting_member_unique
  ON public.membership_applications(resulting_member_id)
  WHERE resulting_member_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- Repair existing self-signup users that have an organisation saved in Auth
-- metadata and an organisation Member role.
-- ---------------------------------------------------------------------------

-- Ensure profiles exist.
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
    updated_at = now();

-- Ensure organisation link exists and uses the Member role for self-signups.
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
  r.id,
  false,
  'active'
FROM auth.users u
JOIN public.organisations o
  ON o.id::text = u.raw_user_meta_data->>'organisation_id'
JOIN public.roles r
  ON r.organisation_id = o.id
 AND lower(r.name) = 'member'
WHERE NULLIF(u.raw_user_meta_data->>'organisation_id', '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.organisation_users existing
    WHERE existing.user_id = u.id
      AND existing.is_owner = true
  )
ON CONFLICT (organisation_id, user_id) DO UPDATE
SET role_id = EXCLUDED.role_id,
    status = 'active',
    updated_at = now();

-- Ensure Member role mapping exists.
INSERT INTO public.user_roles (organisation_id, user_id, role_id)
SELECT
  ou.organisation_id,
  ou.user_id,
  ou.role_id
FROM public.organisation_users ou
JOIN public.roles r ON r.id = ou.role_id
JOIN auth.users u ON u.id = ou.user_id
WHERE lower(r.name) = 'member'
  AND NULLIF(u.raw_user_meta_data->>'organisation_id', '') IS NOT NULL
ON CONFLICT DO NOTHING;

-- Create a pending member record for self-signups that do not yet have one.
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
SELECT
  o.id,
  u.id,
  'M-' || upper(substr(replace(u.id::text, '-', ''), 1, 10)),
  COALESCE(NULLIF(u.raw_user_meta_data->>'first_name', ''), split_part(COALESCE(u.email,''), '@', 1)),
  COALESCE(u.raw_user_meta_data->>'last_name', ''),
  u.email,
  'pending',
  CURRENT_DATE,
  CURRENT_DATE,
  CASE WHEN o.country = 'NZ' THEN 'New Zealand' ELSE o.country END
FROM auth.users u
JOIN public.organisations o
  ON o.id::text = u.raw_user_meta_data->>'organisation_id'
JOIN public.organisation_users ou
  ON ou.user_id = u.id
 AND ou.organisation_id = o.id
JOIN public.roles r
  ON r.id = ou.role_id
 AND lower(r.name) = 'member'
WHERE NULLIF(u.raw_user_meta_data->>'organisation_id', '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.organisation_id = o.id
      AND m.user_id = u.id
  );

-- If a self-signup member has no membership/application yet, make sure their
-- state is pending rather than accidentally treating them as an active member.
UPDATE public.members m
SET status = 'pending',
    updated_at = now()
FROM auth.users u,
     public.organisation_users ou,
     public.roles r
WHERE m.user_id = u.id
  AND ou.user_id = u.id
  AND ou.organisation_id = m.organisation_id
  AND r.id = ou.role_id
  AND lower(r.name) = 'member'
  AND NULLIF(u.raw_user_meta_data->>'organisation_id', '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.memberships ms
    WHERE ms.member_id = m.id
      AND ms.status = 'active'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.membership_applications a
    WHERE a.resulting_member_id = m.id
      AND a.status = 'approved'
  );

-- Create missing applications.
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
  jsonb_build_object('source', 'self_signup_repair')
FROM public.members m
JOIN auth.users u ON u.id = m.user_id
JOIN public.organisation_users ou
  ON ou.user_id = u.id
 AND ou.organisation_id = m.organisation_id
JOIN public.roles r
  ON r.id = ou.role_id
 AND lower(r.name) = 'member'
WHERE NULLIF(u.raw_user_meta_data->>'organisation_id', '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.membership_applications a
    WHERE a.resulting_member_id = m.id
  );


-- ---------------------------------------------------------------------------
-- Future signup trigger
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

  -- Organisation link
  BEGIN
    INSERT INTO public.organisation_users
      (organisation_id, user_id, role_id, is_owner, status)
    VALUES
      (v_org_id, NEW.id, v_role_id, false, 'active')
    ON CONFLICT (organisation_id, user_id) DO UPDATE
    SET role_id = EXCLUDED.role_id,
        is_owner = false,
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
      RAISE WARNING 'ClubOS role mapping failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  -- Pending member
  BEGIN
    SELECT m.id INTO v_member_id
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
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name',''), split_part(COALESCE(NEW.email,''),'@',1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NEW.email,
        'pending',
        CURRENT_DATE,
        CURRENT_DATE,
        v_country
      )
      RETURNING id INTO v_member_id;
    ELSE
      UPDATE public.members
      SET status = 'pending',
          updated_at = now()
      WHERE id = v_member_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ClubOS member creation failed for %: %', NEW.id, SQLERRM;
    v_member_id := NULL;
  END;

  -- Submitted application
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
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;


-- Verification: newly/self-created member accounts should now show here.
SELECT
  u.email,
  r.name AS role,
  m.member_number,
  m.status AS member_status,
  a.status AS application_status,
  o.trading_name AS organisation
FROM auth.users u
LEFT JOIN public.organisation_users ou ON ou.user_id = u.id
LEFT JOIN public.roles r ON r.id = ou.role_id
LEFT JOIN public.members m
  ON m.user_id = u.id
 AND m.organisation_id = ou.organisation_id
LEFT JOIN public.membership_applications a
  ON a.resulting_member_id = m.id
LEFT JOIN public.organisations o ON o.id = ou.organisation_id
WHERE NULLIF(u.raw_user_meta_data->>'organisation_id', '') IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 20;
