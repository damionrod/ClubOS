import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function usePendingVotes(organisationId?: string) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!organisationId) { setCount(0); return; }
    const { data, error } = await supabase.rpc('get_pending_motion_count', { p_org_id: organisationId });
    if (!error) setCount(Number(data ?? 0));
  }, [organisationId]);

  useEffect(() => {
    refresh();
    if (!organisationId) return;
    const channel = supabase.channel(`member-votes-${organisationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'governance_motions', filter: `organisation_id=eq.${organisationId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'governance_motion_votes', filter: `organisation_id=eq.${organisationId}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organisationId, refresh]);

  return { count, refresh };
}
