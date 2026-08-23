import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Link } from 'react-router-dom';
import { Trophy, Plus, Users } from 'lucide-react';
import type { Team } from '@/types/database';

export function TeamsPage() {
  const { activeOrg } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrg) return;
    supabase.from('teams').select('*, sports(name)').eq('organisation_id', activeOrg.id).eq('is_archived', false).order('name').then(({ data }) => {
      setTeams(data as unknown as Team[] ?? []);
      setLoading(false);
    });
  }, [activeOrg]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description={`${teams.length} teams`}
        actions={<button className="btn-primary"><Plus className="h-4 w-4" /> New Team</button>}
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-32 animate-pulse" />)}</div>
      ) : teams.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Trophy className="h-6 w-6" />} title="No teams yet" description="Create your first team to start managing players and team fees." action={<button className="btn-primary"><Plus className="h-4 w-4" /> New Team</button>} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <div key={t.id} className="card-hover p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{t.name}</h3>
                    <p className="text-xs text-slate-500">{t.sports?.name} · {t.season}</p>
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>
              {t.description && <p className="mt-3 text-sm text-slate-500">{t.description}</p>}
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Users className="h-4 w-4" /> View players
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
