import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  className?: string;
  lines?: number;
}

export function SkeletonLoader({ className, lines = 1 }: SkeletonLoaderProps) {
  if (lines === 1) {
    return <div className={cn('animate-pulse rounded-md bg-slate-200', className ?? 'h-4 w-full')} />;
  }
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn('animate-pulse rounded-md bg-slate-200', i === lines - 1 ? 'h-4 w-2/3' : 'h-4 w-full')}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden">
      <div className="border-b border-slate-200 pb-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 flex-1 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-b border-slate-100 py-3">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
