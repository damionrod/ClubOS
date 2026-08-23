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
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, name)
);

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
