import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { FormField, Select, TextArea, TextInput } from '@/components/ui/FormField';
import { formatCurrency } from '@/lib/utils';
import { useOrganisationCurrency } from '@/lib/useOrganisationCurrency';
import { Trophy, Plus, Users, Pencil, Trash2, Settings2 } from 'lucide-react';
import type { Sport } from '@/types/database';

type SubscriptionType={id:string;name:string;fee:number;billing_period:string;is_active:boolean};
type Team=any;

type TeamForm = {
  name: string;
  sport_id: string;
  description: string;
  contact: string;
  status: string;
  subscription_type_id: string;
};

const emptyForm: TeamForm = {
  name: '',
  sport_id: '',
  description: '',
  contact: '',
  status: 'active',
  subscription_type_id: '',
};

export function TeamsPage() {
  const { activeOrg } = useAuth();
  const { currency } = useOrganisationCurrency();
  const [teams, setTeams] = useState<Team[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionType[]>([]);
  const [defaultSubscriptionId, setDefaultSubscriptionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState<TeamForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const defaultSubscription = useMemo(
    () => subscriptions.find((s) => s.id === defaultSubscriptionId) ?? null,
    [subscriptions, defaultSubscriptionId],
  );

  async function load() {
    if (!activeOrg) return;
    setLoading(true);
    const [teamRes, sportRes, subRes, settingsRes] = await Promise.all([
      supabase
        .from('teams')
        .select('*, sports(*), subscription_types(*)')
        .eq('organisation_id', activeOrg.id)
        .eq('is_archived', false)
        .order('name'),
      supabase.from('sports').select('*').eq('organisation_id', activeOrg.id).eq('status', 'active').order('name'),
      supabase.from('subscription_types').select('*').eq('organisation_id', activeOrg.id).eq('is_active', true).order('sort_order'),
      supabase.from('organisation_settings').select('default_team_subscription_type_id').eq('organisation_id', activeOrg.id).maybeSingle(),
    ]);

    setTeams((teamRes.data ?? []) as unknown as Team[]);
    setSports((sportRes.data ?? []) as Sport[]);
    setSubscriptions((subRes.data ?? []) as SubscriptionType[]);
    setDefaultSubscriptionId(settingsRes.data?.default_team_subscription_type_id ?? '');
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [activeOrg?.id]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      sport_id: sports[0]?.id ?? '',
      subscription_type_id: defaultSubscriptionId || subscriptions[0]?.id || '',
    });
    setModalOpen(true);
  }

  function openEdit(team: Team) {
    setEditing(team);
    setForm({
      name: team.name,
      sport_id: team.sport_id,
      description: team.description ?? '',
      contact: team.contact ?? '',
      status: team.status,
      subscription_type_id: team.subscription_type_id ?? '',
    });
    setModalOpen(true);
  }

  async function saveTeam() {
    if (!activeOrg || !form.name.trim() || !form.sport_id) return;
    setSaving(true);
    const payload = {
      organisation_id: activeOrg.id,
      name: form.name.trim(),
      sport_id: form.sport_id,
      season: sports.find((s) => s.id === form.sport_id)?.season || null,
      description: form.description.trim() || null,
      contact: form.contact.trim() || null,
      status: form.status,
      subscription_type_id: form.subscription_type_id || null,
      is_archived: false,
    };

    const { error } = editing
      ? await supabase.from('teams').update(payload).eq('id', editing.id).eq('organisation_id', activeOrg.id)
      : await supabase.from('teams').insert(payload);

    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setModalOpen(false);
    await load();
  }

  async function deleteTeam(team: Team) {
    if (!activeOrg) return;
    if (!window.confirm(`Delete team “${team.name}”? Team player assignments for this team will also be removed.`)) return;
    const { error } = await supabase.from('teams').delete().eq('id', team.id).eq('organisation_id', activeOrg.id);
    if (error) alert(error.message);
    else await load();
  }

  async function updateDefaultSubscription(value: string) {
    if (!activeOrg) return;
    setDefaultSubscriptionId(value);
    const { error } = await supabase
      .from('organisation_settings')
      .update({ default_team_subscription_type_id: value || null })
      .eq('organisation_id', activeOrg.id);
    if (error) {
      alert(error.message);
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description={`${teams.length} teams · create, edit, delete and assign a subscription to each team`}
        actions={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> New Team</button>}
      />

      <div className="card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Default team subscription</h2>
              <p className="text-sm text-slate-500">This subscription is preselected whenever a new team is created. It can still be changed for that team.</p>
            </div>
          </div>
          <div className="w-full md:w-80">
            <Select value={defaultSubscriptionId} onChange={(e) => updateDefaultSubscription(e.target.value)}>
              <option value="">No default subscription</option>
              {subscriptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {formatCurrency(s.fee, currency)}</option>
              ))}
            </Select>
            {defaultSubscription && <p className="mt-1 text-xs text-slate-500">Current default: {defaultSubscription.name}</p>}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-40 animate-pulse" />)}</div>
      ) : teams.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Trophy className="h-6 w-6" />} title="No teams yet" description="Create your first team and assign its subscription." action={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> New Team</button>} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const subscription = t.subscription_types;
            return (
              <div key={t.id} className="card-hover p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{t.name}</h3>
                      <p className="text-xs text-slate-500">{t.sports?.name || 'Sport'}{t.sports?.season ? ` · ${t.sports.season}` : t.season ? ` · ${t.season}` : ''}</p>
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>

                {t.description && <p className="mt-3 text-sm text-slate-500">{t.description}</p>}

                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Team subscription</p>
                  {subscription ? (
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-900">{subscription.name}</span>
                      <span className="text-sm font-semibold text-primary-700">{formatCurrency(subscription.fee, currency)}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-amber-700">No subscription assigned</p>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <Users className="h-4 w-4" /> Manage players from member/team assignments
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="btn-secondary flex-1" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  <button className="btn-ghost text-error-600 hover:bg-error-50" onClick={() => deleteTeam(t)} title="Delete team"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Team' : 'Create Team'}
        description={editing ? 'Update the team details and assigned subscription.' : 'The organisation default subscription is preselected and can be changed.'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveTeam} disabled={saving || !form.name.trim() || !form.sport_id}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Team'}</button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Team name" required className="md:col-span-2">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premier Cricket" />
          </FormField>

          <FormField label="Sport" required>
            <Select value={form.sport_id} onChange={(e) => setForm({ ...form, sport_id: e.target.value })}>
              <option value="">Select sport</option>
              {sports.map((s) => <option key={s.id} value={s.id}>{s.name}{s.season ? ` · ${s.season}` : ''}</option>)}
            </Select>
          </FormField>


          <FormField label="Team subscription" required helpText="Defaults to the organisation setting for new teams, but can be changed here." className="md:col-span-2">
            <Select value={form.subscription_type_id} onChange={(e) => setForm({ ...form, subscription_type_id: e.target.value })}>
              <option value="">No subscription</option>
              {subscriptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {formatCurrency(s.fee, currency)} / {s.billing_period.replace('_',' ')}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Contact">
            <TextInput value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Team contact email or phone" />
          </FormField>

          <FormField label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>

          <FormField label="Description" className="md:col-span-2">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Team notes or description..." />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
