import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  children?: ReactNode;
  className?: string;
}

type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'primary';

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-50 text-success-700 ring-success-600/20',
  warning: 'bg-warning-50 text-warning-700 ring-warning-600/20',
  error: 'bg-error-50 text-error-700 ring-error-600/20',
  info: 'bg-primary-50 text-primary-700 ring-primary-600/20',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-600/20',
  primary: 'bg-primary-700 text-white ring-primary-700/20',
};

const statusToVariant: Record<string, BadgeVariant> = {
  active: 'success',
  paid: 'success',
  approved: 'success',
  valid: 'success',
  completed: 'success',
  collected: 'success',
  closed: 'neutral',
  pending: 'warning',
  submitted: 'info',
  under_review: 'info',
  upcoming: 'info',
  due: 'warning',
  overdue: 'error',
  expired: 'error',
  failed: 'error',
  cancelled: 'error',
  rejected: 'error',
  invalid: 'error',
  inactive: 'neutral',
  suspended: 'error',
  resigned: 'neutral',
  archived: 'neutral',
  draft: 'neutral',
  withdrawn: 'neutral',
  deceased: 'neutral',
  applicant: 'info',
  payment_required: 'warning',
  info_required: 'warning',
  ready: 'info',
  past_due: 'warning',
  trial: 'info',
  read_only: 'warning',
};

export function StatusBadge({ status, variant, children, className }: StatusBadgeProps) {
  const v = variant ?? statusToVariant[status.toLowerCase()] ?? 'neutral';
  const label = children ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset capitalize',
        variantStyles[v],
        className,
      )}
    >
      {label}
    </span>
  );
}
