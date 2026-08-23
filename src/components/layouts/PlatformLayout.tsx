import { type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, CreditCard, Boxes, CalendarClock,
  TrendingUp, LifeBuoy, ShieldCheck, Users as UsersIcon, Activity,
  Settings, LogOut, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/platform-admin' },
  { label: 'Organisations', icon: Building2, path: '/platform-admin/organisations' },
  { label: 'Plans', icon: CreditCard, path: '/platform-admin/plans' },
  { label: 'Modules & Add-ons', icon: Boxes, path: '/platform-admin/modules' },
  { label: 'Subscriptions', icon: CalendarClock, path: '/platform-admin/subscriptions' },
  { label: 'Platform Billing', icon: TrendingUp, path: '/platform-admin/billing' },
  { label: 'Usage', icon: Activity, path: '/platform-admin/usage' },
  { label: 'Support', icon: LifeBuoy, path: '/platform-admin/support' },
  { label: 'Privacy & Compliance', icon: ShieldCheck, path: '/platform-admin/privacy' },
  { label: 'Platform Users', icon: UsersIcon, path: '/platform-admin/users' },
  { label: 'System Monitoring', icon: Activity, path: '/platform-admin/monitoring' },
  { label: 'Reports', icon: TrendingUp, path: '/platform-admin/reports' },
  { label: 'Settings', icon: Settings, path: '/platform-admin/settings' },
];

export function PlatformLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-slate-900 md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-700/50 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white text-sm font-bold">
            P
          </div>
          <div>
            <p className="text-sm font-semibold text-white">ClubOS</p>
            <p className="text-xs text-slate-400">Platform Admin</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/platform-admin'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mb-0.5',
                    isActive || active
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-700/50 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar
              firstName={profile?.first_name}
              lastName={profile?.last_name}
              photoUrl={profile?.avatar_url}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="truncate text-xs text-slate-400">{profile?.email}</p>
            </div>
            <button onClick={signOut} className="text-slate-400 hover:text-error-400">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <p className="text-sm font-medium text-slate-500">
            Platform Administration
          </p>
          <NavLink to="/admin" className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary-700">
            Club Admin <ChevronRight className="h-4 w-4" />
          </NavLink>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
