import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Calendar, CreditCard, Heart, Newspaper, ShoppingBag,
  User, Users, Vote
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePendingVotes } from '@/hooks/usePendingVotes';
import { useUnreadUpdates } from '@/hooks/useUnreadUpdates';
import { useOrganisationCurrency } from '@/lib/useOrganisationCurrency';
import { formatCurrency } from '@/lib/utils';
import type { Member } from '@/types/database';

export function MemberDashboard() {
  const { profile, activeOrg } = useAuth();
  const { currency } = useOrganisationCurrency();
  const { count: pendingVotes } = usePendingVotes(activeOrg?.id);
  const { count: unreadUpdates } = useUnreadUpdates(activeOrg?.id, profile?.id);

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [teamRows, setTeamRows] = useState<any[]>([]);

  useEffect(() => {
    if (!profile || !activeOrg) return;

    (async () => {
      const { data } = await supabase
        .from('members')
        .select('*, memberships(membership_types(*))')
        .eq('organisation_id', activeOrg.id)
        .eq('user_id', profile.id)
        .maybeSingle();

      setMember(data as unknown as Member);

      if (data?.id) {
        const [{ data: charges }, { data: donations }, { data: teams }] = await Promise.all([
          supabase
            .from('member_subscription_charges')
            .select('amount,status')
            .eq('organisation_id', activeOrg.id)
            .eq('member_id', data.id),
          supabase
            .from('donations')
            .select('amount,status')
            .eq('organisation_id', activeOrg.id)
            .eq('member_id', data.id)
            .eq('status', 'pending'),
          supabase
            .from('team_members')
            .select('id,season,subscription_fee,teams(name,sports(name)),subscription_types(name)')
            .eq('member_id', data.id)
            .eq('role', 'player')
            .order('created_at', { ascending: false })
            .limit(4),
        ]);

        const pendingCharges = (charges ?? []).filter((x: any) =>
          ['pending', 'unpaid'].includes(x.status),
        );
        const pending = [...pendingCharges, ...(donations ?? [])];

        setPendingAmount(pending.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0));
        setPendingCount(pending.length);
        setTeamRows(teams ?? []);
      }

      setLoading(false);
    })();
  }, [profile?.id, activeOrg?.id]);

  if (loading) {
    return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="card h-32 animate-pulse" />)}</div>;
  }

  if (!member) {
    return (
      <div className="card">
        <EmptyState
          icon={<User className="h-6 w-6" />}
          title="No membership found"
          description="You don't have a membership linked to this organisation yet. Contact your club administrator."
        />
      </div>
    );
  }

  const membershipType = (member as any).memberships?.[0]?.membership_types;
  const name = (member as any).preferred_name ?? member.first_name;

  const quickActions = [
    { label: 'Events', desc: 'Tickets & upcoming events', icon: Calendar, path: '/member/events' },
    { label: 'Shop', desc: 'Club merchandise', icon: ShoppingBag, path: '/member/merchandise' },
    { label: 'My Profile', desc: 'Update your details', icon: User, path: '/member/profile' },
    { label: 'Donate', desc: 'Support the club', icon: Heart, path: '/member/donations' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hi {name}</h1>
        <p className="mt-1 text-sm text-slate-500">Here’s what needs your attention.</p>
      </div>

      {(pendingCount > 0 || pendingVotes > 0 || unreadUpdates > 0) && (
        <div className="grid gap-2 sm:grid-cols-3">
          {pendingCount > 0 && (
            <Link to="/member/payments" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <CreditCard className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{pendingCount} payment{pendingCount === 1 ? '' : 's'} due</p>
                <p className="text-xs">{formatCurrency(pendingAmount, currency)}</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
            </Link>
          )}

          {pendingVotes > 0 && (
            <Link to="/member/voting" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
              <Vote className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{pendingVotes} vote{pendingVotes === 1 ? '' : 's'} waiting</p>
                <p className="text-xs">Tap to vote</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
            </Link>
          )}

          {unreadUpdates > 0 && (
            <Link to="/member/news" className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-800">
              <Newspaper className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{unreadUpdates} new update{unreadUpdates === 1 ? '' : 's'}</p>
                <p className="text-xs">See what’s new</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
            </Link>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary-200">My Membership</p>
            <p className="mt-1 text-lg font-bold">{membershipType?.name ?? 'Member'}</p>
            <p className="mt-1 text-sm text-primary-100">#{(member as any).member_number}</p>
          </div>
          <StatusBadge
            status={(member as any).status}
            variant={(member as any).status === 'active' ? 'success' : 'warning'}
          />
        </div>
        <Link to="/member/membership" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white/90 hover:text-white">
          View membership <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.path} to={action.path} className="card-hover p-4">
              <Icon className="h-5 w-5 text-primary-700" />
              <p className="mt-2 text-sm font-semibold text-slate-900">{action.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{action.desc}</p>
            </Link>
          );
        })}
      </div>

      {teamRows.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-700" />
              <h2 className="font-semibold text-slate-900">My Teams</h2>
            </div>
            <Link to="/member/membership" className="text-sm font-medium text-primary-700">View all</Link>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {teamRows.slice(0, 2).map((row: any) => (
              <div key={row.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-slate-900">{row.teams?.name || 'Team'}</p>
                <p className="text-xs text-slate-500">
                  {row.teams?.sports?.name ? `${row.teams.sports.name} · ` : ''}
                  {row.season || 'Current season'}
                  {row.subscription_types?.name ? ` · ${row.subscription_types.name}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
