import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Bell, Calendar, HelpCircle, Home, LogOut, Shield, ShoppingBag, UserRound
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { useOrganisationBranding } from '@/hooks/useOrganisationBranding';
import { usePendingVotes } from '@/hooks/usePendingVotes';
import { useUnreadUpdates } from '@/hooks/useUnreadUpdates';

const nav = [
  { label: 'Home', icon: Home, path: '/member' },
  { label: 'Events', icon: Calendar, path: '/member/events' },
  { label: 'Club', icon: Shield, path: '/member/club' },
  { label: 'Shop', icon: ShoppingBag, path: '/member/shop' },
  { label: 'Me', icon: UserRound, path: '/member/me' },
];

export function MemberLayout({ children }: { children: ReactNode }) {
  const { profile, activeOrg, signOut, activeRole, isActiveOwner } = useAuth();
  const location = useLocation();
  const { branding } = useOrganisationBranding(activeOrg?.id);
  const { count: pendingVotes } = usePendingVotes(activeOrg?.id);
  const { count: unreadUpdates } = useUnreadUpdates(activeOrg?.id, profile?.id);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const notificationCount = pendingVotes + unreadUpdates;
  const canAdmin = isActiveOwner || activeRole?.name?.trim().toLowerCase() !== 'member';

  const sectionActive = (path: string) => {
    const current = location.pathname;
    if (path === '/member') return current === '/member';
    if (path === '/member/events') return current.startsWith('/member/events');
    if (path === '/member/club') {
      return current.startsWith('/member/club') ||
        current.startsWith('/member/voting') ||
        current.startsWith('/member/news') ||
        current.startsWith('/member/more');
    }
    if (path === '/member/shop') {
      return current.startsWith('/member/shop') ||
        current.startsWith('/member/merchandise') ||
        current.startsWith('/member/donations');
    }
    if (path === '/member/me') {
      return current.startsWith('/member/me') ||
        current.startsWith('/member/profile') ||
        current.startsWith('/member/membership') ||
        current.startsWith('/member/payments');
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden min-h-screen w-64 shrink-0 bg-slate-900 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-3 px-5 py-5">
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt={`${activeOrg?.trading_name ?? 'Club'} logo`}
              className="h-10 w-10 rounded-lg border bg-white object-contain p-0.5"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-700 font-bold text-white">
              {activeOrg?.trading_name?.[0] ?? 'C'}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{activeOrg?.trading_name ?? 'ClubOS'}</p>
            <p className="text-xs text-slate-400">Member Portal</p>
          </div>
        </div>

        <nav className="space-y-1 px-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const badge =
              item.path === '/member/club' ? pendingVotes + unreadUpdates : 0;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/member'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive || sectionActive(item.path)
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className="min-w-5 rounded-full bg-red-600 px-1.5 text-center text-[10px] font-bold leading-5 text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 p-3">
          <a href="mailto:" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
            <HelpCircle className="h-4 w-4" />
            Help
          </a>
          {canAdmin && (
            <NavLink to="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
              <Shield className="h-4 w-4" />
              Admin Portal
            </NavLink>
          )}
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-red-600">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Compact mobile/tablet header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white lg:static">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:justify-end">
            <NavLink to="/member" className="flex min-w-0 items-center gap-2 lg:hidden">
              {branding?.logo_url ? (
                <img src={branding.logo_url} alt="Club logo" className="h-8 w-8 rounded-lg border object-contain" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700 text-sm font-bold text-white">
                  {activeOrg?.trading_name?.[0] ?? 'C'}
                </div>
              )}
              <span className="truncate text-sm font-semibold text-slate-900">{activeOrg?.trading_name}</span>
            </NavLink>

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => setNotificationsOpen((value) => !value)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[9px] font-bold leading-4 text-white">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>

              <NavLink to="/member/me" aria-label="My account">
                <Avatar
                  firstName={profile?.first_name}
                  lastName={profile?.last_name}
                  photoUrl={profile?.avatar_url}
                  size="sm"
                />
              </NavLink>

              {notificationsOpen && (
                <div className="absolute right-0 top-11 z-50 w-[min(340px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-slate-900">Notifications</p>
                    {notificationCount === 0 && <span className="text-xs text-slate-400">All caught up</span>}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {pendingVotes > 0 && (
                      <NavLink onClick={() => setNotificationsOpen(false)} to="/member/voting" className="flex gap-3 py-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-red-500" />
                        <div><p className="text-xs font-bold uppercase text-red-600">Motion</p><p className="text-sm font-medium text-slate-900">{pendingVotes} vote{pendingVotes === 1 ? '' : 's'} waiting for you</p></div>
                      </NavLink>
                    )}
                    {unreadUpdates > 0 && (
                      <NavLink onClick={() => setNotificationsOpen(false)} to="/member/news" className="flex gap-3 py-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-primary-500" />
                        <div><p className="text-xs font-bold uppercase text-primary-700">Club Update</p><p className="text-sm font-medium text-slate-900">{unreadUpdates} new update{unreadUpdates === 1 ? '' : 's'}</p></div>
                      </NavLink>
                    )}
                    {notificationCount === 0 && <p className="py-5 text-center text-sm text-slate-500">No unread notifications.</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="pb-24 lg:pb-8">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">{children}</div>
        </main>

        {/* Fixed five-area mobile nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white shadow-[0_-4px_16px_rgba(15,23,42,0.05)] lg:hidden">
          <div className="mx-auto flex max-w-lg">
            {nav.map((item) => {
              const Icon = item.icon;
              const badge = item.path === '/member/club' ? pendingVotes + unreadUpdates : 0;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/member'}
                  className={({ isActive }) =>
                    cn(
                      'relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium',
                      isActive || sectionActive(item.path) ? 'text-primary-700' : 'text-slate-400',
                    )
                  }
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    {badge > 0 && (
                      <span className="absolute -right-3 -top-2 min-w-4 rounded-full bg-red-600 px-1 text-center text-[9px] font-bold leading-4 text-white">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </span>
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
