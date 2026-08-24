
BEGIN;

-- ClubOS Compact v21 FIXED upgrade.
-- Safe for an existing database where subscription_types was not created by v19.

-- 1) Create the base subscription table if it is missing.
CREATE TABLE IF NOT EXISTS public.subscription_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  billing_period text NOT NULL DEFAULT 'season'
    CHECK (billing_period IN ('season','annual','monthly','term','one_off')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_types_select ON public.subscription_types;
CREATE POLICY subscription_types_select
ON public.subscription_types
FOR SELECT TO authenticated
USING (
  public.user_in_org(organisation_id)
  OR public.is_platform_admin()
);

DROP POLICY IF EXISTS subscription_types_manage ON public.subscription_types;
CREATE POLICY subscription_types_manage
ON public.subscription_types
FOR ALL TO authenticated
USING (
  public.user_in_org(organisation_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.user_in_org(organisation_id)
  OR public.is_platform_admin()
);

-- 2) Ensure team/default-subscription fields from v19 exist.
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS subscription_type_id uuid
  REFERENCES public.subscription_types(id) ON DELETE SET NULL;

ALTER TABLE public.organisation_settings
  ADD COLUMN IF NOT EXISTS default_team_subscription_type_id uuid
  REFERENCES public.subscription_types(id) ON DELETE SET NULL;

-- 3) Add standard starter subscription options to each organisation.
INSERT INTO public.subscription_types
  (organisation_id, name, description, fee, billing_period, sort_order)
SELECT
  o.id,
  v.name,
  v.description,
  v.fee,
  'season',
  v.sort_order
FROM public.organisations o
CROSS JOIN (
  VALUES
    ('Full Time', 'Full-time participation for the season', 250.00::numeric, 1),
    ('Part Time', 'Part-time participation for the season', 150.00::numeric, 2),
    ('Casual', 'Casual participation for the season', 75.00::numeric, 3)
) AS v(name, description, fee, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subscription_types s
  WHERE s.organisation_id = o.id
    AND lower(s.name) = lower(v.name)
);

-- Set Full Time as a default only where no default has been selected.
UPDATE public.organisation_settings os
SET default_team_subscription_type_id = (
  SELECT s.id
  FROM public.subscription_types s
  WHERE s.organisation_id = os.organisation_id
    AND lower(s.name) = 'full time'
  ORDER BY s.sort_order
  LIMIT 1
)
WHERE os.default_team_subscription_type_id IS NULL;

UPDATE public.teams t
SET subscription_type_id = (
  SELECT s.id
  FROM public.subscription_types s
  WHERE s.organisation_id = t.organisation_id
    AND lower(s.name) = 'full time'
  ORDER BY s.sort_order
  LIMIT 1
)
WHERE t.subscription_type_id IS NULL;

-- 4) Apply the v21 season/team subscription upgrade.

-- Season/team based subscriptions.
ALTER TABLE public.subscription_types ADD COLUMN IF NOT EXISTS sport_id uuid REFERENCES public.sports(id) ON DELETE CASCADE;
ALTER TABLE public.subscription_types ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.subscription_types ADD COLUMN IF NOT EXISTS season text;
CREATE INDEX IF NOT EXISTS subscription_types_sport_idx ON public.subscription_types(sport_id);
CREATE INDEX IF NOT EXISTS subscription_types_team_idx ON public.subscription_types(team_id);
DROP INDEX IF EXISTS public.subscription_types_org_name_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS subscription_types_scope_name_uidx ON public.subscription_types(organisation_id, lower(name), COALESCE(sport_id,'00000000-0000-0000-0000-000000000000'::uuid), COALESCE(team_id,'00000000-0000-0000-0000-000000000000'::uuid), COALESCE(season,''));

ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS subscription_type_id uuid REFERENCES public.subscription_types(id) ON DELETE SET NULL;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS subscription_fee numeric(12,2);
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS subscribed_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS team_members_subscription_idx ON public.team_members(subscription_type_id);

-- Backfill current player assignments from each team's default subscription.
UPDATE public.team_members tm
SET subscription_type_id = t.subscription_type_id,
    subscription_fee = st.fee
FROM public.teams t
LEFT JOIN public.subscription_types st ON st.id=t.subscription_type_id
WHERE tm.team_id=t.id
  AND tm.role='player'
  AND tm.subscription_type_id IS NULL;

-- Public-safe signup subscriptions for a selected team.
CREATE OR REPLACE FUNCTION public.get_signup_team_subscriptions(p_org_id uuid, p_team_id uuid)
RETURNS TABLE(id uuid, name text, fee numeric, billing_period text, season text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.fee, s.billing_period,
         COALESCE(s.season,t.season) AS season
  FROM subscription_types s
  JOIN teams t ON t.id=p_team_id AND t.organisation_id=p_org_id
  WHERE s.organisation_id=p_org_id
    AND s.is_active=true
    AND (s.team_id IS NULL OR s.team_id=t.id)
    AND (s.sport_id IS NULL OR s.sport_id=t.sport_id)
    AND (s.season IS NULL OR t.season IS NULL OR s.season=t.season)
  ORDER BY CASE WHEN s.team_id=t.id THEN 0 WHEN s.sport_id=t.sport_id THEN 1 ELSE 2 END,
           s.sort_order, s.name;
$$;
GRANT EXECUTE ON FUNCTION public.get_signup_team_subscriptions(uuid,uuid) TO anon, authenticated;

-- Signup trigger stores selected season subscription.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid; v_team_id uuid; v_subscription_id uuid; v_role_id uuid; v_member_id uuid;
  v_member_number text; v_team_season text; v_sub_fee numeric;
BEGIN
  INSERT INTO profiles (id,email,first_name,last_name)
  VALUES (NEW.id,NEW.email,COALESCE(NEW.raw_user_meta_data->>'first_name',''),COALESCE(NEW.raw_user_meta_data->>'last_name',''))
  ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,updated_at=now();
  BEGIN v_org_id:=NULLIF(NEW.raw_user_meta_data->>'organisation_id','')::uuid; EXCEPTION WHEN invalid_text_representation THEN v_org_id:=NULL; END;
  BEGIN v_team_id:=NULLIF(NEW.raw_user_meta_data->>'team_id','')::uuid; EXCEPTION WHEN invalid_text_representation THEN v_team_id:=NULL; END;
  BEGIN v_subscription_id:=NULLIF(NEW.raw_user_meta_data->>'subscription_type_id','')::uuid; EXCEPTION WHEN invalid_text_representation THEN v_subscription_id:=NULL; END;
  IF v_org_id IS NULL OR NOT EXISTS(SELECT 1 FROM organisations o WHERE o.id=v_org_id AND o.status='active') THEN RETURN NEW; END IF;
  SELECT r.id INTO v_role_id FROM roles r WHERE r.organisation_id=v_org_id AND lower(r.name)='member' ORDER BY r.is_default DESC,r.sort_order LIMIT 1;
  INSERT INTO organisation_users(organisation_id,user_id,role_id,is_owner,status) VALUES(v_org_id,NEW.id,v_role_id,false,'active')
  ON CONFLICT (organisation_id,user_id) DO UPDATE SET role_id=COALESCE(EXCLUDED.role_id,organisation_users.role_id),status='active',updated_at=now();
  IF v_role_id IS NOT NULL THEN INSERT INTO user_roles(organisation_id,user_id,role_id) VALUES(v_org_id,NEW.id,v_role_id) ON CONFLICT DO NOTHING; END IF;
  SELECT m.id INTO v_member_id FROM members m WHERE m.organisation_id=v_org_id AND m.user_id=NEW.id LIMIT 1;
  IF v_member_id IS NULL THEN
    v_member_number:='M-'||upper(substr(replace(NEW.id::text,'-',''),1,10));
    INSERT INTO members(organisation_id,user_id,member_number,first_name,last_name,email,status,joined_date,member_since,country)
    VALUES(v_org_id,NEW.id,v_member_number,COALESCE(NEW.raw_user_meta_data->>'first_name',''),COALESCE(NEW.raw_user_meta_data->>'last_name',''),NEW.email,'pending',CURRENT_DATE,CURRENT_DATE,(SELECT CASE WHEN o.country='NZ' THEN 'New Zealand' ELSE o.country END FROM organisations o WHERE o.id=v_org_id)) RETURNING id INTO v_member_id;
  END IF;
  IF v_team_id IS NOT NULL THEN
    SELECT t.season INTO v_team_season FROM teams t WHERE t.id=v_team_id AND t.organisation_id=v_org_id AND t.status='active' AND COALESCE(t.is_archived,false)=false;
    IF FOUND THEN
      IF v_subscription_id IS NOT NULL THEN
        SELECT s.fee INTO v_sub_fee FROM subscription_types s JOIN teams t ON t.id=v_team_id
        WHERE s.id=v_subscription_id AND s.organisation_id=v_org_id AND s.is_active=true
          AND (s.team_id IS NULL OR s.team_id=t.id) AND (s.sport_id IS NULL OR s.sport_id=t.sport_id)
          AND (s.season IS NULL OR t.season IS NULL OR s.season=t.season);
        IF NOT FOUND THEN v_subscription_id:=NULL; v_sub_fee:=NULL; END IF;
      END IF;
      IF v_subscription_id IS NULL THEN
        SELECT t.subscription_type_id, s.fee INTO v_subscription_id,v_sub_fee FROM teams t LEFT JOIN subscription_types s ON s.id=t.subscription_type_id WHERE t.id=v_team_id;
      END IF;
      INSERT INTO team_members(organisation_id,team_id,member_id,season,role,subscription_type_id,subscription_fee,subscription_status)
      VALUES(v_org_id,v_team_id,v_member_id,v_team_season,'player',v_subscription_id,v_sub_fee,'active') ON CONFLICT (team_id,member_id,season) DO UPDATE SET subscription_type_id=EXCLUDED.subscription_type_id,subscription_fee=EXCLUDED.subscription_fee,subscription_status='active',updated_at=now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
