import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FormField, Select, TextInput } from '@/components/ui/FormField';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Member } from '@/types/database';

export function MemberEditModal({ member, open, onClose, onSaved }: { member: Member; open: boolean; onClose: () => void; onSaved: (member: Member) => void }) {
  const { activeOrg, profile } = useAuth();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm({
      title: member.title ?? '', first_name: member.first_name ?? '', middle_name: member.middle_name ?? '', last_name: member.last_name ?? '', preferred_name: member.preferred_name ?? '',
      date_of_birth: member.date_of_birth ?? '', gender: member.gender ?? '', occupation: member.occupation ?? '', email: member.email ?? '', mobile: member.mobile ?? '', alternative_phone: member.alternative_phone ?? '',
      address_line1: member.address_line1 ?? '', address_line2: member.address_line2 ?? '', suburb: member.suburb ?? '', city: member.city ?? '', region: member.region ?? '', postcode: member.postcode ?? '', country: member.country ?? '',
      status: member.status ?? 'active', member_since: member.member_since ?? '', paid_until: member.paid_until ?? '', voting_eligible: !!member.voting_eligible,
    });
    setError(''); setMessage('');
  }, [open, member]);

  const changed = useMemo(() => {
    const keys = Object.keys(form);
    return keys.some((k) => String((member as any)[k] ?? '') !== String(form[k] ?? ''));
  }, [form, member]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const updates: any = {
        title: form.title || null, first_name: form.first_name.trim(), middle_name: form.middle_name || null, last_name: form.last_name.trim(), preferred_name: form.preferred_name || null,
        date_of_birth: form.date_of_birth || null, gender: form.gender || null, occupation: form.occupation || null, email: form.email || null, mobile: form.mobile || null, alternative_phone: form.alternative_phone || null,
        address_line1: form.address_line1 || null, address_line2: form.address_line2 || null, suburb: form.suburb || null, city: form.city || null, region: form.region || null, postcode: form.postcode || null, country: form.country || null,
        status: form.status, member_since: form.member_since || null, paid_until: form.paid_until || null, voting_eligible: !!form.voting_eligible, updated_at: new Date().toISOString(),
      };
      const oldValue: any = {};
      Object.keys(updates).forEach((k) => { if (k !== 'updated_at') oldValue[k] = (member as any)[k] ?? null; });
      const { data, error: updateError } = await supabase.from('members').update(updates).eq('id', member.id).eq('organisation_id', activeOrg.id).select('*').single();
      if (updateError) throw updateError;
      const { error: auditError } = await supabase.from('audit_logs').insert({
        organisation_id: activeOrg.id,
        user_id: profile?.id ?? null,
        action: 'member.updated',
        resource: 'members',
        resource_id: member.id,
        old_value: oldValue,
        new_value: updates,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
      if (auditError) console.warn('Audit log insert failed', auditError);
      onSaved({ ...(member as any), ...(data as any) });
      setMessage('Member details saved. The change has been recorded in the audit log.');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to save member details.');
    } finally { setSaving(false); }
  }

  return <Modal open={open} onClose={onClose} title="Edit member" description="Full-access changes are recorded in the organisation audit log." size="xl" footer={<><button type="button" onClick={onClose} className="btn-secondary">Close</button><button form="member-admin-edit" disabled={saving || !changed} className="btn-primary"><Save className="h-4 w-4"/>{saving ? 'Saving…' : 'Save member'}</button></>}>
    <form id="member-admin-edit" onSubmit={save} className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      <section><h3 className="mb-3 font-semibold">Personal details</h3><div className="grid gap-4 md:grid-cols-3">
        <FormField label="Title"><TextInput value={form.title ?? ''} onChange={e=>set('title',e.target.value)}/></FormField>
        <FormField label="First name" required><TextInput required value={form.first_name ?? ''} onChange={e=>set('first_name',e.target.value)}/></FormField>
        <FormField label="Last name" required><TextInput required value={form.last_name ?? ''} onChange={e=>set('last_name',e.target.value)}/></FormField>
        <FormField label="Middle name"><TextInput value={form.middle_name ?? ''} onChange={e=>set('middle_name',e.target.value)}/></FormField>
        <FormField label="Preferred name"><TextInput value={form.preferred_name ?? ''} onChange={e=>set('preferred_name',e.target.value)}/></FormField>
        <FormField label="Date of birth"><TextInput type="date" value={form.date_of_birth ?? ''} onChange={e=>set('date_of_birth',e.target.value)}/></FormField>
        <FormField label="Gender"><TextInput value={form.gender ?? ''} onChange={e=>set('gender',e.target.value)}/></FormField>
        <FormField label="Occupation"><TextInput value={form.occupation ?? ''} onChange={e=>set('occupation',e.target.value)}/></FormField>
      </div></section>
      <section><h3 className="mb-3 font-semibold">Contact details</h3><div className="grid gap-4 md:grid-cols-2">
        <FormField label="Email"><TextInput type="email" value={form.email ?? ''} onChange={e=>set('email',e.target.value)}/></FormField>
        <FormField label="Mobile"><TextInput value={form.mobile ?? ''} onChange={e=>set('mobile',e.target.value)}/></FormField>
        <FormField label="Alternative phone"><TextInput value={form.alternative_phone ?? ''} onChange={e=>set('alternative_phone',e.target.value)}/></FormField>
        <FormField label="Address line 1"><TextInput value={form.address_line1 ?? ''} onChange={e=>set('address_line1',e.target.value)}/></FormField>
        <FormField label="Address line 2"><TextInput value={form.address_line2 ?? ''} onChange={e=>set('address_line2',e.target.value)}/></FormField>
        <FormField label="Suburb"><TextInput value={form.suburb ?? ''} onChange={e=>set('suburb',e.target.value)}/></FormField>
        <FormField label="City"><TextInput value={form.city ?? ''} onChange={e=>set('city',e.target.value)}/></FormField>
        <FormField label="Region"><TextInput value={form.region ?? ''} onChange={e=>set('region',e.target.value)}/></FormField>
        <FormField label="Postcode"><TextInput value={form.postcode ?? ''} onChange={e=>set('postcode',e.target.value)}/></FormField>
        <FormField label="Country"><TextInput value={form.country ?? ''} onChange={e=>set('country',e.target.value)}/></FormField>
      </div></section>
      <section><h3 className="mb-3 font-semibold">Club-controlled details</h3><div className="grid gap-4 md:grid-cols-3">
        <FormField label="Status"><Select value={form.status ?? 'active'} onChange={e=>set('status',e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option><option value="resigned">Resigned</option></Select></FormField>
        <FormField label="Member since"><TextInput type="date" value={form.member_since ?? ''} onChange={e=>set('member_since',e.target.value)}/></FormField>
        <FormField label="Paid until"><TextInput type="date" value={form.paid_until ?? ''} onChange={e=>set('paid_until',e.target.value)}/></FormField>
        <label className="flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={!!form.voting_eligible} onChange={e=>set('voting_eligible',e.target.checked)}/> Voting eligible</label>
      </div></section>
    </form>
  </Modal>;
}
