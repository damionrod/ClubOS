import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Building2, Users, TrendingUp, Activity, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface OrgWithSub {
  id: string;
  trading_name: string;
  legal_name: string;
  slug: string;
  status: string;
  created_at: string;
  subscriptions: { status: string; plan_id: string }[];
}

export function PlatformDashboard() {
  const [orgs, setOrgs] = useState<OrgWithSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0, suspended: 0, members: 0 });

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('organisations').select('*, subscriptions(status)').order('created_at', { ascending: false });
      setOrgs((data ?? []) as unknown as OrgWithSub[]);

      const { count: memberCount } = await supabase.from('members').select('*', { count: 'exact', head: true });

      const orgData = (data ?? []) as unknown as OrgWithSub[];
      setStats({
        total: orgData.length,
        active: orgData.filter((o) => o.status === 'active').length,
        trial: orgData.filter((o) => o.subscriptions?.[0]?.status === 'trial').length,
        suspended: orgData.filter((o) => o.status === 'suspended').length,
        members: memberCount ?? 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  const columns: Column<OrgWithSub>[] = [
    { key: 'trading_name', label: 'Organisation', render: (o) => <span className="font-medium text-slate-900">{o.trading_name}</span> },
    { key: 'legal_name', label: 'Legal Name', render: (o) => <span className="text-sm text-slate-600">{o.legal_name}</span> },
    { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'sub_status', label: 'Subscription', render: (o) => <StatusBadge status={o.subscriptions?.[0]?.status ?? 'none'} /> },
    { key: 'created_at', label: 'Created', render: (o) => <span className="text-sm text-slate-600">{formatDate(o.created_at, 'short')}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Dashboard" description="Overview of all organisations on the platform" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total Organisations" value={stats.total} icon={<Building2 className="h-5 w-5" />} accent="primary" />
        <MetricCard label="Active" value={stats.active} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
        <MetricCard label="Trials" value={stats.trial} icon={<Activity className="h-5 w-5" />} accent="warning" />
        <MetricCard label="Suspended" value={stats.suspended} icon={<AlertCircle className="h-5 w-5" />} accent="error" />
        <MetricCard label="Total Members" value={stats.members} icon={<Users className="h-5 w-5" />} accent="primary" />
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Organisations</h2>
        <DataTable
          columns={columns}
          data={orgs}
          loading={loading}
          rowKey={(o) => o.id}
          emptyState={<p className="text-center text-sm text-slate-500">No organisations</p>}
        />
      </div>
    </div>
  );
}
