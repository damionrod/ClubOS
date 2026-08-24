import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { TextInput, FormField, Select } from '@/components/ui/FormField';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type SignupOrg = { id: string; trading_name: string; country: string };
type SignupTeam = { id: string; name: string; season: string | null };
type SignupSubscription = { id:string; name:string; fee:number; billing_period:string; season:string|null };

export function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organisations, setOrganisations] = useState<SignupOrg[]>([]);
  const [teams, setTeams] = useState<SignupTeam[]>([]);
  const [subscriptions,setSubscriptions]=useState<SignupSubscription[]>([]);
  const [organisationId, setOrganisationId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [subscriptionTypeId,setSubscriptionTypeId]=useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.rpc('get_signup_organisations').then(({ data, error }) => {
      if (error) return setError(error.message);
      const rows = (data ?? []) as SignupOrg[];
      setOrganisations(rows);
      if (rows.length === 1) setOrganisationId(rows[0].id);
    });
  }, []);

  useEffect(() => {
    setTeamId(''); setSubscriptionTypeId(''); setSubscriptions([]); setTeams([]);
    if (!organisationId) return;
    supabase.rpc('get_signup_teams', { p_org_id: organisationId }).then(({ data, error }) => {
      if (error) return setError(error.message);
      setTeams((data ?? []) as SignupTeam[]);
    });
  }, [organisationId]);

  useEffect(()=>{
    setSubscriptionTypeId(''); setSubscriptions([]);
    if(!organisationId||!teamId) return;
    supabase.rpc('get_signup_team_subscriptions',{p_org_id:organisationId,p_team_id:teamId}).then(({data,error})=>{
      if(error) return setError(error.message);
      const rows=(data??[]) as SignupSubscription[]; setSubscriptions(rows); if(rows.length===1)setSubscriptionTypeId(rows[0].id);
    });
  },[organisationId,teamId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (!organisationId) return setError('Please select your organisation');
    if(teamId && subscriptions.length>0 && !subscriptionTypeId) return setError('Please select your subscription for this team and season');
    setLoading(true);
    const { error: signUpError } = await signUp(email.trim(), password, firstName.trim(), lastName.trim(), organisationId, teamId || undefined, subscriptionTypeId || undefined);
    if (signUpError) { setError(signUpError); setLoading(false); } else navigate('/login');
  }

  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50/30 px-4 py-8"><div className="w-full max-w-md"><div className="mb-8 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-700 text-white shadow-lg"><ShieldCheck className="h-7 w-7" /></div><h1 className="text-2xl font-bold text-slate-900">ClubOS</h1><p className="mt-1 text-sm text-slate-500">Create your member account</p></div><div className="card p-8"><form onSubmit={handleSubmit} className="space-y-4">
    <FormField label="Organisation" required><Select required value={organisationId} onChange={e=>setOrganisationId(e.target.value)}><option value="">Select organisation</option>{organisations.map(o=><option key={o.id} value={o.id}>{o.trading_name} · {o.country}</option>)}</Select></FormField>
    <FormField label="Team" helpText="Choose the team you are joining for this season."><Select value={teamId} onChange={e=>setTeamId(e.target.value)} disabled={!organisationId}><option value="">No team selected</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}{t.season?` · ${t.season}`:''}</option>)}</Select></FormField>
    {teamId&&<FormField label="Subscription" required={subscriptions.length>0} helpText="Choose how you are participating this season, e.g. Full Time, Part Time or Casual."><Select value={subscriptionTypeId} onChange={e=>setSubscriptionTypeId(e.target.value)}><option value="">Select subscription</option>{subscriptions.map(s=><option key={s.id} value={s.id}>{s.name} · {Number(s.fee).toFixed(2)}{s.season?` · ${s.season}`:''}</option>)}</Select></FormField>}
    <div className="grid grid-cols-2 gap-4"><FormField label="First Name" required><TextInput required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" /></FormField><FormField label="Last Name" required><TextInput required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" /></FormField></div>
    <FormField label="Email" required><TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></FormField><FormField label="Password" required helpText="At least 6 characters"><TextInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></FormField>
    {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}<button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating account...' : 'Create Account'}</button>
  </form><p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-medium text-primary-700 hover:text-primary-800">Sign in</Link></p></div></div></div>;
}
