BEGIN;

-- ClubOS Compact v22
-- Team roster subscriptions + team logos + member payment obligations.

-- ------------------------------------------------------------------
-- Ensure subscription structure exists even if an earlier upgrade was skipped.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  billing_period text NOT NULL DEFAULT 'season',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_types ADD COLUMN IF NOT EXISTS sport_id uuid REFERENCES public.sports(id) ON DELETE CASCADE;
ALTER TABLE public.subscription_types ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.subscription_types ADD COLUMN IF NOT EXISTS season text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS subscription_type_id uuid REFERENCES public.subscription_types(id) ON DELETE SET NULL;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS subscription_fee numeric(12,2);
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS subscribed_at timestamptz NOT NULL DEFAULT now();

-- Team subscription is no longer a team-level setting. Keep the old column for
-- backward compatibility but clear it so new behaviour is entirely per player.
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS subscription_type_id uuid REFERENCES public.subscription_types(id) ON DELETE SET NULL;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS logo_url text;
UPDATE public.teams SET subscription_type_id = NULL WHERE subscription_type_id IS NOT NULL;

-- Team logo storage.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('team-logos','team-logos',true,5242880,ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=5242880,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'];

DROP POLICY IF EXISTS team_logos_insert ON storage.objects;
CREATE POLICY team_logos_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id='team-logos'
  AND public.can_manage_teams(((storage.foldername(name))[1])::uuid)
);
DROP POLICY IF EXISTS team_logos_update ON storage.objects;
CREATE POLICY team_logos_update ON storage.objects FOR UPDATE TO authenticated
USING(bucket_id='team-logos' AND public.can_manage_teams(((storage.foldername(name))[1])::uuid))
WITH CHECK(bucket_id='team-logos' AND public.can_manage_teams(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS team_logos_delete ON storage.objects;
CREATE POLICY team_logos_delete ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='team-logos' AND public.can_manage_teams(((storage.foldername(name))[1])::uuid));

-- Tighten team writes to users who can manage teams.
DROP POLICY IF EXISTS "teams_modify" ON public.teams;
CREATE POLICY "teams_modify" ON public.teams FOR ALL TO authenticated
USING(public.can_manage_teams(organisation_id) OR public.is_platform_admin())
WITH CHECK(public.can_manage_teams(organisation_id) OR public.is_platform_admin());

-- ------------------------------------------------------------------
-- Per-member subscription charges.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_subscription_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL UNIQUE REFERENCES public.team_members(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  subscription_type_id uuid REFERENCES public.subscription_types(id) ON DELETE SET NULL,
  season text,
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK(amount>=0),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','waived','cancelled','refunded')),
  due_date date,
  paid_at timestamptz,
  payment_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_subscription_charges_member_idx ON public.member_subscription_charges(member_id,status);
ALTER TABLE public.member_subscription_charges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS member_subscription_charges_select ON public.member_subscription_charges;
CREATE POLICY member_subscription_charges_select ON public.member_subscription_charges FOR SELECT TO authenticated
USING(
 public.can_manage_teams(organisation_id)
 OR public.is_platform_admin()
 OR EXISTS(SELECT 1 FROM public.members m WHERE m.id=member_id AND m.user_id=auth.uid())
);
DROP POLICY IF EXISTS member_subscription_charges_admin_manage ON public.member_subscription_charges;
CREATE POLICY member_subscription_charges_admin_manage ON public.member_subscription_charges FOR ALL TO authenticated
USING(public.can_manage_teams(organisation_id) OR public.is_platform_admin())
WITH CHECK(public.can_manage_teams(organisation_id) OR public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.sync_team_member_subscription_charge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_team_name text; v_sub_name text; v_amount numeric(12,2); v_due date;
BEGIN
 IF NEW.role <> 'player' THEN RETURN NEW; END IF;
 SELECT name INTO v_team_name FROM teams WHERE id=NEW.team_id;
 SELECT name,fee INTO v_sub_name,v_amount FROM subscription_types WHERE id=NEW.subscription_type_id;
 v_amount:=COALESCE(NEW.subscription_fee,v_amount,0);
 v_due:=CURRENT_DATE + 14;
 INSERT INTO member_subscription_charges(organisation_id,member_id,team_member_id,team_id,subscription_type_id,season,description,amount,status,due_date)
 VALUES(NEW.organisation_id,NEW.member_id,NEW.id,NEW.team_id,NEW.subscription_type_id,NEW.season,COALESCE(v_team_name,'Team')||CASE WHEN v_sub_name IS NOT NULL THEN ' – '||v_sub_name ELSE '' END,v_amount,CASE WHEN v_amount=0 THEN 'waived' ELSE 'pending' END,v_due)
 ON CONFLICT(team_member_id) DO UPDATE SET
   subscription_type_id=EXCLUDED.subscription_type_id,
   season=EXCLUDED.season,
   description=EXCLUDED.description,
   amount=EXCLUDED.amount,
   status=CASE
     WHEN EXCLUDED.amount=0 THEN 'waived'
     WHEN member_subscription_charges.subscription_type_id IS DISTINCT FROM EXCLUDED.subscription_type_id OR member_subscription_charges.amount IS DISTINCT FROM EXCLUDED.amount THEN 'pending'
     ELSE member_subscription_charges.status END,
   due_date=CASE WHEN member_subscription_charges.status='paid' AND (member_subscription_charges.subscription_type_id IS DISTINCT FROM EXCLUDED.subscription_type_id OR member_subscription_charges.amount IS DISTINCT FROM EXCLUDED.amount) THEN v_due ELSE member_subscription_charges.due_date END,
   updated_at=now();
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_team_member_subscription_charge ON public.team_members;
CREATE TRIGGER trg_sync_team_member_subscription_charge AFTER INSERT OR UPDATE OF subscription_type_id,subscription_fee,season,role ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.sync_team_member_subscription_charge();

-- Backfill charges for current team/player subscriptions.
INSERT INTO public.member_subscription_charges(organisation_id,member_id,team_member_id,team_id,subscription_type_id,season,description,amount,status,due_date)
SELECT tm.organisation_id,tm.member_id,tm.id,tm.team_id,tm.subscription_type_id,tm.season,t.name||CASE WHEN st.name IS NULL THEN '' ELSE ' – '||st.name END,COALESCE(tm.subscription_fee,st.fee,0),CASE WHEN COALESCE(tm.subscription_fee,st.fee,0)=0 THEN 'waived' ELSE 'pending' END,CURRENT_DATE+14
FROM public.team_members tm JOIN public.teams t ON t.id=tm.team_id LEFT JOIN public.subscription_types st ON st.id=tm.subscription_type_id
WHERE tm.role='player'
ON CONFLICT(team_member_id) DO NOTHING;

-- Member can create a pending donation for themselves; admin keeps normal access.
DROP POLICY IF EXISTS donations_member_insert_v22 ON public.donations;
CREATE POLICY donations_member_insert_v22 ON public.donations FOR INSERT TO authenticated
WITH CHECK(
  EXISTS(SELECT 1 FROM public.members m WHERE m.id=member_id AND m.user_id=auth.uid() AND m.organisation_id=organisation_id)
  OR public.is_platform_admin()
);
DROP POLICY IF EXISTS donations_member_select_v22 ON public.donations;
CREATE POLICY donations_member_select_v22 ON public.donations FOR SELECT TO authenticated
USING(
  EXISTS(SELECT 1 FROM public.members m WHERE m.id=member_id AND m.user_id=auth.uid())
  OR public.user_in_org(organisation_id)
  OR public.is_platform_admin()
);

-- Demo payment completion helper. This records a payment inside ClubOS only.
-- Replace its frontend caller with Stripe/POLi checkout + webhook confirmation for live payments.
CREATE OR REPLACE FUNCTION public.record_demo_member_payment(p_item_type text,p_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_org uuid; v_member uuid; v_amount numeric(12,2); v_desc text; v_ref text; v_currency text; v_profile uuid:=auth.uid();
BEGIN
 IF v_profile IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF p_item_type='subscription' THEN
   SELECT c.organisation_id,c.member_id,c.amount,c.description INTO v_org,v_member,v_amount,v_desc FROM member_subscription_charges c JOIN members m ON m.id=c.member_id WHERE c.id=p_item_id AND m.user_id=v_profile AND c.status='pending';
   IF NOT FOUND THEN RAISE EXCEPTION 'Payment item not found'; END IF;
   UPDATE member_subscription_charges SET status='paid',paid_at=now(),payment_method='demo',updated_at=now() WHERE id=p_item_id;
   v_ref:='SUB-'||upper(substr(replace(p_item_id::text,'-',''),1,10));
 ELSIF p_item_type='donation' THEN
   SELECT d.organisation_id,d.member_id,d.amount,COALESCE(d.campaign,'Donation') INTO v_org,v_member,v_amount,v_desc FROM donations d JOIN members m ON m.id=d.member_id WHERE d.id=p_item_id AND m.user_id=v_profile AND d.status='pending';
   IF NOT FOUND THEN RAISE EXCEPTION 'Payment item not found'; END IF;
   UPDATE donations SET status='received',provider='demo' WHERE id=p_item_id;
   v_ref:='DON-'||upper(substr(replace(p_item_id::text,'-',''),1,10));
 ELSIF p_item_type='merchandise' THEN
   SELECT o.organisation_id,m.id,o.total_amount,COALESCE(p.name,'Merchandise') INTO v_org,v_member,v_amount,v_desc FROM merchandise_orders o LEFT JOIN merchandise_products p ON p.id=o.product_id LEFT JOIN members m ON m.organisation_id=o.organisation_id AND m.user_id=v_profile WHERE o.id=p_item_id AND o.purchaser_user_id=v_profile AND o.payment_status='pending';
   IF NOT FOUND THEN RAISE EXCEPTION 'Payment item not found'; END IF;
   UPDATE merchandise_orders SET payment_status='paid' WHERE id=p_item_id;
   v_ref:='MER-'||upper(substr(replace(p_item_id::text,'-',''),1,10));
 ELSIF p_item_type='event' THEN
   SELECT o.organisation_id,o.member_id,o.total_amount,COALESCE(e.title,'Event tickets') INTO v_org,v_member,v_amount,v_desc FROM event_orders o JOIN events e ON e.id=o.event_id JOIN members m ON m.id=o.member_id WHERE o.id=p_item_id AND m.user_id=v_profile AND o.payment_status='pending';
   IF NOT FOUND THEN RAISE EXCEPTION 'Payment item not found'; END IF;
   UPDATE event_orders SET payment_status='paid',payment_provider='demo',payment_reference='DEMO-'||substr(p_item_id::text,1,8) WHERE id=p_item_id;
   v_ref:='EVT-'||upper(substr(replace(p_item_id::text,'-',''),1,10));
 ELSE RAISE EXCEPTION 'Unsupported payment type'; END IF;
 SELECT COALESCE(currency,'NZD') INTO v_currency FROM organisations WHERE id=v_org;
 INSERT INTO club_finance_transactions(organisation_id,member_id,reference,transaction_type,description,amount,currency,provider,status,occurred_at)
 VALUES(v_org,v_member,v_ref,p_item_type,v_desc,v_amount,v_currency,'demo','paid',now()) ON CONFLICT(organisation_id,reference) DO NOTHING;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_demo_member_payment(text,uuid) TO authenticated;

COMMIT;
