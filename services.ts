import { supabase } from './supabase';
import type {
  Member,
  MembershipType,
  MembershipApplication,
  CustomField,
  Team,
  Sport,
  AuditLog,
  OrganisationSettings,
  OrganisationBranding,
  Profile,
  Role,
  Module,
} from '@/types/database';

function getOrgId(): string {
  const stored = localStorage.getItem('clubos_active_org');
  if (!stored) throw new Error('No active organisation');
  return stored;
}

export const MembershipService = {
  async getMembers(params: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) {
    const orgId = getOrgId();
    const { search, status, page = 1, pageSize = 20, sortBy = 'member_number', sortDir = 'asc' } = params;

    let query = supabase
      .from('members')
      .select(
        `*, memberships!inner(membership_types!inner(name))`,
        { count: 'exact' },
      )
      .eq('organisation_id', orgId)
      .eq('is_archived', false);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,member_number.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order(sortBy as string, { ascending: sortDir === 'asc' });
    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data as unknown as Member[], total: count ?? 0 };
  },

  async getMember(id: string) {
    const { data, error } = await supabase
      .from('members')
      .select(`*, memberships!inner(*, membership_types!inner(*))`)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as Member | null;
  },

  async getMemberEmergencyContacts(memberId: string) {
    const { data, error } = await supabase
      .from('member_emergency_contacts')
      .select('*')
      .eq('member_id', memberId)
      .order('sort_order');
    if (error) throw error;
    return data;
  },

  async getMemberGuardians(memberId: string) {
    const { data, error } = await supabase
      .from('member_guardians')
      .select('*')
      .eq('member_id', memberId)
      .order('sort_order');
    if (error) throw error;
    return data;
  },

  async getMemberMedicalInfo(memberId: string) {
    const { data, error } = await supabase
      .from('member_medical_information')
      .select('*')
      .eq('member_id', memberId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getMemberActivity(memberId: string) {
    const { data, error } = await supabase
      .from('member_activity')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getMemberTeams(memberId: string) {
    const orgId = getOrgId();
    const { data, error } = await supabase
      .from('team_members')
      .select(`*, teams!inner(*, sports!inner(*))`)
      .eq('organisation_id', orgId)
      .eq('member_id', memberId);
    if (error) throw error;
    return data;
  },

  async updateMember(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase.from('members').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Member | null;
  },

  async createMember(member: Record<string, unknown>) {
    const { data, error } = await supabase.from('members').insert(member).select().maybeSingle();
    if (error) throw error;
    return data as Member | null;
  },

  async getMembershipTypes() {
    const orgId = getOrgId();
    const { data, error } = await supabase
      .from('membership_types')
      .select('*')
      .eq('organisation_id', orgId)
      .order('sort_order');
    if (error) throw error;
    return data as MembershipType[];
  },

  async createMembershipType(type: Record<string, unknown>) {
    const { data, error } = await supabase.from('membership_types').insert(type).select().maybeSingle();
    if (error) throw error;
    return data as MembershipType | null;
  },

  async updateMembershipType(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('membership_types')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as MembershipType | null;
  },

  async getApplications(params: { status?: string; page?: number; pageSize?: number }) {
    const orgId = getOrgId();
    const { status, page = 1, pageSize = 20 } = params;

    let query = supabase
      .from('membership_applications')
      .select(`*, membership_types!inner(name)`, { count: 'exact' })
      .eq('organisation_id', orgId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data as unknown as MembershipApplication[], total: count ?? 0 };
  },

  async updateApplication(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('membership_applications')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as MembershipApplication | null;
  },

  async getCustomFields() {
    const orgId = getOrgId();
    const { data, error } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('organisation_id', orgId)
      .order('display_order');
    if (error) throw error;
    return data as CustomField[];
  },

  async createCustomField(field: Record<string, unknown>) {
    const { data, error } = await supabase.from('custom_fields').insert(field).select().maybeSingle();
    if (error) throw error;
    return data as CustomField | null;
  },

  async updateCustomField(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase.from('custom_fields').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as CustomField | null;
  },

  async deleteCustomField(id: string) {
    const { error } = await supabase.from('custom_fields').delete().eq('id', id);
    if (error) throw error;
  },
};

export const TeamService = {
  async getSports() {
    const orgId = getOrgId();
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .eq('organisation_id', orgId)
      .order('name');
    if (error) throw error;
    return data as Sport[];
  },

  async getTeams() {
    const orgId = getOrgId();
    const { data, error } = await supabase
      .from('teams')
      .select(`*, sports!inner(*)`)
      .eq('organisation_id', orgId)
      .eq('is_archived', false)
      .order('name');
    if (error) throw error;
    return data as unknown as Team[];
  },

  async getTeamMembers(teamId: string) {
    const { data, error } = await supabase
      .from('team_members')
      .select(`*, members!inner(*)`)
      .eq('team_id', teamId)
      .order('role');
    if (error) throw error;
    return data;
  },
};

export const OrgService = {
  async getSettings() {
    const orgId = getOrgId();
    const { data, error } = await supabase
      .from('organisation_settings')
      .select('*')
      .eq('organisation_id', orgId)
      .maybeSingle();
    if (error) throw error;
    return data as OrganisationSettings | null;
  },

  async getBranding() {
    const orgId = getOrgId();
    const { data, error } = await supabase
      .from('organisation_branding')
      .select('*')
      .eq('organisation_id', orgId)
      .maybeSingle();
    if (error) throw error;
    return data as OrganisationBranding | null;
  },

  async updateBranding(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('organisation_branding')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateSettings(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('organisation_settings')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getModules() {
    const orgId = getOrgId();
    const { data, error } = await supabase
      .from('organisation_modules')
      .select(`*, modules!inner(*)`)
      .eq('organisation_id', orgId);
    if (error) throw error;
    return data;
  },

  async getUsers() {
    const orgId = getOrgId();
    const { data, error } = await supabase
      .from('organisation_users')
      .select(`*, profiles!inner(*), roles!inner(*)`)
      .eq('organisation_id', orgId)
      .order('created_at');
    if (error) throw error;
    return data;
  },

  async getRoles() {
    const orgId = getOrgId();
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('organisation_id', orgId)
      .order('sort_order');
    if (error) throw error;
    return data as Role[];
  },

  async getAuditLogs(page = 1, pageSize = 20) {
    const orgId = getOrgId();
    const { data, error, count } = await supabase
      .from('audit_logs')
      .select(`*, profiles!inner(email, first_name, last_name)`, { count: 'exact' })
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return { data: data as unknown as AuditLog[], total: count ?? 0 };
  },
};

export const PlatformService = {
  async getOrganisations() {
    const { data, error } = await supabase
      .from('organisations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getPlans() {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data;
  },

  async getModules() {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data as Module[];
  },

  async getPlatformUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_platform_admin', true)
      .order('created_at');
    if (error) throw error;
    return data as Profile[];
  },
};
