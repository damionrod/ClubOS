import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ReactNode } from 'react';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <div className="card">
        <EmptyState
          icon={<Construction className="h-6 w-6" />}
          title="Coming Soon"
          description={description ?? `The ${title} module is under development and will be available in a future phase of the platform.`}
        />
      </div>
    </div>
  );
}
