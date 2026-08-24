import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, Organisation, Role, AccessLevel } from '@/types/database';

interface OrgMembership {
  organisation: Organisation;
  role: Role | null;
  isOwner: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  orgMemberships: OrgMembership[];
  activeOrg: Organisation | null;
  activeRole: Role | null;
  isActiveOwner: boolean;
  loading: boolean;
  setActiveOrgId: (orgId: string) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, organisationId?: string, teamId?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACTIVE_ORG_KEY = 'clubos_active_org';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orgMemberships, setOrgMemberships] = useState<OrgMembership[]>([]);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeOrg = orgMemberships.find((m) => m.organisation.id === activeOrgId)?.organisation ?? null;
  const activeMembership = orgMemberships.find((m) => m.organisation.id === activeOrgId);
  const activeRole = activeMembership?.role ?? null;
  const isActiveOwner = activeMembership?.isOwner ?? false;

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session) {
        loadUserData(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession) {
          await loadUserData(newSession.user.id);
        } else {
          setProfile(null);
          setOrgMemberships([]);
          setActiveOrgIdState(null);
          setLoading(false);
        }
      })();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function loadUserData(userId: string) {
    setLoading(true);

    try {
      // Load the signed-in user's profile independently. A profile failure should
      // not be mistaken for a missing organisation membership.
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile load error:', profileError);
      }

      setProfile(profileData as Profile | null);

      // Fetch the link table first. This avoids relying on PostgREST's embedded
      // relationship inference, which can fail when FK relationship names differ.
      const { data: orgUsers, error: orgUsersError } = await supabase
        .from('organisation_users')
        .select('organisation_id, role_id, is_owner, status')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (orgUsersError) {
        console.error('Organisation membership load error:', orgUsersError);
        throw orgUsersError;
      }

      const memberships: OrgMembership[] = [];

      for (const orgUser of orgUsers ?? []) {
        const { data: organisation, error: organisationError } = await supabase
          .from('organisations')
          .select('*')
          .eq('id', orgUser.organisation_id)
          .maybeSingle();

        if (organisationError) {
          console.error(
            'Organisation load error:',
            orgUser.organisation_id,
            organisationError,
          );
          continue;
        }

        if (!organisation) continue;

        let role: Role | null = null;

        if (orgUser.role_id) {
          const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('*')
            .eq('id', orgUser.role_id)
            .maybeSingle();

          if (roleError) {
            console.error('Role load error:', orgUser.role_id, roleError);
          } else {
            role = roleData as Role | null;
          }
        }

        memberships.push({
          organisation: organisation as Organisation,
          role,
          isOwner: orgUser.is_owner,
        });
      }

      setOrgMemberships(memberships);

      const storedOrgId = localStorage.getItem(ACTIVE_ORG_KEY);
      const validStored = Boolean(
        storedOrgId && memberships.some((m) => m.organisation.id === storedOrgId),
      );

      if (validStored && storedOrgId) {
        setActiveOrgIdState(storedOrgId);
      } else if (memberships.length > 0) {
        const firstOrgId = memberships[0].organisation.id;
        setActiveOrgIdState(firstOrgId);
        localStorage.setItem(ACTIVE_ORG_KEY, firstOrgId);
      } else {
        setActiveOrgIdState(null);
        localStorage.removeItem(ACTIVE_ORG_KEY);
      }
    } catch (error) {
      console.error('Failed to load ClubOS user data:', error);
      setProfile(null);
      setOrgMemberships([]);
      setActiveOrgIdState(null);
    } finally {
      setLoading(false);
    }
  }

  function setActiveOrgId(orgId: string) {
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    setActiveOrgIdState(orgId);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, firstName: string, lastName: string, organisationId?: string, teamId?: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, organisation_id: organisationId || null, team_id: teamId || null } },
    });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setOrgMemberships([]);
    setActiveOrgIdState(null);
    localStorage.removeItem(ACTIVE_ORG_KEY);
  }

  async function refresh() {
    if (user) await loadUserData(user.id);
  }

  const value: AuthContextValue = {
    session,
    user,
    profile,
    orgMemberships,
    activeOrg,
    activeRole,
    isActiveOwner,
    loading,
    setActiveOrgId,
    signIn,
    signUp,
    signOut,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export type { OrgMembership };
export type { AccessLevel };
