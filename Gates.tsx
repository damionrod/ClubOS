import type { ReactNode } from 'react';
import { hasModuleAccess, hasPermission } from '@/lib/permissions';
import type { AccessLevel } from '@/types/database';
import { EmptyState } from './EmptyState';
import { Lock } from 'lucide-react';

interface ModuleGateProps {
  moduleKey: string;
  minLevel?: AccessLevel;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ModuleGate({ moduleKey, minLevel = 'read_only', children, fallback }: ModuleGateProps) {
  if (!hasModuleAccess(moduleKey, minLevel)) {
    return (
      <>{fallback ?? <NoAccessState moduleName={moduleKey} />}</>
    );
  }
  return <>{children}</>;
}

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, children, fallback }: PermissionGateProps) {
  if (!hasPermission(permission)) {
    return <>{fallback ?? null}</>;
  }
  return <>{children}</>;
}

function NoAccessState({ moduleName }: { moduleName: string }) {
  return (
    <EmptyState
      icon={<Lock className="h-6 w-6" />}
      title="No Access"
      description={`You don't have permission to access the ${moduleName.replace(/_/g, ' ')} module. Contact your organisation administrator if you believe this is an error.`}
    />
  );
}
