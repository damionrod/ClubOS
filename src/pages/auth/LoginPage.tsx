import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { TextInput, FormField } from '@/components/ui/FormField';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_platform_admin')
          .eq('id', user.id)
          .maybeSingle();
        if (profileData?.is_platform_admin) {
          navigate('/platform-admin');
        } else {
          navigate('/admin');
        }
      } else {
        navigate('/admin');
      }
      setLoading(false);
    }
  }

  function fillDemo(email: string) {
    setEmail(email);
    setPassword('DemoClub2025!');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-700 text-white shadow-lg">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ClubOS</h1>
          <p className="mt-1 text-sm text-slate-500">Club Management Operating System</p>
        </div>

        <div className="card p-8">
          <h2 className="text-lg font-semibold text-slate-900">Sign In</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your credentials to access your portal</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FormField label="Email" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </FormField>

            <FormField label="Password" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="px-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            {error && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New to ClubOS?{' '}
            <Link to="/signup" className="font-medium text-primary-700 hover:text-primary-800">
              Create an account
            </Link>
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Demo Accounts (password: DemoClub2025!)
          </p>
          <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-600">
            <button onClick={() => fillDemo('owner@demosportsclub.example')} className="flex justify-between rounded px-2 py-1 hover:bg-slate-100">
              <span>Organisation Owner</span>
              <span className="text-slate-400">owner@...</span>
            </button>
            <button onClick={() => fillDemo('secretary@demosportsclub.example')} className="flex justify-between rounded px-2 py-1 hover:bg-slate-100">
              <span>Secretary</span>
              <span className="text-slate-400">secretary@...</span>
            </button>
            <button onClick={() => fillDemo('treasurer@demosportsclub.example')} className="flex justify-between rounded px-2 py-1 hover:bg-slate-100">
              <span>Treasurer</span>
              <span className="text-slate-400">treasurer@...</span>
            </button>
            <button onClick={() => fillDemo('teammanager@demosportsclub.example')} className="flex justify-between rounded px-2 py-1 hover:bg-slate-100">
              <span>Team Manager</span>
              <span className="text-slate-400">teammanager@...</span>
            </button>
            <button onClick={() => fillDemo('readonly@demosportsclub.example')} className="flex justify-between rounded px-2 py-1 hover:bg-slate-100">
              <span>Read Only Admin</span>
              <span className="text-slate-400">readonly@...</span>
            </button>
            <button onClick={() => fillDemo('platform.admin@clubos.example')} className="flex justify-between rounded px-2 py-1 hover:bg-slate-100">
              <span>Platform Admin</span>
              <span className="text-slate-400">platform.admin@...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
