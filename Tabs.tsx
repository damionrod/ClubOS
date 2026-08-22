import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
  tabs: { id: string; label: string; icon?: ReactNode; visible?: boolean }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  const visibleTabs = tabs.filter((t) => t.visible !== false);
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-slate-200 scrollbar-thin', className)}>
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
            active === tab.id
              ? 'border-primary-700 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function useTabs(defaultTab: string) {
  const [active, setActive] = useState(defaultTab);
  return { active, setActive };
}
