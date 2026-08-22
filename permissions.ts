import { supabase } from './supabase';
import type { AccessLevel, RoleModuleAccess, Permission } from '@/types/database';

interface PermissionCache {
  orgId: string;
  moduleAccess: Record<string, AccessLevel>;
  permissions: Set<string>;
}

let cache: PermissionCache | null = null;

export async function loadPermissions(orgId: string, roleIds: string[]): Promise<PermissionCache> {
  if (cache && cache.orgId === orgId) return cache;

  const moduleAccess: Record<string, AccessLevel> = {};
  const permissions = new Set<string>();

  if (roleIds.length > 0) {
    const { data: rma } = await supabase
      .from('role_module_access')
      .select('access_level, modules!inner(key)')
      .in('role_id', roleIds);

    for (const item of (rma ?? []) as unknown as RoleModuleAccess[]) {
      const moduleKey = (item as any).modules?.key;
      if (moduleKey) {
        const current = moduleAccess[moduleKey];
        if (!current || rankAccess(item.access_level) > rankAccess(current)) {
          moduleAccess[moduleKey] = item.access_level;
        }
      }
    }

    const { data: perms } = await supabase
      .from('role_permissions')
      .select('permissions!inner(key)')
      .in('role_id', roleIds);

    for (const p of (perms ?? []) as unknown as Permission[]) {
      permissions.add((p as any).permissions?.key);
    }

    const { data: overrides } = await supabase
      .from('user_permission_overrides')
      .select('override_type, permissions!inner(key)')
      .eq('organisation_id', orgId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    for (const o of overrides ?? []) {
      const key = (o as any).permissions?.key;
      if (key) {
        if ((o as any).override_type === 'grant') permissions.add(key);
        else permissions.delete(key);
      }
    }
  }

  cache = { orgId, moduleAccess, permissions };
  return cache;
}

function rankAccess(level: AccessLevel): number {
  switch (level) {
    case 'full_admin': return 4;
    case 'read_only': return 2;
    case 'restricted': return 1;
    default: return 0;
  }
}

export function getModuleAccess(moduleKey: string): AccessLevel {
  if (!cache) return 'no_access';
  return cache.moduleAccess[moduleKey] ?? 'no_access';
}

export function hasPermission(key: string): boolean {
  if (!cache) return false;
  return cache.permissions.has(key);
}

export function hasModuleAccess(moduleKey: string, minLevel: AccessLevel = 'read_only'): boolean {
  const current = getModuleAccess(moduleKey);
  return rankAccess(current) >= rankAccess(minLevel);
}

export function clearPermissionCache() {
  cache = null;
}
