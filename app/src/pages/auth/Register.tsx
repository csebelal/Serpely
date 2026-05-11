import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clientRegister } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { data } = await clientRegister(form.name, form.email, form.password);
      login(data.token, data.user);
      navigate('/profile', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed';
      setError(msg);
    }
    setLoading(false);
  }

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--text-soft)', letterSpacing: '0.06em' }}>{label}</label>
      <input
        type={type} required
        value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
        style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: 'var(--text)' }}
        onFocus={e => (e.target.style.borderColor = '#00C27A')}
        onBlur={e => (e.target.style.borderColor = 'hsl(var(--border))')}
      />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center mb-6">
            <img src="/Serpely Logo PNG/Serpely - Logo_Logo - Main.png" alt="Serpely" className="h-8 w-auto" />
          </Link>
          <h1 className="font-display text-3xl font-black mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}>Create your account</h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-soft)' }}>Start your free Serpely trial — no credit card needed</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {field('Full Name', 'name', 'text', 'Jane Smith')}
            {field('Email', 'email', 'email', 'jane@company.com')}
            {field('Password', 'password', 'password', 'Min 6 characters')}
            {field('Confirm Password', 'confirm', 'password', 'Repeat password')}

            {error && <p className="text-sm font-medium rounded-lg px-4 py-2.5" style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca' }}>{error}</p>}

            <button type="submit" disabled={loading} className="btn-accent-s justify-center py-3 text-sm font-bold mt-1" style={{ width: '100%' }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm font-medium mt-6" style={{ color: 'var(--text-soft)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-bold" style={{ color: '#00A868' }}>Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs mt-4 font-medium" style={{ color: 'var(--text-faint)' }}>
          By creating an account you agree to our{' '}
          <Link to="#" style={{ color: 'var(--text-soft)' }}>Terms of Service</Link> and{' '}
          <Link to="#" style={{ color: 'var(--text-soft)' }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
