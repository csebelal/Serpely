import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { clientLogin } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/profile';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await clientLogin(form.email, form.password);
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed';
      setError(msg);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center mb-6">
            <img src="/Serpely Logo PNG/Serpely - Logo_Logo - Main.png" alt="Serpely" className="h-8 w-auto" />
          </Link>
          <h1 className="font-display text-3xl font-black mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}>Welcome back</h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-soft)' }}>Sign in to your Serpely account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--text-soft)', letterSpacing: '0.06em' }}>Email</label>
              <input
                type="email" required autoFocus
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
                style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: 'var(--text)' }}
                onFocus={e => (e.target.style.borderColor = '#00C27A')}
                onBlur={e => (e.target.style.borderColor = 'hsl(var(--border))')}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--text-soft)', letterSpacing: '0.06em' }}>Password</label>
              <input
                type="password" required
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Your password"
                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
                style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: 'var(--text)' }}
                onFocus={e => (e.target.style.borderColor = '#00C27A')}
                onBlur={e => (e.target.style.borderColor = 'hsl(var(--border))')}
              />
            </div>

            {error && <p className="text-sm font-medium rounded-lg px-4 py-2.5" style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca' }}>{error}</p>}

            <button type="submit" disabled={loading} className="btn-accent-s justify-center py-3 text-sm font-bold mt-1" style={{ width: '100%' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm font-medium mt-6" style={{ color: 'var(--text-soft)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-bold" style={{ color: '#00A868' }}>Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
