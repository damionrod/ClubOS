BEGIN;

-- ClubOS Compact v35: merchandise sizes
ALTER TABLE public.merchandise_products
  ADD COLUMN IF NOT EXISTS sizes text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.merchandise_orders
  ADD COLUMN IF NOT EXISTS selected_size text;

-- SKU is no longer used by the ClubOS merchandise UI.
-- Remove old uniqueness rules so legacy SKU values cannot block new products.
ALTER TABLE public.merchandise_products
  DROP CONSTRAINT IF EXISTS merchandise_products_organisation_id_sku_key;

DROP INDEX IF EXISTS public.merchandise_products_org_sku_uidx;

NOTIFY pgrst, 'reload schema';

COMMIT;
