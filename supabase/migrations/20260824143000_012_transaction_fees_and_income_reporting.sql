/* ClubOS v6: configurable transaction fees + income category reporting */

CREATE TABLE IF NOT EXISTS income_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, name)
);

CREATE TABLE IF NOT EXISTS organisation_fee_settings (
  organisation_id uuid PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
  fee_payer text NOT NULL DEFAULT 'organisation' CHECK (fee_payer IN ('member','organisation','split')),
  member_share_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (member_share_percent BETWEEN 0 AND 100),
  apply_provider_fees boolean NOT NULL DEFAULT true,
  apply_platform_fees boolean NOT NULL DEFAULT true,
  display_fee_breakdown boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS platform_transaction_fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Default platform transaction fee',
  enabled boolean NOT NULL DEFAULT false,
  fixed_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (fixed_amount >= 0),
  percentage numeric(7,4) NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  currency text NOT NULL DEFAULT 'NZD',
  minimum_fee numeric(10,2),
  maximum_fee numeric(10,2),
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE club_finance_transactions ADD COLUMN IF NOT EXISTS income_category_id uuid REFERENCES income_categories(id) ON DELETE SET NULL;
ALTER TABLE club_finance_transactions ADD COLUMN IF NOT EXISTS gross_amount numeric(12,2);
ALTER TABLE club_finance_transactions ADD COLUMN IF NOT EXISTS provider_fee numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE club_finance_transactions ADD COLUMN IF NOT EXISTS platform_fee numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE club_finance_transactions ADD COLUMN IF NOT EXISTS member_fee_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE club_finance_transactions ADD COLUMN IF NOT EXISTS organisation_fee_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE club_finance_transactions ADD COLUMN IF NOT EXISTS refund_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE club_finance_transactions ADD COLUMN IF NOT EXISTS fee_payer text CHECK (fee_payer IN ('member','organisation','split'));
ALTER TABLE club_finance_transactions ADD COLUMN IF NOT EXISTS member_share_percent numeric(5,2) CHECK (member_share_percent BETWEEN 0 AND 100);

UPDATE club_finance_transactions
SET gross_amount = amount
WHERE gross_amount IS NULL;

CREATE INDEX IF NOT EXISTS income_categories_org_idx ON income_categories(organisation_id, active, sort_order);
CREATE INDEX IF NOT EXISTS finance_txn_category_date_idx ON club_finance_transactions(organisation_id, income_category_id, occurred_at);

ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_transaction_fee_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS income_categories_access ON income_categories;
CREATE POLICY income_categories_access ON income_categories FOR ALL
  USING (user_in_org(organisation_id) OR is_platform_admin())
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS organisation_fee_settings_access ON organisation_fee_settings;
CREATE POLICY organisation_fee_settings_access ON organisation_fee_settings FOR ALL
  USING (user_in_org(organisation_id) OR is_platform_admin())
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS platform_transaction_fee_settings_select ON platform_transaction_fee_settings;
CREATE POLICY platform_transaction_fee_settings_select ON platform_transaction_fee_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS platform_transaction_fee_settings_write ON platform_transaction_fee_settings;
CREATE POLICY platform_transaction_fee_settings_write ON platform_transaction_fee_settings FOR ALL
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- Helper function used by checkout/payment flows to calculate the configured platform fee.
CREATE OR REPLACE FUNCTION calculate_platform_transaction_fee(base_amount numeric, at_time timestamptz DEFAULT now())
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  r platform_transaction_fee_settings%ROWTYPE;
  result numeric(12,2);
BEGIN
  SELECT * INTO r
  FROM platform_transaction_fee_settings
  WHERE enabled = true
    AND active = true
    AND effective_from <= at_time
    AND (effective_to IS NULL OR effective_to > at_time)
  ORDER BY effective_from DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN 0; END IF;

  result := COALESCE(r.fixed_amount,0) + (COALESCE(base_amount,0) * COALESCE(r.percentage,0) / 100);
  IF r.minimum_fee IS NOT NULL THEN result := GREATEST(result, r.minimum_fee); END IF;
  IF r.maximum_fee IS NOT NULL THEN result := LEAST(result, r.maximum_fee); END IF;
  RETURN ROUND(result,2);
END;
$$;

-- Seed standard categories for every organisation.
INSERT INTO income_categories (organisation_id,name,code,sort_order)
SELECT o.id, v.name, v.code, v.sort_order
FROM organisations o
CROSS JOIN (VALUES
 ('Membership Fees','membership',10),
 ('Event Tickets','events',20),
 ('Donations','donations',30),
 ('Merchandise','merchandise',40),
 ('Sponsorship','sponsorship',50),
 ('Fundraising','fundraising',60),
 ('Grants','grants',70),
 ('Other Income','other',99)
) AS v(name,code,sort_order)
ON CONFLICT (organisation_id,name) DO NOTHING;

-- Default organisation rule: organisation absorbs transaction fees.
INSERT INTO organisation_fee_settings (organisation_id,fee_payer,member_share_percent)
SELECT id,'organisation',0 FROM organisations
ON CONFLICT (organisation_id) DO NOTHING;

-- Demo platform fee: disabled by default, editable by Platform Admin.
INSERT INTO platform_transaction_fee_settings (name,enabled,fixed_amount,percentage,currency,active)
SELECT 'Default platform transaction fee',false,0.50,1.00,'NZD',true
WHERE NOT EXISTS (SELECT 1 FROM platform_transaction_fee_settings WHERE active=true);

-- Categorise existing demo finance transactions.
UPDATE club_finance_transactions t SET income_category_id=c.id
FROM income_categories c
WHERE c.organisation_id=t.organisation_id AND (
 (t.transaction_type='membership' AND c.code='membership') OR
 (t.transaction_type='event' AND c.code='events') OR
 (t.transaction_type='merchandise' AND c.code='merchandise') OR
 (t.transaction_type='donation' AND c.code='donations')
) AND t.income_category_id IS NULL;

-- Add representative income rows so the report can be fully tested.
INSERT INTO club_finance_transactions
(organisation_id,reference,transaction_type,description,amount,gross_amount,provider,provider_fee,platform_fee,member_fee_amount,organisation_fee_amount,refund_amount,fee_payer,member_share_percent,status,occurred_at,income_category_id)
SELECT o.id, x.ref, x.typ, x.des, x.amt, x.amt, x.provider, x.pfee, x.cfee, x.mfee, x.ofee, x.refund, x.payer, x.share, 'paid', now()-x.days*interval '1 day', c.id
FROM organisations o
JOIN (VALUES
 ('DEMO-DON-001','donation','Community fundraising donation',750.00,'Stripe',15.00,8.00,0.00,23.00,0.00,'organisation',0.00,12,'donations'),
 ('DEMO-SPON-001','sponsorship','Local sponsor contribution',2500.00,'Bank transfer',0.00,0.00,0.00,0.00,0.00,'organisation',0.00,22,'sponsorship'),
 ('DEMO-GRANT-001','grant','Community sport grant',5000.00,'Bank transfer',0.00,0.00,0.00,0.00,0.00,'organisation',0.00,45,'grants'),
 ('DEMO-FUND-001','fundraising','Quiz night fundraising',1200.00,'Stripe',24.00,12.50,18.25,18.25,0.00,'split',50.00,62,'fundraising'),
 ('DEMO-OTHER-001','other','Miscellaneous club income',180.00,'Bank transfer',0.00,0.00,0.00,0.00,20.00,'organisation',0.00,74,'other')
) AS x(ref,typ,des,amt,provider,pfee,cfee,mfee,ofee,refund,payer,share,days,catcode) ON true
JOIN income_categories c ON c.organisation_id=o.id AND c.code=x.catcode
WHERE o.slug='demo-sports-club'
ON CONFLICT (organisation_id,reference) DO NOTHING;

-- Backfill fee snapshot for older transactions using zero fees.
UPDATE club_finance_transactions
SET fee_payer = COALESCE(fee_payer,'organisation'),
    member_share_percent = COALESCE(member_share_percent,0),
    gross_amount = COALESCE(gross_amount,amount)
WHERE fee_payer IS NULL OR member_share_percent IS NULL OR gross_amount IS NULL;
