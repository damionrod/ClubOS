import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { FormField, TextInput, Select, TextArea, Checkbox } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Plus, Pencil, Trash2, ListPlus } from 'lucide-react';
import type { CustomField, FieldType, FieldSensitivity } from '@/types/database';

export function CustomFields() {
  const { activeOrg } = useAuth();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CustomField> & { optionsText?: string }>({});

  useEffect(() => {
    if (!activeOrg) return;
    supabase.from('custom_fields').select('*').eq('organisation_id', activeOrg.id).order('display_order').then(({ data }) => {
      setFields(data ?? []);
      setLoading(false);
    });
  }, [activeOrg]);

  function openCreate() {
    setEditing(null);
    setForm({ field_type: 'text', section: 'personal_details', display_order: fields.length + 1, is_active: true, is_mandatory: false, member_editable: false, admin_editable: true, is_application_field: false, is_renewal_field: false, is_profile_field: true, is_exportable: true, sensitivity: 'general', optionsText: '' });
    setModalOpen(true);
  }

  function openEdit(f: CustomField) {
    setEditing(f);
    setForm({ ...f, optionsText: f.options?.join('\n') ?? '' });
    setModalOpen(true);
  }

  async function save() {
    if (!activeOrg) return;
    const { optionsText, ...rest } = form;
    const options = optionsText ? optionsText.split('\n').map((s) => s.trim()).filter(Boolean) : [];
    const payload = { ...rest, options };

    if (editing) {
      await supabase.from('custom_fields').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('custom_fields').insert({ ...payload, organisation_id: activeOrg.id });
    }
    setModalOpen(false);
    const { data } = await supabase.from('custom_fields').select('*').eq('organisation_id', activeOrg.id).order('display_order');
    setFields(data ?? []);
  }

  async function confirmDelete() {
    if (!deleteId || !activeOrg) return;
    await supabase.from('custom_fields').delete().eq('id', deleteId);
    setDeleteId(null);
    const { data } = await supabase.from('custom_fields').select('*').eq('organisation_id', activeOrg.id).order('display_order');
    setFields(data ?? []);
  }

  const sectionLabels: Record<string, string> = {
    personal_details: 'Personal Details',
    contact_details: 'Contact Details',
    emergency_contacts: 'Emergency Contacts',
    guardians: 'Guardians',
    medical_safety: 'Medical & Safety',
    membership: 'Membership',
  };

  const grouped = fields.reduce((acc, f) => {
    const key = f.section;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {} as Record<string, CustomField[]>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Fields"
        description="Add custom fields to collect additional member information"
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> New Field</button>}
      />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-20 animate-pulse" />)}</div>
      ) : fields.length === 0 ? (
        <div className="card">
          <EmptyState icon={<ListPlus className="h-6 w-6" />} title="No custom fields" description="Create custom fields to collect additional information from your members." action={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> New Field</button>} />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([section, sectionFields]) => (
            <div key={section}>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">{sectionLabels[section] ?? section}</h3>
              <div className="card divide-y divide-slate-100">
                {sectionFields.map((f) => (
                  <div key={f.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{f.label}</p>
                        <p className="text-xs text-slate-500">{f.field_type} · {f.help_text ?? 'No help text'}</p>
                      </div>
                      <div className="flex gap-1.5">
                        {f.is_mandatory && <StatusBadge status="active" variant="error">Required</StatusBadge>}
                        <StatusBadge status={f.is_active ? 'active' : 'inactive'} />
                        <StatusBadge status="active" variant="info">{f.sensitivity.replace('_', ' ')}</StatusBadge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(f)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteId(f.id)} className="rounded-lg p-2 text-slate-400 hover:bg-error-50 hover:text-error-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Custom Field' : 'New Custom Field'}
        size="lg"
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={save}>{editing ? 'Save' : 'Create'}</button></>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Label" required className="md:col-span-2">
            <TextInput value={form.label ?? ''} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Dietary Requirements" />
          </FormField>
          <FormField label="Help Text" className="md:col-span-2">
            <TextInput value={form.help_text ?? ''} onChange={(e) => setForm({ ...form, help_text: e.target.value })} placeholder="Shown below the field" />
          </FormField>
          <FormField label="Field Type" required>
            <Select value={form.field_type ?? 'text'} onChange={(e) => setForm({ ...form, field_type: e.target.value as FieldType })}>
              <option value="text">Text</option>
              <option value="longtext">Long Text</option>
              <option value="number">Number</option>
              <option value="currency">Currency</option>
              <option value="date">Date</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="yesno">Yes/No</option>
              <option value="checkbox">Checkbox</option>
              <option value="dropdown">Dropdown</option>
              <option value="multiselect">Multi-select</option>
            </Select>
          </FormField>
          <FormField label="Section" required>
            <Select value={form.section ?? 'personal_details'} onChange={(e) => setForm({ ...form, section: e.target.value })}>
              {Object.entries(sectionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </FormField>
          <FormField label="Sensitivity" required>
            <Select value={form.sensitivity ?? 'general'} onChange={(e) => setForm({ ...form, sensitivity: e.target.value as FieldSensitivity })}>
              <option value="general">General</option>
              <option value="personal">Personal</option>
              <option value="sensitive">Sensitive</option>
              <option value="highly_sensitive">Highly Sensitive</option>
            </Select>
          </FormField>
          <FormField label="Display Order">
            <TextInput type="number" value={form.display_order ?? 0} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
          </FormField>
          {(form.field_type === 'dropdown' || form.field_type === 'multiselect') && (
            <FormField label="Options (one per line)" className="md:col-span-2">
              <TextArea value={form.optionsText ?? ''} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} placeholder="Option 1&#10;Option 2&#10;Option 3" />
            </FormField>
          )}
          <div className="md:col-span-2 space-y-3 rounded-lg bg-slate-50 p-4">
            <Checkbox label="Mandatory" checked={form.is_mandatory ?? false} onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })} />
            <Checkbox label="Active" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <Checkbox label="Member Editable" checked={form.member_editable ?? false} onChange={(e) => setForm({ ...form, member_editable: e.target.checked })} />
            <Checkbox label="Exportable" checked={form.is_exportable ?? true} onChange={(e) => setForm({ ...form, is_exportable: e.target.checked })} />
            <Checkbox label="Show on Application Form" checked={form.is_application_field ?? false} onChange={(e) => setForm({ ...form, is_application_field: e.target.checked })} />
            <Checkbox label="Show on Profile" checked={form.is_profile_field ?? true} onChange={(e) => setForm({ ...form, is_profile_field: e.target.checked })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Custom Field"
        message="Are you sure you want to delete this custom field? All values stored for this field will also be removed."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
