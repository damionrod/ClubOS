/*
# Club Management Platform — Foundation Schema Part 2: Functions & Policies

## Overview
Creates helper functions and RLS policies for all foundation tables.

## Functions
- user_organisations() — returns org IDs the current user belongs to
- user_in_org(p_org_id) — checks if user belongs to a specific org
- is_platform_admin() — checks if user is a platform admin
- handle_new_user() — auto-creates profile on auth signup

## Policies
- Tenant isolation: every org-scoped table checks user_in_org(organisation_id)
- Platform admin bypass on select for admin oversight
- Profiles: user reads/updates own; org members can read each other
- Audit logs: insert by org members, read by org members
- Modules & permissions: globally readable (catalogue data)
*/

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION user_organisations()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organisation_id FROM organisation_users WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION user_in_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_users
    WHERE user_id = auth.uid() AND organisation_id = p_org_id
  );
$$;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_platform_admin = true
  );
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ORGANISATIONS
-- ============================================================
DROP POLICY IF EXISTS "org_select_member" ON organisations;
CREATE POLICY "org_select_member" ON organisations
  FOR SELECT TO authenticated
  USING (id IN (SELECT user_organisations()) OR is_platform_admin());

DROP POLICY IF EXISTS "org_insert_platform_admin" ON organisations;
CREATE POLICY "org_insert_platform_admin" ON organisations
  FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "org_update_org_admin" ON organisations;
CREATE POLICY "org_update_org_admin" ON organisations
  FOR UPDATE TO authenticated
  USING (user_in_org(id))
  WITH CHECK (user_in_org(id));

-- ============================================================
-- PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profile_select_self_or_admin" ON profiles;
CREATE POLICY "profile_select_self_or_admin" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR is_platform_admin() OR
    id IN (SELECT user_id FROM organisation_users WHERE organisation_id IN (SELECT user_organisations())));

DROP POLICY IF EXISTS "profile_update_self" ON profiles;
CREATE POLICY "profile_update_self" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profile_insert_self" ON profiles;
CREATE POLICY "profile_insert_self" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- ORGANISATION SETTINGS
-- ============================================================
DROP POLICY IF EXISTS "org_settings_select" ON organisation_settings;
CREATE POLICY "org_settings_select" ON organisation_settings
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "org_settings_update" ON organisation_settings;
CREATE POLICY "org_settings_update" ON organisation_settings
  FOR UPDATE TO authenticated
  USING (user_in_org(organisation_id))
  WITH CHECK (user_in_org(organisation_id));

DROP POLICY IF EXISTS "org_settings_insert" ON organisation_settings;
CREATE POLICY "org_settings_insert" ON organisation_settings
  FOR INSERT TO authenticated
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

-- ============================================================
-- ORGANISATION BRANDING
-- ============================================================
DROP POLICY IF EXISTS "branding_select" ON organisation_branding;
CREATE POLICY "branding_select" ON organisation_branding
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "branding_update" ON organisation_branding;
CREATE POLICY "branding_update" ON organisation_branding
  FOR UPDATE TO authenticated
  USING (user_in_org(organisation_id))
  WITH CHECK (user_in_org(organisation_id));

DROP POLICY IF EXISTS "branding_insert" ON organisation_branding;
CREATE POLICY "branding_insert" ON organisation_branding
  FOR INSERT TO authenticated
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

-- ============================================================
-- ROLES
-- ============================================================
DROP POLICY IF EXISTS "roles_select" ON roles;
CREATE POLICY "roles_select" ON roles
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "roles_insert" ON roles;
CREATE POLICY "roles_insert" ON roles
  FOR INSERT TO authenticated
  WITH CHECK (user_in_org(organisation_id));

DROP POLICY IF EXISTS "roles_update" ON roles;
CREATE POLICY "roles_update" ON roles
  FOR UPDATE TO authenticated
  USING (user_in_org(organisation_id))
  WITH CHECK (user_in_org(organisation_id));

DROP POLICY IF EXISTS "roles_delete" ON roles;
CREATE POLICY "roles_delete" ON roles
  FOR DELETE TO authenticated
  USING (user_in_org(organisation_id));

-- ============================================================
-- ORGANISATION USERS
-- ============================================================
DROP POLICY IF EXISTS "org_users_select" ON organisation_users;
CREATE POLICY "org_users_select" ON organisation_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "org_users_insert" ON organisation_users;
CREATE POLICY "org_users_insert" ON organisation_users
  FOR INSERT TO authenticated
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "org_users_update" ON organisation_users;
CREATE POLICY "org_users_update" ON organisation_users
  FOR UPDATE TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin())
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "org_users_delete" ON organisation_users;
CREATE POLICY "org_users_delete" ON organisation_users
  FOR DELETE TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

-- ============================================================
-- PERMISSIONS (global catalogue, read by all)
-- ============================================================
DROP POLICY IF EXISTS "perms_select_all" ON permissions;
CREATE POLICY "perms_select_all" ON permissions
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- ROLE PERMISSIONS
-- ============================================================
DROP POLICY IF EXISTS "role_perms_select" ON role_permissions;
CREATE POLICY "role_perms_select" ON role_permissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND (user_in_org(r.organisation_id) OR is_platform_admin()))
  );

DROP POLICY IF EXISTS "role_perms_modify" ON role_permissions;
CREATE POLICY "role_perms_modify" ON role_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND user_in_org(r.organisation_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND user_in_org(r.organisation_id))
  );

-- ============================================================
-- MODULES (global catalogue)
-- ============================================================
DROP POLICY IF EXISTS "modules_select_all" ON modules;
CREATE POLICY "modules_select_all" ON modules
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- ORGANISATION MODULES
-- ============================================================
DROP POLICY IF EXISTS "org_modules_select" ON organisation_modules;
CREATE POLICY "org_modules_select" ON organisation_modules
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "org_modules_modify" ON organisation_modules;
CREATE POLICY "org_modules_modify" ON organisation_modules
  FOR ALL TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin())
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

-- ============================================================
-- ROLE MODULE ACCESS
-- ============================================================
DROP POLICY IF EXISTS "role_module_select" ON role_module_access;
CREATE POLICY "role_module_select" ON role_module_access
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND (user_in_org(r.organisation_id) OR is_platform_admin()))
  );

DROP POLICY IF EXISTS "role_module_modify" ON role_module_access;
CREATE POLICY "role_module_modify" ON role_module_access
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND user_in_org(r.organisation_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = role_id AND user_in_org(r.organisation_id))
  );

-- ============================================================
-- USER ROLES
-- ============================================================
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
CREATE POLICY "user_roles_select" ON user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
CREATE POLICY "user_roles_insert" ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;
CREATE POLICY "user_roles_delete" ON user_roles
  FOR DELETE TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

-- ============================================================
-- USER PERMISSION OVERRIDES
-- ============================================================
DROP POLICY IF EXISTS "perm_overrides_select" ON user_permission_overrides;
CREATE POLICY "perm_overrides_select" ON user_permission_overrides
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "perm_overrides_modify" ON user_permission_overrides;
CREATE POLICY "perm_overrides_modify" ON user_permission_overrides
  FOR ALL TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin())
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

-- ============================================================
-- SUBSCRIPTION PLANS
-- ============================================================
DROP POLICY IF EXISTS "plans_select_all" ON subscription_plans;
CREATE POLICY "plans_select_all" ON subscription_plans
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
DROP POLICY IF EXISTS "subs_select" ON subscriptions;
CREATE POLICY "subs_select" ON subscriptions
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "subs_insert" ON subscriptions;
CREATE POLICY "subs_insert" ON subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "subs_update" ON subscriptions;
CREATE POLICY "subs_update" ON subscriptions
  FOR UPDATE TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ============================================================
-- AUDIT LOGS
-- ============================================================
DROP POLICY IF EXISTS "audit_select" ON audit_logs;
CREATE POLICY "audit_select" ON audit_logs
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "audit_insert" ON audit_logs;
CREATE POLICY "audit_insert" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
DROP POLICY IF EXISTS "notif_select" ON notifications;
CREATE POLICY "notif_select" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_update" ON notifications;
CREATE POLICY "notif_update" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_platform_admin());

DROP POLICY IF EXISTS "notif_delete" ON notifications;
CREATE POLICY "notif_delete" ON notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
