/**
 * Transactional email via the Resend REST API.
 *
 * Dormant by design: with no RESEND_API_KEY every send is logged and skipped, so
 * registration and other flows keep working before the key is supplied. No extra
 * dependency — this is a plain fetch call.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Where users sign in. The SaaS app, not the marketing site. */
export function appUrl(): string {
  return (process.env.APP_URL || 'https://dev.serpely.com').replace(/\/+$/, '');
}

/** Public base of this API, used for links that must round-trip through the server. */
export function apiPublicUrl(): string {
  return (process.env.API_PUBLIC_URL || 'https://serpely.com').replace(/\/+$/, '');
}

export interface SendResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
  id?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Serpely <no-reply@serpely.com>';

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY unset — skipped "${subject}" to ${to}`);
    return { sent: false, skipped: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      console.error(`[email] Resend rejected "${subject}" to ${to}: ${res.status} ${data.message ?? ''}`);
      return { sent: false, error: data.message || `HTTP ${res.status}` };
    }
    return { sent: true, id: data.id };
  } catch (err) {
    console.error('[email] send failed:', err);
    return { sent: false, error: 'network' };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Confirmation email. The button points at the API, which verifies the token and
 * then redirects the user to the sign-in page — there is no separate landing page.
 */
export function verificationEmail(name: string, verifyLink: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(name);
  const loginLink = `${appUrl()}/login`;
  const subject = 'Confirm your email for Serpely';
  const text = [
    `Hi ${name},`,
    '',
    'Confirm your email address to finish setting up your Serpely account:',
    verifyLink,
    '',
    `The link works for 24 hours. Afterwards you can sign in at ${loginLink}.`,
    '',
    "If you didn't create this account you can ignore this email.",
    '',
    '— Serpely',
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1d21;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e6e8eb;">
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">Confirm your email</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${safeName},</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Confirm your email address to finish setting up your Serpely account.</p>
        <p style="margin:0 0 24px;">
          <a href="${verifyLink}" style="display:inline-block;background:#00C27A;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:10px;">Verify my email</a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#5c6470;">The link works for 24 hours. Afterwards you can sign in at <a href="${loginLink}" style="color:#00C27A;">${loginLink}</a>.</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#5c6470;">If you didn't create this account you can ignore this email.</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
