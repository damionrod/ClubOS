import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Camera, Save, Trash2, UserRound } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FormField, Select, TextArea, TextInput } from '@/components/ui/FormField';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { notifySuccess, notifyError } from '@/lib/notifications';
import type { Member } from '@/types/database';

const emptyEmergency = {
  id: '',
  full_name: '',
  relationship: '',
  mobile: '',
  alternative_phone: '',
  email: '',
};

const emptyMedical = {
  id: '',
  medical_conditions: '',
  allergies: '',
  medication: '',
  existing_injuries: '',
  accessibility_requirements: '',
  dietary_requirements: '',
  emergency_notes: '',
};

export function MemberEditModal({
  member,
  open,
  onClose,
  onSaved,
}: {
  member: Member;
  open: boolean;
  onClose: () => void;
  onSaved: (member: Member) => void;
}) {
  const { activeOrg, profile } = useAuth();
  const [form, setForm] = useState<any>({});
  const [emergency, setEmergency] = useState<any>(emptyEmergency);
  const [medical, setMedical] = useState<any>(emptyMedical);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [committeePositions, setCommitteePositions] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    setForm({
      title: member.title ?? '',
      first_name: member.first_name ?? '',
      middle_name: member.middle_name ?? '',
      last_name: member.last_name ?? '',
      preferred_name: member.preferred_name ?? '',
      date_of_birth: member.date_of_birth ?? '',
      gender: member.gender ?? '',
      occupation: member.occupation ?? '',
      email: member.email ?? '',
      mobile: member.mobile ?? '',
      alternative_phone: member.alternative_phone ?? '',
      address_line1: member.address_line1 ?? '',
      address_line2: member.address_line2 ?? '',
      suburb: member.suburb ?? '',
      city: member.city ?? '',
      region: member.region ?? '',
      postcode: member.postcode ?? '',
      country: member.country ?? '',
      status: member.status ?? 'pending',
      member_since: member.member_since ?? '',
      paid_until: member.paid_until ?? '',
      voting_eligible: !!member.voting_eligible,
      is_committee_member: !!(member as any).is_committee_member,
      committee_position_id: (member as any).committee_position_id ?? '',
    });

    setPhoto(null);
    setPhotoPreview(member.photo_url ?? '');
    setRemoveExistingPhoto(false);
    setError('');

    let cancelled = false;
    setLoadingDetails(true);

    if (activeOrg) {
      supabase
        .from('committee_positions')
        .select('id,name,sort_order,is_active')
        .eq('organisation_id', activeOrg.id)
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => {
          if (!cancelled) setCommitteePositions(data ?? []);
        });
    }

    Promise.all([
      supabase
        .from('member_emergency_contacts')
        .select('*')
        .eq('member_id', member.id)
        .order('sort_order')
        .limit(1)
        .maybeSingle(),
      supabase
        .from('member_medical_information')
        .select('*')
        .eq('member_id', member.id)
        .maybeSingle(),
    ]).then(([emergencyResult, medicalResult]) => {
      if (cancelled) return;

      const ec: any = emergencyResult.data;
      setEmergency(
        ec
          ? {
              id: ec.id,
              full_name: ec.full_name ?? '',
              relationship: ec.relationship ?? '',
              mobile: ec.mobile ?? '',
              alternative_phone: ec.alternative_phone ?? '',
              email: ec.email ?? '',
            }
          : emptyEmergency,
      );

      const med: any = medicalResult.data;
      setMedical(
        med
          ? {
              id: med.id,
              medical_conditions: med.medical_conditions ?? '',
              allergies: med.allergies ?? '',
              medication: med.medication ?? '',
              existing_injuries: med.existing_injuries ?? '',
              accessibility_requirements: med.accessibility_requirements ?? '',
              dietary_requirements: med.dietary_requirements ?? '',
              emergency_notes: med.emergency_notes ?? '',
            }
          : emptyMedical,
      );

      setLoadingDetails(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, member]);

  const set = (key: string, value: any) => setForm((current: any) => ({ ...current, [key]: value }));

  const changed = useMemo(() => {
    if (photo || removeExistingPhoto) return true;
    return Object.keys(form).some(
      (key) => String((member as any)[key] ?? '') !== String(form[key] ?? ''),
    );
  }, [form, member, photo, removeExistingPhoto]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!activeOrg) return;

    setSaving(true);
    setError('');

    try {
      let photoUrl = member.photo_url ?? null;

      if (removeExistingPhoto) {
        photoUrl = null;
      }

      if (photo) {
        if (photo.size > 5 * 1024 * 1024) {
          throw new Error('Member photo must be 5 MB or smaller.');
        }

        const extension = (photo.name.split('.').pop() || 'jpg').toLowerCase();
        const storagePath = `${activeOrg.id}/${member.id}/profile.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('member-photos')
          .upload(storagePath, photo, {
            upsert: true,
            contentType: photo.type || undefined,
          });

        if (uploadError) throw uploadError;

        photoUrl = supabase.storage.from('member-photos').getPublicUrl(storagePath).data.publicUrl;
      }

      const updates: any = {
        title: form.title || null,
        first_name: form.first_name.trim(),
        middle_name: form.middle_name || null,
        last_name: form.last_name.trim(),
        preferred_name: form.preferred_name || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        occupation: form.occupation || null,
        email: form.email || null,
        mobile: form.mobile || null,
        alternative_phone: form.alternative_phone || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        suburb: form.suburb || null,
        city: form.city || null,
        region: form.region || null,
        postcode: form.postcode || null,
        country: form.country || null,
        photo_url: photoUrl,
        status: form.status,
        member_since: form.member_since || null,
        paid_until: form.paid_until || null,
        voting_eligible: !!form.voting_eligible,
        is_committee_member: !!form.is_committee_member,
        committee_position_id: form.is_committee_member && form.committee_position_id ? form.committee_position_id : null,
        updated_at: new Date().toISOString(),
      };

      const oldValue: any = {};
      Object.keys(updates).forEach((key) => {
        if (key !== 'updated_at') oldValue[key] = (member as any)[key] ?? null;
      });

      const { data, error: memberError } = await supabase
        .from('members')
        .update(updates)
        .eq('id', member.id)
        .eq('organisation_id', activeOrg.id)
        .select('*')
        .single();

      if (memberError) throw memberError;

      if (emergency.id) {
        const { error: emergencyError } = await supabase
          .from('member_emergency_contacts')
          .update({
            full_name: emergency.full_name || '',
            relationship: emergency.relationship || null,
            mobile: emergency.mobile || null,
            alternative_phone: emergency.alternative_phone || null,
            email: emergency.email || null,
          })
          .eq('id', emergency.id)
          .eq('member_id', member.id);

        if (emergencyError) throw emergencyError;
      } else if (emergency.full_name.trim()) {
        const { error: emergencyError } = await supabase
          .from('member_emergency_contacts')
          .insert({
            organisation_id: activeOrg.id,
            member_id: member.id,
            full_name: emergency.full_name.trim(),
            relationship: emergency.relationship || null,
            mobile: emergency.mobile || null,
            alternative_phone: emergency.alternative_phone || null,
            email: emergency.email || null,
            sort_order: 0,
          });

        if (emergencyError) throw emergencyError;
      }

      const medicalPayload = {
        medical_conditions: medical.medical_conditions || null,
        allergies: medical.allergies || null,
        medication: medical.medication || null,
        existing_injuries: medical.existing_injuries || null,
        accessibility_requirements: medical.accessibility_requirements || null,
        dietary_requirements: medical.dietary_requirements || null,
        emergency_notes: medical.emergency_notes || null,
      };

      const hasMedical = Object.values(medicalPayload).some(Boolean);

      if (medical.id) {
        const { error: medicalError } = await supabase
          .from('member_medical_information')
          .update(medicalPayload)
          .eq('id', medical.id)
          .eq('member_id', member.id);

        if (medicalError) throw medicalError;
      } else if (hasMedical) {
        const { error: medicalError } = await supabase
          .from('member_medical_information')
          .insert({
            organisation_id: activeOrg.id,
            member_id: member.id,
            ...medicalPayload,
          });

        if (medicalError) throw medicalError;
      }

      const { error: auditError } = await supabase.from('audit_logs').insert({
        organisation_id: activeOrg.id,
        user_id: profile?.id ?? null,
        action: 'member.updated',
        resource: 'members',
        resource_id: member.id,
        old_value: oldValue,
        new_value: {
          ...updates,
          emergency_contact_updated: Boolean(emergency.full_name || emergency.id),
          medical_information_updated: hasMedical || Boolean(medical.id),
        },
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });

      if (auditError) console.warn('Audit log insert failed', auditError);

      onSaved({ ...(member as any), ...(data as any) });
      notifySuccess('Member profile saved successfully.');
      onClose();
    } catch (err: any) {
      const message = err?.message ?? 'Unable to save member details.';
      setError(message);
      notifyError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit member"
      description="Full-access changes are recorded in the organisation audit log."
      size="xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button form="member-admin-edit" disabled={saving || loadingDetails} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save member'}
          </button>
        </>
      }
    >
      <form id="member-admin-edit" onSubmit={save} className="space-y-6">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <section>
          <h3 className="mb-3 font-semibold">Member photo</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border bg-slate-50">
              {photoPreview && !removeExistingPhoto ? (
                <img src={photoPreview} alt="Member" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-9 w-9 text-slate-300" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="btn-secondary cursor-pointer">
                <Camera className="h-4 w-4" />
                Choose photo
                <input
                  className="hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      setError('Member photo must be 5 MB or smaller.');
                      return;
                    }
                    setPhoto(file);
                    setPhotoPreview(URL.createObjectURL(file));
                    setRemoveExistingPhoto(false);
                  }}
                />
              </label>
              {(photoPreview || member.photo_url) && (
                <button
                  type="button"
                  className="btn-secondary text-red-600"
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview('');
                    setRemoveExistingPhoto(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Personal details</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Title"><TextInput value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} /></FormField>
            <FormField label="First name" required><TextInput required value={form.first_name ?? ''} onChange={(e) => set('first_name', e.target.value)} /></FormField>
            <FormField label="Last name" required><TextInput required value={form.last_name ?? ''} onChange={(e) => set('last_name', e.target.value)} /></FormField>
            <FormField label="Middle name"><TextInput value={form.middle_name ?? ''} onChange={(e) => set('middle_name', e.target.value)} /></FormField>
            <FormField label="Preferred name"><TextInput value={form.preferred_name ?? ''} onChange={(e) => set('preferred_name', e.target.value)} /></FormField>
            <FormField label="Date of birth"><TextInput type="date" value={form.date_of_birth ?? ''} onChange={(e) => set('date_of_birth', e.target.value)} /></FormField>
            <FormField label="Gender"><TextInput value={form.gender ?? ''} onChange={(e) => set('gender', e.target.value)} /></FormField>
            <FormField label="Occupation"><TextInput value={form.occupation ?? ''} onChange={(e) => set('occupation', e.target.value)} /></FormField>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Contact & address</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Email"><TextInput type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></FormField>
            <FormField label="Mobile"><TextInput value={form.mobile ?? ''} onChange={(e) => set('mobile', e.target.value)} /></FormField>
            <FormField label="Alternative phone"><TextInput value={form.alternative_phone ?? ''} onChange={(e) => set('alternative_phone', e.target.value)} /></FormField>
            <FormField label="Address line 1"><TextInput value={form.address_line1 ?? ''} onChange={(e) => set('address_line1', e.target.value)} /></FormField>
            <FormField label="Address line 2"><TextInput value={form.address_line2 ?? ''} onChange={(e) => set('address_line2', e.target.value)} /></FormField>
            <FormField label="Suburb"><TextInput value={form.suburb ?? ''} onChange={(e) => set('suburb', e.target.value)} /></FormField>
            <FormField label="City"><TextInput value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} /></FormField>
            <FormField label="Region"><TextInput value={form.region ?? ''} onChange={(e) => set('region', e.target.value)} /></FormField>
            <FormField label="Postcode"><TextInput value={form.postcode ?? ''} onChange={(e) => set('postcode', e.target.value)} /></FormField>
            <FormField label="Country"><TextInput value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} /></FormField>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Emergency contact</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Full name"><TextInput value={emergency.full_name} onChange={(e) => setEmergency((v: any) => ({ ...v, full_name: e.target.value }))} /></FormField>
            <FormField label="Relationship"><TextInput value={emergency.relationship} onChange={(e) => setEmergency((v: any) => ({ ...v, relationship: e.target.value }))} /></FormField>
            <FormField label="Mobile"><TextInput value={emergency.mobile} onChange={(e) => setEmergency((v: any) => ({ ...v, mobile: e.target.value }))} /></FormField>
            <FormField label="Alternative phone"><TextInput value={emergency.alternative_phone} onChange={(e) => setEmergency((v: any) => ({ ...v, alternative_phone: e.target.value }))} /></FormField>
            <FormField label="Email"><TextInput type="email" value={emergency.email} onChange={(e) => setEmergency((v: any) => ({ ...v, email: e.target.value }))} /></FormField>
          </div>
        </section>

        <section>
          <h3 className="mb-1 font-semibold">Medical, dietary & accessibility</h3>
          <p className="mb-3 text-xs text-slate-500">Sensitive information — only authorised users should access this section.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Medical conditions"><TextArea value={medical.medical_conditions} onChange={(e) => setMedical((v: any) => ({ ...v, medical_conditions: e.target.value }))} /></FormField>
            <FormField label="Allergies"><TextArea value={medical.allergies} onChange={(e) => setMedical((v: any) => ({ ...v, allergies: e.target.value }))} /></FormField>
            <FormField label="Medication"><TextArea value={medical.medication} onChange={(e) => setMedical((v: any) => ({ ...v, medication: e.target.value }))} /></FormField>
            <FormField label="Existing injuries"><TextArea value={medical.existing_injuries} onChange={(e) => setMedical((v: any) => ({ ...v, existing_injuries: e.target.value }))} /></FormField>
            <FormField label="Accessibility requirements"><TextArea value={medical.accessibility_requirements} onChange={(e) => setMedical((v: any) => ({ ...v, accessibility_requirements: e.target.value }))} /></FormField>
            <FormField label="Dietary requirements"><TextArea value={medical.dietary_requirements} onChange={(e) => setMedical((v: any) => ({ ...v, dietary_requirements: e.target.value }))} /></FormField>
            <div className="md:col-span-2">
              <FormField label="Emergency notes"><TextArea value={medical.emergency_notes} onChange={(e) => setMedical((v: any) => ({ ...v, emergency_notes: e.target.value }))} /></FormField>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-1 font-semibold">Committee</h3>
          <p className="mb-3 text-xs text-slate-500">Committee-only motions use the Committee Member setting below. The committee position is a club title and does not automatically change system access permissions.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <input
                type="checkbox"
                checked={!!form.is_committee_member}
                onChange={(e) => {
                  set('is_committee_member', e.target.checked);
                  if (!e.target.checked) set('committee_position_id', '');
                }}
              />
              <span>
                <span className="block font-medium text-slate-900">Committee Member</span>
                <span className="text-xs text-slate-500">Eligible for committee-only voting when membership is active.</span>
              </span>
            </label>
            <FormField label="Committee role / position">
              <Select
                value={form.committee_position_id ?? ''}
                disabled={!form.is_committee_member}
                onChange={(e) => set('committee_position_id', e.target.value)}
              >
                <option value="">Not Applicable</option>
                {committeePositions.map((position) => (
                  <option key={position.id} value={position.id}>{position.name}</option>
                ))}
              </Select>
            </FormField>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Club-controlled details</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Status">
              <Select value={form.status ?? 'pending'} onChange={(e) => set('status', e.target.value)}>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="resigned">Resigned</option>
              </Select>
            </FormField>
            <FormField label="Member since"><TextInput type="date" value={form.member_since ?? ''} onChange={(e) => set('member_since', e.target.value)} /></FormField>
            <FormField label="Paid until"><TextInput type="date" value={form.paid_until ?? ''} onChange={(e) => set('paid_until', e.target.value)} /></FormField>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.voting_eligible} onChange={(e) => set('voting_eligible', e.target.checked)} />
              Voting eligible
            </label>
          </div>
        </section>
      </form>
    </Modal>
  );
}
