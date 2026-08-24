import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, ShieldCheck, Users, Vote } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';

interface Motion {
  id:string; title:string; description:string|null; voting_audience:string; voting_method:string;
  majority_percent:number; quorum_percent:number; opens_at:string; closes_at:string|null; status:string;
  my_choice:string|null; total_votes:number; yes_votes:number; no_votes:number; abstain_votes:number;
}

export function MemberVoting() {
  const { activeOrg, user } = useAuth();
  const [motions,setMotions]=useState<Motion[]>([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(''); const [message,setMessage]=useState(''); const [error,setError]=useState('');
  async function load(){ if(!activeOrg){setLoading(false);return;} setLoading(true); setError(''); const {data,error}=await supabase.rpc('get_my_voting_motions',{p_org_id:activeOrg.id}); if(error){setError(error.message);setMotions([]);} else setMotions((data??[]) as Motion[]); setLoading(false); }
  useEffect(()=>{load();},[activeOrg?.id]);
  const pending=useMemo(()=>motions.filter(m=>m.status==='open'&&!m.my_choice&&(!m.closes_at||new Date(m.closes_at)>new Date())).length,[motions]);
  async function vote(motion:Motion,choice:'yes'|'no'|'abstain'){
    if(!activeOrg||!user)return; setSaving(motion.id);setMessage('');setError('');
    const {error}=await supabase.rpc('cast_motion_vote',{p_motion_id:motion.id,p_choice:choice});
    if(error)setError(error.message); else {setMessage(m.my_choice ? 'Your vote has been updated.' : 'Your vote has been recorded.'); await load();}
    setSaving('');
  }
  return <div className="space-y-6">
    <PageHeader title="Voting" description={pending?`${pending} vote${pending===1?'':'s'} waiting for you`:'You have no pending votes'} />
    {message&&<div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-800">{message}</div>}{error&&<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {loading?<div className="card h-36 animate-pulse"/>:motions.length===0?<div className="card p-8 text-center"><Vote className="mx-auto h-10 w-10 text-slate-300"/><h3 className="mt-3 font-semibold">No motions available</h3><p className="mt-1 text-sm text-slate-500">When a motion opens that you are eligible to vote on, it will appear here.</p></div>:
    <div className="space-y-4">{motions.map(m=>{const open=m.status==='open'&&(!m.closes_at||new Date(m.closes_at)>new Date());return <div key={m.id} className={`card p-5 ${open&&!m.my_choice?'ring-2 ring-primary-200':''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="font-semibold text-slate-900">{m.title}</h3>{open&&!m.my_choice&&<span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Vote required</span>}</div><p className="mt-2 text-sm text-slate-600">{m.description}</p></div>{m.my_choice&&<span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"><CheckCircle2 className="h-3.5 w-3.5"/> Voted: {m.my_choice}</span>}</div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500"><span className="flex items-center gap-1">{m.voting_audience==='committee_only'?<ShieldCheck className="h-4 w-4"/>:<Users className="h-4 w-4"/>}{m.voting_audience==='committee_only'?'Committee members only':'All eligible members'}</span><span className="flex items-center gap-1"><Clock3 className="h-4 w-4"/>{m.closes_at?`Closes ${new Date(m.closes_at).toLocaleString('en-NZ',{dateStyle:'medium',timeStyle:'short'})}`:'No closing date'}</span><span>{m.voting_method==='secret'?'Secret ballot':'Named ballot'}</span></div>
      {open ? (
        <div className="mt-5">
          {m.my_choice && (
            <p className="mb-3 text-xs text-slate-500">
              You can change your vote while this motion is open. Your latest selection replaces your previous vote.
            </p>
          )}
          <div className="grid grid-cols-3 gap-2">
            <button
              disabled={saving===m.id}
              onClick={()=>vote(m,'yes')}
              className={m.my_choice==='yes' ? 'btn-primary justify-center' : 'btn-secondary justify-center'}
            >
              {m.my_choice==='yes' ? '✓ Yes' : 'Yes'}
            </button>
            <button
              disabled={saving===m.id}
              onClick={()=>vote(m,'no')}
              className={m.my_choice==='no' ? 'btn-primary justify-center' : 'btn-secondary justify-center'}
            >
              {m.my_choice==='no' ? '✓ No' : 'No'}
            </button>
            <button
              disabled={saving===m.id}
              onClick={()=>vote(m,'abstain')}
              className={m.my_choice==='abstain' ? 'btn-primary justify-center' : 'btn-secondary justify-center'}
            >
              {m.my_choice==='abstain' ? '✓ Abstain' : 'Abstain'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          {m.my_choice && (
            <p className="mb-3 text-xs font-medium text-slate-600">
              Final vote: {m.my_choice}. Voting is closed and can no longer be changed.
            </p>
          )}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded bg-slate-50 p-2"><b className="block text-base text-slate-900">{m.yes_votes}</b>Yes</div>
            <div className="rounded bg-slate-50 p-2"><b className="block text-base text-slate-900">{m.no_votes}</b>No</div>
            <div className="rounded bg-slate-50 p-2"><b className="block text-base text-slate-900">{m.abstain_votes}</b>Abstain</div>
          </div>
        </div>
      )}
    </div>})}</div>}
  </div>;
}
