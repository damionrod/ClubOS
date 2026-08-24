import { type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, User, Calendar, CreditCard, MoreHorizontal, LogOut, ArrowLeft, Vote, Newspaper } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { useOrganisationBranding } from '@/hooks/useOrganisationBranding';
import { usePendingVotes } from '@/hooks/usePendingVotes';

const bottomNav = [
  { label: 'Home', icon: Home, path: '/member' },
  { label: 'Membership', icon: User, path: '/member/membership' },
  { label: 'Events', icon: Calendar, path: '/member/events' },
  { label: 'Payments', icon: CreditCard, path: '/member/payments' },
  { label: 'Voting', icon: Vote, path: '/member/voting' },
  { label: 'News', icon: Newspaper, path: '/member/news' },
  { label: 'More', icon: MoreHorizontal, path: '/member/more' },
];

export function MemberLayout({ children }: { children: ReactNode }) {
  const { profile, activeOrg, signOut } = useAuth();
  const location = useLocation();
  const { branding } = useOrganisationBranding(activeOrg?.id);
  const { count: pendingVotes } = usePendingVotes(activeOrg?.id);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={`${activeOrg?.trading_name ?? 'Club'} logo`} className="h-8 w-8 rounded-lg border border-slate-200 bg-white object-contain p-0.5" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700 text-white text-sm font-bold">
                {activeOrg?.trading_name?.[0] ?? 'C'}
              </div>
            )}
            <span className="text-sm font-semibold text-slate-900">{activeOrg?.trading_name ?? 'ClubOS'}</span>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/member/voting" className="relative inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <Vote className="h-4 w-4" />
              Voting
              {pendingVotes > 0 && <span className="ml-1 min-w-5 rounded-full bg-red-600 px-1.5 text-center text-[10px] font-bold leading-5 text-white">{pendingVotes > 99 ? '99+' : pendingVotes}</span>}
            </NavLink>
            <NavLink to="/admin" className="text-xs text-slate-400 hover:text-slate-600">
              <ArrowLeft className="h-4 w-4 inline" /> Admin
            </NavLink>
            <Avatar
              firstName={profile?.first_name}
              lastName={profile?.last_name}
              photoUrl={profile?.avatar_url}
              size="sm"
            />
            <button onClick={signOut} className="text-slate-400 hover:text-error-600">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 lg:pb-0">
        <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white lg:hidden">
        <div className="flex">
          {bottomNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/member'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors',
                    isActive || active ? 'text-primary-700' : 'text-slate-400',
                  )
                }
              >
                <span className="relative"><Icon className="h-5 w-5" />{item.path === '/member/voting' && pendingVotes > 0 && <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">{pendingVotes > 9 ? '9+' : pendingVotes}</span>}</span>
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
