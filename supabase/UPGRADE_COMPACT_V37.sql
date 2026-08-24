
BEGIN;

-- ClubOS Compact v37
-- Targeted enhancements only:
-- Group Type label (UI only), Communications -> Member News,
-- Committee roles/appointments, Organisations with multiple contacts,
-- and document attachments/member visibility.

-- ---------------------------------------------------------------------------
-- 1. Communications / News & Updates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  audience_membership_type_id uuid REFERENCES public.membership_types(id) ON DELETE SET NULL,
  attachment_path text,
  attachment_name text,
  attachment_type text,
  published_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_posts_org_published_idx
  ON public.news_posts(organisation_id, published_at DESC);

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS news_posts_select ON public.news_posts;
CREATE POLICY news_posts_select
ON public.news_posts
FOR SELECT TO authenticated
USING (
  public.is_org_admin_user(organisation_id)
  OR (
    status = 'published'
    AND published_at <= now()
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.organisation_id = news_posts.organisation_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND COALESCE(m.is_archived,false) = false
        AND (
          news_posts.audience_membership_type_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.memberships ms
            WHERE ms.member_id = m.id
              AND ms.organisation_id = m.organisation_id
              AND ms.membership_type_id = news_posts.audience_membership_type_id
              AND ms.status = 'active'
          )
        )
    )
  )
);

DROP POLICY IF EXISTS news_posts_manage ON public.news_posts;
CREATE POLICY news_posts_manage
ON public.news_posts
FOR ALL TO authenticated
USING (public.is_org_admin_user(organisation_id) OR public.is_platform_admin())
WITH CHECK (public.is_org_admin_user(organisation_id) OR public.is_platform_admin());


-- ---------------------------------------------------------------------------
-- 2. Committee appointments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.committee_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES public.committee_positions(id) ON DELETE RESTRICT,
  appointed_on date NOT NULL DEFAULT CURRENT_DATE,
  ended_on date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  appointed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS committee_appointments_active_uidx
  ON public.committee_appointments(organisation_id, member_id, position_id)
  WHERE status = 'active';

ALTER TABLE public.committee_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS committee_appointments_select ON public.committee_appointments;
CREATE POLICY committee_appointments_select
ON public.committee_appointments
FOR SELECT TO authenticated
USING (public.user_in_org(organisation_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS committee_appointments_manage ON public.committee_appointments;
CREATE POLICY committee_appointments_manage
ON public.committee_appointments
FOR ALL TO authenticated
USING (public.is_org_admin_user(organisation_id) OR public.is_platform_admin())
WITH CHECK (public.is_org_admin_user(organisation_id) OR public.is_platform_admin());

-- Backfill the existing committee flags into appointments when possible.
INSERT INTO public.committee_appointments (
  organisation_id, member_id, position_id, appointed_on, status
)
SELECT
  m.organisation_id,
  m.id,
  m.committee_position_id,
  COALESCE(m.member_since, CURRENT_DATE),
  'active'
FROM public.members m
WHERE COALESCE(m.is_committee_member,false) = true
  AND m.committee_position_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.committee_appointments ca
    WHERE ca.organisation_id = m.organisation_id
      AND ca.member_id = m.id
      AND ca.position_id = m.committee_position_id
      AND ca.status = 'active'
  );


-- ---------------------------------------------------------------------------
-- 3. Organisations & multiple contact persons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contact_organisations_org_name_uidx
  ON public.contact_organisations(organisation_id, lower(name));

CREATE TABLE IF NOT EXISTS public.contact_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_record_id uuid NOT NULL REFERENCES public.contact_organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  position text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_persons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_organisations_select ON public.contact_organisations;
CREATE POLICY contact_organisations_select
ON public.contact_organisations
FOR SELECT TO authenticated
USING (public.user_in_org(organisation_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS contact_organisations_manage ON public.contact_organisations;
CREATE POLICY contact_organisations_manage
ON public.contact_organisations
FOR ALL TO authenticated
USING (public.is_org_admin_user(organisation_id) OR public.is_platform_admin())
WITH CHECK (public.is_org_admin_user(organisation_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS contact_persons_select ON public.contact_persons;
CREATE POLICY contact_persons_select
ON public.contact_persons
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.contact_organisations co
    WHERE co.id = contact_persons.organisation_record_id
      AND (public.user_in_org(co.organisation_id) OR public.is_platform_admin())
  )
);

DROP POLICY IF EXISTS contact_persons_manage ON public.contact_persons;
CREATE POLICY contact_persons_manage
ON public.contact_persons
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.contact_organisations co
    WHERE co.id = contact_persons.organisation_record_id
      AND (public.is_org_admin_user(co.organisation_id) OR public.is_platform_admin())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.contact_organisations co
    WHERE co.id = contact_persons.organisation_record_id
      AND (public.is_org_admin_user(co.organisation_id) OR public.is_platform_admin())
  )
);

-- Convert existing single-contact organisation records into the new structure.
INSERT INTO public.contact_organisations (organisation_id, name, category, status)
SELECT DISTINCT
  oc.organisation_id,
  oc.company_name,
  oc.category,
  COALESCE(oc.status,'active')
FROM public.organisation_contacts oc
WHERE NOT EXISTS (
  SELECT 1
  FROM public.contact_organisations co
  WHERE co.organisation_id = oc.organisation_id
    AND lower(co.name) = lower(oc.company_name)
)
ON CONFLICT DO NOTHING;

INSERT INTO public.contact_persons (organisation_record_id, name, email, position, phone)
SELECT
  co.id,
  COALESCE(NULLIF(oc.contact_name,''),'General Contact'),
  oc.email,
  NULL,
  oc.phone
FROM public.organisation_contacts oc
JOIN public.contact_organisations co
  ON co.organisation_id = oc.organisation_id
 AND lower(co.name) = lower(oc.company_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.contact_persons cp
  WHERE cp.organisation_record_id = co.id
    AND lower(cp.name) = lower(COALESCE(NULLIF(oc.contact_name,''),'General Contact'))
    AND COALESCE(cp.email,'') = COALESCE(oc.email,'')
);


-- ---------------------------------------------------------------------------
-- 4. Document file attachments and member visibility
-- ---------------------------------------------------------------------------
ALTER TABLE public.club_documents
  ADD COLUMN IF NOT EXISTS file_path text;

ALTER TABLE public.club_documents
  ADD COLUMN IF NOT EXISTS file_name text;

ALTER TABLE public.club_documents
  ADD COLUMN IF NOT EXISTS file_type text;

ALTER TABLE public.club_documents
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.club_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demo_org_access ON public.club_documents;
DROP POLICY IF EXISTS club_documents_select ON public.club_documents;
DROP POLICY IF EXISTS club_documents_manage ON public.club_documents;

CREATE POLICY club_documents_select
ON public.club_documents
FOR SELECT TO authenticated
USING (
  public.is_org_admin_user(organisation_id)
  OR public.is_platform_admin()
  OR (
    visibility IN ('members','public')
    AND public.user_in_org(organisation_id)
  )
);

CREATE POLICY club_documents_manage
ON public.club_documents
FOR ALL TO authenticated
USING (public.is_org_admin_user(organisation_id) OR public.is_platform_admin())
WITH CHECK (public.is_org_admin_user(organisation_id) OR public.is_platform_admin());


-- ---------------------------------------------------------------------------
-- 5. Private attachment storage for communications and documents
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (
  id, name, public, file_size_limit,
  allowed_mime_types
)
VALUES (
  'club-record-files',
  'club-record-files',
  false,
  12582912,
  ARRAY[
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 12582912,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS club_record_files_select ON storage.objects;
CREATE POLICY club_record_files_select
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'club-record-files'
  AND public.user_in_org(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS club_record_files_insert ON storage.objects;
CREATE POLICY club_record_files_insert
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'club-record-files'
  AND public.is_org_admin_user(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS club_record_files_update ON storage.objects;
CREATE POLICY club_record_files_update
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'club-record-files'
  AND public.is_org_admin_user(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'club-record-files'
  AND public.is_org_admin_user(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS club_record_files_delete ON storage.objects;
CREATE POLICY club_record_files_delete
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'club-record-files'
  AND public.is_org_admin_user(((storage.foldername(name))[1])::uuid)
);

NOTIFY pgrst, 'reload schema';

COMMIT;
