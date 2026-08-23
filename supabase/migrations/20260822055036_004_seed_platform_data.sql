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
