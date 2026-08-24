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
import { Users, UserPlus, Upload, SlidersHorizontal, X } from 'lucide-react';
import { formatDate, fullName } from '@/lib/utils';
import type { Member } from '@/types/database';

type FilterOption = { id: string; name: string };

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function MemberRegister() {
  const { activeOrg } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [votingFilter, setVotingFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const [membershipTypes, setMembershipTypes] = useState<FilterOption[]>([]);
  const [teams, setTeams] = useState<FilterOption[]>([]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('member_number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const pageSize = 20;

  useEffect(() => {
    if (!activeOrg) return;
    Promise.all([
      supabase.from('membership_types').select('id,name').eq('organisation_id', activeOrg.id).eq('is_active', true).order('sort_order'),
      supabase.from('teams').select('id,name').eq('organisation_id', activeOrg.id).eq('is_archived', false).order('name'),
    ]).then(([typesRes, teamsRes]) => {
      setMembershipTypes((typesRes.data ?? []) as FilterOption[]);
      setTeams((teamsRes.data ?? []) as FilterOption[]);
    });
  }, [activeOrg]);

  const loadMembers = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);

    const membershipJoin = membershipTypeFilter !== 'all'
      ? 'memberships!inner(membership_type_id,membership_types(name))'
      : 'memberships(membership_type_id,membership_types(name))';
    const teamJoin = teamFilter !== 'all'
      ? ',team_members!inner(team_id)'
      : ',team_members(team_id)';

    let query = supabase
      .from('members')
      .select(`*,${membershipJoin}${teamJoin}`, { count: 'exact' })
      .eq('organisation_id', activeOrg.id)
      .eq('is_archived', false);

    if (search) {
      const safeSearch = search.replace(/,/g, ' ');
      query = query.or(`first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%,preferred_name.ilike.%${safeSearch}%,member_number.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,mobile.ilike.%${safeSearch}%`);
    }
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (membershipTypeFilter !== 'all') query = query.eq('memberships.membership_type_id', membershipTypeFilter);
    if (teamFilter !== 'all') query = query.eq('team_members.team_id', teamFilter);
    if (votingFilter === 'eligible') query = query.eq('voting_eligible', true);
    if (votingFilter === 'not_eligible') query = query.eq('voting_eligible', false);

    const today = new Date();
    const todayIso = isoDate(today);
    if (paymentFilter === 'current') query = query.gte('paid_until', todayIso);
    if (paymentFilter === 'overdue') query = query.lt('paid_until', todayIso);
    if (paymentFilter === 'no_date') query = query.is('paid_until', null);

    const adultCutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const cutoffIso = isoDate(adultCutoff);
    if (ageFilter === 'junior') query = query.gt('date_of_birth', cutoffIso);
    if (ageFilter === 'adult') query = query.lte('date_of_birth', cutoffIso);
    if (ageFilter === 'unknown') query = query.is('date_of_birth', null);

    query = query.order(sortBy, { ascending: sortDir === 'asc' });
    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error('Member register load failed:', error);
      setMembers([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setMembers((data ?? []) as unknown as Member[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [activeOrg, search, statusFilter, membershipTypeFilter, teamFilter, votingFilter, paymentFilter, ageFilter, page, sortBy, sortDir]);

  useEffect(() => {
    const timer = setTimeout(loadMembers, 300);
    return () => clearTimeout(timer);
  }, [loadMembers]);

  const resetPage = () => setPage(1);
  const clearFilters = () => {
    setStatusFilter('all');
    setMembershipTypeFilter('all');
    setTeamFilter('all');
    setVotingFilter('all');
    setPaymentFilter('all');
    setAgeFilter('all');
    setPage(1);
  };

  const activeFilterCount = [statusFilter, membershipTypeFilter, teamFilter, votingFilter, paymentFilter, ageFilter]
    .filter((v) => v !== 'all').length;

  const columns: Column<Member>[] = [
    {
      key: 'member_number', label: 'Member #', sortable: true,
      render: (m) => <span className="font-mono text-xs text-slate-600">{m.member_number}</span>,
    },
    {
      key: 'name', label: 'Name', sortable: true,
      render: (m) => (
        <Link to={`/admin/members/${m.id}`} className="font-medium text-slate-900 hover:text-primary-700">
          {fullName(m.first_name, m.last_name, m.preferred_name)}
        </Link>
      ),
    },
    {
      key: 'membership_type', label: 'Membership Type',
      render: (m) => <span className="text-sm text-slate-600">{m.memberships?.[0]?.membership_types?.name ?? '—'}</span>,
    },
    { key: 'status', label: 'Status', render: (m) => <StatusBadge status={m.status} /> },
    {
      key: 'joined_date', label: 'Joined', sortable: true,
      render: (m) => <span className="text-sm text-slate-600">{formatDate(m.joined_date, 'short')}</span>,
    },
    {
      key: 'paid_until', label: 'Paid Until',
      render: (m) => {
        const paid = m.paid_until ? formatDate(m.paid_until, 'short') : '—';
        const overdue = Boolean(m.paid_until && new Date(m.paid_until) < new Date());
        return <span className={overdue ? 'text-sm font-medium text-error-600' : 'text-sm text-slate-600'}>{paid}{overdue && <span className="ml-1 text-xs">OVERDUE</span>}</span>;
      },
    },
    { key: 'voting_eligible', label: 'Voting', render: (m) => <span className="text-sm text-slate-600">{m.voting_eligible ? 'Yes' : 'No'}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member Register"
        description={`${total} members match the current view`}
        actions={<div className="flex flex-wrap gap-2"><Link to="/admin/members/import" className="btn-secondary"><Upload className="h-4 w-4" /> Import CSV / Excel</Link><Link to="/admin/members/new" className="btn-primary"><UserPlus className="h-4 w-4" /> Add Member</Link></div>}
      />

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><SlidersHorizontal className="h-4 w-4" /> Registry Filters {activeFilterCount > 0 && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700">{activeFilterCount} active</span>}</div>
          {activeFilterCount > 0 && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><X className="h-4 w-4" /> Clear filters</button>}
        </div>

        <SearchBar value={search} onChange={(v) => { setSearch(v); resetPage(); }} placeholder="Search name, member number, email, phone..." />

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Select value={membershipTypeFilter} onChange={(e) => { setMembershipTypeFilter(e.target.value); resetPage(); }}>
            <option value="all">All Membership Types</option>
            {membershipTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}>
            <option value="all">All Statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option><option value="expired">Expired</option><option value="suspended">Suspended</option>
          </Select>
          <Select value={teamFilter} onChange={(e) => { setTeamFilter(e.target.value); resetPage(); }}>
            <option value="all">All Teams</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </Select>
          <Select value={ageFilter} onChange={(e) => { setAgeFilter(e.target.value); resetPage(); }}>
            <option value="all">All Age Groups</option><option value="adult">Adults (18+)</option><option value="junior">Juniors (Under 18)</option><option value="unknown">DOB Not Recorded</option>
          </Select>
          <Select value={votingFilter} onChange={(e) => { setVotingFilter(e.target.value); resetPage(); }}>
            <option value="all">All Voting Rights</option><option value="eligible">Voting Eligible</option><option value="not_eligible">No Voting Rights</option>
          </Select>
          <Select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); resetPage(); }}>
            <option value="all">All Fee Statuses</option><option value="current">Fees Current</option><option value="overdue">Fees Overdue</option><option value="no_date">No Paid-Until Date</option>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns} data={members} loading={loading} rowKey={(m) => m.id}
        onRowClick={(m) => navigate(`/admin/members/${m.id}`)} sortColumn={sortBy} sortDirection={sortDir}
        onSort={(col) => { if (col === sortBy) setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('asc'); } }}
        page={page} pageSize={pageSize} total={total} onPageChange={setPage}
        emptyState={<EmptyState icon={<Users className="h-6 w-6" />} title="No members found" description="Try adjusting your search or filters, or add a new member." action={<Link to="/admin/members/new" className="btn-primary"><UserPlus className="h-4 w-4" /> Add Member</Link>} />}
      />
    </div>
  );
}
