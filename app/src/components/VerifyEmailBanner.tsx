import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { resendVerification } from '../lib/api';

/**
 * Soft email-verification prompt. Renders nothing once the address is confirmed
 * (or for signed-out visitors) — the account stays fully usable either way.
 */
export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (!user || user.emailVerified !== false) return null;

  async function resend() {
    setState('sending');
    try {
      await resendVerification();
      setState('sent');
    } catch {
      setState('error');
    }
  }

  return (
    <div
      className="rounded-xl px-4 py-3.5 mb-6 flex items-center gap-3 flex-wrap"
      style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
    >
      <p className="text-sm font-medium flex-1" style={{ color: '#92400e', minWidth: 200 }}>
        {state === 'sent'
          ? <>Confirmation email sent to <strong>{user.email}</strong>.</>
          : <>Please confirm <strong>{user.email}</strong> to secure your account.</>}
      </p>
      {state !== 'sent' && (
        <button
          type="button"
          onClick={resend}
          disabled={state === 'sending'}
          className="text-xs font-bold px-3 py-2 rounded-lg"
          style={{ background: '#f59e0b', color: '#fff', opacity: state === 'sending' ? 0.7 : 1 }}
        >
          {state === 'sending' ? 'Sending…' : 'Resend email'}
        </button>
      )}
      {state === 'error' && (
        <span className="text-xs font-semibold" style={{ color: '#b91c1c' }}>Couldn&apos;t send — try again later.</span>
      )}
    </div>
  );
}
