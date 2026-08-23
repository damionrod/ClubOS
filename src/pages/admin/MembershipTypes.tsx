import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { FormField, TextInput, Select, TextArea, Checkbox } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils';
import { Plus, Pencil, DollarSign, Users, Vote, Award } from 'lucide-react';
import type { MembershipType } from '@/types/database';

export function MembershipTypes() {
  const { activeOrg } = useAuth();
  const [types, setTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MembershipType | null>(null);
  const [form, setForm] = useState<Partial<MembershipType>>({});

  useEffect(() => {
    if (!activeOrg) return;
    supabase.from('membership_types').select('*').eq('organisation_id', activeOrg.id).order('sort_order').then(({ data }) => {
      setTypes(data ?? []);
      setLoading(false);
    });
  }, [activeOrg]);

  function openCreate() {
    setEditing(null);
    setForm({ annual_fee: 0, joining_fee: 0, duration_months: 12, renewal_required: true, approval_required: true, voting_rights: false, committee_eligibility: false, is_active: true, sort_order: types.length + 1 });
    setModalOpen(true);
  }

  function openEdit(t: MembershipType) {
    setEditing(t);
    setForm(t);
    setModalOpen(true);
  }

  async function save() {
    if (!activeOrg) return;
    if (editing) {
      await supabase.from('membership_types').update(form).eq('id', editing.id);
    } else {
      await supabase.from('membership_types').insert({ ...form, organisation_id: activeOrg.id });
    }
    setModalOpen(false);
    const { data } = await supabase.from('membership_types').select('*').eq('organisation_id', activeOrg.id).order('sort_order');
    setTypes(data ?? []);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership Types"
        description="Define the different classes of membership for your club"
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> New Type</button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total Types" value={types.length} icon={<Users className="h-5 w-5" />} />
        <MetricCard label="Active Types" value={types.filter((t) => t.is_active).length} icon={<Users className="h-5 w-5" />} accent="success" />
        <MetricCard label="With Voting" value={types.filter((t) => t.voting_rights).length} icon={<Vote className="h-5 w-5" />} accent="warning" />
        <MetricCard label="Avg. Annual Fee" value={formatCurrency(types.reduce((s, t) => s + Number(t.annual_fee), 0) / (types.length || 1))} icon={<DollarSign className="h-5 w-5" />} accent="primary" />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-32 animate-pulse" />)}</div>
      ) : types.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Users className="h-6 w-6" />} title="No membership types yet" description="Create your first membership type to start accepting members." action={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> New Type</button>} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => (
            <div key={t.id} className="card-hover p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{t.name}</h3>
                  {t.description && <p className="mt-1 text-sm text-slate-500">{t.description}</p>}
                </div>
                <StatusBadge status={t.is_active ? 'active' : 'inactive'} />
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Annual Fee</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(t.annual_fee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Joining Fee</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(t.joining_fee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Duration</span>
                  <span className="text-slate-900">{t.duration_months} months</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {t.voting_rights && <StatusBadge status="active" variant="info">Voting Rights</StatusBadge>}
                {t.committee_eligibility && <StatusBadge status="active" variant="primary">Committee Eligible</StatusBadge>}
                {t.renewal_required && <StatusBadge status="active" variant="warning">Renewal Required</StatusBadge>}
                {t.approval_required && <StatusBadge status="pending" variant="neutral">Approval Required</StatusBadge>}
              </div>
              <button onClick={() => openEdit(t)} className="btn-ghost mt-4 w-full">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Membership Type' : 'New Membership Type'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={save}>{editing ? 'Save Changes' : 'Create Type'}</button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Name" required className="md:col-span-2">
            <TextInput value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Senior Membership" />
          </FormField>
          <FormField label="Description" className="md:col-span-2">
            <TextArea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." />
          </FormField>
          <FormField label="Annual Fee" required>
            <TextInput type="number" value={form.annual_fee ?? 0} onChange={(e) => setForm({ ...form, annual_fee: parseFloat(e.target.value) || 0 })} />
          </FormField>
          <FormField label="Joining Fee">
            <TextInput type="number" value={form.joining_fee ?? 0} onChange={(e) => setForm({ ...form, joining_fee: parseFloat(e.target.value) || 0 })} />
          </FormField>
          <FormField label="Min Age">
            <TextInput type="number" value={form.min_age ?? ''} onChange={(e) => setForm({ ...form, min_age: e.target.value ? parseInt(e.target.value) : null })} />
          </FormField>
          <FormField label="Max Age">
            <TextInput type="number" value={form.max_age ?? ''} onChange={(e) => setForm({ ...form, max_age: e.target.value ? parseInt(e.target.value) : null })} />
          </FormField>
          <FormField label="Duration (months)" required>
            <TextInput type="number" value={form.duration_months ?? 12} onChange={(e) => setForm({ ...form, duration_months: parseInt(e.target.value) || 12 })} />
          </FormField>
          <FormField label="Sort Order">
            <TextInput type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
          </FormField>
          <div className="md:col-span-2 space-y-3 rounded-lg bg-slate-50 p-4">
            <Checkbox label="Voting Rights" checked={form.voting_rights ?? false} onChange={(e) => setForm({ ...form, voting_rights: e.target.checked })} />
            <Checkbox label="Committee Eligibility" checked={form.committee_eligibility ?? false} onChange={(e) => setForm({ ...form, committee_eligibility: e.target.checked })} />
            <Checkbox label="Renewal Required" checked={form.renewal_required ?? false} onChange={(e) => setForm({ ...form, renewal_required: e.target.checked })} />
            <Checkbox label="Approval Required" checked={form.approval_required ?? false} onChange={(e) => setForm({ ...form, approval_required: e.target.checked })} />
            <Checkbox label="Active" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
