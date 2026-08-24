import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { ImagePlus, Trash2, UploadCloud, Palette, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useOrganisationBranding } from '@/hooks/useOrganisationBranding';
import { notifySuccess } from '@/lib/notifications';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

function storagePathFromPublicUrl(url: string | null) {
  if (!url) return null;
  const marker = '/storage/v1/object/public/organisation-branding/';
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

export function BrandingSettings() {
  const { activeOrg } = useAuth();
  const { branding, loading, refresh } = useOrganisationBranding(activeOrg?.id);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [primaryColour, setPrimaryColour] = useState('#0F766E');
  const [secondaryColour, setSecondaryColour] = useState('#1E293B');
  const [accentColour, setAccentColour] = useState('#F59E0B');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPrimaryColour(branding?.primary_colour ?? '#0F766E');
    setSecondaryColour(branding?.secondary_colour ?? '#1E293B');
    setAccentColour(branding?.accent_colour ?? '#F59E0B');
  }, [branding]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const displayedLogo = previewUrl || branding?.logo_url || null;
  const initials = useMemo(() => activeOrg?.trading_name?.trim()?.[0]?.toUpperCase() || 'C', [activeOrg?.trading_name]);

  function onChooseFile(event: ChangeEvent<HTMLInputElement>) {
    setError('');
    setMessage('');
    const selected = event.target.files?.[0] ?? null;
    if (!selected) return;
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Please choose a PNG, JPG, JPEG, WebP or SVG image.');
      event.target.value = '';
      return;
    }
    if (selected.size > MAX_LOGO_BYTES) {
      setError('Logo file must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function ensureBrandingRow() {
    if (!activeOrg) throw new Error('No active organisation selected.');
    if (branding?.id) return branding.id;
    const { data, error: insertError } = await supabase
      .from('organisation_branding')
      .insert({
        organisation_id: activeOrg.id,
        primary_colour: primaryColour,
        secondary_colour: secondaryColour,
        accent_colour: accentColour,
      })
      .select('id')
      .single();
    if (insertError) throw insertError;
    return data.id as string;
  }

  async function saveBranding() {
    if (!activeOrg) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const brandingId = await ensureBrandingRow();
      let logoUrl = branding?.logo_url ?? null;
      if (file) {
        const extension = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `${activeOrg.id}/logo-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('organisation-branding')
          .upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('organisation-branding').getPublicUrl(path);
        logoUrl = publicData.publicUrl;

        const oldPath = storagePathFromPublicUrl(branding?.logo_url ?? null);
        if (oldPath && oldPath !== path) {
          await supabase.storage.from('organisation-branding').remove([oldPath]);
        }
      }

      const { error: updateError } = await supabase
        .from('organisation_branding')
        .update({
          logo_url: logoUrl,
          primary_colour: primaryColour,
          secondary_colour: secondaryColour,
          accent_colour: accentColour,
          updated_at: new Date().toISOString(),
        })
        .eq('id', brandingId);
      if (updateError) throw updateError;

      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      await refresh();
      window.dispatchEvent(new CustomEvent('clubos-branding-updated', { detail: { organisationId: activeOrg.id } }));
      setMessage('Branding saved successfully.'); notifySuccess('Branding saved successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save branding.');
    } finally {
      setSaving(false);
    }
  }

  async function removeLogo() {
    if (!activeOrg || !branding?.id || !branding.logo_url) return;
    if (!window.confirm('Remove this organisation logo?')) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const path = storagePathFromPublicUrl(branding.logo_url);
      if (path) await supabase.storage.from('organisation-branding').remove([path]);
      const { error: updateError } = await supabase
        .from('organisation_branding')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('id', branding.id);
      if (updateError) throw updateError;
      await refresh();
      window.dispatchEvent(new CustomEvent('clubos-branding-updated', { detail: { organisationId: activeOrg.id } }));
      setMessage('Logo removed.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to remove logo.');
    } finally {
      setSaving(false);
    }
  }

  if (!activeOrg) return <div className="card p-6">Select an organisation first.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Branding</h1>
        <p className="mt-1 text-sm text-slate-500">Manage the logo and brand colours used for {activeOrg.trading_name} across ClubOS.</p>
      </div>

      {(message || error) && (
        <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ? <AlertCircle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
          <span>{error || message}</span>
        </div>
      )}

      <section className="card p-6">
        <div className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-primary-700" />
          <h2 className="text-lg font-semibold text-slate-900">Organisation Logo</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">PNG, JPG, WebP or SVG. Maximum file size 5 MB.</p>

        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white p-3 shadow-sm">
            {displayedLogo ? (
              <img src={displayedLogo} alt={`${activeOrg.trading_name} logo`} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary-700 text-3xl font-bold text-white">{initials}</div>
            )}
          </div>

          <div className="space-y-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800">
              <UploadCloud className="h-4 w-4" />
              {branding?.logo_url ? 'Replace logo' : 'Upload logo'}
              <input type="file" className="hidden" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" onChange={onChooseFile} />
            </label>
            {branding?.logo_url && (
              <button type="button" onClick={removeLogo} disabled={saving} className="ml-2 inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
                <Trash2 className="h-4 w-4" /> Remove logo
              </button>
            )}
            {file && <p className="text-xs text-slate-500">Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary-700" />
          <h2 className="text-lg font-semibold text-slate-900">Brand Colours</h2>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {[
            ['Primary colour', primaryColour, setPrimaryColour],
            ['Secondary colour', secondaryColour, setSecondaryColour],
            ['Accent colour', accentColour, setAccentColour],
          ].map(([label, value, setter]) => (
            <label key={label as string} className="block">
              <span className="text-sm font-medium text-slate-700">{label as string}</span>
              <div className="mt-2 flex items-center gap-2">
                <input type="color" value={value as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1" />
                <input value={value as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase" maxLength={7} />
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900">Preview</h2>
          <p className="mt-1 text-sm text-slate-500">This is how the organisation identity will appear in the portal header.</p>
        </div>
        <div className="flex items-center gap-3 p-6" style={{ borderLeft: `5px solid ${primaryColour}` }}>
          {displayedLogo ? (
            <img src={displayedLogo} alt="Brand preview" className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ backgroundColor: primaryColour }}>{initials}</div>
          )}
          <div>
            <div className="font-semibold text-slate-900">{activeOrg.trading_name}</div>
            <div className="text-sm text-slate-500">ClubOS member & administration portal</div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" disabled={saving || loading} onClick={saveBranding} className="rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Branding'}
        </button>
      </div>
    </div>
  );
}
