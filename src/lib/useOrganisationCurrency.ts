import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export function useOrganisationCurrency() {
  const { activeOrg } = useAuth();
  const [currency, setCurrency] = useState('NZD');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeOrg?.id) {
      setCurrency('NZD');
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('organisation_settings')
      .select('currency')
      .eq('organisation_id', activeOrg.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setCurrency(data?.currency || 'NZD');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeOrg?.id]);

  return { currency, loading };
}
