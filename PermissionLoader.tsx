import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { loadPermissions, clearPermissionCache } from '@/lib/permissions';

export function PermissionLoader({ children }: { children: ReactNode }) {
  const { user, activeOrg, activeRole } = useAuth();

  useEffect(() => {
    if (!user || !activeOrg) return;
    clearPermissionCache();
    const roleIds: string[] = [];
    if (activeRole) roleIds.push(activeRole.id);

    (async () => {
      const { data } = await supabase.from('user_roles').select('role_id').eq('organisation_id', activeOrg.id).eq('user_id', user.id);
      if (data) {
        for (const r of data) {
          if (r.role_id && !roleIds.includes(r.role_id)) roleIds.push(r.role_id);
        }
      }
      await loadPermissions(activeOrg.id, roleIds);
    })();
  }, [user, activeOrg, activeRole]);

  return <>{children}</>;
}
