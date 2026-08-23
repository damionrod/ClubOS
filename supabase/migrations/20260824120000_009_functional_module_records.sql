/* ClubOS functional CRUD store for operational/admin modules. */
CREATE TABLE IF NOT EXISTS module_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  scope text NOT NULL DEFAULT 'organisation' CHECK (scope IN ('organisation','platform')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((scope='organisation' AND organisation_id IS NOT NULL) OR (scope='platform' AND organisation_id IS NULL))
);
CREATE INDEX IF NOT EXISTS module_records_org_module_idx ON module_records(organisation_id,module_key);
CREATE INDEX IF NOT EXISTS module_records_platform_module_idx ON module_records(module_key) WHERE organisation_id IS NULL;
ALTER TABLE module_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS module_records_select ON module_records;
CREATE POLICY module_records_select ON module_records FOR SELECT USING ((organisation_id IS NOT NULL AND user_in_org(organisation_id)) OR is_platform_admin());
DROP POLICY IF EXISTS module_records_insert ON module_records;
CREATE POLICY module_records_insert ON module_records FOR INSERT WITH CHECK ((organisation_id IS NOT NULL AND user_in_org(organisation_id)) OR (organisation_id IS NULL AND is_platform_admin()));
DROP POLICY IF EXISTS module_records_update ON module_records;
CREATE POLICY module_records_update ON module_records FOR UPDATE USING ((organisation_id IS NOT NULL AND user_in_org(organisation_id)) OR (organisation_id IS NULL AND is_platform_admin())) WITH CHECK ((organisation_id IS NOT NULL AND user_in_org(organisation_id)) OR (organisation_id IS NULL AND is_platform_admin()));
DROP POLICY IF EXISTS module_records_delete ON module_records;
CREATE POLICY module_records_delete ON module_records FOR DELETE USING ((organisation_id IS NOT NULL AND user_in_org(organisation_id)) OR (organisation_id IS NULL AND is_platform_admin()));
