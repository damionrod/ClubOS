export type AccessLevel = 'full_admin' | 'read_only' | 'restricted' | 'no_access';

export type MemberStatus =
  | 'applicant'
  | 'pending'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'expired'
  | 'resigned'
  | 'deceased'
  | 'archived';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'info_required'
  | 'approved'
  | 'payment_required'
  | 'active'
  | 'rejected'
  | 'withdrawn';

export type RenewalStatus = 'upcoming' | 'due' | 'overdue' | 'paid' | 'expired';

export type FieldSensitivity = 'general' | 'personal' | 'sensitive' | 'highly_sensitive';

export type FieldType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'currency'
  | 'date'
  | 'email'
  | 'phone'
  | 'yesno'
  | 'checkbox'
  | 'dropdown'
  | 'multiselect'
  | 'file';

export type OrgStatus = 'active' | 'trial' | 'past_due' | 'read_only' | 'suspended' | 'cancelled';

export interface Organisation {
  id: string;
  legal_name: string;
  trading_name: string;
  slug: string;
  organisation_type: string;
  registration_number: string | null;
  country: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OrganisationSettings {
  id: string;
  organisation_id: string;
  currency: string;
  timezone: string;
  date_format: string;
  financial_year_start: string;
  membership_year_start: string;
  guardian_age_threshold: number;
  default_membership_status: string;
  compliance_profile: string | null;
  default_team_membership_type_id?: string | null;
}

export interface OrganisationBranding {
  id: string;
  organisation_id: string;
  logo_url: string | null;
  primary_colour: string;
  secondary_colour: string;
  accent_colour: string;
  login_banner_url: string | null;
  portal_banner_url: string | null;
  social_links: Record<string, string>;
}

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_platform_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  organisation_id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  is_default: boolean;
  sort_order: number;
}

export interface OrganisationUser {
  id: string;
  organisation_id: string;
  user_id: string;
  role_id: string | null;
  is_owner: boolean;
  status: string;
  profiles?: Profile;
  roles?: Role;
}

export interface Module {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface RoleModuleAccess {
  id: string;
  role_id: string;
  module_id: string;
  access_level: AccessLevel;
  modules?: Module;
}

export interface Permission {
  id: string;
  key: string;
  module_key: string;
  description: string | null;
  sensitivity: FieldSensitivity;
}

export interface MembershipType {
  id: string;
  organisation_id: string;
  name: string;
  description: string | null;
  annual_fee: number;
  joining_fee: number;
  min_age: number | null;
  max_age: number | null;
  voting_rights: boolean;
  committee_eligibility: boolean;
  renewal_required: boolean;
  duration_months: number;
  approval_required: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface Member {
  id: string;
  organisation_id: string;
  user_id: string | null;
  member_number: string;
  title: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  occupation: string | null;
  photo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  suburb: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  country: string | null;
  email: string | null;
  mobile: string | null;
  alternative_phone: string | null;
  status: MemberStatus;
  joined_date: string | null;
  member_since: string | null;
  paid_until: string | null;
  voting_eligible: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  memberships?: Membership[];
  membership_types?: MembershipType;
}

export interface Membership {
  id: string;
  organisation_id: string;
  member_id: string;
  membership_type_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  membership_types?: MembershipType;
}

export interface MemberEmergencyContact {
  id: string;
  member_id: string;
  full_name: string;
  relationship: string | null;
  mobile: string | null;
  alternative_phone: string | null;
  email: string | null;
  sort_order: number;
}

export interface MemberGuardian {
  id: string;
  member_id: string;
  full_name: string;
  relationship: string | null;
  email: string | null;
  mobile: string | null;
  address: string | null;
  same_address_as_child: boolean;
  is_primary: boolean;
  is_legal_guardian: boolean;
  is_billing_contact: boolean;
  is_emergency_contact: boolean;
  sort_order: number;
}

export interface MemberMedicalInfo {
  id: string;
  member_id: string;
  medical_conditions: string | null;
  allergies: string | null;
  medication: string | null;
  existing_injuries: string | null;
  accessibility_requirements: string | null;
  dietary_requirements: string | null;
  emergency_notes: string | null;
}

export interface MembershipApplication {
  id: string;
  organisation_id: string;
  membership_type_id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string | null;
  date_of_birth: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  country: string | null;
  status: ApplicationStatus;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  internal_notes: string | null;
  resulting_member_id: string | null;
  custom_field_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  membership_types?: MembershipType;
}

export interface CustomField {
  id: string;
  organisation_id: string;
  label: string;
  help_text: string | null;
  field_type: FieldType;
  options: string[];
  section: string;
  display_order: number;
  is_active: boolean;
  is_mandatory: boolean;
  member_editable: boolean;
  admin_editable: boolean;
  is_application_field: boolean;
  is_renewal_field: boolean;
  is_profile_field: boolean;
  is_exportable: boolean;
  sensitivity: FieldSensitivity;
}

export interface MemberActivity {
  id: string;
  member_id: string;
  activity_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Sport {
  id: string;
  organisation_id: string;
  name: string;
  description: string | null;
  season?: string | null;
  status: string;
}

export interface Team {
  id: string;
  organisation_id: string;
  sport_id: string;
  name: string;
  season: string | null;
  manager_id: string | null;
  coach_id: string | null;
  captain_id: string | null;
  description: string | null;
  contact: string | null;
  status: string;
  is_archived: boolean;
  membership_type_id?: string | null;
  sports?: Sport;
  membership_types?: MembershipType;
}

export interface TeamMember {
  id: string;
  team_id: string;
  member_id: string;
  season: string | null;
  role: string;
  start_date: string;
  end_date: string | null;
  members?: Member;
  teams?: Team;
}

export interface AuditLog {
  id: string;
  organisation_id: string;
  user_id: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_cycle: string;
  member_limit: number | null;
  admin_limit: number | null;
  storage_mb: number | null;
  email_limit: number | null;
  features: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}
