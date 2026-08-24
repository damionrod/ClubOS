import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CreditCard, User, Calendar, Vote, Mail, ShoppingBag, Award, FileText, Bell, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, fullName } from '@/lib/utils';
import { usePendingVotes } from '@/hooks/usePendingVotes';
import type { Member } from '@/types/database';

export function MemberDashboard() {
  const { profile, activeOrg } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<any[]>([]);
  const { count: pendingVotes } = usePendingVotes(activeOrg?.id);

  useEffect(() => {
    if (!profile || !activeOrg) return;
    supabase.from('members').select('*, memberships(membership_types(*))').eq('organisation_id', activeOrg.id).eq('user_id', profile.id).maybeSingle().then(({ data }) => {
      setMember(data as unknown as Member);
      setLoading(false);
    });
  }, [profile, activeOrg]);

  useEffect(() => {
    if (!activeOrg) return;
    supabase.from('member_awards').select('id,awarded_on,citation,award_types(name),members(first_name,last_name,preferred_name)').eq('organisation_id',activeOrg.id).eq('visibility','members').order('awarded_on',{ascending:false}).limit(3).then(({data})=>setNews(data??[]));
  }, [activeOrg?.id]);

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-32 animate-pulse" />)}</div>;
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

  const membershipType = member.memberships?.[0]?.membership_types;
  const needsRenewal = member.paid_until && new Date(member.paid_until) < new Date();

  const quickActions = [
    { label: 'Pay Membership', icon: CreditCard, path: '/member/payments' },
    { label: 'Update Details', icon: User, path: '/member/profile' },
    { label: 'Buy Tickets', icon: Calendar, path: '/member/events' },
    { label: pendingVotes > 0 ? `Vote (${pendingVotes})` : 'Vote', icon: Vote, path: '/member/voting' },
    { label: 'Contact Committee', icon: Mail, path: '/member/more' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {member.preferred_name ?? member.first_name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{activeOrg?.trading_name}</p>
      </div>

      {/* Membership Card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary-200">Membership Card</p>
            <p className="mt-2 text-xl font-bold">{activeOrg?.trading_name}</p>
          </div>
          <StatusBadge status={member.status} variant={member.status === 'active' ? 'success' : 'warning'} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-primary-200">Member Number</p>
            <p className="text-sm font-semibold">{member.member_number}</p>
          </div>
          <div>
            <p className="text-xs text-primary-200">Membership Type</p>
            <p className="text-sm font-semibold">{membershipType?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-primary-200">Member Since</p>
            <p className="text-sm font-semibold">{formatDate(member.member_since, 'short')}</p>
          </div>
          <div>
            <p className="text-xs text-primary-200">Paid Until</p>
            <p className="text-sm font-semibold">{member.paid_until ? formatDate(member.paid_until, 'short') : '—'}</p>
          </div>
        </div>
      </div>

      {/* Requires Attention */}
      {pendingVotes > 0 && (
        <div className="card border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <Vote className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">{pendingVotes} vote{pendingVotes === 1 ? '' : 's'} waiting for you</p>
              <p className="text-xs text-red-700">An eligible motion is currently open for voting.</p>
            </div>
            <Link to="/member/voting" className="btn-primary ml-auto">Vote Now</Link>
          </div>
        </div>
      )}
      {needsRenewal && (
        <div className="card border-warning-200 bg-warning-50 p-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-warning-600" />
            <div>
              <p className="text-sm font-semibold text-warning-800">Membership Renewal Due</p>
              <p className="text-xs text-warning-700">Your membership expired on {formatDate(member.paid_until, 'short')}. Please renew to maintain your membership.</p>
            </div>
            <Link to="/member/payments" className="btn-primary ml-auto">Renew Now</Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.path}
                className="card-hover flex flex-col items-center gap-2 p-4 text-center"
              >
                <Icon className="h-5 w-5 text-primary-700" />
                <span className="text-xs font-medium text-slate-700">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* News & Updates */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">News & Updates</h2><Link to="/member/news" className="text-xs font-medium text-primary-700">View all</Link></div>
        {news.length===0 ? <EmptyState title="No updates" description="Awards, recognition and club updates will appear here." /> : <div className="space-y-3">{news.map((n:any)=><Link to="/member/news" key={n.id} className="flex gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50"><Award className="h-5 w-5 text-amber-700"/></div><div><p className="text-sm font-semibold text-slate-900">{n.members?.preferred_name||n.members?.first_name} {n.members?.last_name} — {n.award_types?.name}</p><p className="text-xs text-slate-400">{formatDate(n.awarded_on,'short')}</p>{n.citation&&<p className="mt-1 line-clamp-2 text-xs text-slate-500">{n.citation}</p>}</div></Link>)}</div>}
      </div>
    </div>
  );
}
