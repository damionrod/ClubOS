import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CreditCard, User, Calendar, Vote, Mail, ShoppingBag, Award, FileText, Bell, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, fullName } from '@/lib/utils';
import type { Member } from '@/types/database';

export function MemberDashboard() {
  const { profile, activeOrg } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !activeOrg) return;
    supabase.from('members').select('*, memberships(membership_types(*))').eq('organisation_id', activeOrg.id).eq('user_id', profile.id).maybeSingle().then(({ data }) => {
      setMember(data as unknown as Member);
      setLoading(false);
    });
  }, [profile, activeOrg]);

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
    { label: 'Vote', icon: Vote, path: '/member/more' },
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

      {/* Announcements placeholder */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Club Announcements</h2>
        <EmptyState title="No announcements" description="Club announcements will appear here." />
      </div>
    </div>
  );
}
