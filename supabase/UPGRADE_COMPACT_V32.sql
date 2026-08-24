
BEGIN;

-- ClubOS Compact v32
-- Repairs older merchandise_products schemas and brings them up to the
-- fields expected by the Admin and Member merchandise screens.

ALTER TABLE public.merchandise_products
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.merchandise_products
  ADD COLUMN IF NOT EXISTS stock_quantity integer;

ALTER TABLE public.merchandise_products
  ADD COLUMN IF NOT EXISTS image_url_1 text;

ALTER TABLE public.merchandise_products
  ADD COLUMN IF NOT EXISTS image_url_2 text;

ALTER TABLE public.merchandise_products
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.merchandise_products
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Older ClubOS builds used stock_qty. Preserve existing stock when upgrading.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'merchandise_products'
      AND column_name = 'stock_qty'
  ) THEN
    EXECUTE '
      UPDATE public.merchandise_products
      SET stock_quantity = COALESCE(stock_quantity, stock_qty, 0)
      WHERE stock_quantity IS NULL
    ';
  END IF;
END $$;

UPDATE public.merchandise_products
SET stock_quantity = 0
WHERE stock_quantity IS NULL;

ALTER TABLE public.merchandise_products
  ALTER COLUMN stock_quantity SET DEFAULT 0;

ALTER TABLE public.merchandise_products
  ALTER COLUMN stock_quantity SET NOT NULL;

-- Normalise price/status defaults without removing existing data.
UPDATE public.merchandise_products SET price = 0 WHERE price IS NULL;
ALTER TABLE public.merchandise_products ALTER COLUMN price SET DEFAULT 0;

UPDATE public.merchandise_products
SET status = 'active'
WHERE status IS NULL OR status NOT IN ('active','inactive','sold_out');

ALTER TABLE public.merchandise_products
  ALTER COLUMN status SET DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS merchandise_products_org_sku_uidx
  ON public.merchandise_products(organisation_id, sku)
  WHERE sku IS NOT NULL;

-- Merchandise orders used by the member purchasing flow.
CREATE TABLE IF NOT EXISTS public.merchandise_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.merchandise_products(id) ON DELETE RESTRICT,
  purchaser_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK(quantity > 0),
  unit_price numeric(12,2) NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchandise_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchandise_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchandise_products_select ON public.merchandise_products;
CREATE POLICY merchandise_products_select
ON public.merchandise_products
FOR SELECT TO authenticated
USING (
  public.user_in_org(organisation_id)
  OR public.is_platform_admin()
);

DROP POLICY IF EXISTS merchandise_products_manage ON public.merchandise_products;
CREATE POLICY merchandise_products_manage
ON public.merchandise_products
FOR ALL TO authenticated
USING (
  public.user_in_org(organisation_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.user_in_org(organisation_id)
  OR public.is_platform_admin()
);

DROP POLICY IF EXISTS merchandise_orders_select ON public.merchandise_orders;
CREATE POLICY merchandise_orders_select
ON public.merchandise_orders
FOR SELECT TO authenticated
USING (
  purchaser_user_id = auth.uid()
  OR public.user_in_org(organisation_id)
  OR public.is_platform_admin()
);

DROP POLICY IF EXISTS merchandise_orders_insert_member ON public.merchandise_orders;
CREATE POLICY merchandise_orders_insert_member
ON public.merchandise_orders
FOR INSERT TO authenticated
WITH CHECK (
  purchaser_user_id = auth.uid()
  AND public.user_in_org(organisation_id)
);

DROP POLICY IF EXISTS merchandise_orders_manage_admin ON public.merchandise_orders;
CREATE POLICY merchandise_orders_manage_admin
ON public.merchandise_orders
FOR UPDATE TO authenticated
USING (
  public.user_in_org(organisation_id)
  OR public.is_platform_admin()
)
WITH CHECK (
  public.user_in_org(organisation_id)
  OR public.is_platform_admin()
);

-- Ensure image bucket exists.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'merchandise-images',
  'merchandise-images',
  true,
  6291456,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 6291456,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS merchandise_images_insert ON storage.objects;
CREATE POLICY merchandise_images_insert
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'merchandise-images'
  AND EXISTS (
    SELECT 1
    FROM public.organisation_users ou
    WHERE ou.organisation_id = ((storage.foldername(name))[1])::uuid
      AND ou.user_id = auth.uid()
      AND ou.status = 'active'
  )
);

DROP POLICY IF EXISTS merchandise_images_update ON storage.objects;
CREATE POLICY merchandise_images_update
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'merchandise-images'
  AND EXISTS (
    SELECT 1
    FROM public.organisation_users ou
    WHERE ou.organisation_id = ((storage.foldername(name))[1])::uuid
      AND ou.user_id = auth.uid()
      AND ou.status = 'active'
  )
);

DROP POLICY IF EXISTS merchandise_images_delete ON storage.objects;
CREATE POLICY merchandise_images_delete
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'merchandise-images'
  AND EXISTS (
    SELECT 1
    FROM public.organisation_users ou
    WHERE ou.organisation_id = ((storage.foldername(name))[1])::uuid
      AND ou.user_id = auth.uid()
      AND ou.status = 'active'
  )
);

COMMIT;

NOTIFY pgrst, 'reload schema';
