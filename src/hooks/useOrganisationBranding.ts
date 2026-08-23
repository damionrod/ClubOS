import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { OrganisationBranding } from '@/types/database';

export function useOrganisationBranding(organisationId?: string | null) {
  const [branding, setBranding] = useState<OrganisationBranding | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!organisationId) {
      setBranding(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('organisation_branding')
      .select('*')
      .eq('organisation_id', organisationId)
      .maybeSingle();
    if (error) console.error('Branding load error:', error);
    setBranding((data as OrganisationBranding | null) ?? null);
    setLoading(false);
  }, [organisationId]);

  useEffect(() => {
    load();
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ organisationId?: string }>).detail;
      if (!detail?.organisationId || detail.organisationId === organisationId) load();
    };
    window.addEventListener('clubos-branding-updated', handler);
    return () => window.removeEventListener('clubos-branding-updated', handler);
  }, [load, organisationId]);

  return { branding, loading, refresh: load };
}
