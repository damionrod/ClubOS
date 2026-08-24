import { useState, useEffect, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Trophy, Calendar, CreditCard,
  Mail, Scale, ShoppingBag, Heart, FileSignature, Building2,
  CheckSquare, ShieldCheck, ClipboardCheck, BarChart3, Settings,
  ChevronDown, ChevronRight, LogOut, Menu, X, Bell, Shield,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { hasModuleAccess } from '@/lib/permissions';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { useOrganisationBranding } from '@/hooks/useOrganisationBranding';
import type { AccessLevel } from '@/types/database';

interface NavItem {
  label: string;
  icon: ReactNode;
  path?: string;
  module?: string;
  minLevel?: AccessLevel;
  children?: { label: string; path: string }[];
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: '',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, path: '/admin' },
    ],
  },
  {
    title: 'Membership',
    items: [
      {
        label: 'Membership', icon: <Users className="h-4 w-4" />, module: 'membership',
        children: [
          { label: 'Member Register', path: '/admin/members' },
          { label: 'Applications', path: '/admin/applications' },
          { label: 'Membership Types', path: '/admin/membership-types' },
          { label: 'Custom Fields', path: '/admin/custom-fields' },
        ],
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Teams & Sports', icon: <Trophy className="h-4 w-4" />, module: 'teams',
        children: [
          { label: 'Sports', path: '/admin/sports' },
          { label: 'Teams', path: '/admin/teams' },
        ],
      },
      {
        label: 'Events & Ticketing', icon: <Calendar className="h-4 w-4" />, module: 'events',
        children: [
          { label: 'Events', path: '/admin/events' },
          { label: 'Check-in', path: '/admin/events/checkin' },
        ],
      },
      {
        label: 'Communications', icon: <Mail className="h-4 w-4" />, module: 'communications',
        children: [
          { label: 'Dashboard', path: '/admin/communications' },
          { label: 'Send Email', path: '/admin/communications/send' },
          { label: 'History', path: '/admin/communications/history' },
        ],
      },
      { label: 'Merchandise', icon: <ShoppingBag className="h-4 w-4" />, module: 'merchandise', path: '/admin/merchandise' },
      { label: 'Donations', icon: <Heart className="h-4 w-4" />, module: 'donations', path: '/admin/donations' },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        label: 'Finance', icon: <CreditCard className="h-4 w-4" />, module: 'finance',
        children: [
          { label: 'Dashboard', path: '/admin/finance' },
          { label: 'Transactions', path: '/admin/finance/transactions' },
          { label: 'Payment & Fee Settings', path: '/admin/finance/fees' },
        ],
      },
    ],
  },
  {
    title: 'Governance',
    items: [
      {
        label: 'Governance', icon: <Scale className="h-4 w-4" />, module: 'governance',
        children: [
          { label: 'Dashboard', path: '/admin/governance' },
          { label: 'Committee', path: '/admin/governance/committee' },
          { label: 'Motions', path: '/admin/governance/motions' },
          { label: 'Awards & Recognition', path: '/admin/governance/awards' },
        ],
      },
      { label: 'Documents', icon: <FileText className="h-4 w-4" />, module: 'documents', path: '/admin/documents' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Organisations & Contacts', icon: <Building2 className="h-4 w-4" />, module: 'contacts', path: '/admin/contacts' },
      { label: 'Contracts', icon: <FileSignature className="h-4 w-4" />, module: 'contracts', path: '/admin/contracts' },
      { label: 'Tasks & Compliance', icon: <CheckSquare className="h-4 w-4" />, module: 'tasks', path: '/admin/tasks' },
    ],
  },
  {
    title: 'Privacy & Compliance',
    items: [
      { label: 'Privacy & Data Governance', icon: <ShieldCheck className="h-4 w-4" />, module: 'privacy', path: '/admin/privacy' },
      { label: 'Regulatory Compliance', icon: <ClipboardCheck className="h-4 w-4" />, module: 'compliance', path: '/admin/compliance' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Reports & Analytics', icon: <BarChart3 className="h-4 w-4" />, module: 'reports', children: [
        { label: 'Reports Dashboard', path: '/admin/reports' },
        { label: 'Income by Category', path: '/admin/reports/income-by-category' },
      ] },
    ],
  },
  {
    title: 'Configuration',
    items: [
      {
        label: 'Settings', icon: <Settings className="h-4 w-4" />, module: 'core', minLevel: 'read_only',
        children: [
          { label: 'Organisation Settings', path: '/admin/settings' },
          { label: 'Branding', path: '/admin/settings/branding' },
          { label: 'Users', path: '/admin/settings/users' },
          { label: 'Roles', path: '/admin/settings/roles' },
          { label: 'Modules', path: '/admin/settings/modules' },
        ],
      },
    ],
  },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, activeOrg, orgMemberships, setActiveOrgId, signOut } = useAuth();
  const location = useLocation();
  const { branding } = useOrganisationBranding(activeOrg?.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.module) return true;
        return hasModuleAccess(item.module, item.minLevel ?? 'read_only');
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2.5">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={`${activeOrg?.trading_name ?? 'Club'} logo`} className="h-9 w-9 rounded-lg border border-slate-200 bg-white object-contain p-1" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-700 text-white font-bold text-sm">
                {activeOrg?.trading_name?.[0] ?? 'C'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{activeOrg?.trading_name ?? 'ClubOS'}</p>
              <p className="text-xs text-slate-500">Admin Portal</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Org switcher */}
        {orgMemberships.length > 1 && (
          <div className="relative border-b border-slate-200 px-3 py-2">
            <button
              onClick={() => setOrgSwitcherOpen(!orgSwitcherOpen)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <span className="truncate">{activeOrg?.trading_name}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {orgSwitcherOpen && (
              <div className="absolute left-3 right-3 top-full z-10 mt-1 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {orgMemberships.map((m) => (
                  <button
                    key={m.organisation.id}
                    onClick={() => {
                      setActiveOrgId(m.organisation.id);
                      setOrgSwitcherOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center px-3 py-2 text-left text-sm hover:bg-slate-100',
                      m.organisation.id === activeOrg?.id && 'bg-primary-50 text-primary-700',
                    )}
                  >
                    {m.organisation.trading_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          {visibleGroups.map((group, gi) => (
            <div key={gi} className="mb-4">
              {group.title && (
                <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.title}</p>
              )}
              {group.items.map((item) => (
                <NavItem key={item.label} item={item} pathname={location.pathname} />
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar
              firstName={profile?.first_name}
              lastName={profile?.last_name}
              photoUrl={profile?.avatar_url}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="truncate text-xs text-slate-500">{profile?.email}</p>
            </div>
            <button onClick={signOut} className="text-slate-400 hover:text-error-600" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500">
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <Bell className="h-5 w-5" />
            </button>
            <NavLink to="/member" className="text-sm text-slate-500 hover:text-primary-700">
              Member Portal
            </NavLink>
            {profile?.is_platform_admin && (
              <NavLink to="/platform-admin" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-700">
                <Shield className="h-4 w-4" />
                Platform Admin
              </NavLink>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const [expanded, setExpanded] = useState(() => {
    if (!item.children) return false;
    return item.children.some((c) => pathname === c.path || pathname.startsWith(c.path + '/'));
  });

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <span className="flex items-center gap-3">
            {item.icon}
            {item.label}
          </span>
          {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </button>
        {expanded && (
          <div className="mt-0.5 ml-4 space-y-0.5 border-l border-slate-200 pl-3">
            {item.children.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) =>
                  cn(
                    'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-primary-50 font-medium text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100',
                  )
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path ?? '#'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-100',
        )
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  );
}
