/*
# Club Management Platform — Foundation Schema Part 1: Tables

## Overview
Creates all foundation tables for the multi-tenant club management SaaS.
This migration creates tables only — policies and helper functions come in Part 2.

## New Tables
1. organisations — tenant root entity
2. organisation_settings — per-org config
3. organisation_branding — per-org visual identity
4. profiles — user display info (1:1 with auth.users)
5. roles — roles within an org
6. permissions — resource/action permissions
7. role_permissions — M:N role ↔ permission
8. organisation_users — membership of a user in an org
9. role_module_access — module access level per role
10. user_roles — roles assigned to users within an org
11. user_permission_overrides — per-user permission overrides
12. modules — platform module catalogue
13. organisation_modules — modules enabled per org
14. subscription_plans — SaaS plans
15. subscriptions — org subscription state
16. audit_logs — immutable audit trail
17. notifications — user notifications
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORGANISATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  trading_name text NOT NULL,
  slug text UNIQUE NOT NULL,
  organisation_type text NOT NULL DEFAULT 'sports_club',
  registration_number text,
  country text NOT NULL DEFAULT 'NZ',
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postcode text,
  email text,
  phone text,
  website text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  avatar_url text,
  phone text,
  is_platform_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ORGANISATION SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS organisation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'NZD',
  timezone text NOT NULL DEFAULT 'Pacific/Auckland',
  date_format text NOT NULL DEFAULT 'DD/MM/YYYY',
  financial_year_start text NOT NULL DEFAULT '01-01',
  membership_year_start text NOT NULL DEFAULT '01-01',
  guardian_age_threshold int NOT NULL DEFAULT 18,
  default_membership_status text NOT NULL DEFAULT 'pending',
  compliance_profile text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id)
);

-- ============================================================
-- ORGANISATION BRANDING
-- ============================================================
CREATE TABLE IF NOT EXISTS organisation_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  logo_url text,
  primary_colour text NOT NULL DEFAULT '#0F766E',
  secondary_colour text NOT NULL DEFAULT '#1E293B',
  accent_colour text NOT NULL DEFAULT '#F59E0B',
  login_banner_url text,
  portal_banner_url text,
  social_links jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id)
);

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system_role boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, name)
);

-- ============================================================
-- ORGANISATION USERS (membership link)
-- ============================================================
CREATE TABLE IF NOT EXISTS organisation_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  is_owner boolean NOT NULL DEFAULT false,
  invited_at timestamptz,
  accepted_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, user_id)
);

-- ============================================================
-- PERMISSIONS (resource/action)
-- ============================================================
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  module_key text NOT NULL,
  description text,
  sensitivity text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ROLE PERMISSIONS (M:N)
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- ============================================================
-- MODULES (platform catalogue)
-- ============================================================
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'core',
  icon text DEFAULT 'LayoutGrid',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ORGANISATION MODULES (enabled modules per org)
-- ============================================================
CREATE TABLE IF NOT EXISTS organisation_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, module_id)
);

-- ============================================================
-- ROLE MODULE ACCESS
-- ============================================================
CREATE TABLE IF NOT EXISTS role_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'no_access',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, module_id)
);

-- ============================================================
-- USER ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, user_id, role_id)
);

-- ============================================================
-- USER PERMISSION OVERRIDES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  override_type text NOT NULL DEFAULT 'grant',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, user_id, permission_id)
);

-- ============================================================
-- SUBSCRIPTION PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  member_limit int,
  admin_limit int,
  storage_mb int,
  email_limit int,
  features jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SUBSCRIPTIONS (org → plan)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'trial',
  start_date timestamptz NOT NULL DEFAULT now(),
  renewal_date timestamptz,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  modules jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organisation_users_user ON organisation_users(user_id);
CREATE INDEX IF NOT EXISTS idx_organisation_users_org ON organisation_users(organisation_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org_user ON user_roles(organisation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
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
/*
# Club Management Platform — Membership Module Schema

## Overview
Creates all tables for the membership module: members, emergency contacts,
guardians, medical info, membership types, memberships, applications,
renewals, custom fields, and teams/sports.

## New Tables (all org-scoped with organisation_id)
1. membership_types — classes of membership (Senior, Junior, etc.)
2. members — individual member records
3. memberships — a member's membership to a type
4. member_emergency_contacts — emergency contact info
5. member_guardians — guardian info for junior members
6. member_medical_information — sensitive medical data
7. membership_applications — join applications
8. membership_renewals — renewal tracking
9. custom_fields — admin-defined custom fields
10. custom_field_values — values for custom fields per member
11. member_activity — activity timeline
12. sports — sport categories
13. teams — teams within a sport
14. team_members — member ↔ team relationship

## Security
- All tables org-scoped with RLS checking user_in_org(organisation_id)
- Medical information has additional sensitivity controls
- Members can read their own data
*/

-- ============================================================
-- MEMBERSHIP TYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS membership_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  annual_fee numeric(10,2) NOT NULL DEFAULT 0,
  joining_fee numeric(10,2) NOT NULL DEFAULT 0,
  min_age int,
  max_age int,
  voting_rights boolean NOT NULL DEFAULT false,
  committee_eligibility boolean NOT NULL DEFAULT false,
  renewal_required boolean NOT NULL DEFAULT true,
  duration_months int NOT NULL DEFAULT 12,
  approval_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE membership_types ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  member_number text NOT NULL,
  title text,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  preferred_name text,
  date_of_birth date,
  gender text,
  occupation text,
  photo_url text,
  -- Contact
  address_line1 text,
  address_line2 text,
  suburb text,
  city text,
  region text,
  postcode text,
  country text,
  email text,
  mobile text,
  alternative_phone text,
  -- Status
  status text NOT NULL DEFAULT 'pending',
  joined_date date,
  member_since date,
  paid_until date,
  voting_eligible boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, member_number)
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MEMBERSHIPS (member ↔ membership_type)
-- ============================================================
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  membership_type_id uuid NOT NULL REFERENCES membership_types(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MEMBER EMERGENCY CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS member_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relationship text,
  mobile text,
  alternative_phone text,
  email text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE member_emergency_contacts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MEMBER GUARDIANS
-- ============================================================
CREATE TABLE IF NOT EXISTS member_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relationship text,
  email text,
  mobile text,
  address text,
  same_address_as_child boolean NOT NULL DEFAULT false,
  is_primary boolean NOT NULL DEFAULT false,
  is_legal_guardian boolean NOT NULL DEFAULT false,
  is_billing_contact boolean NOT NULL DEFAULT false,
  is_emergency_contact boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE member_guardians ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MEMBER MEDICAL INFORMATION (HIGHLY SENSITIVE)
-- ============================================================
CREATE TABLE IF NOT EXISTS member_medical_information (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  medical_conditions text,
  allergies text,
  medication text,
  existing_injuries text,
  accessibility_requirements text,
  dietary_requirements text,
  emergency_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id)
);

ALTER TABLE member_medical_information ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MEMBERSHIP APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS membership_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  membership_type_id uuid NOT NULL REFERENCES membership_types(id) ON DELETE RESTRICT,
  -- Applicant data (snapshot)
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  mobile text,
  date_of_birth date,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postcode text,
  country text,
  -- Application data
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  reviewer_notes text,
  internal_notes text,
  assigned_reviewer uuid REFERENCES profiles(id),
  resulting_member_id uuid REFERENCES members(id),
  -- Custom field data stored as JSONB
  custom_field_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MEMBERSHIP RENEWALS
-- ============================================================
CREATE TABLE IF NOT EXISTS membership_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'upcoming',
  renewal_open_date date,
  due_date date NOT NULL,
  grace_period_days int NOT NULL DEFAULT 14,
  expiry_date date NOT NULL,
  fee_amount numeric(10,2) NOT NULL DEFAULT 0,
  reminders_paused boolean NOT NULL DEFAULT false,
  last_reminder_sent timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE membership_renewals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CUSTOM FIELDS
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  label text NOT NULL,
  help_text text,
  field_type text NOT NULL DEFAULT 'text',
  options jsonb DEFAULT '[]',
  section text NOT NULL DEFAULT 'personal_details',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_mandatory boolean NOT NULL DEFAULT false,
  member_editable boolean NOT NULL DEFAULT false,
  admin_editable boolean NOT NULL DEFAULT true,
  is_application_field boolean NOT NULL DEFAULT false,
  is_renewal_field boolean NOT NULL DEFAULT false,
  is_profile_field boolean NOT NULL DEFAULT true,
  is_exportable boolean NOT NULL DEFAULT true,
  sensitivity text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CUSTOM FIELD VALUES
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  custom_field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, custom_field_id)
);

ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MEMBER ACTIVITY (timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS member_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  performed_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE member_activity ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  season text,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
);

CREATE UNIQUE INDEX IF NOT EXISTS sports_org_name_season_unique
  ON sports (organisation_id, lower(name), coalesce(lower(season), ''));

ALTER TABLE sports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  name text NOT NULL,
  season text,
  manager_id uuid REFERENCES members(id) ON DELETE SET NULL,
  coach_id uuid REFERENCES members(id) ON DELETE SET NULL,
  captain_id uuid REFERENCES members(id) ON DELETE SET NULL,
  vice_captain_id uuid REFERENCES members(id) ON DELETE SET NULL,
  description text,
  contact text,
  status text NOT NULL DEFAULT 'active',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  season text,
  role text NOT NULL DEFAULT 'player',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, member_id, season)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES FOR ALL MEMBERSHIP TABLES
-- ============================================================

-- Membership Types
DROP POLICY IF EXISTS "memb_types_select" ON membership_types;
CREATE POLICY "memb_types_select" ON membership_types
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "memb_types_insert" ON membership_types;
CREATE POLICY "memb_types_insert" ON membership_types
  FOR INSERT TO authenticated
  WITH CHECK (user_in_org(organisation_id));

DROP POLICY IF EXISTS "memb_types_update" ON membership_types;
CREATE POLICY "memb_types_update" ON membership_types
  FOR UPDATE TO authenticated
  USING (user_in_org(organisation_id))
  WITH CHECK (user_in_org(organisation_id));

DROP POLICY IF EXISTS "memb_types_delete" ON membership_types;
CREATE POLICY "memb_types_delete" ON membership_types
  FOR DELETE TO authenticated
  USING (user_in_org(organisation_id));

-- Members (select: org members + platform admin + member reads own)
DROP POLICY IF EXISTS "members_select" ON members;
CREATE POLICY "members_select" ON members
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "members_insert" ON members;
CREATE POLICY "members_insert" ON members
  FOR INSERT TO authenticated
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "members_update" ON members;
CREATE POLICY "members_update" ON members
  FOR UPDATE TO authenticated
  USING (user_in_org(organisation_id) OR user_id = auth.uid())
  WITH CHECK (user_in_org(organisation_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "members_delete" ON members;
CREATE POLICY "members_delete" ON members
  FOR DELETE TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

-- Memberships
DROP POLICY IF EXISTS "memberships_select" ON memberships;
CREATE POLICY "memberships_select" ON memberships
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin() OR
    EXISTS (SELECT 1 FROM members m WHERE m.id = memberships.member_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "memberships_insert" ON memberships;
CREATE POLICY "memberships_insert" ON memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "memberships_update" ON memberships;
CREATE POLICY "memberships_update" ON memberships
  FOR UPDATE TO authenticated
  USING (user_in_org(organisation_id))
  WITH CHECK (user_in_org(organisation_id));

DROP POLICY IF EXISTS "memberships_delete" ON memberships;
CREATE POLICY "memberships_delete" ON memberships
  FOR DELETE TO authenticated
  USING (user_in_org(organisation_id));

-- Emergency Contacts
DROP POLICY IF EXISTS "emerg_select" ON member_emergency_contacts;
CREATE POLICY "emerg_select" ON member_emergency_contacts
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin() OR
    EXISTS (SELECT 1 FROM members m WHERE m.id = member_emergency_contacts.member_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "emerg_modify" ON member_emergency_contacts;
CREATE POLICY "emerg_modify" ON member_emergency_contacts
  FOR ALL TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin())
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

-- Guardians
DROP POLICY IF EXISTS "guard_select" ON member_guardians;
CREATE POLICY "guard_select" ON member_guardians
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin() OR
    EXISTS (SELECT 1 FROM members m WHERE m.id = member_guardians.member_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "guard_modify" ON member_guardians;
CREATE POLICY "guard_modify" ON member_guardians
  FOR ALL TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin())
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

-- Medical Information (HIGHLY SENSITIVE - org members only, no self-service for now)
DROP POLICY IF EXISTS "medical_select" ON member_medical_information;
CREATE POLICY "medical_select" ON member_medical_information
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin() OR
    EXISTS (SELECT 1 FROM members m WHERE m.id = member_medical_information.member_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "medical_modify" ON member_medical_information;
CREATE POLICY "medical_modify" ON member_medical_information
  FOR ALL TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin())
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

-- Applications
DROP POLICY IF EXISTS "app_select" ON membership_applications;
CREATE POLICY "app_select" ON membership_applications
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin() OR email = (
    SELECT p.email FROM profiles p WHERE p.id = auth.uid()
  ));

DROP POLICY IF EXISTS "app_insert" ON membership_applications;
CREATE POLICY "app_insert" ON membership_applications
  FOR INSERT TO authenticated
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin() OR true);

DROP POLICY IF EXISTS "app_update" ON membership_applications;
CREATE POLICY "app_update" ON membership_applications
  FOR UPDATE TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin())
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "app_delete" ON membership_applications;
CREATE POLICY "app_delete" ON membership_applications
  FOR DELETE TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

-- Renewals
DROP POLICY IF EXISTS "renewals_select" ON membership_renewals;
CREATE POLICY "renewals_select" ON membership_renewals
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin() OR
    EXISTS (SELECT 1 FROM members m WHERE m.id = membership_renewals.member_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "renewals_modify" ON membership_renewals;
CREATE POLICY "renewals_modify" ON membership_renewals
  FOR ALL TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin())
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

-- Custom Fields
DROP POLICY IF EXISTS "cf_select" ON custom_fields;
CREATE POLICY "cf_select" ON custom_fields
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "cf_modify" ON custom_fields;
CREATE POLICY "cf_modify" ON custom_fields
  FOR ALL TO authenticated
  USING (user_in_org(organisation_id))
  WITH CHECK (user_in_org(organisation_id));

-- Custom Field Values
DROP POLICY IF EXISTS "cfv_select" ON custom_field_values;
CREATE POLICY "cfv_select" ON custom_field_values
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin() OR
    EXISTS (SELECT 1 FROM members m WHERE m.id = custom_field_values.member_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "cfv_modify" ON custom_field_values;
CREATE POLICY "cfv_modify" ON custom_field_values
  FOR ALL TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin())
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

-- Member Activity
DROP POLICY IF EXISTS "activity_select" ON member_activity;
CREATE POLICY "activity_select" ON member_activity
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin() OR
    EXISTS (SELECT 1 FROM members m WHERE m.id = member_activity.member_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "activity_insert" ON member_activity;
CREATE POLICY "activity_insert" ON member_activity
  FOR INSERT TO authenticated
  WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS "activity_delete" ON member_activity;
CREATE POLICY "activity_delete" ON member_activity
  FOR DELETE TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());

-- Sports
DROP POLICY IF EXISTS "sports_select" ON sports;
CREATE POLICY "sports_select" ON sports
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin() OR true);

DROP POLICY IF EXISTS "sports_modify" ON sports;
CREATE POLICY "sports_modify" ON sports
  FOR ALL TO authenticated
  USING (user_in_org(organisation_id))
  WITH CHECK (user_in_org(organisation_id));

-- Teams
DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin() OR true);

DROP POLICY IF EXISTS "teams_modify" ON teams;
CREATE POLICY "teams_modify" ON teams
  FOR ALL TO authenticated
  USING (user_in_org(organisation_id))
  WITH CHECK (user_in_org(organisation_id));

-- Team Members
DROP POLICY IF EXISTS "tm_select" ON team_members;
CREATE POLICY "tm_select" ON team_members
  FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin() OR
    EXISTS (SELECT 1 FROM members m WHERE m.id = team_members.member_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "tm_modify" ON team_members;
CREATE POLICY "tm_modify" ON team_members
  FOR ALL TO authenticated
  USING (user_in_org(organisation_id))
  WITH CHECK (user_in_org(organisation_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_members_org ON members(organisation_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_number ON members(organisation_id, member_number);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_member ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_emerg_member ON member_emergency_contacts(member_id);
CREATE INDEX IF NOT EXISTS idx_guard_member ON member_guardians(member_id);
CREATE INDEX IF NOT EXISTS idx_medical_member ON member_medical_information(member_id);
CREATE INDEX IF NOT EXISTS idx_apps_org_status ON membership_applications(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_renewals_org_status ON membership_renewals(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_cf_org ON custom_fields(organisation_id, display_order);
CREATE INDEX IF NOT EXISTS idx_cfv_member ON custom_field_values(member_id);
CREATE INDEX IF NOT EXISTS idx_activity_member ON member_activity(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tm_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tm_member ON team_members(member_id);
/*
# Club Management Platform — Seed Data

## Overview
Populates modules, permissions, subscription plans, Demo Sports Club,
default roles with module access and permissions, membership types,
sports, teams, sample members, and sample applications.
Uses subqueries to reference roles by name to avoid UUID format issues.
*/

-- ============================================================
-- MODULES
-- ============================================================
INSERT INTO modules (key, name, description, category, icon, sort_order) VALUES
  ('core', 'Organisation & Settings', 'Core organisation configuration', 'core', 'Settings', 1),
  ('membership', 'Membership', 'Member register, types, applications, renewals', 'core', 'Users', 2),
  ('teams', 'Teams & Sports', 'Sports, teams, players, team fees', 'operations', 'Trophy', 3),
  ('events', 'Events & Ticketing', 'Events, tickets, check-in, door sales', 'operations', 'Calendar', 4),
  ('finance', 'Finance & Payments', 'Transactions, invoices, refunds, fee settings', 'finance', 'CreditCard', 5),
  ('communications', 'Communications', 'Email, announcements, enquiries, templates', 'operations', 'Mail', 6),
  ('governance', 'Governance & Voting', 'Committee, motions, voting, awards', 'governance', 'Scale', 7),
  ('merchandise', 'Merchandise', 'Products, orders, variants', 'operations', 'ShoppingBag', 8),
  ('donations', 'Donations', 'Campaigns and donations', 'finance', 'Heart', 9),
  ('documents', 'Documents', 'Document library and versioning', 'governance', 'FileText', 10),
  ('contacts', 'Organisations & Contacts', 'External organisations and contacts', 'administration', 'Building2', 11),
  ('contracts', 'Contracts', 'Contract register and reminders', 'administration', 'FileSignature', 12),
  ('tasks', 'Tasks & Compliance', 'Tasks, compliance calendar', 'administration', 'CheckSquare', 13),
  ('privacy', 'Privacy & Data Governance', 'Privacy notices, consents, incidents, retention', 'privacy', 'ShieldCheck', 14),
  ('compliance', 'Regulatory Compliance', 'Compliance profiles and obligations', 'privacy', 'ClipboardCheck', 15),
  ('reports', 'Reports & Analytics', 'Reporting and analytics', 'reporting', 'BarChart3', 16)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- PERMISSIONS
-- ============================================================
INSERT INTO permissions (key, module_key, description, sensitivity) VALUES
  ('members.view', 'membership', 'View member register', 'general'),
  ('members.create', 'membership', 'Create new members', 'general'),
  ('members.edit', 'membership', 'Edit member details', 'general'),
  ('members.archive', 'membership', 'Archive members', 'general'),
  ('members.export', 'membership', 'Export member data', 'general'),
  ('members.emergency.view', 'membership', 'View emergency contacts', 'sensitive'),
  ('members.guardians.view', 'membership', 'View guardian information', 'sensitive'),
  ('members.medical.view', 'membership', 'View medical information', 'highly_sensitive'),
  ('members.applications.review', 'membership', 'Review membership applications', 'general'),
  ('members.applications.approve', 'membership', 'Approve membership applications', 'general'),
  ('members.types.manage', 'membership', 'Manage membership types', 'general'),
  ('members.customfields.manage', 'membership', 'Manage custom fields', 'general'),
  ('members.renewals.manage', 'membership', 'Manage renewals', 'general'),
  ('teams.view', 'teams', 'View teams', 'general'),
  ('teams.create', 'teams', 'Create teams', 'general'),
  ('teams.edit', 'teams', 'Edit teams', 'general'),
  ('teams.manage', 'teams', 'Manage team members', 'general'),
  ('events.view', 'events', 'View events', 'general'),
  ('events.create', 'events', 'Create events', 'general'),
  ('events.publish', 'events', 'Publish events', 'general'),
  ('events.checkin', 'events', 'Check-in attendees', 'general'),
  ('payments.view', 'finance', 'View payments', 'general'),
  ('payments.refund', 'finance', 'Process refunds', 'general'),
  ('finance.settings', 'finance', 'Manage finance settings', 'general'),
  ('communications.send', 'communications', 'Send communications', 'general'),
  ('communications.manage', 'communications', 'Manage templates and announcements', 'general'),
  ('voting.create', 'governance', 'Create voting events', 'general'),
  ('voting.manage', 'governance', 'Manage voting', 'general'),
  ('governance.manage', 'governance', 'Manage committee and governance', 'general'),
  ('documents.view', 'documents', 'View documents', 'general'),
  ('documents.upload', 'documents', 'Upload documents', 'general'),
  ('documents.manage', 'documents', 'Manage document library', 'general'),
  ('roles.manage', 'core', 'Manage roles and permissions', 'general'),
  ('settings.manage', 'core', 'Manage organisation settings', 'general'),
  ('branding.manage', 'core', 'Manage organisation branding', 'general'),
  ('modules.manage', 'core', 'Manage module access', 'general'),
  ('users.manage', 'core', 'Manage users', 'general')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- SUBSCRIPTION PLANS
-- ============================================================
INSERT INTO subscription_plans (name, description, price, billing_cycle, member_limit, admin_limit, storage_mb, email_limit, features, sort_order) VALUES
  ('Starter', 'For small clubs getting started', 49.00, 'monthly', 100, 3, 500, 500, '{"modules": ["core", "membership", "teams"]}', 1),
  ('Club', 'For growing clubs that need more', 149.00, 'monthly', 500, 10, 5000, 5000, '{"modules": ["core", "membership", "teams", "events", "finance", "communications", "documents", "tasks"]}', 2),
  ('Professional', 'For large organisations with full needs', 399.00, 'monthly', 5000, 50, 50000, 50000, '{"modules": ["all"]}', 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- DEMO SPORTS CLUB
-- ============================================================
INSERT INTO organisations (id, legal_name, trading_name, slug, organisation_type, registration_number, country, address_line1, city, region, postcode, email, phone, website, status) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'Demo Sports Club Incorporated',
   'Demo Sports Club',
   'demo-sports-club',
   'sports_club',
   'NR123456',
   'NZ',
   '123 Sports Avenue',
   'Auckland',
   'Auckland',
   '1010',
   'info@demosportsclub.example',
   '+64 9 555 0123',
   'https://demosportsclub.example',
   'active')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO organisation_settings (organisation_id, currency, timezone, date_format, financial_year_start, membership_year_start, guardian_age_threshold, default_membership_status, compliance_profile) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'NZD', 'Pacific/Auckland', 'DD/MM/YYYY', '01-04', '01-09', 18, 'pending', 'nz_incorporated_society')
ON CONFLICT (organisation_id) DO NOTHING;

INSERT INTO organisation_branding (organisation_id, primary_colour, secondary_colour, accent_colour) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '#0F766E', '#1E293B', '#F59E0B')
ON CONFLICT (organisation_id) DO NOTHING;

-- Enable all modules for Demo Sports Club
INSERT INTO organisation_modules (organisation_id, module_id, is_enabled)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', id, true FROM modules
ON CONFLICT (organisation_id, module_id) DO NOTHING;

-- Create subscription for demo org
INSERT INTO subscriptions (organisation_id, plan_id, status, start_date, renewal_date, billing_cycle)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', id, 'active', now(), now() + interval '1 year', 'yearly'
FROM subscription_plans WHERE name = 'Professional'
ON CONFLICT DO NOTHING;

-- ============================================================
-- DEFAULT ROLES (use gen_random_uuid, referenced by name later)
-- ============================================================
INSERT INTO roles (organisation_id, name, description, is_system_role, sort_order) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Organisation Owner', 'Full access to everything. There must always be at least one owner.', true, 1),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Full Administrator', 'Full admin access to all modules.', true, 2),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Secretary', 'Membership full admin, governance full admin, finance read only.', true, 3),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Treasurer', 'Finance full admin, membership read only.', true, 4),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Team Manager', 'Teams full admin, membership restricted.', true, 5),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Read Only Administrator', 'Read only access to all modules.', true, 6),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Member', 'Member portal access only.', true, 7)
ON CONFLICT (organisation_id, name) DO NOTHING;

-- ============================================================
-- ROLE MODULE ACCESS (reference roles by name via subquery)
-- ============================================================
-- Owner: full admin on everything
INSERT INTO role_module_access (role_id, module_id, access_level)
SELECT r.id, m.id, 'full_admin' FROM roles r CROSS JOIN modules m
WHERE r.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name = 'Organisation Owner'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Full Administrator: full admin on everything
INSERT INTO role_module_access (role_id, module_id, access_level)
SELECT r.id, m.id, 'full_admin' FROM roles r CROSS JOIN modules m
WHERE r.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name = 'Full Administrator'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Secretary
INSERT INTO role_module_access (role_id, module_id, access_level)
SELECT r.id, m.id,
  CASE m.key
    WHEN 'membership' THEN 'full_admin'
    WHEN 'governance' THEN 'full_admin'
    WHEN 'communications' THEN 'full_admin'
    WHEN 'documents' THEN 'full_admin'
    WHEN 'tasks' THEN 'full_admin'
    WHEN 'finance' THEN 'read_only'
    WHEN 'events' THEN 'full_admin'
    WHEN 'privacy' THEN 'full_admin'
    WHEN 'compliance' THEN 'full_admin'
    WHEN 'core' THEN 'read_only'
    ELSE 'no_access'
  END
FROM roles r CROSS JOIN modules m
WHERE r.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name = 'Secretary'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Treasurer
INSERT INTO role_module_access (role_id, module_id, access_level)
SELECT r.id, m.id,
  CASE m.key
    WHEN 'finance' THEN 'full_admin'
    WHEN 'membership' THEN 'read_only'
    WHEN 'reports' THEN 'read_only'
    WHEN 'core' THEN 'read_only'
    WHEN 'donations' THEN 'full_admin'
    WHEN 'merchandise' THEN 'read_only'
    ELSE 'no_access'
  END
FROM roles r CROSS JOIN modules m
WHERE r.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name = 'Treasurer'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Team Manager
INSERT INTO role_module_access (role_id, module_id, access_level)
SELECT r.id, m.id,
  CASE m.key
    WHEN 'teams' THEN 'full_admin'
    WHEN 'membership' THEN 'restricted'
    WHEN 'events' THEN 'read_only'
    WHEN 'communications' THEN 'read_only'
    WHEN 'core' THEN 'read_only'
    ELSE 'no_access'
  END
FROM roles r CROSS JOIN modules m
WHERE r.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name = 'Team Manager'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Read Only: read_only on all modules
INSERT INTO role_module_access (role_id, module_id, access_level)
SELECT r.id, m.id, 'read_only' FROM roles r CROSS JOIN modules m
WHERE r.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name = 'Read Only Administrator'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Member: no_access on admin modules
INSERT INTO role_module_access (role_id, module_id, access_level)
SELECT r.id, m.id, 'no_access' FROM roles r CROSS JOIN modules m
WHERE r.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name = 'Member'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- ============================================================
-- ROLE PERMISSIONS
-- ============================================================
-- Owner & Full Admin get all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND r.name IN ('Organisation Owner', 'Full Administrator')
ON CONFLICT DO NOTHING;

-- Secretary gets membership, governance, communications, documents permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name = 'Secretary'
  AND (p.key LIKE 'members.%' OR p.key LIKE 'voting.%' OR p.key LIKE 'governance.%'
       OR p.key LIKE 'communications.%' OR p.key LIKE 'documents.%')
ON CONFLICT DO NOTHING;

-- Treasurer gets finance permissions + members.view
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name = 'Treasurer'
  AND (p.key LIKE 'payments.%' OR p.key LIKE 'finance.%' OR p.key = 'members.view')
ON CONFLICT DO NOTHING;

-- Team Manager gets teams permissions + members.view
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name = 'Team Manager'
  AND (p.key LIKE 'teams.%' OR p.key = 'members.view' OR p.key = 'events.view')
ON CONFLICT DO NOTHING;

-- Read Only gets view permissions only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name = 'Read Only Administrator'
  AND p.key LIKE '%.view'
ON CONFLICT DO NOTHING;

-- ============================================================
-- MEMBERSHIP TYPES
-- ============================================================
INSERT INTO membership_types (organisation_id, name, description, annual_fee, joining_fee, min_age, max_age, voting_rights, committee_eligibility, renewal_required, duration_months, approval_required, sort_order) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Senior', 'Full senior membership with voting rights', 220.00, 50.00, 18, NULL, true, true, true, 12, true, 1),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Junior', 'For members under 18', 120.00, 25.00, 0, 17, false, false, true, 12, true, 2),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Student', 'Discounted membership for tertiary students', 100.00, 25.00, 18, 25, false, false, true, 12, true, 3),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Social', 'Social membership without sports participation', 80.00, 0, 18, NULL, false, false, true, 12, false, 4),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Life', 'Honorary life membership', 0, 0, NULL, NULL, true, true, false, 999, false, 5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SPORTS
-- ============================================================
INSERT INTO sports (organisation_id, name, description, status) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Cricket', 'Summer cricket', 'active'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Netball', 'Winter netball', 'active'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rugby', 'Winter rugby', 'active')
ON CONFLICT (organisation_id, name) DO NOTHING;

-- ============================================================
-- TEAMS
-- ============================================================
INSERT INTO teams (organisation_id, sport_id, name, season, description, contact, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', s.id, 'Premier Cricket', '2025/26', 'Top grade cricket team', 'premier.cricket@demosportsclub.example', 'active'
FROM sports s WHERE s.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND s.name = 'Cricket'
ON CONFLICT DO NOTHING;

INSERT INTO teams (organisation_id, sport_id, name, season, description, contact, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', s.id, 'Junior Cricket', '2025/26', 'Under-15 cricket team', 'junior.cricket@demosportsclub.example', 'active'
FROM sports s WHERE s.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND s.name = 'Cricket'
ON CONFLICT DO NOTHING;

INSERT INTO teams (organisation_id, sport_id, name, season, description, contact, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', s.id, 'Premier Netball', '2025', 'Top grade netball team', 'premier.netball@demosportsclub.example', 'active'
FROM sports s WHERE s.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND s.name = 'Netball'
ON CONFLICT DO NOTHING;

INSERT INTO teams (organisation_id, sport_id, name, season, description, contact, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', s.id, 'Senior Rugby', '2025', 'Senior rugby squad', 'senior.rugby@demosportsclub.example', 'active'
FROM sports s WHERE s.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND s.name = 'Rugby'
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE MEMBERS
-- ============================================================
INSERT INTO members (organisation_id, member_number, title, first_name, last_name, preferred_name, date_of_birth, gender, email, mobile, address_line1, city, region, postcode, country, status, joined_date, member_since, paid_until, voting_eligible) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000001', 'Mr', 'James', 'Wilson', 'Jim', '1985-03-15', 'male', 'james.wilson@example.com', '+64 21 555 0001', '45 Oak Street', 'Auckland', 'Auckland', '1010', 'NZ', 'active', '2020-09-01', '2020-09-01', '2026-09-01', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000002', 'Ms', 'Sarah', 'Connors', 'Sarah', '1992-07-22', 'female', 'sarah.connors@example.com', '+64 21 555 0002', '12 Pine Road', 'Auckland', 'Auckland', '1020', 'NZ', 'active', '2021-09-01', '2021-09-01', '2026-09-01', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000003', 'Mr', 'Michael', 'Chen', 'Mike', '1988-11-30', 'male', 'michael.chen@example.com', '+64 21 555 0003', '78 Elm Avenue', 'Auckland', 'Auckland', '1015', 'NZ', 'active', '2019-09-01', '2019-09-01', '2026-09-01', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000004', 'Mrs', 'Emily', 'Patel', 'Em', '1990-02-14', 'female', 'emily.patel@example.com', '+64 21 555 0004', '34 Kowhai Lane', 'Auckland', 'Auckland', '1025', 'NZ', 'active', '2022-09-01', '2022-09-01', '2026-09-01', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000005', 'Mr', 'David', 'Thompson', 'Dave', '1995-05-20', 'male', 'david.thompson@example.com', '+64 21 555 0005', '56 River Street', 'Auckland', 'Auckland', '1011', 'NZ', 'active', '2023-09-01', '2023-09-01', '2026-09-01', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000006', 'Ms', 'Jessica', 'Brown', 'Jess', '1998-09-10', 'female', 'jessica.brown@example.com', '+64 21 555 0006', '89 Beach Road', 'Auckland', 'Auckland', '1012', 'NZ', 'active', '2022-09-01', '2022-09-01', '2026-09-01', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000007', 'Mr', 'Thomas', 'Walker', 'Tom', '2010-04-18', 'male', 'thomas.walker@example.com', '+64 21 555 0007', '23 Hill Street', 'Auckland', 'Auckland', '1013', 'NZ', 'active', '2024-09-01', '2024-09-01', '2026-09-01', false),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000008', 'Ms', 'Olivia', 'Smith', 'Liv', '2011-12-03', 'female', 'olivia.smith@example.com', '+64 21 555 0008', '67 Park Road', 'Auckland', 'Auckland', '1014', 'NZ', 'active', '2024-09-01', '2024-09-01', '2026-09-01', false),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000009', 'Mr', 'Robert', 'Jones', 'Rob', '1983-08-25', 'male', 'robert.jones@example.com', '+64 21 555 0009', '91 Queen Street', 'Auckland', 'Auckland', '1016', 'NZ', 'active', '2018-09-01', '2018-09-01', '2025-09-01', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000010', 'Mrs', 'Helen', 'Taylor', 'Helen', '1978-01-12', 'female', 'helen.taylor@example.com', '+64 21 555 0010', '15 King Street', 'Auckland', 'Auckland', '1017', 'NZ', 'inactive', '2015-09-01', '2015-09-01', '2024-09-01', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000011', 'Mr', 'Daniel', 'Anderson', 'Dan', '1993-06-08', 'male', 'daniel.anderson@example.com', '+64 21 555 0011', '42 Church Lane', 'Auckland', 'Auckland', '1018', 'NZ', 'active', '2021-09-01', '2021-09-01', '2026-09-01', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000012', 'Ms', 'Charlotte', 'White', 'Charlie', '1996-10-30', 'female', 'charlotte.white@example.com', '+64 21 555 0012', '5 Victoria Road', 'Auckland', 'Auckland', '1019', 'NZ', 'active', '2023-09-01', '2023-09-01', '2026-09-01', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000013', 'Mr', 'William', 'Garcia', 'Will', '2009-03-22', 'male', 'william.garcia@example.com', '+64 21 555 0013', '18 Nelson Street', 'Auckland', 'Auckland', '1021', 'NZ', 'active', '2024-09-01', '2024-09-01', '2026-09-01', false),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000014', 'Ms', 'Sophie', 'Lee', 'Soph', '2012-07-14', 'female', 'sophie.lee@example.com', '+64 21 555 0014', '30 Cook Street', 'Auckland', 'Auckland', '1022', 'NZ', 'pending', '2025-08-15', NULL, NULL, false),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DSC-000015', 'Mr', 'Christopher', 'Evans', 'Chris', '1987-11-05', 'male', 'christopher.evans@example.com', '+64 21 555 0015', '7 Albert Street', 'Auckland', 'Auckland', '1023', 'NZ', 'active', '2020-09-01', '2020-09-01', '2025-09-01', true)
ON CONFLICT (organisation_id, member_number) DO NOTHING;

-- Memberships for members (link to Senior type)
INSERT INTO memberships (organisation_id, member_id, membership_type_id, status, start_date, end_date)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', m.id, mt.id,
  CASE WHEN m.status = 'inactive' THEN 'expired' WHEN m.status = 'pending' THEN 'pending' ELSE 'active' END,
  m.joined_date, m.paid_until
FROM members m CROSS JOIN membership_types mt
WHERE m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND mt.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND mt.name = 'Senior'
  AND m.member_number IN ('DSC-000001','DSC-000002','DSC-000003','DSC-000004','DSC-000005','DSC-000006','DSC-000009','DSC-000010','DSC-000011','DSC-000012','DSC-000015')
ON CONFLICT DO NOTHING;

-- Junior memberships
INSERT INTO memberships (organisation_id, member_id, membership_type_id, status, start_date, end_date)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', m.id, mt.id, 'active', m.joined_date, m.paid_until
FROM members m CROSS JOIN membership_types mt
WHERE m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND mt.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND mt.name = 'Junior'
  AND m.member_number IN ('DSC-000007','DSC-000008','DSC-000013')
ON CONFLICT DO NOTHING;

-- Pending membership for DSC-000014
INSERT INTO memberships (organisation_id, member_id, membership_type_id, status, start_date)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', m.id, mt.id, 'pending', m.joined_date
FROM members m CROSS JOIN membership_types mt
WHERE m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND mt.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND mt.name = 'Junior' AND m.member_number = 'DSC-000014'
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE MEMBERSHIP APPLICATIONS
-- ============================================================
INSERT INTO membership_applications (organisation_id, membership_type_id, first_name, last_name, email, mobile, date_of_birth, address_line1, city, region, postcode, country, status, submitted_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', mt.id, 'Marcus', 'Turner', 'marcus.turner@example.com', '+64 21 555 0016', '1994-04-12', '22 New Street', 'Auckland', 'Auckland', '1024', 'NZ', 'under_review', now()
FROM membership_types mt WHERE mt.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND mt.name = 'Senior'
ON CONFLICT DO NOTHING;

INSERT INTO membership_applications (organisation_id, membership_type_id, first_name, last_name, email, mobile, date_of_birth, address_line1, city, region, postcode, country, status, submitted_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', mt.id, 'Aisha', 'Mohammed', 'aisha.mohammed@example.com', '+64 21 555 0017', '2002-08-20', '14 Lake Road', 'Auckland', 'Auckland', '1026', 'NZ', 'submitted', now() - interval '2 days'
FROM membership_types mt WHERE mt.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND mt.name = 'Student'
ON CONFLICT DO NOTHING;

INSERT INTO membership_applications (organisation_id, membership_type_id, first_name, last_name, email, mobile, date_of_birth, address_line1, city, region, postcode, country, status, submitted_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', mt.id, 'Ryan', 'Campbell', 'ryan.campbell@example.com', '+64 21 555 0018', '2008-11-15', '33 School Road', 'Auckland', 'Auckland', '1027', 'NZ', 'payment_required', now() - interval '5 days'
FROM membership_types mt WHERE mt.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND mt.name = 'Junior'
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE MEMBER ACTIVITY
-- ============================================================
INSERT INTO member_activity (organisation_id, member_id, activity_type, description)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', m.id, 'joined', 'Joined Demo Sports Club'
FROM members m WHERE m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number = 'DSC-000001'
ON CONFLICT DO NOTHING;

INSERT INTO member_activity (organisation_id, member_id, activity_type, description)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', m.id, 'membership_renewed', 'Membership renewed for 2025/26 season'
FROM members m WHERE m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number = 'DSC-000001'
ON CONFLICT DO NOTHING;

INSERT INTO member_activity (organisation_id, member_id, activity_type, description)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', m.id, 'team_joined', 'Joined Premier Cricket team'
FROM members m WHERE m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number = 'DSC-000001'
ON CONFLICT DO NOTHING;

-- ============================================================
-- TEAM MEMBERSHIPS
-- ============================================================
INSERT INTO team_members (organisation_id, team_id, member_id, season, role)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', t.id, m.id, '2025/26', 'player'
FROM teams t, members m
WHERE t.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND t.name = 'Premier Cricket'
  AND m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number = 'DSC-000001'
ON CONFLICT DO NOTHING;

INSERT INTO team_members (organisation_id, team_id, member_id, season, role)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', t.id, m.id, '2025/26', 'player'
FROM teams t, members m
WHERE t.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND t.name = 'Premier Cricket'
  AND m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number = 'DSC-000003'
ON CONFLICT DO NOTHING;

INSERT INTO team_members (organisation_id, team_id, member_id, season, role)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', t.id, m.id, '2025/26', 'player'
FROM teams t, members m
WHERE t.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND t.name = 'Junior Cricket'
  AND m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number = 'DSC-000007'
ON CONFLICT DO NOTHING;

INSERT INTO team_members (organisation_id, team_id, member_id, season, role)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', t.id, m.id, '2025/26', 'player'
FROM teams t, members m
WHERE t.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND t.name = 'Premier Netball'
  AND m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number = 'DSC-000002'
ON CONFLICT DO NOTHING;

INSERT INTO team_members (organisation_id, team_id, member_id, season, role)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', t.id, m.id, '2025/26', 'player'
FROM teams t, members m
WHERE t.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND t.name = 'Premier Netball'
  AND m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number = 'DSC-000004'
ON CONFLICT DO NOTHING;

-- ============================================================
-- EMERGENCY CONTACTS (for junior members)
-- ============================================================
INSERT INTO member_emergency_contacts (organisation_id, member_id, full_name, relationship, mobile, email)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', m.id, 'Robert Walker', 'Father', '+64 21 555 0101', 'rwalker@example.com'
FROM members m WHERE m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number = 'DSC-000007'
ON CONFLICT DO NOTHING;

INSERT INTO member_emergency_contacts (organisation_id, member_id, full_name, relationship, mobile, email)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', m.id, 'Mary Walker', 'Mother', '+64 21 555 0102', 'mwalker@example.com'
FROM members m WHERE m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number = 'DSC-000007'
ON CONFLICT DO NOTHING;

-- ============================================================
-- GUARDIANS (for junior members)
-- ============================================================
INSERT INTO member_guardians (organisation_id, member_id, full_name, relationship, email, mobile, is_primary, is_legal_guardian, is_billing_contact)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', m.id, 'Robert Walker', 'Father', 'rwalker@example.com', '+64 21 555 0101', true, true, true
FROM members m WHERE m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number = 'DSC-000007'
ON CONFLICT DO NOTHING;

INSERT INTO member_guardians (organisation_id, member_id, full_name, relationship, email, mobile, is_primary, is_legal_guardian, is_billing_contact)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', m.id, 'Mary Walker', 'Mother', 'mwalker@example.com', '+64 21 555 0102', false, true, false
FROM members m WHERE m.organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number = 'DSC-000007'
ON CONFLICT DO NOTHING;
/*
# Club Management Platform — Demo Auth Users (fixed)

## Overview
Creates 6 demo auth users with known passwords for testing.
All passwords are "DemoClub2025!" (bcrypt hashed via pgcrypto).
Links each user to Demo Sports Club with appropriate roles.

## Demo Users
1. owner@demosportsclub.example — Organisation Owner
2. secretary@demosportsclub.example — Secretary
3. treasurer@demosportsclub.example — Treasurer
4. teammanager@demosportsclub.example — Team Manager
5. readonly@demosportsclub.example — Read Only Administrator
6. platform.admin@clubos.example — Platform Super Admin
7. member@demosportsclub.example — Member Portal

All passwords: DemoClub2025!
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Delete existing demo users if any (cleanup for re-runs)
DELETE FROM auth.users WHERE email IN (
  'owner@demosportsclub.example',
  'secretary@demosportsclub.example',
  'treasurer@demosportsclub.example',
  'teammanager@demosportsclub.example',
  'readonly@demosportsclub.example',
  'platform.admin@clubos.example',
  'member@demosportsclub.example'
);

-- Create auth users
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, is_sso_user, is_anonymous
) VALUES
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'owner@demosportsclub.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"James","last_name":"Wilson"}',
   '', '', false, false
  ),
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'secretary@demosportsclub.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Sarah","last_name":"Connors"}',
   '', '', false, false
  ),
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'treasurer@demosportsclub.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Robert","last_name":"Jones"}',
   '', '', false, false
  ),
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'teammanager@demosportsclub.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"David","last_name":"Thompson"}',
   '', '', false, false
  ),
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'readonly@demosportsclub.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Helen","last_name":"Taylor"}',
   '', '', false, false
  ),
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'platform.admin@clubos.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Platform","last_name":"Admin"}',
   '', '', false, false
  ),
  ('00000000-0000-0000-0000-000000000000',
   gen_random_uuid(), 'authenticated', 'authenticated',
   'member@demosportsclub.example',
   crypt('DemoClub2025!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Sarah","last_name":"Connors"}',
   '', '', false, false
  );

-- Link users to Demo Sports Club with roles
INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Organisation Owner'),
  true, 'active'
FROM auth.users u WHERE u.email = 'owner@demosportsclub.example'
ON CONFLICT (organisation_id, user_id) DO NOTHING;

INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Secretary'),
  false, 'active'
FROM auth.users u WHERE u.email = 'secretary@demosportsclub.example'
ON CONFLICT (organisation_id, user_id) DO NOTHING;

INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Treasurer'),
  false, 'active'
FROM auth.users u WHERE u.email = 'treasurer@demosportsclub.example'
ON CONFLICT (organisation_id, user_id) DO NOTHING;

INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Team Manager'),
  false, 'active'
FROM auth.users u WHERE u.email = 'teammanager@demosportsclub.example'
ON CONFLICT (organisation_id, user_id) DO NOTHING;

INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Read Only Administrator'),
  false, 'active'
FROM auth.users u WHERE u.email = 'readonly@demosportsclub.example'
ON CONFLICT (organisation_id, user_id) DO NOTHING;

-- Member portal user link
INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Member'),
  false, 'active'
FROM auth.users u WHERE u.email = 'member@demosportsclub.example'
ON CONFLICT (organisation_id, user_id) DO NOTHING;

-- Assign user_roles
INSERT INTO user_roles (organisation_id, user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Organisation Owner')
FROM auth.users u WHERE u.email = 'owner@demosportsclub.example'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (organisation_id, user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Secretary')
FROM auth.users u WHERE u.email = 'secretary@demosportsclub.example'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (organisation_id, user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Treasurer')
FROM auth.users u WHERE u.email = 'treasurer@demosportsclub.example'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (organisation_id, user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Team Manager')
FROM auth.users u WHERE u.email = 'teammanager@demosportsclub.example'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (organisation_id, user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Read Only Administrator')
FROM auth.users u WHERE u.email = 'readonly@demosportsclub.example'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (organisation_id, user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', u.id,
  (SELECT id FROM roles WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Member')
FROM auth.users u WHERE u.email = 'member@demosportsclub.example'
ON CONFLICT DO NOTHING;

-- Set platform admin flag for platform.admin user
UPDATE profiles SET is_platform_admin = true
WHERE email = 'platform.admin@clubos.example';

-- Link the owner's profile to their member record
UPDATE members SET user_id = (
  SELECT id FROM auth.users WHERE email = 'owner@demosportsclub.example'
)
WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND member_number = 'DSC-000001';

-- Link team manager to their member record
UPDATE members SET user_id = (
  SELECT id FROM auth.users WHERE email = 'teammanager@demosportsclub.example'
)
WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND member_number = 'DSC-000005';

-- Link dedicated member portal account
UPDATE members SET user_id = (SELECT id FROM auth.users WHERE email = 'member@demosportsclub.example')
WHERE organisation_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND member_number = 'DSC-000002';

-- Prevent Supabase Auth schema errors for manually seeded users
UPDATE auth.users SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE email LIKE '%@demosportsclub.example' OR email='platform.admin@clubos.example';
/* ClubOS Events & Ticketing + demo data */

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  venue text,
  address text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  capacity integer CHECK (capacity IS NULL OR capacity >= 0),
  banner_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled','completed')),
  sales_open_at timestamptz,
  sales_close_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  member_price numeric(12,2) CHECK (member_price IS NULL OR member_price >= 0),
  quantity_available integer CHECK (quantity_available IS NULL OR quantity_available >= 0),
  max_per_order integer NOT NULL DEFAULT 10 CHECK (max_per_order > 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  purchaser_name text NOT NULL,
  purchaser_email text,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NZD',
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','void','free')),
  payment_provider text,
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id uuid NOT NULL REFERENCES event_ticket_types(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES event_orders(id) ON DELETE SET NULL,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  attendee_name text NOT NULL,
  attendee_email text,
  qr_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','cancelled','refunded','used')),
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  checkin_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_org_start_idx ON events(organisation_id, start_at);
CREATE INDEX IF NOT EXISTS event_ticket_types_event_idx ON event_ticket_types(event_id);
CREATE INDEX IF NOT EXISTS event_orders_event_idx ON event_orders(event_id);
CREATE INDEX IF NOT EXISTS event_tickets_event_idx ON event_tickets(event_id);
CREATE INDEX IF NOT EXISTS event_tickets_qr_idx ON event_tickets(qr_token);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select ON events;
CREATE POLICY events_select ON events FOR SELECT USING (user_in_org(organisation_id) OR is_platform_admin());
DROP POLICY IF EXISTS events_manage ON events;
CREATE POLICY events_manage ON events FOR ALL USING (user_in_org(organisation_id) OR is_platform_admin()) WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS event_ticket_types_select ON event_ticket_types;
CREATE POLICY event_ticket_types_select ON event_ticket_types FOR SELECT USING (user_in_org(organisation_id) OR is_platform_admin());
DROP POLICY IF EXISTS event_ticket_types_manage ON event_ticket_types;
CREATE POLICY event_ticket_types_manage ON event_ticket_types FOR ALL USING (user_in_org(organisation_id) OR is_platform_admin()) WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS event_orders_select ON event_orders;
CREATE POLICY event_orders_select ON event_orders FOR SELECT USING (user_in_org(organisation_id) OR is_platform_admin());
DROP POLICY IF EXISTS event_orders_manage ON event_orders;
CREATE POLICY event_orders_manage ON event_orders FOR ALL USING (user_in_org(organisation_id) OR is_platform_admin()) WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

DROP POLICY IF EXISTS event_tickets_select ON event_tickets;
CREATE POLICY event_tickets_select ON event_tickets FOR SELECT USING (user_in_org(organisation_id) OR is_platform_admin());
DROP POLICY IF EXISTS event_tickets_manage ON event_tickets;
CREATE POLICY event_tickets_manage ON event_tickets FOR ALL USING (user_in_org(organisation_id) OR is_platform_admin()) WITH CHECK (user_in_org(organisation_id) OR is_platform_admin());

-- Demo events
INSERT INTO events (id, organisation_id, title, description, venue, address, start_at, end_at, capacity, status, sales_open_at, sales_close_at)
VALUES
('11111111-1111-4111-8111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Club Awards Night','Annual club celebration, dinner and player awards.','Harbour View Function Centre','10 Quay Street, Auckland', now() + interval '21 days', now() + interval '21 days 4 hours',180,'published',now()-interval '14 days',now()+interval '20 days'),
('22222222-2222-4222-8222-222222222222','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Family Sports Day','A free family day with junior games, BBQ and activities.','Demo Sports Club Grounds','123 Sports Avenue, Auckland',now()+interval '35 days',now()+interval '35 days 6 hours',300,'published',now()-interval '7 days',now()+interval '34 days'),
('33333333-3333-4333-8333-333333333333','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Fundraising Dinner','Fundraising dinner supporting new junior equipment.','Grand Hall','88 Queen Street, Auckland',now()+interval '60 days',now()+interval '60 days 4 hours',120,'draft',NULL,NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_ticket_types (id,organisation_id,event_id,name,description,price,member_price,quantity_available,max_per_order,sort_order)
VALUES
('aaaa1111-1111-4111-8111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','11111111-1111-4111-8111-111111111111','Adult','Adult admission including dinner',65,55,140,8,1),
('aaaa2222-2222-4222-8222-222222222222','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','11111111-1111-4111-8111-111111111111','Junior','Under 18 admission',30,25,40,8,2),
('bbbb1111-1111-4111-8111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','22222222-2222-4222-8222-222222222222','Free Registration','Family Sports Day registration',0,0,300,10,1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_orders (id,organisation_id,event_id,member_id,purchaser_name,purchaser_email,total_amount,currency,payment_status,payment_provider,payment_reference)
SELECT 'cccc1111-1111-4111-8111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','11111111-1111-4111-8111-111111111111',m.id,'James Wilson','james.wilson@example.com',110,'NZD','paid','stripe','DEMO-STRIPE-001'
FROM members m WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number='DSC-000001'
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_orders (id,organisation_id,event_id,member_id,purchaser_name,purchaser_email,total_amount,currency,payment_status)
SELECT 'cccc2222-2222-4222-8222-222222222222','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','22222222-2222-4222-8222-222222222222',m.id,'Sarah Connors','sarah.connors@example.com',0,'NZD','free'
FROM members m WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number='DSC-000002'
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_tickets (id,organisation_id,event_id,ticket_type_id,order_id,member_id,attendee_name,attendee_email,qr_token,status)
SELECT 'dddd1111-1111-4111-8111-111111111111','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','11111111-1111-4111-8111-111111111111','aaaa1111-1111-4111-8111-111111111111','cccc1111-1111-4111-8111-111111111111',m.id,'James Wilson','james.wilson@example.com','CLUBOS-DEMO-VALID-001','valid'
FROM members m WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number='DSC-000001'
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_tickets (id,organisation_id,event_id,ticket_type_id,order_id,member_id,attendee_name,attendee_email,qr_token,status,checked_in_at,checkin_method)
SELECT 'dddd2222-2222-4222-8222-222222222222','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','11111111-1111-4111-8111-111111111111','aaaa1111-1111-4111-8111-111111111111','cccc1111-1111-4111-8111-111111111111',m.id,'Michael Chen','michael.chen@example.com','CLUBOS-DEMO-USED-002','used',now()-interval '10 minutes','qr'
FROM members m WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number='DSC-000003'
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_tickets (id,organisation_id,event_id,ticket_type_id,order_id,member_id,attendee_name,attendee_email,qr_token,status)
SELECT 'dddd3333-3333-4333-8333-333333333333','a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','22222222-2222-4222-8222-222222222222','bbbb1111-1111-4111-8111-111111111111','cccc2222-2222-4222-8222-222222222222',m.id,'Sarah Connors','sarah.connors@example.com','CLUBOS-DEMO-FAMILY-003','valid'
FROM members m WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number='DSC-000002'
ON CONFLICT (id) DO NOTHING;
/* ClubOS complete demo dataset and test-support tables.
   Run AFTER migrations 001-006. Idempotent where practical. */

-- ------------------------------------------------------------------
-- Repair/link existing demo auth users to profiles and Demo Sports Club
-- ------------------------------------------------------------------
INSERT INTO profiles (id,email,first_name,last_name,is_platform_admin)
SELECT id,email,
       COALESCE(raw_user_meta_data->>'first_name','Demo'),
       COALESCE(raw_user_meta_data->>'last_name','User'),
       email='platform.admin@clubos.example'
FROM auth.users
WHERE email IN ('owner@demosportsclub.example','secretary@demosportsclub.example','treasurer@demosportsclub.example','teammanager@demosportsclub.example','readonly@demosportsclub.example','platform.admin@clubos.example','member@demosportsclub.example')
ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name,
 is_platform_admin=(profiles.is_platform_admin OR EXCLUDED.is_platform_admin);

INSERT INTO organisation_users (organisation_id,user_id,role_id,is_owner,status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',p.id,r.id,(p.email='owner@demosportsclub.example'),'active'
FROM profiles p
JOIN roles r ON r.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
 AND r.name=CASE p.email
   WHEN 'owner@demosportsclub.example' THEN 'Organisation Owner'
   WHEN 'secretary@demosportsclub.example' THEN 'Secretary'
   WHEN 'treasurer@demosportsclub.example' THEN 'Treasurer'
   WHEN 'teammanager@demosportsclub.example' THEN 'Team Manager'
   WHEN 'readonly@demosportsclub.example' THEN 'Read Only Administrator'
   WHEN 'member@demosportsclub.example' THEN 'Member' END
WHERE p.email IN ('owner@demosportsclub.example','secretary@demosportsclub.example','treasurer@demosportsclub.example','teammanager@demosportsclub.example','readonly@demosportsclub.example','member@demosportsclub.example')
ON CONFLICT (organisation_id,user_id) DO UPDATE SET role_id=EXCLUDED.role_id,status='active',is_owner=EXCLUDED.is_owner;

INSERT INTO user_roles (organisation_id,user_id,role_id)
SELECT ou.organisation_id,ou.user_id,ou.role_id FROM organisation_users ou
WHERE ou.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND ou.role_id IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE members m SET user_id=p.id FROM profiles p
WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
AND ((m.member_number='DSC-000001' AND p.email='owner@demosportsclub.example')
  OR (m.member_number='DSC-000005' AND p.email='teammanager@demosportsclub.example')
  OR (m.member_number='DSC-000002' AND p.email='member@demosportsclub.example'));

-- ------------------------------------------------------------------
-- Rich member information
-- ------------------------------------------------------------------
INSERT INTO member_emergency_contacts (organisation_id,member_id,full_name,relationship,mobile,email,sort_order)
SELECT m.organisation_id,m.id,x.full_name,x.relationship,x.mobile,x.email,0
FROM members m JOIN (VALUES
 ('DSC-000001','Anna Wilson','Spouse','+64 21 555 1010','anna.wilson@example.com'),
 ('DSC-000002','Peter Connors','Father','+64 21 555 1020','peter.connors@example.com'),
 ('DSC-000003','Grace Chen','Spouse','+64 21 555 1030','grace.chen@example.com'),
 ('DSC-000007','Rachel Walker','Mother','+64 21 555 1070','rachel.walker@example.com'),
 ('DSC-000008','Mark Smith','Father','+64 21 555 1080','mark.smith@example.com'),
 ('DSC-000013','Elena Garcia','Mother','+64 21 555 1130','elena.garcia@example.com')
) x(member_number,full_name,relationship,mobile,email) ON x.member_number=m.member_number
WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
AND NOT EXISTS (SELECT 1 FROM member_emergency_contacts e WHERE e.member_id=m.id AND e.full_name=x.full_name);

INSERT INTO member_guardians (organisation_id,member_id,full_name,relationship,email,mobile,address,same_address_as_child,is_primary,is_legal_guardian,is_billing_contact,is_emergency_contact)
SELECT m.organisation_id,m.id,x.full_name,x.relationship,x.email,x.mobile,x.address,true,true,true,true,true
FROM members m JOIN (VALUES
 ('DSC-000007','Rachel Walker','Mother','rachel.walker@example.com','+64 21 555 1070','23 Hill Street, Wellington'),
 ('DSC-000008','Mark Smith','Father','mark.smith@example.com','+64 21 555 1080','67 Park Road, Wellington'),
 ('DSC-000013','Elena Garcia','Mother','elena.garcia@example.com','+64 21 555 1130','18 Nelson Street, Wellington'),
 ('DSC-000014','Daniel Lee','Father','daniel.lee@example.com','+64 21 555 1140','30 Cook Street, Wellington')
) x(member_number,full_name,relationship,email,mobile,address) ON x.member_number=m.member_number
WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
AND NOT EXISTS (SELECT 1 FROM member_guardians g WHERE g.member_id=m.id AND g.full_name=x.full_name);

INSERT INTO member_medical_information (organisation_id,member_id,medical_conditions,allergies,medication,existing_injuries,accessibility_requirements,dietary_requirements,emergency_notes)
SELECT m.organisation_id,m.id,x.cond,x.allergy,x.med,x.injury,x.access,x.diet,x.notes
FROM members m JOIN (VALUES
 ('DSC-000001','Asthma','Penicillin','Salbutamol inhaler as required','Previous right ankle sprain',NULL,'No special requirements','Inhaler kept in sports bag'),
 ('DSC-000007','Mild exercise-induced asthma',NULL,'Preventer inhaler',NULL,NULL,'Nut-free preference','Guardian to be contacted for breathing difficulty'),
 ('DSC-000008',NULL,'Peanuts','EpiPen',NULL,NULL,'Strict peanut allergy','EpiPen carried at all times'),
 ('DSC-000013',NULL,NULL,NULL,'Recovering left wrist strain',NULL,'Vegetarian',NULL)
) x(member_number,cond,allergy,med,injury,access,diet,notes) ON x.member_number=m.member_number
WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
ON CONFLICT (member_id) DO UPDATE SET medical_conditions=EXCLUDED.medical_conditions,allergies=EXCLUDED.allergies,medication=EXCLUDED.medication,
existing_injuries=EXCLUDED.existing_injuries,accessibility_requirements=EXCLUDED.accessibility_requirements,dietary_requirements=EXCLUDED.dietary_requirements,emergency_notes=EXCLUDED.emergency_notes;

INSERT INTO custom_fields (organisation_id,label,help_text,field_type,options,section,display_order,is_mandatory,member_editable,is_application_field,is_renewal_field,is_profile_field,sensitivity)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.label,x.help,x.ft,x.opts::jsonb,x.section,x.ord,x.mand,true,true,true,true,x.sens
FROM (VALUES
 ('T-shirt Size','Used for club apparel','select','["XS","S","M","L","XL","2XL"]','club_details',1,false,'general'),
 ('Primary Sport','Main sport played','select','["Cricket","Netball","Football","Badminton"]','club_details',2,true,'general'),
 ('Photo Consent','Consent to club photography','boolean','[]','consent',3,true,'sensitive'),
 ('Volunteer Interests','Areas where the member can help','multiselect','["Coaching","Events","Fundraising","Committee","Transport"]','club_details',4,false,'general')
) x(label,help,ft,opts,section,ord,mand,sens)
WHERE NOT EXISTS (SELECT 1 FROM custom_fields c WHERE c.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND c.label=x.label);

INSERT INTO custom_field_values (organisation_id,member_id,custom_field_id,value)
SELECT m.organisation_id,m.id,c.id,
CASE c.label WHEN 'T-shirt Size' THEN CASE m.member_number WHEN 'DSC-000001' THEN 'L' WHEN 'DSC-000002' THEN 'M' ELSE 'S' END
 WHEN 'Primary Sport' THEN CASE WHEN m.member_number IN ('DSC-000001','DSC-000003','DSC-000005','DSC-000007','DSC-000013') THEN 'Cricket' ELSE 'Netball' END
 WHEN 'Photo Consent' THEN 'true'
 WHEN 'Volunteer Interests' THEN CASE m.member_number WHEN 'DSC-000001' THEN 'Events,Committee' WHEN 'DSC-000002' THEN 'Fundraising' ELSE 'Events' END END
FROM members m CROSS JOIN custom_fields c
WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND c.organisation_id=m.organisation_id
AND m.member_number IN ('DSC-000001','DSC-000002','DSC-000007')
ON CONFLICT (member_id,custom_field_id) DO UPDATE SET value=EXCLUDED.value;

INSERT INTO member_activity (organisation_id,member_id,activity_type,description,metadata)
SELECT m.organisation_id,m.id,x.typ,x.des,x.meta::jsonb
FROM members m JOIN (VALUES
 ('DSC-000001','award','Received Club Service Award 2025','{"award":"Club Service Award 2025"}'),
 ('DSC-000001','payment','Paid 2026/27 Senior membership','{"amount":220,"method":"Stripe"}'),
 ('DSC-000001','event','Purchased Awards Night ticket','{"event":"Club Awards Night"}'),
 ('DSC-000002','volunteer','Volunteered at junior registration day','{"hours":4}'),
 ('DSC-000007','team','Selected for Junior Cricket','{"team":"Junior Cricket"}')
) x(member_number,typ,des,meta) ON x.member_number=m.member_number
WHERE m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
AND NOT EXISTS (SELECT 1 FROM member_activity a WHERE a.member_id=m.id AND a.description=x.des);

-- Applications in different workflow states
INSERT INTO membership_applications (organisation_id,membership_type_id,first_name,last_name,email,mobile,date_of_birth,address_line1,city,region,postcode,country,status,submitted_at,reviewer_notes,custom_field_data)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',mt.id,x.fn,x.ln,x.email,x.mobile,x.dob::date,x.addr,'Wellington','Wellington','6011','NZ',x.status,now()-x.age::interval,x.notes,x.custom::jsonb
FROM membership_types mt JOIN (VALUES
 ('Junior','Noah','Fernando','noah.fernando@example.com','+64 21 666 0001','2012-05-11','14 Tawa Street','submitted','3 days','Guardian consent attached','{"Primary Sport":"Cricket","Photo Consent":true}'),
 ('Senior','Aisha','Khan','aisha.khan@example.com','+64 21 666 0002','1994-09-02','9 Harbour View','under_review','5 days','Identity checked','{"Primary Sport":"Netball","T-shirt Size":"M"}'),
 ('Social','Ben','Roberts','ben.roberts@example.com','+64 21 666 0003','1981-01-26','88 Main Road','approved','8 days','Approved by secretary','{"Volunteer Interests":["Events"]}')
) x(type,fn,ln,email,mobile,dob,addr,status,age,notes,custom) ON mt.name=x.type AND mt.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
WHERE NOT EXISTS (SELECT 1 FROM membership_applications a WHERE a.organisation_id=mt.organisation_id AND a.email=x.email);

INSERT INTO membership_renewals (organisation_id,member_id,membership_id,status,renewal_open_date,due_date,grace_period_days,expiry_date,fee_amount,last_reminder_sent)
SELECT ms.organisation_id,ms.member_id,ms.id,x.status,CURRENT_DATE-30,CURRENT_DATE+x.due,14,CURRENT_DATE+x.exp,mt.annual_fee,now()-interval '5 days'
FROM memberships ms JOIN members m ON m.id=ms.member_id JOIN membership_types mt ON mt.id=ms.membership_type_id
JOIN (VALUES ('DSC-000009','overdue',-10,4),('DSC-000015','due',7,21),('DSC-000001','paid',300,314)) x(member_number,status,due,exp) ON m.member_number=x.member_number
WHERE NOT EXISTS (SELECT 1 FROM membership_renewals r WHERE r.membership_id=ms.id AND r.status=x.status);

-- Team membership assignments
INSERT INTO team_members (organisation_id,team_id,member_id,season,role)
SELECT t.organisation_id,t.id,m.id,t.season,x.role
FROM teams t JOIN (VALUES
 ('Premier Cricket','DSC-000001','player'),('Premier Cricket','DSC-000003','captain'),('Premier Cricket','DSC-000005','manager'),
 ('Junior Cricket','DSC-000007','player'),('Junior Cricket','DSC-000013','player'),('Premier Netball','DSC-000002','player'),('Premier Netball','DSC-000004','captain')
) x(team,member_number,role) ON t.name=x.team
JOIN members m ON m.organisation_id=t.organisation_id AND m.member_number=x.member_number
WHERE t.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------
-- Extended demo module tables
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS club_finance_transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 member_id uuid REFERENCES members(id) ON DELETE SET NULL, reference text NOT NULL, transaction_type text NOT NULL,
 description text, amount numeric(12,2) NOT NULL, currency text DEFAULT 'NZD', provider text, status text DEFAULT 'paid', occurred_at timestamptz DEFAULT now(), UNIQUE(organisation_id,reference));
CREATE TABLE IF NOT EXISTS club_communications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 subject text NOT NULL, audience text, channel text DEFAULT 'email', sent_count int DEFAULT 0, open_rate numeric(5,2), status text DEFAULT 'draft', sent_at timestamptz);
CREATE TABLE IF NOT EXISTS governance_motions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 title text NOT NULL, proposed_by text, meeting_name text, motion_text text, outcome text, status text DEFAULT 'open', meeting_date date);
CREATE TABLE IF NOT EXISTS club_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 title text NOT NULL, category text, version text, review_date date, status text DEFAULT 'current', visibility text DEFAULT 'members');
CREATE TABLE IF NOT EXISTS merchandise_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 name text NOT NULL, sku text, price numeric(10,2), stock_qty int DEFAULT 0, status text DEFAULT 'active', UNIQUE(organisation_id,sku));
CREATE TABLE IF NOT EXISTS donations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 member_id uuid REFERENCES members(id) ON DELETE SET NULL, donor_name text, campaign text, amount numeric(12,2), provider text, status text DEFAULT 'received', donated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS organisation_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 company_name text NOT NULL, contact_name text, category text, email text, phone text, status text DEFAULT 'active');
CREATE TABLE IF NOT EXISTS club_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 title text NOT NULL, counterparty text, start_date date, expiry_date date, annual_value numeric(12,2), status text DEFAULT 'active');
CREATE TABLE IF NOT EXISTS club_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 title text NOT NULL, owner_name text, category text, due_date date, priority text DEFAULT 'normal', status text DEFAULT 'open');
CREATE TABLE IF NOT EXISTS privacy_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 reference text NOT NULL, requester_name text, request_type text, received_at date, due_date date, status text DEFAULT 'open', UNIQUE(organisation_id,reference));
CREATE TABLE IF NOT EXISTS compliance_register (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 requirement text NOT NULL, authority text, owner_name text, due_date date, status text DEFAULT 'current');
CREATE TABLE IF NOT EXISTS support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
 reference text UNIQUE NOT NULL, subject text NOT NULL, priority text DEFAULT 'normal', status text DEFAULT 'open', created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS platform_usage_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
 snapshot_date date NOT NULL DEFAULT CURRENT_DATE, member_count int, email_count int, event_scans int, storage_mb int, api_calls int, UNIQUE(organisation_id,snapshot_date));

-- RLS for extended org tables
DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['club_finance_transactions','club_communications','governance_motions','club_documents','merchandise_products','donations','organisation_contacts','club_contracts','club_tasks','privacy_requests','compliance_register','platform_usage_snapshots'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('DROP POLICY IF EXISTS demo_org_access ON %I',t);
 EXECUTE format('CREATE POLICY demo_org_access ON %I FOR ALL USING (user_in_org(organisation_id) OR is_platform_admin()) WITH CHECK (user_in_org(organisation_id) OR is_platform_admin())',t);
END LOOP;
END $$;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_support_access ON support_tickets;
CREATE POLICY demo_support_access ON support_tickets FOR ALL USING (organisation_id IS NULL OR user_in_org(organisation_id) OR is_platform_admin()) WITH CHECK (organisation_id IS NULL OR user_in_org(organisation_id) OR is_platform_admin());

-- Seed extended modules
INSERT INTO club_finance_transactions (organisation_id,member_id,reference,transaction_type,description,amount,provider,status,occurred_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',m.id,x.ref,x.typ,x.des,x.amt,x.provider,x.status,now()-x.age::interval
FROM (VALUES
 ('DSC-000001','PAY-1042','membership','2026/27 Senior Membership',220.00,'Stripe','paid','2 days'),
 ('DSC-000002','PAY-1041','event','Awards Night Ticket',85.00,'POLi','paid','3 days'),
 ('DSC-000003','PAY-1039','merchandise','Club Playing Shirt',55.00,'Stripe','paid','6 days'),
 ('DSC-000009','PAY-1038','membership','2026/27 Senior Membership',220.00,'Bank transfer','pending','8 days')
) x(member_number,ref,typ,des,amt,provider,status,age)
LEFT JOIN members m ON m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number=x.member_number
ON CONFLICT (organisation_id,reference) DO UPDATE SET status=EXCLUDED.status;

INSERT INTO club_communications (organisation_id,subject,audience,sent_count,open_rate,status,sent_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.s,x.a,x.c,x.o,x.st,now()-x.age::interval FROM (VALUES
 ('AGM Notice 2026','Voting members',112,82.0,'sent','14 days'),('Awards Night Tickets','All members',158,74.0,'sent','2 days'),('Membership Renewal Reminder','Expiring members',38,61.0,'sent','6 days'),('Junior Training Update','Junior parents',0,NULL,'draft','0 days')) x(s,a,c,o,st,age)
WHERE NOT EXISTS (SELECT 1 FROM club_communications c WHERE c.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND c.subject=x.s);

INSERT INTO governance_motions (organisation_id,title,proposed_by,meeting_name,motion_text,outcome,status,meeting_date)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.t,x.p,x.m,x.txt,x.outcome,x.st,x.d::date FROM (VALUES
 ('Approve $500 club management system budget','Sarah Connors','AGM 2026','That the Club approve expenditure up to $500 for a club management system.','Passed','approved','2026-08-21'),
 ('Purchase junior cricket wickets','David Thompson','Committee Meeting','Approve purchase of replacement junior wickets.',NULL,'open','2026-09-03'),
 ('Increase senior subscription to $230','Robert Jones','Committee Meeting','Recommend revised annual senior subscription.',NULL,'open','2026-09-03')) x(t,p,m,txt,outcome,st,d)
WHERE NOT EXISTS (SELECT 1 FROM governance_motions g WHERE g.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND g.title=x.t);

INSERT INTO club_documents (organisation_id,title,category,version,review_date,status,visibility)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.t,x.c,x.v,x.d::date,x.s,x.vis FROM (VALUES
 ('Club Constitution 2026','Governance','2.0','2029-08-21','current','public'),('Member Protection Policy','Policy','1.4','2026-09-15','review_due','members'),('AGM Minutes 2026','Minutes','Final',NULL,'current','members'),('Privacy Policy','Compliance','1.2','2027-03-01','current','public')) x(t,c,v,d,s,vis)
WHERE NOT EXISTS (SELECT 1 FROM club_documents d WHERE d.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND d.title=x.t);

INSERT INTO merchandise_products (organisation_id,name,sku,price,stock_qty,status) VALUES
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Club Playing Shirt','CLS-SHIRT',55,24,'active'),('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Club Cap','CLS-CAP',25,9,'active'),('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Training Hoodie','CLS-HOOD',70,18,'active'),('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','Junior Training Tee','CLS-JTEE',35,6,'active') ON CONFLICT (organisation_id,sku) DO UPDATE SET stock_qty=EXCLUDED.stock_qty,price=EXCLUDED.price;

INSERT INTO donations (organisation_id,member_id,donor_name,campaign,amount,provider,status,donated_at)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',m.id,x.n,x.c,x.a,x.p,'received',now()-x.age::interval
FROM (VALUES ('DSC-000001','James Wilson','Club Development',250.00,'Stripe','10 days'),(NULL,'Local Business Sponsor','Junior Equipment Fund',1000.00,'Bank transfer','19 days'),('DSC-000002','Sarah Connors','Junior Equipment Fund',100.00,'Stripe','4 days')) x(member_number,n,c,a,p,age)
LEFT JOIN members m ON m.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND m.member_number=x.member_number
WHERE NOT EXISTS (SELECT 1 FROM donations d WHERE d.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND d.donor_name=x.n AND d.amount=x.a);

INSERT INTO organisation_contacts (organisation_id,company_name,contact_name,category,email,phone,status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.co,x.n,x.cat,x.e,x.p,'active' FROM (VALUES
 ('Wellington Sports Centre','Venue Manager','Venue','venue@example.com','04 555 2100'),('Cricket Supplies NZ','Matt Green','Supplier','matt@cricketsupplies.example','04 555 3900'),('Community Trust','Grants Team','Funder','grants@communitytrust.example','04 555 4800'),('Metro Accounting','Lisa Kumar','Professional services','lisa@metroaccounting.example','04 555 1500')) x(co,n,cat,e,p)
WHERE NOT EXISTS (SELECT 1 FROM organisation_contacts c WHERE c.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND c.company_name=x.co);

INSERT INTO club_contracts (organisation_id,title,counterparty,start_date,expiry_date,annual_value,status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.t,x.c,x.s::date,x.e::date,x.v,x.st FROM (VALUES
 ('Ground Hire Agreement','Wellington Sports Centre','2025-09-01','2027-08-31',8400.00,'active'),('Uniform Supply','Cricket Supplies NZ','2026-01-01','2026-12-31',4500.00,'renewal_due'),('Website Hosting','Netlify','2026-07-01','2027-06-30',1200.00,'active')) x(t,c,s,e,v,st)
WHERE NOT EXISTS (SELECT 1 FROM club_contracts c WHERE c.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND c.title=x.t);

INSERT INTO club_tasks (organisation_id,title,owner_name,category,due_date,priority,status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.t,x.o,x.c,x.d::date,x.p,x.s FROM (VALUES
 ('Update member register after AGM','Sarah Connors','Governance','2026-08-28','high','in_progress'),('Submit annual return','Sarah Connors','Compliance','2026-09-30','high','open'),('Review first aid kits','David Thompson','Health & Safety','2026-08-26','high','overdue'),('Reconcile event ticket sales','Robert Jones','Finance','2026-08-25','normal','open')) x(t,o,c,d,p,s)
WHERE NOT EXISTS (SELECT 1 FROM club_tasks t WHERE t.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND t.title=x.t);

INSERT INTO privacy_requests (organisation_id,reference,requester_name,request_type,received_at,due_date,status) VALUES
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','PR-0007','Sarah Connors','Access request','2026-08-14','2026-09-04','open') ON CONFLICT (organisation_id,reference) DO NOTHING;
INSERT INTO compliance_register (organisation_id,requirement,authority,owner_name,due_date,status)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',x.r,x.a,x.o,x.d::date,x.s FROM (VALUES
 ('Incorporated society annual return','Companies Office','Sarah Connors','2026-09-30','due_soon'),('Financial statements approval','Club Constitution','Robert Jones','2026-08-21','complete'),('Health & safety review','Club Policy','James Wilson','2026-10-01','current')) x(r,a,o,d,s)
WHERE NOT EXISTS (SELECT 1 FROM compliance_register c WHERE c.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND c.requirement=x.r);
INSERT INTO support_tickets (organisation_id,reference,subject,priority,status) VALUES
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','SUP-1027','POLi configuration','normal','waiting_customer'),
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11','SUP-1028','Member import question','normal','open') ON CONFLICT (reference) DO NOTHING;
INSERT INTO platform_usage_snapshots (organisation_id,snapshot_date,member_count,email_count,event_scans,storage_mb,api_calls) VALUES
 ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',CURRENT_DATE,158,1248,214,720,18400) ON CONFLICT (organisation_id,snapshot_date) DO UPDATE SET member_count=EXCLUDED.member_count,email_count=EXCLUDED.email_count,event_scans=EXCLUDED.event_scans,storage_mb=EXCLUDED.storage_mb,api_calls=EXCLUDED.api_calls;

-- Ensure all modules are enabled for Demo Sports Club so every menu can be tested
INSERT INTO organisation_modules (organisation_id,module_id,is_enabled)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',id,true FROM modules
ON CONFLICT (organisation_id,module_id) DO UPDATE SET is_enabled=true;

-- Give Organisation Owner full module access
INSERT INTO role_module_access (role_id,module_id,access_level)
SELECT r.id,m.id,'full_admin' FROM roles r CROSS JOIN modules m
WHERE r.organisation_id='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND r.name='Organisation Owner'
ON CONFLICT (role_id,module_id) DO UPDATE SET access_level='full_admin';


-- ============================================================
-- 009 FUNCTIONAL MODULE RECORDS
-- ============================================================
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
ALTER TABLE module_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS module_records_select ON module_records;
CREATE POLICY module_records_select ON module_records FOR SELECT USING ((organisation_id IS NOT NULL AND user_in_org(organisation_id)) OR is_platform_admin());
DROP POLICY IF EXISTS module_records_insert ON module_records;
CREATE POLICY module_records_insert ON module_records FOR INSERT WITH CHECK ((organisation_id IS NOT NULL AND user_in_org(organisation_id)) OR (organisation_id IS NULL AND is_platform_admin()));
DROP POLICY IF EXISTS module_records_update ON module_records;
CREATE POLICY module_records_update ON module_records FOR UPDATE USING ((organisation_id IS NOT NULL AND user_in_org(organisation_id)) OR (organisation_id IS NULL AND is_platform_admin())) WITH CHECK ((organisation_id IS NOT NULL AND user_in_org(organisation_id)) OR (organisation_id IS NULL AND is_platform_admin()));
DROP POLICY IF EXISTS module_records_delete ON module_records;
CREATE POLICY module_records_delete ON module_records FOR DELETE USING ((organisation_id IS NOT NULL AND user_in_org(organisation_id)) OR (organisation_id IS NULL AND is_platform_admin()));
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


-- === ClubOS v12 member profile and voting repair ===
-- ClubOS v12: repair member self-service + governance voting reliability
-- Safe to run on an existing ClubOS database, including databases where the
-- original generic governance_motions table was created before the voting module.

-- -----------------------------------------------------------------------------
-- MEMBER SELF-SERVICE LINK REPAIR
-- -----------------------------------------------------------------------------
create or replace function ensure_my_member_link(p_org_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_member_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select id into v_member_id
  from members
  where organisation_id=p_org_id and user_id=v_uid and is_archived=false
  order by created_at limit 1;
  if v_member_id is not null then return v_member_id; end if;

  -- Only claim an unlinked record with exactly the same authenticated email.
  if v_email <> '' then
    select id into v_member_id
    from members
    where organisation_id=p_org_id
      and user_id is null
      and lower(coalesce(email,''))=v_email
      and is_archived=false
    order by created_at limit 1;

    if v_member_id is not null then
      update members set user_id=v_uid, updated_at=now() where id=v_member_id;
      return v_member_id;
    end if;
  end if;

  return null;
end;
$$;
grant execute on function ensure_my_member_link(uuid) to authenticated;

-- Repair the supplied demo member when the Auth account exists.
do $$
declare v_uid uuid; v_org uuid;
begin
  select id into v_uid from auth.users where lower(email)='member@demosportsclub.example' limit 1;
  select id into v_org from organisations where slug='demo-sports-club' limit 1;
  if v_uid is not null and v_org is not null then
    update members
    set user_id=v_uid,status='active',voting_eligible=true,is_archived=false,updated_at=now()
    where organisation_id=v_org
      and (user_id=v_uid or lower(coalesce(email,''))='member@demosportsclub.example');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- GOVERNANCE SCHEMA REPAIR
-- Migration 007 originally created a simpler governance_motions table. Add all
-- voting columns rather than relying on CREATE TABLE IF NOT EXISTS.
-- -----------------------------------------------------------------------------
create table if not exists governance_motions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  title text not null,
  status text default 'draft'
);

alter table governance_motions add column if not exists description text;
alter table governance_motions add column if not exists voting_audience text default 'all_eligible_members';
alter table governance_motions add column if not exists vote_options text[] default array['yes','no','abstain'];
alter table governance_motions add column if not exists voting_method text default 'named';
alter table governance_motions add column if not exists majority_percent numeric(5,2) default 50.00;
alter table governance_motions add column if not exists quorum_percent numeric(5,2) default 0.00;
alter table governance_motions add column if not exists opens_at timestamptz default now();
alter table governance_motions add column if not exists closes_at timestamptz;
alter table governance_motions add column if not exists created_at timestamptz default now();
alter table governance_motions add column if not exists updated_at timestamptz default now();

-- Preserve older motion text/date data where present.
do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='governance_motions' and column_name='motion_text') then
    execute 'update governance_motions set description=coalesce(description,motion_text) where description is null';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='governance_motions' and column_name='meeting_date') then
    execute 'update governance_motions set opens_at=coalesce(opens_at,meeting_date::timestamptz) where opens_at is null';
  end if;
end $$;

update governance_motions set voting_audience='all_eligible_members' where voting_audience is null or voting_audience not in ('all_eligible_members','committee_only');
update governance_motions set voting_method='named' where voting_method is null or voting_method not in ('named','secret');
update governance_motions set majority_percent=50 where majority_percent is null;
update governance_motions set quorum_percent=0 where quorum_percent is null;
update governance_motions set opens_at=coalesce(opens_at,created_at,now()) where opens_at is null;
update governance_motions set created_at=coalesce(created_at,now()) where created_at is null;
update governance_motions set updated_at=coalesce(updated_at,now()) where updated_at is null;
update governance_motions set status='draft' where status is null or status not in ('draft','open','closed','cancelled');
update governance_motions
set closes_at=greatest(opens_at + interval '7 days', now() + interval '1 day')
where closes_at is null;

alter table governance_motions alter column voting_audience set not null;
alter table governance_motions alter column voting_method set not null;
alter table governance_motions alter column majority_percent set not null;
alter table governance_motions alter column quorum_percent set not null;
alter table governance_motions alter column opens_at set not null;
alter table governance_motions alter column closes_at set not null;
alter table governance_motions alter column created_at set not null;
alter table governance_motions alter column updated_at set not null;

create index if not exists governance_motions_org_status_idx on governance_motions(organisation_id,status,closes_at);
alter table governance_motions enable row level security;

create table if not exists governance_motion_votes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  motion_id uuid not null references governance_motions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  choice text not null check(choice in ('yes','no','abstain')),
  voted_at timestamptz not null default now(),
  unique(motion_id,user_id)
);
create index if not exists governance_motion_votes_motion_idx on governance_motion_votes(motion_id);
alter table governance_motion_votes enable row level security;

-- -----------------------------------------------------------------------------
-- ELIGIBILITY / ACCESS HELPERS
-- -----------------------------------------------------------------------------
create or replace function is_committee_user(p_org_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from organisation_users ou
    left join roles r on r.id=ou.role_id
    where ou.organisation_id=p_org_id and ou.user_id=p_user_id and ou.status='active'
      and (
        ou.is_owner=true
        or lower(coalesce(r.structure_group,''))='committee'
        or lower(coalesce(r.name,'')) in ('president','vice president','secretary','treasurer','committee member','organisation owner','club owner','chair','chairperson','committee')
      )
  );
$$;

create or replace function is_eligible_member_voter(p_org_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from members m
    where m.organisation_id=p_org_id and m.user_id=p_user_id
      and m.status='active' and m.voting_eligible=true and m.is_archived=false
  );
$$;

create or replace function is_org_admin_user(p_org_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from organisation_users ou
    left join roles r on r.id=ou.role_id
    where ou.organisation_id=p_org_id and ou.user_id=p_user_id and ou.status='active'
      and (ou.is_owner=true or lower(coalesce(r.name,'')) <> 'member')
  );
$$;

create or replace function can_view_motion(p_motion_id uuid,p_user_id uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public as $$
declare m governance_motions%rowtype;
begin
  select * into m from governance_motions where id=p_motion_id;
  if not found then return false; end if;
  if is_org_admin_user(m.organisation_id,p_user_id) then return true; end if;
  if m.voting_audience='committee_only' then return is_committee_user(m.organisation_id,p_user_id); end if;
  return is_eligible_member_voter(m.organisation_id,p_user_id);
end;
$$;

create or replace function can_vote_motion(p_motion_id uuid,p_user_id uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public as $$
declare m governance_motions%rowtype;
begin
  select * into m from governance_motions where id=p_motion_id;
  if not found then return false; end if;
  if m.status <> 'open' or m.opens_at>now() or m.closes_at<=now() then return false; end if;
  if m.voting_audience='committee_only' then return is_committee_user(m.organisation_id,p_user_id); end if;
  return is_eligible_member_voter(m.organisation_id,p_user_id);
end;
$$;

grant execute on function is_committee_user(uuid,uuid) to authenticated;
grant execute on function is_eligible_member_voter(uuid,uuid) to authenticated;
grant execute on function is_org_admin_user(uuid,uuid) to authenticated;
grant execute on function can_view_motion(uuid,uuid) to authenticated;
grant execute on function can_vote_motion(uuid,uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
drop policy if exists "motions_org_admin_select" on governance_motions;
create policy "motions_org_admin_select" on governance_motions for select to authenticated using(can_view_motion(id,auth.uid()));
drop policy if exists "motions_org_admin_insert" on governance_motions;
create policy "motions_org_admin_insert" on governance_motions for insert to authenticated with check(is_org_admin_user(organisation_id,auth.uid()));
drop policy if exists "motions_org_admin_update" on governance_motions;
create policy "motions_org_admin_update" on governance_motions for update to authenticated using(is_org_admin_user(organisation_id,auth.uid())) with check(is_org_admin_user(organisation_id,auth.uid()));
drop policy if exists "motions_org_admin_delete" on governance_motions;
create policy "motions_org_admin_delete" on governance_motions for delete to authenticated using(is_org_admin_user(organisation_id,auth.uid()));

drop policy if exists "motion_votes_select" on governance_motion_votes;
create policy "motion_votes_select" on governance_motion_votes for select to authenticated using(
  user_id=auth.uid() or exists(
    select 1 from governance_motions m
    where m.id=motion_id and m.voting_method='named' and is_org_admin_user(m.organisation_id,auth.uid())
  )
);
drop policy if exists "motion_votes_insert" on governance_motion_votes;
create policy "motion_votes_insert" on governance_motion_votes for insert to authenticated with check(user_id=auth.uid() and can_vote_motion(motion_id,auth.uid()));
drop policy if exists "motion_votes_update" on governance_motion_votes;
create policy "motion_votes_update" on governance_motion_votes for update to authenticated using(user_id=auth.uid() and can_vote_motion(motion_id,auth.uid())) with check(user_id=auth.uid() and can_vote_motion(motion_id,auth.uid()));

-- -----------------------------------------------------------------------------
-- SERVER-SIDE VOTE SUBMISSION
-- -----------------------------------------------------------------------------
create or replace function cast_motion_vote(p_motion_id uuid,p_choice text)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_org uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_choice not in ('yes','no','abstain') then raise exception 'Invalid vote choice'; end if;
  if not can_vote_motion(p_motion_id,v_uid) then
    raise exception 'You are not eligible to vote on this motion, or voting has closed.';
  end if;
  select organisation_id into v_org from governance_motions where id=p_motion_id;
  insert into governance_motion_votes(organisation_id,motion_id,user_id,choice,voted_at)
  values(v_org,p_motion_id,v_uid,p_choice,now())
  on conflict(motion_id,user_id) do update set choice=excluded.choice,voted_at=now();
end;
$$;
grant execute on function cast_motion_vote(uuid,text) to authenticated;

-- -----------------------------------------------------------------------------
-- MEMBER / ADMIN QUERY RPCs
-- -----------------------------------------------------------------------------
create or replace function get_my_voting_motions(p_org_id uuid)
returns table(id uuid,title text,description text,voting_audience text,voting_method text,majority_percent numeric,quorum_percent numeric,opens_at timestamptz,closes_at timestamptz,status text,my_choice text,total_votes bigint,yes_votes bigint,no_votes bigint,abstain_votes bigint)
language sql stable security definer set search_path=public as $$
  select m.id,m.title,m.description,m.voting_audience,m.voting_method,m.majority_percent,m.quorum_percent,m.opens_at,m.closes_at,
    case when m.status='open' and m.closes_at<=now() then 'closed' else m.status end,
    mine.choice,count(v.id),count(v.id) filter(where v.choice='yes'),count(v.id) filter(where v.choice='no'),count(v.id) filter(where v.choice='abstain')
  from governance_motions m
  left join governance_motion_votes mine on mine.motion_id=m.id and mine.user_id=auth.uid()
  left join governance_motion_votes v on v.motion_id=m.id
  where m.organisation_id=p_org_id and m.status in ('open','closed') and m.opens_at<=now()
    and ((m.voting_audience='all_eligible_members' and is_eligible_member_voter(m.organisation_id,auth.uid()))
      or (m.voting_audience='committee_only' and is_committee_user(m.organisation_id,auth.uid())))
  group by m.id,m.title,m.description,m.voting_audience,m.voting_method,m.majority_percent,m.quorum_percent,m.opens_at,m.closes_at,m.status,mine.choice
  order by case when m.status='open' and m.closes_at>now() and mine.choice is null then 0 else 1 end,m.closes_at asc,m.opens_at desc;
$$;
grant execute on function get_my_voting_motions(uuid) to authenticated;

create or replace function get_pending_motion_count(p_org_id uuid)
returns integer language sql stable security definer set search_path=public as $$
  select count(*)::integer from governance_motions m
  where m.organisation_id=p_org_id and m.status='open' and m.opens_at<=now() and m.closes_at>now()
    and not exists(select 1 from governance_motion_votes v where v.motion_id=m.id and v.user_id=auth.uid())
    and ((m.voting_audience='all_eligible_members' and is_eligible_member_voter(m.organisation_id,auth.uid()))
      or (m.voting_audience='committee_only' and is_committee_user(m.organisation_id,auth.uid())));
$$;
grant execute on function get_pending_motion_count(uuid) to authenticated;

create or replace function get_admin_motions(p_org_id uuid)
returns table(id uuid,title text,description text,voting_audience text,voting_method text,majority_percent numeric,quorum_percent numeric,opens_at timestamptz,closes_at timestamptz,status text,created_at timestamptz,total_votes bigint,yes_votes bigint,no_votes bigint,abstain_votes bigint)
language sql stable security definer set search_path=public as $$
  select m.id,m.title,m.description,m.voting_audience,m.voting_method,m.majority_percent,m.quorum_percent,m.opens_at,m.closes_at,
    case when m.status='open' and m.closes_at<=now() then 'closed' else m.status end,m.created_at,
    count(v.id),count(v.id) filter(where v.choice='yes'),count(v.id) filter(where v.choice='no'),count(v.id) filter(where v.choice='abstain')
  from governance_motions m left join governance_motion_votes v on v.motion_id=m.id
  where m.organisation_id=p_org_id and is_org_admin_user(p_org_id,auth.uid())
  group by m.id
  order by m.created_at desc;
$$;
grant execute on function get_admin_motions(uuid) to authenticated;

-- Demo motions if the demo organisation exists.
do $$
declare v_org uuid;
begin
  select id into v_org from organisations where slug='demo-sports-club' limit 1;
  if v_org is null then return; end if;
  if not exists(select 1 from governance_motions where organisation_id=v_org and title='Approve 2026/27 Equipment Budget') then
    insert into governance_motions(organisation_id,title,description,voting_audience,voting_method,majority_percent,quorum_percent,opens_at,closes_at,status)
    values(v_org,'Approve 2026/27 Equipment Budget','Approve an equipment budget for the 2026/27 season.','all_eligible_members','named',50,20,now()-interval '1 hour',now()+interval '7 days','open');
  end if;
  if not exists(select 1 from governance_motions where organisation_id=v_org and title='Approve Catering Supplier for Awards Night') then
    insert into governance_motions(organisation_id,title,description,voting_audience,voting_method,majority_percent,quorum_percent,opens_at,closes_at,status)
    values(v_org,'Approve Catering Supplier for Awards Night','Committee approval of the preferred awards-night catering supplier.','committee_only','named',50,50,now()-interval '1 hour',now()+interval '3 days','open');
  end if;
end $$;

/*
  ClubOS v13 — member team selection at signup + self-service team editing.

  Adds:
  - public-safe RPCs used by the signup screen to list active organisations/teams
  - signup metadata handling so a new Auth user becomes a pending member of the chosen organisation
  - initial team assignment (and team membership subscription when configured)
  - RLS allowing members to change only their own player-team assignment
  - RLS preserving full team management for owners/platform admins/roles with teams.manage
*/

-- Public signup catalogues. These functions deliberately return only minimal display data.
CREATE OR REPLACE FUNCTION get_signup_organisations()
RETURNS TABLE(id uuid, trading_name text, country text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.trading_name, o.country
  FROM organisations o
  WHERE o.status = 'active'
  ORDER BY o.trading_name;
$$;

CREATE OR REPLACE FUNCTION get_signup_teams(p_org_id uuid)
RETURNS TABLE(id uuid, name text, season text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name, t.season
  FROM teams t
  WHERE t.organisation_id = p_org_id
    AND t.status = 'active'
    AND COALESCE(t.is_archived, false) = false
  ORDER BY t.name;
$$;

GRANT EXECUTE ON FUNCTION get_signup_organisations() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_signup_teams(uuid) TO anon, authenticated;

-- Permission helper for team administration.
CREATE OR REPLACE FUNCTION can_manage_teams(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM organisation_users ou
      WHERE ou.organisation_id = p_org_id
        AND ou.user_id = auth.uid()
        AND ou.status = 'active'
        AND (
          ou.is_owner = true
          OR EXISTS (
            SELECT 1
            FROM role_permissions rp
            JOIN permissions p ON p.id = rp.permission_id
            WHERE rp.role_id = ou.role_id
              AND p.key = 'teams.manage'
          )
        )
    );
$$;

-- Replace the overly broad team_members policy. Members can manage only their own
-- normal player assignment; club users with teams.manage retain full management.
DROP POLICY IF EXISTS "tm_modify" ON team_members;
DROP POLICY IF EXISTS "tm_insert_v13" ON team_members;
DROP POLICY IF EXISTS "tm_update_v13" ON team_members;
DROP POLICY IF EXISTS "tm_delete_v13" ON team_members;

CREATE POLICY "tm_insert_v13" ON team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    can_manage_teams(organisation_id)
    OR (
      role = 'player'
      AND EXISTS (
        SELECT 1 FROM members m
        WHERE m.id = team_members.member_id
          AND m.user_id = auth.uid()
          AND m.organisation_id = team_members.organisation_id
      )
      AND EXISTS (
        SELECT 1 FROM teams t
        WHERE t.id = team_members.team_id
          AND t.organisation_id = team_members.organisation_id
          AND t.status = 'active'
          AND COALESCE(t.is_archived, false) = false
      )
    )
  );

CREATE POLICY "tm_update_v13" ON team_members
  FOR UPDATE TO authenticated
  USING (
    can_manage_teams(organisation_id)
    OR (role = 'player' AND EXISTS (
      SELECT 1 FROM members m WHERE m.id = team_members.member_id AND m.user_id = auth.uid()
    ))
  )
  WITH CHECK (
    can_manage_teams(organisation_id)
    OR (
      role = 'player'
      AND EXISTS (
        SELECT 1 FROM members m
        WHERE m.id = team_members.member_id
          AND m.user_id = auth.uid()
          AND m.organisation_id = team_members.organisation_id
      )
    )
  );

CREATE POLICY "tm_delete_v13" ON team_members
  FOR DELETE TO authenticated
  USING (
    can_manage_teams(organisation_id)
    OR (role = 'player' AND EXISTS (
      SELECT 1 FROM members m WHERE m.id = team_members.member_id AND m.user_id = auth.uid()
    ))
  );

-- Expand the existing signup trigger. If organisation_id/team_id are supplied by
-- the ClubOS signup form, create the member link immediately. The member itself is
-- pending so clubs can still use an approval process.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_team_id uuid;
  v_role_id uuid;
  v_member_id uuid;
  v_member_number text;
  v_team_membership_type_id uuid;
  v_team_season text;
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = now();

  BEGIN
    v_org_id := NULLIF(NEW.raw_user_meta_data->>'organisation_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_org_id := NULL;
  END;

  BEGIN
    v_team_id := NULLIF(NEW.raw_user_meta_data->>'team_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_team_id := NULL;
  END;

  IF v_org_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM organisations o WHERE o.id = v_org_id AND o.status = 'active'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT r.id INTO v_role_id
  FROM roles r
  WHERE r.organisation_id = v_org_id
    AND lower(r.name) = 'member'
  ORDER BY r.is_default DESC, r.sort_order
  LIMIT 1;

  INSERT INTO organisation_users (organisation_id, user_id, role_id, is_owner, status)
  VALUES (v_org_id, NEW.id, v_role_id, false, 'active')
  ON CONFLICT (organisation_id, user_id) DO UPDATE SET
    role_id = COALESCE(EXCLUDED.role_id, organisation_users.role_id),
    status = 'active',
    updated_at = now();

  IF v_role_id IS NOT NULL THEN
    INSERT INTO user_roles (organisation_id, user_id, role_id)
    VALUES (v_org_id, NEW.id, v_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT m.id INTO v_member_id
  FROM members m
  WHERE m.organisation_id = v_org_id AND m.user_id = NEW.id
  LIMIT 1;

  IF v_member_id IS NULL THEN
    v_member_number := 'M-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 10));
    INSERT INTO members (
      organisation_id, user_id, member_number, first_name, last_name, email,
      status, joined_date, member_since, country
    ) VALUES (
      v_org_id, NEW.id, v_member_number,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.email, 'pending', CURRENT_DATE, CURRENT_DATE,
      (SELECT CASE WHEN o.country = 'NZ' THEN 'New Zealand' ELSE o.country END FROM organisations o WHERE o.id = v_org_id)
    )
    RETURNING id INTO v_member_id;
  END IF;

  IF v_team_id IS NOT NULL THEN
    SELECT t.membership_type_id, t.season
      INTO v_team_membership_type_id, v_team_season
    FROM teams t
    WHERE t.id = v_team_id
      AND t.organisation_id = v_org_id
      AND t.status = 'active'
      AND COALESCE(t.is_archived, false) = false;

    IF FOUND THEN
      INSERT INTO team_members (organisation_id, team_id, member_id, season, role)
      VALUES (v_org_id, v_team_id, v_member_id, v_team_season, 'player')
      ON CONFLICT DO NOTHING;

      IF v_team_membership_type_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM memberships ms WHERE ms.member_id = v_member_id AND ms.status = 'active') THEN
        INSERT INTO memberships (organisation_id, member_id, membership_type_id, status, start_date)
        VALUES (v_org_id, v_member_id, v_team_membership_type_id, 'active', CURRENT_DATE);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
/*
# Awards & Recognition
- Configurable award types per organisation
- Award assignment to searchable members
- Public/member-visible or private/internal recognition
- Member profile history and member news feed
*/

CREATE TABLE IF NOT EXISTS award_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'recognition',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, name)
);
ALTER TABLE award_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS member_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  award_type_id uuid NOT NULL REFERENCES award_types(id) ON DELETE RESTRICT,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  awarded_on date NOT NULL DEFAULT CURRENT_DATE,
  award_year int,
  season text,
  citation text,
  notes text,
  visibility text NOT NULL DEFAULT 'members' CHECK (visibility IN ('members','private')),
  announced_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE member_awards ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_member_awards_member ON member_awards(member_id, awarded_on DESC);
CREATE INDEX IF NOT EXISTS idx_member_awards_org_public ON member_awards(organisation_id, visibility, awarded_on DESC);

CREATE OR REPLACE FUNCTION can_manage_awards(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organisation_users ou
    LEFT JOIN user_roles ur ON ur.organisation_id = ou.organisation_id AND ur.user_id = ou.user_id
    LEFT JOIN roles r ON r.id = COALESCE(ur.role_id, ou.role_id)
    LEFT JOIN role_module_access rma ON rma.role_id = r.id
    LEFT JOIN modules m ON m.id = rma.module_id AND m.key = 'governance'
    WHERE ou.organisation_id = p_org_id
      AND ou.user_id = auth.uid()
      AND ou.status = 'active'
      AND (ou.is_owner = true OR rma.access_level = 'full_admin')
  ) OR is_platform_admin();
$$;

DROP POLICY IF EXISTS "award_types_select" ON award_types;
CREATE POLICY "award_types_select" ON award_types FOR SELECT TO authenticated
  USING (user_in_org(organisation_id) OR is_platform_admin());
DROP POLICY IF EXISTS "award_types_manage" ON award_types;
CREATE POLICY "award_types_manage" ON award_types FOR ALL TO authenticated
  USING (can_manage_awards(organisation_id)) WITH CHECK (can_manage_awards(organisation_id));

DROP POLICY IF EXISTS "member_awards_select" ON member_awards;
CREATE POLICY "member_awards_select" ON member_awards FOR SELECT TO authenticated
  USING (
    is_platform_admin()
    OR can_manage_awards(organisation_id)
    OR (
      user_in_org(organisation_id)
      AND (
        visibility = 'members'
        OR EXISTS (SELECT 1 FROM members mm WHERE mm.id = member_id AND mm.user_id = auth.uid())
      )
    )
  );
DROP POLICY IF EXISTS "member_awards_manage" ON member_awards;
CREATE POLICY "member_awards_manage" ON member_awards FOR ALL TO authenticated
  USING (can_manage_awards(organisation_id)) WITH CHECK (can_manage_awards(organisation_id));

-- Catalogue permissions for organisations that prefer fine-grained permissions.
INSERT INTO permissions (key,module_key,description,sensitivity)
VALUES
 ('awards.view','governance','View awards and recognition','general'),
 ('awards.manage','governance','Create and manage award types and member awards','general')
ON CONFLICT (key) DO NOTHING;

-- Give governance full-admin roles the new permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rma.role_id, p.id
FROM role_module_access rma
JOIN modules m ON m.id = rma.module_id AND m.key = 'governance'
CROSS JOIN permissions p
WHERE rma.access_level = 'full_admin' AND p.key IN ('awards.view','awards.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Demo award types and awards.
DO $$
DECLARE
  v_org uuid;
  v_best_vol uuid;
  v_best_bowler uuid;
  v_spirit uuid;
  v_m1 uuid;
  v_m2 uuid;
BEGIN
  SELECT id INTO v_org FROM organisations WHERE slug = 'demo-sports-club' LIMIT 1;
  IF v_org IS NULL THEN RETURN; END IF;

  INSERT INTO award_types(organisation_id,name,description,category,sort_order)
  VALUES
   (v_org,'Volunteer of the Year','Recognises outstanding voluntary service to the club.','service',10),
   (v_org,'Best Bowler','Recognises outstanding bowling performance for the season.','sporting',20),
   (v_org,'Club Spirit Award','Recognises sportsmanship, leadership and positive club contribution.','recognition',30)
  ON CONFLICT (organisation_id,name) DO UPDATE SET description=EXCLUDED.description, category=EXCLUDED.category, is_active=true;

  SELECT id INTO v_best_vol FROM award_types WHERE organisation_id=v_org AND name='Volunteer of the Year';
  SELECT id INTO v_best_bowler FROM award_types WHERE organisation_id=v_org AND name='Best Bowler';
  SELECT id INTO v_spirit FROM award_types WHERE organisation_id=v_org AND name='Club Spirit Award';
  SELECT id INTO v_m1 FROM members WHERE organisation_id=v_org ORDER BY member_number LIMIT 1;
  SELECT id INTO v_m2 FROM members WHERE organisation_id=v_org ORDER BY member_number OFFSET 1 LIMIT 1;

  IF v_m1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM member_awards WHERE organisation_id=v_org AND member_id=v_m1 AND award_type_id=v_best_vol) THEN
    INSERT INTO member_awards(organisation_id,award_type_id,member_id,awarded_on,award_year,season,citation,visibility,announced_at)
    VALUES(v_org,v_best_vol,v_m1,CURRENT_DATE-45,EXTRACT(YEAR FROM CURRENT_DATE)::int,'2026/27','For exceptional contribution to club activities, events and member support.','members',now()-interval '45 days');
  END IF;
  IF v_m2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM member_awards WHERE organisation_id=v_org AND member_id=v_m2 AND award_type_id=v_best_bowler) THEN
    INSERT INTO member_awards(organisation_id,award_type_id,member_id,awarded_on,award_year,season,citation,visibility,announced_at)
    VALUES(v_org,v_best_bowler,v_m2,CURRENT_DATE-20,EXTRACT(YEAR FROM CURRENT_DATE)::int,'2026/27','Outstanding bowling performance and consistency throughout the season.','members',now()-interval '20 days');
  END IF;
END $$;
-- ClubOS Compact v17 upgrade
-- Admin member editing/audit uses existing members + audit_logs tables.
-- Adds public event links, public event checkout RPCs, and event banner storage.

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS public_slug text;
CREATE UNIQUE INDEX IF NOT EXISTS events_public_slug_uidx ON public.events(public_slug) WHERE public_slug IS NOT NULL;

UPDATE public.events
SET public_slug = regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g') || '-' || substr(replace(id::text,'-',''),1,6)
WHERE public_slug IS NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-banners','event-banners',true,8388608,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=true, file_size_limit=8388608, allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS "event_banners_insert" ON storage.objects;
CREATE POLICY "event_banners_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='event-banners' AND public.user_in_org(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "event_banners_update" ON storage.objects;
CREATE POLICY "event_banners_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='event-banners' AND public.user_in_org(((storage.foldername(name))[1])::uuid))
WITH CHECK (bucket_id='event-banners' AND public.user_in_org(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "event_banners_delete" ON storage.objects;
CREATE POLICY "event_banners_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='event-banners' AND public.user_in_org(((storage.foldername(name))[1])::uuid));

CREATE OR REPLACE FUNCTION public.get_public_event(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'description', e.description,
    'venue', e.venue,
    'address', e.address,
    'start_at', e.start_at,
    'end_at', e.end_at,
    'banner_url', e.banner_url,
    'currency', COALESCE(os.currency,'NZD'),
    'organisation_name', o.trading_name,
    'ticket_types', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', tt.id,
        'name', tt.name,
        'description', tt.description,
        'price', tt.price,
        'quantity_available', tt.quantity_available,
        'max_per_order', tt.max_per_order
      ) ORDER BY tt.sort_order, tt.name)
      FROM event_ticket_types tt
      WHERE tt.event_id=e.id AND tt.is_active=true
    ), '[]'::jsonb)
  ) INTO result
  FROM events e
  JOIN organisations o ON o.id=e.organisation_id
  LEFT JOIN organisation_settings os ON os.organisation_id=e.organisation_id
  WHERE e.public_slug=p_slug AND e.status='published'
    AND (e.sales_open_at IS NULL OR e.sales_open_at <= now())
    AND (e.sales_close_at IS NULL OR e.sales_close_at >= now())
  LIMIT 1;
  IF result IS NULL THEN RAISE EXCEPTION 'Published event not found or ticket sales are closed'; END IF;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.create_public_event_order(
  p_event_id uuid,
  p_purchaser_name text,
  p_purchaser_email text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_event events%ROWTYPE;
  v_order_id uuid;
  v_total numeric(12,2) := 0;
  v_currency text := 'NZD';
  item jsonb;
  tt event_ticket_types%ROWTYPE;
  q integer;
  i integer;
BEGIN
  IF trim(COALESCE(p_purchaser_name,''))='' OR trim(COALESCE(p_purchaser_email,''))='' THEN RAISE EXCEPTION 'Purchaser name and email are required'; END IF;
  SELECT * INTO v_event FROM events WHERE id=p_event_id AND status='published';
  IF NOT FOUND THEN RAISE EXCEPTION 'Event is not available for public ticket sales'; END IF;
  IF v_event.sales_open_at IS NOT NULL AND v_event.sales_open_at > now() THEN RAISE EXCEPTION 'Ticket sales have not opened yet'; END IF;
  IF v_event.sales_close_at IS NOT NULL AND v_event.sales_close_at < now() THEN RAISE EXCEPTION 'Ticket sales have closed'; END IF;
  SELECT COALESCE(currency,'NZD') INTO v_currency FROM organisation_settings WHERE organisation_id=v_event.organisation_id LIMIT 1;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items,'[]'::jsonb)) LOOP
    q := COALESCE((item->>'quantity')::integer,0);
    IF q <= 0 THEN CONTINUE; END IF;
    SELECT * INTO tt FROM event_ticket_types WHERE id=(item->>'ticket_type_id')::uuid AND event_id=p_event_id AND is_active=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'A selected ticket type is unavailable'; END IF;
    IF q > tt.max_per_order THEN RAISE EXCEPTION 'Quantity exceeds the maximum allowed for %', tt.name; END IF;
    v_total := v_total + (tt.price * q);
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p_items,'[]'::jsonb)) x WHERE COALESCE((x->>'quantity')::integer,0)>0) THEN RAISE EXCEPTION 'Select at least one ticket'; END IF;

  INSERT INTO event_orders(organisation_id,event_id,purchaser_name,purchaser_email,total_amount,currency,payment_status,payment_provider)
  VALUES(v_event.organisation_id,p_event_id,trim(p_purchaser_name),lower(trim(p_purchaser_email)),v_total,v_currency,CASE WHEN v_total=0 THEN 'free' ELSE 'pending' END,CASE WHEN v_total=0 THEN 'free' ELSE NULL END)
  RETURNING id INTO v_order_id;

  -- Free orders can issue tickets immediately. Paid orders remain pending until a payment-provider webhook confirms payment.
  IF v_total=0 THEN
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      q := COALESCE((item->>'quantity')::integer,0);
      IF q <= 0 THEN CONTINUE; END IF;
      SELECT * INTO tt FROM event_ticket_types WHERE id=(item->>'ticket_type_id')::uuid AND event_id=p_event_id AND is_active=true;
      FOR i IN 1..q LOOP
        INSERT INTO event_tickets(organisation_id,event_id,ticket_type_id,order_id,attendee_name,attendee_email,status)
        VALUES(v_event.organisation_id,p_event_id,tt.id,v_order_id,trim(p_purchaser_name),lower(trim(p_purchaser_email)),'valid');
      END LOOP;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('order_id',v_order_id,'total_amount',v_total,'currency',v_currency,'payment_status',CASE WHEN v_total=0 THEN 'free' ELSE 'pending' END);
END; $$;

REVOKE ALL ON FUNCTION public.get_public_event(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_public_event_order(uuid,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_event(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_event_order(uuid,text,text,jsonb) TO anon, authenticated;
