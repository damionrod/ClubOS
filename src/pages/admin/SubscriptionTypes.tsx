import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { FormField, Select, TextArea, TextInput } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import { useOrganisationCurrency } from '@/lib/useOrganisationCurrency';
import { notifySuccess, notifyError } from '@/lib/notifications';

type SubscriptionType = {
  id: string;
  organisation_id: string;
  name: string;
  description: string | null;
  fee: number;
  billing_period: string;
  is_active: boolean;
  sort_order: number;
  sport_id: string | null;
  team_id: string | null;
  season: string | null;
};

type Sport = { id: string; name: string; season: string | null };
type Team = { id: string; name: string; season: string | null; sport_id: string | null };

const empty = {
  name: '',
  description: '',
  fee: '0',
  billing_period: 'season',
  is_active: true,
  sort_order: '0',
  sport_id: '',
  team_id: '',
  season: '',
};

export function SubscriptionTypes() {
  const { activeOrg } = useAuth();
  const { currency } = useOrganisationCurrency();

  const [rows, setRows] = useState<SubscriptionType[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionType | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredTeams = useMemo(
    () => (form.sport_id ? teams.filter((team) => team.sport_id === form.sport_id) : teams),
    [teams, form.sport_id],
  );

  function sportName(id: string | null) {
    return sports.find((sport) => sport.id === id)?.name ?? null;
  }

  function teamName(id: string | null) {
    return teams.find((team) => team.id === id)?.name ?? null;
  }

  async function load() {
    if (!activeOrg) return;

    setLoading(true);
    setError('');

    // Keep these as three simple queries. The previous embedded sports/teams
    // relationship query could fail even after a subscription was successfully
    // inserted, leaving the page looking empty.
    const [subRes, sportRes, teamRes] = await Promise.all([
      supabase
        .from('subscription_types')
        .select('*')
        .eq('organisation_id', activeOrg.id)
        .order('is_active', { ascending: false })
        .order('sort_order')
        .order('name'),
      supabase
        .from('sports')
        .select('id,name,season')
        .eq('organisation_id', activeOrg.id)
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('teams')
        .select('id,name,season,sport_id')
        .eq('organisation_id', activeOrg.id)
        .eq('status', 'active')
        .eq('is_archived', false)
        .order('name'),
    ]);

    if (subRes.error) {
      setError(subRes.error.message);
      setRows([]);
    } else {
      setRows((subRes.data ?? []) as SubscriptionType[]);
    }

    setSports((sportRes.data ?? []) as Sport[]);
    setTeams((teamRes.data ?? []) as Team[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [activeOrg?.id]);

  function add() {
    setEditing(null);
    setForm({ ...empty, sort_order: String(rows.length + 1) });
    setError('');
    setOpen(true);
  }

  function edit(row: SubscriptionType) {
    setEditing(row);
    setForm({
      name: row.name,
      description: row.description ?? '',
      fee: String(row.fee),
      billing_period: row.billing_period,
      is_active: row.is_active,
      sort_order: String(row.sort_order),
      sport_id: row.sport_id ?? '',
      team_id: row.team_id ?? '',
      season: row.season ?? '',
    });
    setError('');
    setOpen(true);
  }

  async function save() {
    if (!activeOrg) return;

    if (!form.name.trim()) {
      setError('Subscription name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const selectedTeam = teams.find((team) => team.id === form.team_id);
      const selectedSport = sports.find((sport) => sport.id === form.sport_id);

      const payload = {
        organisation_id: activeOrg.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        fee: Number(form.fee || 0),
        billing_period: form.billing_period,
        is_active: !!form.is_active,
        sort_order: Number(form.sort_order || 0),
        sport_id: form.sport_id || selectedTeam?.sport_id || null,
        team_id: form.team_id || null,
        season: form.season.trim() || selectedTeam?.season || selectedSport?.season || null,
      };

      if (editing) {
        const { data, error: updateError } = await supabase
          .from('subscription_types')
          .update(payload)
          .eq('id', editing.id)
          .eq('organisation_id', activeOrg.id)
          .select('*')
          .single();

        if (updateError) throw updateError;

        setRows((current) =>
          current.map((row) => (row.id === editing.id ? (data as SubscriptionType) : row)),
        );
        notifySuccess('Subscription updated successfully.');
      } else {
        const { data, error: insertError } = await supabase
          .from('subscription_types')
          .insert(payload)
          .select('*')
          .single();

        if (insertError) throw insertError;

        setRows((current) => [data as SubscriptionType, ...current]);
        notifySuccess('Subscription created successfully.');
      }

      setOpen(false);
      setEditing(null);

      // Re-sync with Supabase as well as updating local state immediately.
      await load();
    } catch (err: any) {
      const message = err?.message ?? 'Unable to save subscription.';
      setError(message);
      notifyError(message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: SubscriptionType) {
    if (!confirm(`Delete subscription “${row.name}”?`)) return;

    const { error: deleteError } = await supabase
      .from('subscription_types')
      .delete()
      .eq('id', row.id)
      .eq('organisation_id', activeOrg?.id ?? '');

    if (deleteError) {
      notifyError(deleteError.message);
      return;
    }

    setRows((current) => current.filter((item) => item.id !== row.id));
    notifySuccess('Subscription deleted successfully.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Create the subscription options members can be assigned for a team or season."
        actions={
          <button className="btn-primary" onClick={add}>
            <Plus className="h-4 w-4" />
            New Subscription
          </button>
        }
      />

      {error && !open && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="card h-32 animate-pulse" />
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-3 font-semibold text-slate-900">No subscriptions yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Use New Subscription above to create your first option.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {rows.map((row, index) => {
            const team = teamName(row.team_id);
            const sport = sportName(row.sport_id);
            return (
              <button
                type="button"
                key={row.id}
                onClick={() => edit(row)}
                className={`flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 ${
                  index > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{row.name}</h3>
                    <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {team ? `Team: ${team}` : sport ? `Sport: ${sport}` : 'All sports / teams'}
                    {row.season ? ` · ${row.season}` : ''}
                  </p>
                  {row.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-slate-400">{row.description}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(Number(row.fee), currency)}
                  </p>
                  <p className="text-xs capitalize text-slate-500">
                    per {row.billing_period.replace('_', ' ')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Subscription' : 'New Subscription'}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              {editing && (
                <button
                  type="button"
                  className="btn-ghost text-red-600"
                  onClick={async () => {
                    const row = editing;
                    setOpen(false);
                    await remove(row);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Subscription'}
              </button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {error && (
            <div className="md:col-span-2 rounded bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <FormField label="Subscription name" required className="md:col-span-2">
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Full Time, Part Time, Casual"
            />
          </FormField>

          <FormField label="Description" className="md:col-span-2">
            <TextArea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormField>

          <FormField label="Fee">
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value })}
            />
          </FormField>

          <FormField label="Status">
            <Select
              value={form.is_active ? 'active' : 'inactive'}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.value === 'active' })
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>

          <FormField label="Sport">
            <Select
              value={form.sport_id}
              onChange={(e) =>
                setForm({ ...form, sport_id: e.target.value, team_id: '' })
              }
            >
              <option value="">All sports</option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Team">
            <Select
              value={form.team_id}
              onChange={(e) => setForm({ ...form, team_id: e.target.value })}
            >
              <option value="">All teams in selected scope</option>
              {filteredTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Season">
            <TextInput
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
              placeholder="e.g. 2026/27"
            />
          </FormField>

          <FormField label="Billing period">
            <Select
              value={form.billing_period}
              onChange={(e) => setForm({ ...form, billing_period: e.target.value })}
            >
              <option value="season">Season</option>
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
              <option value="term">Term</option>
              <option value="one_off">One-off</option>
            </Select>
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
