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
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      setProfile(profileData as Profile | null);

      const { data: orgUsers } = await supabase
        .from('organisation_users')
        .select(
          `organisation_id, is_owner, status, roles:id(*) , organisations:organisation_id(*)`,
        )
        .eq('user_id', userId)
        .eq('status', 'active');

      const memberships: OrgMembership[] = (orgUsers ?? []).map((ou: any) => ({
        organisation: ou.organisations as Organisation,
        role: ou.roles as Role,
        isOwner: ou.is_owner,
      }));

      setOrgMemberships(memberships);

      const storedOrgId = localStorage.getItem(ACTIVE_ORG_KEY);
      const validStored = storedOrgId && memberships.some((m) => m.organisation.id === storedOrgId);
      if (validStored) {
        setActiveOrgIdState(storedOrgId);
      } else if (memberships.length > 0) {
        setActiveOrgIdState(memberships[0].organisation.id);
      } else {
        setActiveOrgIdState(null);
      }
    } catch {
      setProfile(null);
      setOrgMemberships([]);
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

  async function signUp(email: string, password: string, firstName: string, lastName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
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
