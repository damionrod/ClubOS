import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: string; positive: boolean };
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

const accentStyles = {
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  error: 'bg-error-50 text-error-700',
  neutral: 'bg-slate-100 text-slate-700',
};

export function MetricCard({ label, value, icon, trend, accent = 'primary', className }: MetricCardProps) {
  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && (
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', accentStyles[accent])}>
            {icon}
          </div>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      {trend && (
        <p className={cn('mt-1 text-xs font-medium', trend.positive ? 'text-success-600' : 'text-error-600')}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </p>
      )}
    </div>
  );
}
