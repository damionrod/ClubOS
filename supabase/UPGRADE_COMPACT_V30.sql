
BEGIN;

-- ClubOS Compact v30
-- Adds configurable committee positions to member profiles and makes the
-- Committee Member flag the authoritative eligibility source for
-- committee-only voting.

CREATE TABLE IF NOT EXISTS public.committee_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, name)
);

ALTER TABLE public.committee_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS committee_positions_select ON public.committee_positions;
CREATE POLICY committee_positions_select
ON public.committee_positions
FOR SELECT TO authenticated
USING (public.user_in_org(organisation_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS committee_positions_manage ON public.committee_positions;
CREATE POLICY committee_positions_manage
ON public.committee_positions
FOR ALL TO authenticated
USING (public.user_in_org(organisation_id) OR public.is_platform_admin())
WITH CHECK (public.user_in_org(organisation_id) OR public.is_platform_admin());

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS is_committee_member boolean NOT NULL DEFAULT false;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS committee_position_id uuid
  REFERENCES public.committee_positions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS members_committee_idx
  ON public.members(organisation_id, is_committee_member)
  WHERE is_committee_member = true;

-- Starter positions. Organisations can add/edit more later.
INSERT INTO public.committee_positions (organisation_id, name, sort_order)
SELECT o.id, p.name, p.sort_order
FROM public.organisations o
CROSS JOIN (
  VALUES
    ('President', 1),
    ('Vice President', 2),
    ('Secretary', 3),
    ('Treasurer', 4),
    ('Committee Member', 5)
) AS p(name, sort_order)
ON CONFLICT (organisation_id, name) DO NOTHING;

-- Committee-only voting now checks the member profile directly.
-- Legacy owner/role checks remain as a compatibility fallback.
CREATE OR REPLACE FUNCTION public.is_committee_user(
  p_org_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.organisation_id = p_org_id
        AND m.user_id = p_user_id
        AND m.status = 'active'
        AND COALESCE(m.is_archived, false) = false
        AND COALESCE(m.is_committee_member, false) = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.organisation_users ou
      LEFT JOIN public.roles r ON r.id = ou.role_id
      WHERE ou.organisation_id = p_org_id
        AND ou.user_id = p_user_id
        AND ou.status = 'active'
        AND (
          ou.is_owner = true
          OR lower(coalesce(r.name,'')) IN (
            'president','vice president','secretary','treasurer',
            'committee member','organisation owner','club owner',
            'chair','chairperson','committee'
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_committee_user(uuid,uuid) TO authenticated;

COMMIT;
