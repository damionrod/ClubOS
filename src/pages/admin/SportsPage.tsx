import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { FormField, TextInput } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { notifySuccess } from '@/lib/notifications';

interface SportRecord {
  id: string;
  organisation_id: string;
  name: string;
  season: string | null;
  status: string;
}

export function SportsPage() {
  const { activeOrg } = useAuth();
  const [sports, setSports] = useState<SportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SportRecord | null>(null);
  const [name, setName] = useState('');
  const [season, setSeason] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!activeOrg) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('sports')
      .select('id,organisation_id,name,season,status')
      .eq('organisation_id', activeOrg.id)
      .order('name')
      .order('season', { ascending: false });
    if (error) alert(error.message);
    setSports((data ?? []) as SportRecord[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [activeOrg?.id]);

  function newSport() {
    setEditing(null); setName(''); setSeason(''); setOpen(true);
  }

  function editSport(s: SportRecord) {
    setEditing(s); setName(s.name); setSeason(s.season ?? ''); setOpen(true);
  }

  async function save() {
    if (!activeOrg || !name.trim()) return;
    setSaving(true);
    const payload = { organisation_id: activeOrg.id, name: name.trim(), season: season.trim() || null, status: 'active' };
    const { error } = editing
      ? await supabase.from('sports').update(payload).eq('id', editing.id).eq('organisation_id', activeOrg.id)
      : await supabase.from('sports').insert(payload);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setOpen(false); notifySuccess(editing ? 'Group type updated.' : 'Group type created.'); await load();
  }

  async function remove(s: SportRecord) {
    if (!activeOrg) return;
    const { count } = await supabase.from('teams').select('id', { count: 'exact', head: true }).eq('organisation_id', activeOrg.id).eq('sport_id', s.id);
    if ((count ?? 0) > 0) {
      alert(`This group type is used by ${count} team${count === 1 ? '' : 's'}. Change or delete those teams before deleting the sport.`);
      return;
    }
    if (!window.confirm(`Delete “${s.name}${s.season ? ` — ${s.season}` : ''}”?`)) return;
    const { error } = await supabase.from('sports').delete().eq('id', s.id).eq('organisation_id', activeOrg.id);
    if (error) alert(error.message); else await load();
  }

  return <div className="space-y-6">
    <PageHeader title="Group Types" description="Create the group types and optional seasons your organisation uses. Teams select from this list." actions={<button className="btn-primary" onClick={newSport}><Plus className="h-4 w-4"/> Add Group Type</button>} />

    {loading ? <div className="card h-32 animate-pulse"/> : sports.length === 0 ?
      <div className="card"><EmptyState icon={<Trophy className="h-6 w-6"/>} title="No group types yet" description="Add a group type. Only the name is required." action={<button className="btn-primary" onClick={newSport}><Plus className="h-4 w-4"/> Add Group Type</button>} /></div>
      : <div className="card overflow-hidden"><div className="divide-y divide-slate-100">{sports.map(s => <div key={s.id} className="flex items-center justify-between gap-4 p-4">
          <div><p className="font-semibold text-slate-900">{s.name}</p><p className="text-sm text-slate-500">{s.season || 'No season specified'}</p></div>
          <div className="flex gap-2"><button className="btn-secondary" onClick={()=>editSport(s)}><Pencil className="h-4 w-4"/> Edit</button><button className="btn-ghost text-error-600" onClick={()=>remove(s)}><Trash2 className="h-4 w-4"/></button></div>
        </div>)}</div></div>}

    <Modal open={open} onClose={()=>setOpen(false)} title={editing ? 'Edit Group Type' : 'Add Group Type'} description="Keep this simple: group type name is required; season is optional." footer={<><button className="btn-secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary" disabled={saving || !name.trim()} onClick={save}>{saving?'Saving…':'Save'}</button></>}>
      <div className="space-y-4"><FormField label="Group type name" required><TextInput value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Cricket" /></FormField><FormField label="Season" helpText="Optional"><TextInput value={season} onChange={e=>setSeason(e.target.value)} placeholder="e.g. 2026/27" /></FormField></div>
    </Modal>
  </div>;
}
