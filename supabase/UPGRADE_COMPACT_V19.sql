-- ClubOS Compact v19 upgrade
-- Run ONCE on an existing ClubOS database after deploying Compact v19.
-- Adds separate Team Subscription Types, robust Event/Ticket RLS + banner upload,
-- event purchase reporting support, and merchandise products with two images.

BEGIN;

-- ================================================================
-- 1. Subscription Types (separate from Membership Types)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.subscription_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  billing_period text NOT NULL DEFAULT 'season' CHECK (billing_period IN ('season','annual','monthly','term','one_off')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_types_org_name_uidx ON public.subscription_types(organisation_id, lower(name));
ALTER TABLE public.subscription_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_types_select ON public.subscription_types;
CREATE POLICY subscription_types_select ON public.subscription_types FOR SELECT TO authenticated
USING (public.user_in_org(organisation_id) OR public.is_platform_admin());
DROP POLICY IF EXISTS subscription_types_manage ON public.subscription_types;
CREATE POLICY subscription_types_manage ON public.subscription_types FOR ALL TO authenticated
USING (public.user_in_org(organisation_id) OR public.is_platform_admin())
WITH CHECK (public.user_in_org(organisation_id) OR public.is_platform_admin());

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS subscription_type_id uuid REFERENCES public.subscription_types(id) ON DELETE SET NULL;
ALTER TABLE public.organisation_settings ADD COLUMN IF NOT EXISTS default_team_subscription_type_id uuid REFERENCES public.subscription_types(id) ON DELETE SET NULL;

INSERT INTO public.subscription_types(organisation_id,name,description,fee,billing_period,sort_order)
SELECT o.id,v.name,v.description,v.fee,v.billing_period,v.sort_order
FROM public.organisations o
CROSS JOIN (VALUES
  ('Full Time','Full season/team participation',250.00::numeric,'season',1),
  ('Part Time','Part-time team participation',150.00::numeric,'season',2),
  ('Casual','Casual/player-on-demand participation',75.00::numeric,'season',3),
  ('Junior Team','Junior team season subscription',130.00::numeric,'season',4)
) AS v(name,description,fee,billing_period,sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_types s WHERE s.organisation_id=o.id AND lower(s.name)=lower(v.name));

UPDATE public.organisation_settings os
SET default_team_subscription_type_id = (
  SELECT s.id FROM public.subscription_types s WHERE s.organisation_id=os.organisation_id AND s.name='Full Time' LIMIT 1
)
WHERE os.default_team_subscription_type_id IS NULL;

UPDATE public.teams t
SET subscription_type_id=(SELECT s.id FROM public.subscription_types s WHERE s.organisation_id=t.organisation_id AND s.name='Full Time' LIMIT 1)
WHERE t.subscription_type_id IS NULL;

-- ================================================================
-- 2. Events: robust organisation policies + banner storage
-- ================================================================
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS public_slug text;
CREATE UNIQUE INDEX IF NOT EXISTS events_public_slug_uidx ON public.events(public_slug) WHERE public_slug IS NOT NULL;
UPDATE public.events SET public_slug=regexp_replace(lower(title),'[^a-z0-9]+','-','g')||'-'||substr(replace(id::text,'-',''),1,6) WHERE public_slug IS NULL;

-- Rebuild event policies so authenticated organisation users can reliably save event + ticket records.

CREATE OR REPLACE FUNCTION public.can_upload_org_asset(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public AS $$
  SELECT public.user_in_org(p_org_id) OR public.is_platform_admin();
$$;
GRANT EXECUTE ON FUNCTION public.can_upload_org_asset(uuid) TO authenticated;
DROP POLICY IF EXISTS events_manage ON public.events;
CREATE POLICY events_manage ON public.events FOR ALL TO authenticated
USING (public.user_in_org(organisation_id) OR public.is_platform_admin())
WITH CHECK (public.user_in_org(organisation_id) OR public.is_platform_admin());
DROP POLICY IF EXISTS event_ticket_types_manage ON public.event_ticket_types;
CREATE POLICY event_ticket_types_manage ON public.event_ticket_types FOR ALL TO authenticated
USING (public.user_in_org(organisation_id) OR public.is_platform_admin())
WITH CHECK (public.user_in_org(organisation_id) OR public.is_platform_admin());
DROP POLICY IF EXISTS event_orders_manage ON public.event_orders;
CREATE POLICY event_orders_manage ON public.event_orders FOR ALL TO authenticated
USING (public.user_in_org(organisation_id) OR public.is_platform_admin())
WITH CHECK (public.user_in_org(organisation_id) OR public.is_platform_admin());
DROP POLICY IF EXISTS event_tickets_manage ON public.event_tickets;
CREATE POLICY event_tickets_manage ON public.event_tickets FOR ALL TO authenticated
USING (public.user_in_org(organisation_id) OR public.is_platform_admin())
WITH CHECK (public.user_in_org(organisation_id) OR public.is_platform_admin());

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('event-banners','event-banners',true,8388608,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=8388608,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS event_banners_insert ON storage.objects;
CREATE POLICY event_banners_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id='event-banners' AND public.can_upload_org_asset(((storage.foldername(name))[1])::uuid)
);
DROP POLICY IF EXISTS event_banners_update ON storage.objects;
CREATE POLICY event_banners_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='event-banners' AND public.can_upload_org_asset(((storage.foldername(name))[1])::uuid))
WITH CHECK (bucket_id='event-banners' AND public.can_upload_org_asset(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS event_banners_delete ON storage.objects;
CREATE POLICY event_banners_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='event-banners' AND public.can_upload_org_asset(((storage.foldername(name))[1])::uuid));

-- ================================================================
-- 3. Merchandise with up to two images
-- ================================================================
CREATE TABLE IF NOT EXISTS public.merchandise_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sku text,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK(price>=0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK(stock_quantity>=0),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','sold_out')),
  image_url_1 text,
  image_url_2 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS merchandise_products_org_sku_uidx ON public.merchandise_products(organisation_id,sku) WHERE sku IS NOT NULL;
ALTER TABLE public.merchandise_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS merchandise_products_select ON public.merchandise_products;
CREATE POLICY merchandise_products_select ON public.merchandise_products FOR SELECT TO authenticated USING(public.user_in_org(organisation_id) OR public.is_platform_admin());
DROP POLICY IF EXISTS merchandise_products_manage ON public.merchandise_products;
CREATE POLICY merchandise_products_manage ON public.merchandise_products FOR ALL TO authenticated
USING(public.user_in_org(organisation_id) OR public.is_platform_admin()) WITH CHECK(public.user_in_org(organisation_id) OR public.is_platform_admin());

CREATE TABLE IF NOT EXISTS public.merchandise_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.merchandise_products(id) ON DELETE RESTRICT,
  purchaser_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK(quantity>0),
  unit_price numeric(12,2) NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.merchandise_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS merchandise_orders_select ON public.merchandise_orders;
CREATE POLICY merchandise_orders_select ON public.merchandise_orders FOR SELECT TO authenticated
USING(public.user_in_org(organisation_id) OR purchaser_user_id=auth.uid() OR public.is_platform_admin());
DROP POLICY IF EXISTS merchandise_orders_manage_admin ON public.merchandise_orders;
CREATE POLICY merchandise_orders_manage_admin ON public.merchandise_orders FOR ALL TO authenticated
USING(public.user_in_org(organisation_id) OR public.is_platform_admin()) WITH CHECK(public.user_in_org(organisation_id) OR public.is_platform_admin());

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('merchandise-images','merchandise-images',true,6291456,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=6291456,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];
DROP POLICY IF EXISTS merchandise_images_insert ON storage.objects;
CREATE POLICY merchandise_images_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='merchandise-images' AND public.can_upload_org_asset(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS merchandise_images_update ON storage.objects;
CREATE POLICY merchandise_images_update ON storage.objects FOR UPDATE TO authenticated
USING(bucket_id='merchandise-images' AND public.can_upload_org_asset(((storage.foldername(name))[1])::uuid))
WITH CHECK(bucket_id='merchandise-images' AND public.can_upload_org_asset(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS merchandise_images_delete ON storage.objects;
CREATE POLICY merchandise_images_delete ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='merchandise-images' AND public.can_upload_org_asset(((storage.foldername(name))[1])::uuid));

INSERT INTO public.merchandise_products(organisation_id,name,description,sku,price,stock_quantity,status)
SELECT o.id,'Club Training Shirt','Official club training shirt','DEMO-SHIRT',35,24,'active' FROM public.organisations o
WHERE o.slug='demo-sports-club' AND NOT EXISTS(SELECT 1 FROM public.merchandise_products p WHERE p.organisation_id=o.id AND p.sku='DEMO-SHIRT');

COMMIT;
