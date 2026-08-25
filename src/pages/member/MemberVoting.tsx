import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, ShieldCheck, Users, Vote } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';

interface Motion {
  id: string;
  title: string;
  description: string | null;
  voting_audience: string;
  voting_method: string;
  majority_percent: number;
  quorum_percent: number;
  opens_at: string;
  closes_at: string | null;
  status: string;
  my_choice: 'yes' | 'no' | 'abstain' | null;
  total_votes: number;
  yes_votes: number;
  no_votes: number;
  abstain_votes: number;
}

const choiceLabel: Record<'yes' | 'no' | 'abstain', string> = {
  yes: 'Yes',
  no: 'No',
  abstain: 'Abstain',
};

export function MemberVoting() {
  const { activeOrg, user } = useAuth();
  const [motions, setMotions] = useState<Motion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'active' | 'past' | 'history'>('active');

  async function load() {
    if (!activeOrg) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data, error } = await supabase.rpc('get_my_voting_motions', {
      p_org_id: activeOrg.id,
    });

    if (error) {
      setError(error.message);
      setMotions([]);
    } else {
      setMotions((data ?? []) as Motion[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [activeOrg?.id]);

  const pending = useMemo(
    () =>
      motions.filter(
        (motion) =>
          motion.status === 'open' &&
          !motion.my_choice &&
          (!motion.closes_at || new Date(motion.closes_at) > new Date()),
      ).length,
    [motions],
  );

  const visibleMotions = useMemo(() => {
    const now = new Date();
    if (tab === 'history') return motions.filter((motion) => !!motion.my_choice);
    if (tab === 'past') {
      return motions.filter(
        (motion) =>
          motion.status !== 'open' ||
          (!!motion.closes_at && new Date(motion.closes_at) <= now),
      );
    }
    return motions.filter(
      (motion) =>
        motion.status === 'open' &&
        (!motion.closes_at || new Date(motion.closes_at) > now),
    );
  }, [motions, tab]);

  async function vote(motion: Motion, choice: 'yes' | 'no' | 'abstain') {
    if (!activeOrg || !user || saving === motion.id) return;

    const previousChoice = motion.my_choice;
    setSaving(motion.id);
    setMessage('');
    setError('');

    // Show the member's choice immediately instead of waiting for a round trip.
    setMotions((current) =>
      current.map((item) =>
        item.id === motion.id ? { ...item, my_choice: choice } : item,
      ),
    );

    const { error } = await supabase.rpc('cast_motion_vote', {
      p_motion_id: motion.id,
      p_choice: choice,
    });

    if (error) {
      // Restore the previous choice if Supabase rejects the vote.
      setMotions((current) =>
        current.map((item) =>
          item.id === motion.id ? { ...item, my_choice: previousChoice } : item,
        ),
      );
      setError(error.message);
      setSaving('');
      return;
    }

    setMessage(
      previousChoice
        ? `Vote changed to ${choiceLabel[choice]}.`
        : `Vote recorded: ${choiceLabel[choice]}.`,
    );

    setSaving('');

    // Re-sync vote totals/current selection from the database.
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voting"
        description={
          pending
            ? `${pending} vote${pending === 1 ? '' : 's'} waiting for you`
            : 'You have no pending votes'
        }
      />

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {([
          ['active', 'Active Motions'],
          ['past', 'Past Motions'],
          ['history', 'Voting History'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium ${
              tab === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card h-36 animate-pulse" />
      ) : visibleMotions.length === 0 ? (
        <div className="card p-8 text-center">
          <Vote className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 font-semibold">
            {tab === 'active' ? 'No active motions' : tab === 'past' ? 'No past motions' : 'No voting history'}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {tab === 'active'
              ? 'There is currently nothing requiring your vote.'
              : tab === 'past'
                ? 'Closed motions will appear here.'
                : 'Motions you have voted on will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleMotions.map((motion) => {
            const open =
              motion.status === 'open' &&
              (!motion.closes_at || new Date(motion.closes_at) > new Date());

            return (
              <div
                key={motion.id}
                className={`card p-5 ${
                  open && !motion.my_choice ? 'ring-2 ring-primary-200' : ''
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{motion.title}</h3>

                      {open && !motion.my_choice && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Vote required
                        </span>
                      )}

                      {motion.my_choice && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          You voted {choiceLabel[motion.my_choice]}
                        </span>
                      )}
                    </div>

                    {motion.description && (
                      <p className="mt-2 text-sm text-slate-600">{motion.description}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    {motion.voting_audience === 'committee_only' ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                    {motion.voting_audience === 'committee_only'
                      ? 'Committee members only'
                      : 'All eligible members'}
                  </span>

                  <span className="flex items-center gap-1">
                    <Clock3 className="h-4 w-4" />
                    {motion.closes_at
                      ? `Closes ${new Date(motion.closes_at).toLocaleString('en-NZ', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}`
                      : 'No closing date'}
                  </span>

                  <span>
                    {motion.voting_method === 'secret' ? 'Secret ballot' : 'Named ballot'}
                  </span>
                </div>

                {open ? (
                  <div className="mt-5">
                    {motion.my_choice && (
                      <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        Current vote: <strong>{choiceLabel[motion.my_choice]}</strong>.
                        You can change it until voting closes.
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {(['yes', 'no', 'abstain'] as const).map((choice) => {
                        const selected = motion.my_choice === choice;
                        return (
                          <button
                            key={choice}
                            type="button"
                            disabled={saving === motion.id}
                            onClick={() => vote(motion, choice)}
                            className={
                              selected
                                ? 'btn-primary min-h-12 justify-center text-base'
                                : 'btn-secondary min-h-12 justify-center text-base'
                            }
                          >
                            {selected ? `✓ ${choiceLabel[choice]}` : choiceLabel[choice]}
                          </button>
                        );
                      })}
                    </div>

                    {saving === motion.id && (
                      <p className="mt-2 text-center text-xs text-slate-500">
                        Saving your vote…
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-5">
                    {motion.my_choice && (
                      <div className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                        Final vote: {choiceLabel[motion.my_choice]}. Voting is closed.
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded bg-slate-50 p-2">
                        <b className="block text-base text-slate-900">{motion.yes_votes}</b>
                        Yes
                      </div>
                      <div className="rounded bg-slate-50 p-2">
                        <b className="block text-base text-slate-900">{motion.no_votes}</b>
                        No
                      </div>
                      <div className="rounded bg-slate-50 p-2">
                        <b className="block text-base text-slate-900">
                          {motion.abstain_votes}
                        </b>
                        Abstain
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
