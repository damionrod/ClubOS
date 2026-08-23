import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SearchBar } from '@/components/ui/SearchBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/FormField';
import { Users, UserPlus, Upload } from 'lucide-react';
import { formatDate, fullName } from '@/lib/utils';
import type { Member } from '@/types/database';

export function MemberRegister() {
  const { activeOrg } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('member_number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const pageSize = 20;

  const loadMembers = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    let query = supabase
      .from('members')
      .select('*, memberships(membership_types(name))', { count: 'exact' })
      .eq('organisation_id', activeOrg.id)
      .eq('is_archived', false);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,member_number.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    query = query.order(sortBy, { ascending: sortDir === 'asc' });
    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;
    if (error) {
      setLoading(false);
      return;
    }
    setMembers((data ?? []) as unknown as Member[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [activeOrg, search, statusFilter, page, sortBy, sortDir]);

  useEffect(() => {
    const timer = setTimeout(loadMembers, 300);
    return () => clearTimeout(timer);
  }, [loadMembers]);

  const columns: Column<Member>[] = [
    {
      key: 'member_number',
      label: 'Member #',
      sortable: true,
      render: (m) => <span className="font-mono text-xs text-slate-600">{m.member_number}</span>,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (m) => (
        <Link to={`/admin/members/${m.id}`} className="font-medium text-slate-900 hover:text-primary-700">
          {fullName(m.first_name, m.last_name, m.preferred_name)}
        </Link>
      ),
    },
    {
      key: 'membership_type',
      label: 'Type',
      render: (m) => <span className="text-sm text-slate-600">{m.memberships?.[0]?.membership_types?.name ?? '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (m) => <StatusBadge status={m.status} />,
    },
    {
      key: 'joined_date',
      label: 'Joined',
      sortable: true,
      render: (m) => <span className="text-sm text-slate-600">{formatDate(m.joined_date, 'short')}</span>,
    },
    {
      key: 'paid_until',
      label: 'Paid Until',
      render: (m) => {
        const paid = m.paid_until ? formatDate(m.paid_until, 'short') : '—';
        const overdue = m.paid_until && new Date(m.paid_until) < new Date();
        return (
          <span className={overdue ? 'text-sm font-medium text-error-600' : 'text-sm text-slate-600'}>
            {paid}
            {overdue && <span className="ml-1 text-xs">OVERDUE</span>}
          </span>
        );
      },
    },
    {
      key: 'voting_eligible',
      label: 'Voting',
      render: (m) => <span className="text-sm text-slate-600">{m.voting_eligible ? 'Yes' : 'No'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member Register"
        description={`${total} members`}
        actions={
          <div className="flex gap-2">
            <Link to="/admin/members/import" className="btn-secondary"><Upload className="h-4 w-4" /> Import CSV / Excel</Link>
            <Link to="/admin/members/new" className="btn-primary"><UserPlus className="h-4 w-4" /> Add Member</Link>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, member number, email..." className="flex-1" />
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="sm:w-44">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={members}
        loading={loading}
        rowKey={(m) => m.id}
        onRowClick={(m) => navigate(`/admin/members/${m.id}`)}
        sortColumn={sortBy}
        sortDirection={sortDir}
        onSort={(col) => {
          if (col === sortBy) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
          else { setSortBy(col); setSortDir('asc'); }
        }}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        emptyState={
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No members found"
            description="Try adjusting your search or filters, or add a new member."
            action={<Link to="/admin/members/new" className="btn-primary"><UserPlus className="h-4 w-4" /> Add Member</Link>}
          />
        }
      />
    </div>
  );
}
