import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { TextInput, FormField, Select } from '@/components/ui/FormField';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type SignupOrg = { id: string; trading_name: string; country: string };

export function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organisations, setOrganisations] = useState<SignupOrg[]>([]);
  const [organisationId, setOrganisationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.rpc('get_signup_organisations').then(({ data, error }) => {
      if (error) {
        setError(error.message);
        return;
      }
      const rows = (data ?? []) as SignupOrg[];
      setOrganisations(rows);
      if (rows.length === 1) setOrganisationId(rows[0].id);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!firstName.trim() || !lastName.trim()) return setError('First name and last name are required.');
    if (!organisationId) return setError('Please select your organisation.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');

    setLoading(true);
    const { error: signUpError } = await signUp(
      email.trim(),
      password,
      firstName.trim(),
      lastName.trim(),
      organisationId
    );

    if (signUpError) {
      setError(signUpError);
      setLoading(false);
      return;
    }

    setSuccess('Account created successfully. You can now sign in.');
    setLoading(false);
    setTimeout(() => navigate('/login'), 1200);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50/30 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-700 text-white shadow-lg">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ClubOS</h1>
          <p className="mt-1 text-sm text-slate-500">Create your member account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Organisation" required>
              <Select required value={organisationId} onChange={(e) => setOrganisationId(e.target.value)}>
                <option value="">Select organisation</option>
                {organisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.trading_name} · {o.country}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Team and subscription are optional and can be selected later after you sign in.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name" required>
                <TextInput required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
              </FormField>
              <FormField label="Last Name" required>
                <TextInput required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" />
              </FormField>
            </div>

            <FormField label="Email" required>
              <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </FormField>

            <FormField label="Password" required helpText="At least 6 characters">
              <TextInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </FormField>

            {error && <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}
            {success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-700 hover:text-primary-800">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
