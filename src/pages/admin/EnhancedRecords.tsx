import { useEffect, useMemo, useState } from 'react';
import {
  Building2, FileText, Mail, Paperclip, Pencil, Plus, Search, Trash2,
  UserPlus, Users
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { FormField, Select, TextArea, TextInput } from '@/components/ui/FormField';
import { notifyError, notifySuccess } from '@/lib/notifications';
import { formatDate } from '@/lib/utils';

async function uploadRecordFile(
  organisationId: string,
  area: string,
  file: File,
) {
  if (file.size > 12 * 1024 * 1024) throw new Error('File must be 12 MB or smaller.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const path = `${organisationId}/${area}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from('club-record-files')
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return path;
}

/* -------------------------------------------------------------------------- */
/* Communications / News                                                      */
/* -------------------------------------------------------------------------- */

type MemberType = { id: string; name: string };
type NewsPost = {
  id: string; title: string; body: string; audience_membership_type_id: string | null;
  published_at: string; attachment_name: string | null; attachment_path: string | null;
  attachment_type: string | null; status: string;
};

export function CommunicationsRecords() {
  const { activeOrg, profile } = useAuth();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [memberTypes, setMemberTypes] = useState<MemberType[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NewsPost | null>(null);
  const [title, setTitle] = useState('');
  const [audience, setAudience] = useState('');
  const [body, setBody] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [existingAttachmentName, setExistingAttachmentName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!activeOrg) return;
    const [postResult, typeResult] = await Promise.all([
      supabase.from('news_posts').select('*').eq('organisation_id', activeOrg.id).order('published_at', { ascending: false }),
      supabase.from('membership_types').select('id,name').eq('organisation_id', activeOrg.id).eq('is_active', true).order('name'),
    ]);
    if (postResult.error) setError(postResult.error.message);
    setPosts((postResult.data ?? []) as NewsPost[]);
    setMemberTypes((typeResult.data ?? []) as MemberType[]);
  }

  useEffect(() => { load(); }, [activeOrg?.id]);

  function beginAdd() {
    setEditing(null); setTitle(''); setAudience(''); setBody('');
    setPublishedAt(new Date().toISOString().slice(0, 10));
    setFile(null); setExistingAttachmentName(''); setError(''); setOpen(true);
  }

  function beginEdit(post: NewsPost) {
    setEditing(post); setTitle(post.title); setAudience(post.audience_membership_type_id ?? '');
    setBody(post.body); setPublishedAt(post.published_at.slice(0, 10));
    setFile(null); setExistingAttachmentName(post.attachment_name ?? ''); setError(''); setOpen(true);
  }

  async function save() {
    if (!activeOrg || !title.trim() || !body.trim()) {
      setError('Title and article are required.');
      return;
    }
    setSaving(true); setError('');
    try {
      let attachmentPath = editing?.attachment_path ?? null;
      let attachmentName = editing?.attachment_name ?? null;
      let attachmentType = editing?.attachment_type ?? null;
      if (file) {
        attachmentPath = await uploadRecordFile(activeOrg.id, 'communications', file);
        attachmentName = file.name;
        attachmentType = file.type || null;
      }
      const payload = {
        organisation_id: activeOrg.id,
        title: title.trim(),
        body: body.trim(),
        audience_membership_type_id: audience || null,
        attachment_path: attachmentPath,
        attachment_name: attachmentName,
        attachment_type: attachmentType,
        published_at: publishedAt ? new Date(`${publishedAt}T12:00:00`).toISOString() : new Date().toISOString(),
        status: 'published',
        created_by: profile?.id ?? null,
        updated_at: new Date().toISOString(),
      };
      const result = editing
        ? await supabase.from('news_posts').update(payload).eq('id', editing.id).eq('organisation_id', activeOrg.id)
        : await supabase.from('news_posts').insert(payload);
      if (result.error) throw result.error;
      notifySuccess(editing ? 'Communication updated.' : 'Communication published to News & Updates.');
      setOpen(false); await load();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to save communication.');
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this communication?')) return;
    const { error } = await supabase.from('news_posts').delete().eq('id', id);
    if (error) notifyError(error.message); else { notifySuccess('Communication deleted.'); load(); }
  }

  const audienceName = (id: string | null) =>
    id ? memberTypes.find((t) => t.id === id)?.name ?? 'Member Type' : 'All Members';

  return <div className="space-y-6">
    <PageHeader
      title="Communications"
      description="Publish club articles and updates to all members or a selected Member Type."
      actions={<button className="btn-primary" onClick={beginAdd}><Plus className="h-4 w-4"/> Add Record</button>}
    />
    <div className="card overflow-hidden">
      {posts.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No communications yet.</div> :
        <div className="divide-y divide-slate-100">{posts.map((post) =>
          <div key={post.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Mail className="h-4 w-4 text-primary-600"/>
                <p className="font-semibold text-slate-900">{post.title}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{audienceName(post.audience_membership_type_id)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{formatDate(post.published_at)}{post.attachment_name ? ` · Attachment: ${post.attachment_name}` : ''}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{post.body}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => beginEdit(post)}><Pencil className="h-4 w-4"/> Edit</button>
              <button className="btn-ghost text-red-600" onClick={() => remove(post.id)}><Trash2 className="h-4 w-4"/></button>
            </div>
          </div>
        )}</div>}
    </div>

    <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Communication' : 'Add Communication Record'} size="lg"
      footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save & Publish'}</button></>}>
      <div className="space-y-4">
        {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <FormField label="Title" required><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Audience" required>
            <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="">All Members</option>
              {memberTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Date"><TextInput type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} /></FormField>
        </div>
        <FormField label="Article" required><TextArea className="min-h-52" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the article or update members will see…" /></FormField>
        <FormField label="Attachment" helpText="Optional image, PDF, Word or Excel file; max 12 MB">
          <input className="input" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {existingAttachmentName && !file && <p className="mt-2 text-xs text-slate-500">Current attachment: {existingAttachmentName}</p>}
        </FormField>
      </div>
    </Modal>
  </div>;
}

/* -------------------------------------------------------------------------- */
/* Committee                                                                  */
/* -------------------------------------------------------------------------- */

type Position = { id: string; name: string; description: string | null; is_active: boolean };
type MemberOption = { id: string; first_name: string; last_name: string; preferred_name: string | null; email: string | null };
type Appointment = {
  id: string; member_id: string; position_id: string; appointed_on: string; status: string;
  members?: MemberOption | null; committee_positions?: Position | null;
};

export function CommitteeRecords() {
  const { activeOrg, profile } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [query, setQuery] = useState('');
  const [roleOpen, setRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Position | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [error, setError] = useState('');

  async function load() {
    if (!activeOrg) return;
    const [pr, mr, ar] = await Promise.all([
      supabase.from('committee_positions').select('*').eq('organisation_id', activeOrg.id).eq('is_active', true).order('sort_order').order('name'),
      supabase.from('members').select('id,first_name,last_name,preferred_name,email').eq('organisation_id', activeOrg.id).eq('status', 'active').eq('is_archived', false).order('first_name'),
      supabase.from('committee_appointments').select('*,members(id,first_name,last_name,preferred_name,email),committee_positions(id,name,description,is_active)').eq('organisation_id', activeOrg.id).eq('status', 'active').order('appointed_on', { ascending: false }),
    ]);
    setPositions((pr.data ?? []) as Position[]);
    setMembers((mr.data ?? []) as MemberOption[]);
    setAppointments((ar.data ?? []) as unknown as Appointment[]);
  }
  useEffect(() => { load(); }, [activeOrg?.id]);

  const filteredMembers = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return members.slice(0, 30);
    return members.filter((m) => `${m.first_name} ${m.last_name} ${m.preferred_name ?? ''} ${m.email ?? ''}`.toLowerCase().includes(q)).slice(0, 30);
  }, [members, query]);

  function addRole() { setEditingRole(null); setRoleName(''); setRoleDescription(''); setError(''); setRoleOpen(true); }
  function editRole(role: Position) { setEditingRole(role); setRoleName(role.name); setRoleDescription(role.description ?? ''); setError(''); setRoleOpen(true); }

  async function saveRole() {
    if (!activeOrg || !roleName.trim()) return;
    const payload = { organisation_id: activeOrg.id, name: roleName.trim(), description: roleDescription.trim() || null, is_active: true };
    const result = editingRole
      ? await supabase.from('committee_positions').update(payload).eq('id', editingRole.id)
      : await supabase.from('committee_positions').insert(payload);
    if (result.error) { setError(result.error.message); return; }
    notifySuccess(editingRole ? 'Committee role updated.' : 'Committee role created.');
    setRoleOpen(false); load();
  }

  async function appoint() {
    if (!activeOrg || !memberId || !positionId) { setError('Select a member and committee role.'); return; }
    setError('');
    const existing = appointments.find((a) => a.member_id === memberId && a.position_id === positionId);
    if (existing) { setError('This member already has this active committee appointment.'); return; }

    const { error: appointmentError } = await supabase.from('committee_appointments').insert({
      organisation_id: activeOrg.id, member_id: memberId, position_id: positionId,
      appointed_on: new Date().toISOString().slice(0, 10), status: 'active', appointed_by: profile?.id ?? null,
    });
    if (appointmentError) { setError(appointmentError.message); return; }

    await supabase.from('members').update({ is_committee_member: true, committee_position_id: positionId }).eq('id', memberId);

    const member = members.find((m) => m.id === memberId);
    const role = positions.find((p) => p.id === positionId);
    if (member && role) {
      await supabase.from('news_posts').insert({
        organisation_id: activeOrg.id,
        title: 'Committee Appointment',
        body: `${member.preferred_name || member.first_name} ${member.last_name} has been appointed as ${role.name}.`,
        audience_membership_type_id: null,
        published_at: new Date().toISOString(),
        status: 'published',
        created_by: profile?.id ?? null,
      });
    }
    notifySuccess('Committee appointment saved and published to News & Updates.');
    setAppointmentOpen(false); setMemberId(''); setPositionId(''); setQuery(''); load();
  }

  async function endAppointment(appointment: Appointment) {
    if (!confirm('End this committee appointment?')) return;
    await supabase.from('committee_appointments').update({ status: 'ended', ended_on: new Date().toISOString().slice(0, 10) }).eq('id', appointment.id);
    const { count } = await supabase.from('committee_appointments').select('id', { head: true, count: 'exact' }).eq('member_id', appointment.member_id).eq('status', 'active');
    if ((count ?? 0) === 0) {
      await supabase.from('members').update({ is_committee_member: false, committee_position_id: null }).eq('id', appointment.member_id);
    }
    notifySuccess('Committee appointment ended.'); load();
  }

  return <div className="space-y-6">
    <PageHeader title="Committee" description="Create committee roles and appoint existing members."
      actions={<div className="flex gap-2"><button className="btn-secondary" onClick={addRole}><Plus className="h-4 w-4"/> New Role</button><button className="btn-primary" onClick={() => { setError(''); setAppointmentOpen(true); }}><UserPlus className="h-4 w-4"/> Appoint Member</button></div>} />
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card overflow-hidden"><div className="border-b p-4"><h2 className="font-semibold">Committee Roles</h2></div>
        <div className="divide-y">{positions.map((role) => <button key={role.id} onClick={() => editRole(role)} className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"><div><p className="font-medium">{role.name}</p><p className="text-xs text-slate-500">{role.description || 'No description'}</p></div><Pencil className="h-4 w-4 text-slate-400"/></button>)}</div>
      </div>
      <div className="card overflow-hidden"><div className="border-b p-4"><h2 className="font-semibold">Current Appointments</h2></div>
        {appointments.length === 0 ? <div className="p-6 text-sm text-slate-500">No current appointments.</div> :
          <div className="divide-y">{appointments.map((a) => <div key={a.id} className="flex items-center justify-between gap-3 p-4"><div><p className="font-medium">{a.members?.preferred_name || a.members?.first_name} {a.members?.last_name}</p><p className="text-sm text-slate-500">{a.committee_positions?.name} · appointed {formatDate(a.appointed_on)}</p></div><button className="btn-ghost text-red-600" onClick={() => endAppointment(a)}>End</button></div>)}</div>}
      </div>
    </div>

    <Modal open={roleOpen} onClose={() => setRoleOpen(false)} title={editingRole ? 'Edit Committee Role' : 'Create Committee Role'}
      footer={<><button className="btn-secondary" onClick={() => setRoleOpen(false)}>Cancel</button><button className="btn-primary" onClick={saveRole}>Save Role</button></>}>
      <div className="space-y-4">{error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}<FormField label="Role name" required><TextInput value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. President, Secretary" /></FormField><FormField label="Description"><TextArea value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} /></FormField></div>
    </Modal>

    <Modal open={appointmentOpen} onClose={() => setAppointmentOpen(false)} title="Appoint Committee Member" size="lg"
      footer={<><button className="btn-secondary" onClick={() => setAppointmentOpen(false)}>Cancel</button><button className="btn-primary" onClick={appoint}>Save Appointment</button></>}>
      <div className="space-y-4">{error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <FormField label="Search member"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input className="input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email…" /></div></FormField>
        <FormField label="Member" required><Select value={memberId} onChange={(e) => setMemberId(e.target.value)}><option value="">Select member</option>{filteredMembers.map((m) => <option key={m.id} value={m.id}>{m.preferred_name || m.first_name} {m.last_name}{m.email ? ` — ${m.email}` : ''}</option>)}</Select></FormField>
        <FormField label="Committee role" required><Select value={positionId} onChange={(e) => setPositionId(e.target.value)}><option value="">Select role</option>{positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></FormField>
      </div>
    </Modal>
  </div>;
}

/* -------------------------------------------------------------------------- */
/* Organisations & Contacts                                                   */
/* -------------------------------------------------------------------------- */

type ContactOrg = { id: string; name: string; category: string | null; status: string };
type ContactPerson = { id: string; organisation_record_id: string; name: string; email: string | null; position: string | null; phone: string | null };

export function ContactRecords() {
  const { activeOrg } = useAuth();
  const [organisations, setOrganisations] = useState<ContactOrg[]>([]);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [selected, setSelected] = useState<ContactOrg | null>(null);
  const [orgOpen, setOrgOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactPerson | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgCategory, setOrgCategory] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPosition, setContactPosition] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  async function load() {
    if (!activeOrg) return;
    const { data } = await supabase.from('contact_organisations').select('*').eq('organisation_id', activeOrg.id).order('name');
    setOrganisations((data ?? []) as ContactOrg[]);
  }
  async function loadContacts(id: string) {
    const { data } = await supabase.from('contact_persons').select('*').eq('organisation_record_id', id).order('name');
    setContacts((data ?? []) as ContactPerson[]);
  }
  useEffect(() => { load(); }, [activeOrg?.id]);
  useEffect(() => { if (selected) loadContacts(selected.id); else setContacts([]); }, [selected?.id]);

  async function saveOrganisation() {
    if (!activeOrg || !orgName.trim()) return;
    const { data, error } = await supabase.from('contact_organisations').insert({ organisation_id: activeOrg.id, name: orgName.trim(), category: orgCategory.trim() || null, status: 'active' }).select('*').single();
    if (error) { notifyError(error.message); return; }
    notifySuccess('Organisation added.'); setOrgOpen(false); setOrgName(''); setOrgCategory(''); await load(); setSelected(data as ContactOrg);
  }

  function addContact() { setEditingContact(null); setContactName(''); setContactEmail(''); setContactPosition(''); setContactPhone(''); setContactOpen(true); }
  function editContact(c: ContactPerson) { setEditingContact(c); setContactName(c.name); setContactEmail(c.email ?? ''); setContactPosition(c.position ?? ''); setContactPhone(c.phone ?? ''); setContactOpen(true); }

  async function saveContact() {
    if (!selected || !contactName.trim()) return;
    const payload = { organisation_record_id: selected.id, name: contactName.trim(), email: contactEmail.trim() || null, position: contactPosition.trim() || null, phone: contactPhone.trim() || null };
    const result = editingContact ? await supabase.from('contact_persons').update(payload).eq('id', editingContact.id) : await supabase.from('contact_persons').insert(payload);
    if (result.error) { notifyError(result.error.message); return; }
    notifySuccess(editingContact ? 'Contact updated.' : 'Contact added.');
    setContactOpen(false); loadContacts(selected.id);
  }

  async function removeContact(id: string) {
    if (!confirm('Delete this contact person?')) return;
    const { error } = await supabase.from('contact_persons').delete().eq('id', id);
    if (error) notifyError(error.message); else if (selected) loadContacts(selected.id);
  }

  return <div className="space-y-6">
    <PageHeader title="Organisations & Contacts" description="Maintain organisations and multiple contact people for each record."
      actions={<button className="btn-primary" onClick={() => setOrgOpen(true)}><Plus className="h-4 w-4"/> Add Organisation</button>} />
    <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="card overflow-hidden"><div className="border-b p-4 font-semibold">Organisations</div>
        <div className="divide-y">{organisations.map((org) => <button key={org.id} onClick={() => setSelected(org)} className={`w-full p-4 text-left hover:bg-slate-50 ${selected?.id === org.id ? 'bg-primary-50' : ''}`}><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-400"/><span className="font-medium">{org.name}</span></div><p className="mt-1 text-xs text-slate-500">{org.category || 'No category'}</p></button>)}</div>
      </div>
      <div className="card overflow-hidden">
        {!selected ? <div className="p-10 text-center text-slate-500"><Users className="mx-auto h-8 w-8"/><p className="mt-2">Select an organisation to view its contacts.</p></div> :
          <><div className="flex items-center justify-between border-b p-4"><div><h2 className="font-semibold">{selected.name}</h2><p className="text-xs text-slate-500">{selected.category}</p></div><button className="btn-primary" onClick={addContact}><Plus className="h-4 w-4"/> Add Contact</button></div>
          {contacts.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No contact people yet.</div> :
            <div className="divide-y">{contacts.map((c) => <div key={c.id} className="flex items-center justify-between gap-3 p-4"><div><p className="font-medium">{c.name}</p><p className="text-sm text-slate-500">{c.position || 'No position'}{c.email ? ` · ${c.email}` : ''}{c.phone ? ` · ${c.phone}` : ''}</p></div><div className="flex gap-1"><button className="btn-ghost" onClick={() => editContact(c)}><Pencil className="h-4 w-4"/></button><button className="btn-ghost text-red-600" onClick={() => removeContact(c.id)}><Trash2 className="h-4 w-4"/></button></div></div>)}</div>}</>}
      </div>
    </div>

    <Modal open={orgOpen} onClose={() => setOrgOpen(false)} title="Add Organisation"
      footer={<><button className="btn-secondary" onClick={() => setOrgOpen(false)}>Cancel</button><button className="btn-primary" onClick={saveOrganisation}>Save Organisation</button></>}>
      <div className="space-y-4"><FormField label="Organisation name" required><TextInput value={orgName} onChange={(e) => setOrgName(e.target.value)} /></FormField><FormField label="Category"><TextInput value={orgCategory} onChange={(e) => setOrgCategory(e.target.value)} placeholder="Sponsor, Supplier, Venue…" /></FormField></div>
    </Modal>

    <Modal open={contactOpen} onClose={() => setContactOpen(false)} title={editingContact ? 'Edit Contact Person' : 'Add Contact Person'}
      footer={<><button className="btn-secondary" onClick={() => setContactOpen(false)}>Cancel</button><button className="btn-primary" onClick={saveContact}>Save Contact</button></>}>
      <div className="grid gap-4 md:grid-cols-2"><FormField label="Name" required><TextInput value={contactName} onChange={(e) => setContactName(e.target.value)} /></FormField><FormField label="Position"><TextInput value={contactPosition} onChange={(e) => setContactPosition(e.target.value)} /></FormField><FormField label="Email"><TextInput type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></FormField><FormField label="Contact number"><TextInput value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></FormField></div>
    </Modal>
  </div>;
}

/* -------------------------------------------------------------------------- */
/* Documents                                                                  */
/* -------------------------------------------------------------------------- */

type DocumentRecord = {
  id: string; title: string; category: string | null; version: string | null;
  review_date: string | null; status: string; visibility: string;
  file_path: string | null; file_name: string | null; file_type: string | null;
};

export function DocumentRecords() {
  const { activeOrg } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentRecord | null>(null);
  const [form, setForm] = useState({ title: '', category: '', version: '', review_date: '', status: 'current', visibility: 'members' });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  async function load() {
    if (!activeOrg) return;
    const { data, error } = await supabase.from('club_documents').select('*').eq('organisation_id', activeOrg.id).order('title');
    if (error) setError(error.message);
    setDocuments((data ?? []) as DocumentRecord[]);
  }
  useEffect(() => { load(); }, [activeOrg?.id]);

  function add() { setEditing(null); setForm({ title: '', category: '', version: '', review_date: '', status: 'current', visibility: 'members' }); setFile(null); setError(''); setOpen(true); }
  function edit(d: DocumentRecord) { setEditing(d); setForm({ title: d.title, category: d.category ?? '', version: d.version ?? '', review_date: d.review_date ?? '', status: d.status, visibility: d.visibility }); setFile(null); setError(''); setOpen(true); }

  async function save() {
    if (!activeOrg || !form.title.trim()) return;
    try {
      let path = editing?.file_path ?? null;
      let name = editing?.file_name ?? null;
      let type = editing?.file_type ?? null;
      if (file) { path = await uploadRecordFile(activeOrg.id, 'documents', file); name = file.name; type = file.type || null; }
      const payload = {
        organisation_id: activeOrg.id, title: form.title.trim(), category: form.category.trim() || null,
        version: form.version.trim() || null, review_date: form.review_date || null, status: form.status,
        visibility: form.visibility, file_path: path, file_name: name, file_type: type, updated_at: new Date().toISOString(),
      };
      const result = editing ? await supabase.from('club_documents').update(payload).eq('id', editing.id) : await supabase.from('club_documents').insert(payload);
      if (result.error) throw result.error;
      notifySuccess(editing ? 'Document updated.' : 'Document saved.');
      setOpen(false); load();
    } catch (e: any) { setError(e?.message ?? 'Unable to save document.'); }
  }

  async function download(d: DocumentRecord) {
    if (!d.file_path) return;
    const { data, error } = await supabase.storage.from('club-record-files').createSignedUrl(d.file_path, 120);
    if (error) { notifyError(error.message); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function remove(id: string) {
    if (!confirm('Delete this document record?')) return;
    const { error } = await supabase.from('club_documents').delete().eq('id', id);
    if (error) notifyError(error.message); else { notifySuccess('Document deleted.'); load(); }
  }

  return <div className="space-y-6">
    <PageHeader title="Documents" description="Policies, constitution, minutes and records. Attach PDF, Word or Excel files."
      actions={<button className="btn-primary" onClick={add}><Plus className="h-4 w-4"/> Add Record</button>} />
    <div className="card overflow-hidden">
      <div className="divide-y">{documents.map((d) => <div key={d.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary-600"/><p className="font-medium">{d.title}</p><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{d.visibility === 'members' ? 'Members' : 'Admins'}</span></div><p className="mt-1 text-xs text-slate-500">{d.category || 'Uncategorised'}{d.version ? ` · ${d.version}` : ''}{d.file_name ? ` · ${d.file_name}` : ''}</p></div><div className="flex gap-2">{d.file_path && <button className="btn-secondary" onClick={() => download(d)}><Paperclip className="h-4 w-4"/> Open</button>}<button className="btn-secondary" onClick={() => edit(d)}><Pencil className="h-4 w-4"/> Edit</button><button className="btn-ghost text-red-600" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4"/></button></div></div>)}</div>
    </div>

    <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Document' : 'Add Document Record'} size="lg"
      footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" onClick={save}>Save Document</button></>}>
      <div className="grid gap-4 md:grid-cols-2">{error && <div className="md:col-span-2 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="md:col-span-2"><FormField label="Document title" required><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField></div><FormField label="Category"><TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></FormField><FormField label="Version"><TextInput value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></FormField><FormField label="Review date"><TextInput type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} /></FormField><FormField label="Visibility"><Select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}><option value="members">Members</option><option value="admins">Admins only</option></Select></FormField><div className="md:col-span-2"><FormField label="File" helpText="PDF, Word or Excel; max 12 MB"><input className="input" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />{editing?.file_name && !file && <p className="mt-2 text-xs text-slate-500">Current file: {editing.file_name}</p>}</FormField></div></div>
    </Modal>
  </div>;
}
