import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { TextArea } from '@/components/ui/FormField';
import { FileText, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { notifySuccess, notifyError } from '@/lib/notifications';
import type { MembershipApplication } from '@/types/database';

export function Applications() {
  const { activeOrg } = useAuth();
  const [apps, setApps] = useState<MembershipApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MembershipApplication | null>(null);
  const [notes, setNotes] = useState('');
  const [membershipTypes, setMembershipTypes] = useState<any[]>([]);
  const [selectedMembershipTypeId, setSelectedMembershipTypeId] = useState('');
  const [saving, setSaving] = useState(false);
  const pageSize = 20;

  const load = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    let query = supabase
      .from('membership_applications')
      .select('*, membership_types(name)', { count: 'exact' })
      .eq('organisation_id', activeOrg.id);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    const { data, count } = await query;
    setApps((data ?? []) as unknown as MembershipApplication[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [activeOrg, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

useEffect(() => {
  if (!activeOrg) return;
  supabase
    .from('membership_types')
    .select('id,name,annual_fee,is_active')
    .eq('organisation_id', activeOrg.id)
    .eq('is_active', true)
    .order('sort_order')
    .then(({ data }) => setMembershipTypes(data ?? []));
}, [activeOrg]);


async function updateStatus(id: string, status: string, reviewerNotes?: string) {
  if (!selected) return;

  if (status === 'approved' && !selectedMembershipTypeId && !selected.membership_type_id) {
    notifyError('Select a membership type before approving this application.');
    return;
  }

  setSaving(true);
  try {
    const { data: authData } = await supabase.auth.getUser();
    const reviewerId = authData.user?.id ?? null;
    const membershipTypeId = selectedMembershipTypeId || selected.membership_type_id || null;

    const applicationUpdate: any = {
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: reviewerNotes ?? notes,
    };

    if (membershipTypeId) applicationUpdate.membership_type_id = membershipTypeId;

    const { error: appError } = await supabase
      .from('membership_applications')
      .update(applicationUpdate)
      .eq('id', id);

    if (appError) throw appError;

    if (selected.resulting_member_id) {
      if (status === 'approved') {
        const { error: memberError } = await supabase
          .from('members')
          .update({ status: 'active' })
          .eq('id', selected.resulting_member_id);
        if (memberError) throw memberError;

        if (membershipTypeId) {
          const { data: existingMembership } = await supabase
            .from('memberships')
            .select('id')
            .eq('organisation_id', selected.organisation_id)
            .eq('member_id', selected.resulting_member_id)
            .eq('membership_type_id', membershipTypeId)
            .maybeSingle();

          if (existingMembership?.id) {
            const { error: membershipError } = await supabase
              .from('memberships')
              .update({ status: 'active', start_date: new Date().toISOString().slice(0, 10) })
              .eq('id', existingMembership.id);
            if (membershipError) throw membershipError;
          } else {
            const { error: membershipError } = await supabase
              .from('memberships')
              .insert({
                organisation_id: selected.organisation_id,
                member_id: selected.resulting_member_id,
                membership_type_id: membershipTypeId,
                status: 'active',
                start_date: new Date().toISOString().slice(0, 10),
              });
            if (membershipError) throw membershipError;
          }
        }

        notifySuccess('Membership application approved. The member is now active.');
      } else if (status === 'rejected') {
        const { error: memberError } = await supabase
          .from('members')
          .update({ status: 'inactive' })
          .eq('id', selected.resulting_member_id);
        if (memberError) throw memberError;
        notifySuccess('Membership application rejected.');
      } else {
        notifySuccess('Application updated successfully.');
      }
    } else {
      notifySuccess(status === 'approved' ? 'Application approved.' : 'Application updated successfully.');
    }

    setSelected(null);
    setNotes('');
    setSelectedMembershipTypeId('');
    await load();
  } catch (error: any) {
    notifyError(error?.message ?? 'Could not update the application.');
  } finally {
    setSaving(false);
  }
}

  const columns: Column<MembershipApplication>[] = [
    { key: 'applicant', label: 'Applicant', render: (a) => <span className="font-medium text-slate-900">{a.first_name} {a.last_name}</span> },
    { key: 'email', label: 'Email', render: (a) => <span className="text-sm text-slate-600">{a.email}</span> },
    { key: 'type', label: 'Type', render: (a) => <span className="text-sm text-slate-600">{a.membership_types?.name}</span> },
    { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'submitted_at', label: 'Submitted', render: (a) => <span className="text-sm text-slate-600">{formatDate(a.submitted_at, 'short')}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Membership Applications" description={`${total} applications`} />

      <div className="flex gap-3">
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-48">
          <option value="all">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="info_required">Info Required</option>
          <option value="approved">Approved</option>
          <option value="payment_required">Payment Required</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={apps}
        loading={loading}
        rowKey={(a) => a.id}
        onRowClick={(a) => { setSelected(a); setNotes(a.reviewer_notes ?? ''); setSelectedMembershipTypeId(a.membership_type_id ?? ''); }}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        emptyState={<EmptyState icon={<FileText className="h-6 w-6" />} title="No applications" description="New membership applications will appear here." />}
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Review Application"
        size="lg"
        footer={
          selected && (
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" disabled={saving} onClick={() => updateStatus(selected.id, 'under_review')}>
                <MessageSquare className="h-4 w-4" /> Mark Under Review
              </button>
              <button className="btn-secondary" disabled={saving} onClick={() => updateStatus(selected.id, 'info_required')}>
                Request Info
              </button>
              <button className="btn-danger" disabled={saving} onClick={() => updateStatus(selected.id, 'rejected')}>
                <XCircle className="h-4 w-4" /> Reject
              </button>
              <button className="btn-primary" disabled={saving} onClick={() => updateStatus(selected.id, 'approved')}>
                <CheckCircle className="h-4 w-4" /> Approve
              </button>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Name</p>
                <p className="text-sm font-medium text-slate-900">{selected.first_name} {selected.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm font-medium text-slate-900">{selected.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Mobile</p>
                <p className="text-sm text-slate-900">{selected.mobile ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Date of Birth</p>
                <p className="text-sm text-slate-900">{formatDate(selected.date_of_birth)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Membership Type</p>
                <Select
                  value={selectedMembershipTypeId}
                  onChange={(e) => setSelectedMembershipTypeId(e.target.value)}
                  className="mt-1"
                >
                  <option value="">Select membership type</option>
                  {membershipTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}{Number(type.annual_fee) > 0 ? ` — ${Number(type.annual_fee).toFixed(2)}` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <StatusBadge status={selected.status} />
              </div>
            </div>
            {selected.address_line1 && (
              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="text-sm text-slate-900">{selected.address_line1}{selected.city ? `, ${selected.city}` : ''}{selected.postcode ? ` ${selected.postcode}` : ''}</p>
              </div>
            )}
            <div>
              <label className="label">Reviewer Notes</label>
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add internal notes about this application..." />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
