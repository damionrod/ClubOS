import { useEffect, useState } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { notifySuccess } from '@/lib/notifications';

type Settings = {
  currency: string;
  timezone: string;
  date_format: string;
  financial_year_start: string;
};

export function OrganisationSettings() {
  const { activeOrg } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    currency: 'NZD',
    timezone: 'Pacific/Auckland',
    date_format: 'DD/MM/YYYY',
    financial_year_start: '01-01',
  });
  const [originalCurrency, setOriginalCurrency] = useState('NZD');
  const [transactionCount, setTransactionCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!activeOrg?.id) return;
    (async () => {
      const [settingsRes, txRes] = await Promise.all([
        supabase.from('organisation_settings').select('currency,timezone,date_format,financial_year_start').eq('organisation_id', activeOrg.id).maybeSingle(),
        supabase.from('club_finance_transactions').select('id', { count: 'exact', head: true }).eq('organisation_id', activeOrg.id),
      ]);
      if (settingsRes.data) {
        const loaded = settingsRes.data as Settings;
        setSettings(loaded);
        setOriginalCurrency(loaded.currency || 'NZD');
      }
      setTransactionCount(txRes.count ?? 0);
    })();
  }, [activeOrg?.id]);

  const currencyChanging = settings.currency !== originalCurrency;

  async function save() {
    if (!activeOrg?.id) return;
    if (currencyChanging && transactionCount > 0) {
      const ok = window.confirm(
        `This organisation already has ${transactionCount} financial transaction${transactionCount === 1 ? '' : 's'}. Changing the currency will NOT convert historical amounts. Continue?`,
      );
      if (!ok) return;
    }
    setSaving(true);
    setMessage('');
    const { error } = await supabase.from('organisation_settings').upsert({
      organisation_id: activeOrg.id,
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organisation_id' });
    setSaving(false);
    if (error) setMessage(error.message);
    else {
      setOriginalCurrency(settings.currency);
      setMessage('Organisation settings saved.'); notifySuccess('Organisation settings saved.');
    }
  }

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Organisation Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Configure regional and financial defaults for {activeOrg?.trading_name}.</p>
    </div>

    <div className="card max-w-3xl p-6 space-y-5">
      <div>
        <label className="label">Organisation currency</label>
        <select className="input" value={settings.currency} onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}>
          {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>)}
        </select>
        <p className="mt-1 text-xs text-slate-500">Used for membership fees, events, donations, merchandise, invoices, fees and financial reports.</p>
      </div>

      {currencyChanging && transactionCount > 0 && <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div><strong>Historical transactions will not be converted.</strong> Existing amounts remain as recorded. Change the organisation currency only if you understand the reporting impact.</div>
      </div>}

      <div className="grid gap-4 md:grid-cols-2">
        <label><span className="label">Timezone</span><input className="input" value={settings.timezone} onChange={e => setSettings(s => ({ ...s, timezone: e.target.value }))} /></label>
        <label><span className="label">Date format</span><select className="input" value={settings.date_format} onChange={e => setSettings(s => ({ ...s, date_format: e.target.value }))}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></label>
        <label><span className="label">Financial year start</span><input className="input" value={settings.financial_year_start} onChange={e => setSettings(s => ({ ...s, financial_year_start: e.target.value }))} placeholder="01-01" /></label>
      </div>

      <button className="btn-primary inline-flex items-center gap-2" disabled={saving} onClick={save}><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save settings'}</button>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  </div>;
}
