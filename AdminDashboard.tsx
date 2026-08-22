import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TableSkeleton } from '@/components/ui/SkeletonLoader';
import { Users, TrendingUp, AlertCircle, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '@/lib/utils';

export function AdminDashboard() {
  const { activeOrg } = useAuth();
  const [stats, setStats] = useState({ totalMembers: 0, activeMembers: 0, pendingApps: 0, upcomingRenewals: 0 });
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrg) return;
    async function load() {
      const orgId = activeOrg!.id;
      const [
        { count: total },
        { count: active },
        { count: apps },
        { data: recent },
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('is_archived', false),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'active'),
        supabase.from('membership_applications').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId).in('status', ['submitted', 'under_review', 'payment_required']),
        supabase.from('members').select('id, member_number, first_name, last_name, status, created_at, memberships(membership_types(name))').eq('organisation_id', orgId).eq('is_archived', false).order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({ totalMembers: total ?? 0, activeMembers: active ?? 0, pendingApps: apps ?? 0, upcomingRenewals: 0 });
      setRecentMembers(recent ?? []);
      setLoading(false);
    }
    load();
  }, [activeOrg]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome to ${activeOrg?.trading_name ?? 'your club'}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Members" value={stats.totalMembers} icon={<Users className="h-5 w-5" />} accent="primary" />
        <MetricCard label="Active Members" value={stats.activeMembers} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
        <MetricCard label="Pending Applications" value={stats.pendingApps} icon={<AlertCircle className="h-5 w-5" />} accent="warning" />
        <MetricCard label="Upcoming Renewals" value={stats.upcomingRenewals} icon={<Calendar className="h-5 w-5" />} accent="neutral" />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Members</h2>
          <Link to="/admin/members" className="flex items-center gap-1 text-sm text-primary-700 hover:text-primary-800">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : recentMembers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No members yet</p>
        ) : (
          <div className="space-y-2">
            {recentMembers.map((m) => (
              <Link
                key={m.id}
                to={`/admin/members/${m.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {m.first_name[0]}{m.last_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{m.first_name} {m.last_name}</p>
                    <p className="text-xs text-slate-500">{m.member_number} · {m.memberships?.[0]?.membership_types?.name ?? 'No membership'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={m.status} />
                  <span className="text-xs text-slate-400">{formatDate(m.created_at, 'short')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
