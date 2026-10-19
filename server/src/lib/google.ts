import crypto from 'crypto';
import { google } from 'googleapis';
import type { IGoogleConnection } from '../models/GoogleConnection';
import GoogleConnection from '../models/GoogleConnection';

export const GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
];

export function googleEnv(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || 'https://serpely.com/api/google/callback';
  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (see Phase 0 of the plan).'
    );
  }
  return { clientId, clientSecret, redirectUri };
}

function keyFrom(raw: string): Buffer {
  return crypto.createHash('sha256').update('serpely-google-tokens:' + raw).digest();
}

function tokenKey(): Buffer {
  const raw = process.env.GOOGLE_TOKEN_KEY || process.env.JWT_SECRET || '';
  if (!raw) throw new Error('Set GOOGLE_TOKEN_KEY (or JWT_SECRET) to encrypt Google tokens.');
  return keyFrom(raw);
}

// Previous key, used only while rotating GOOGLE_TOKEN_KEY: lets refresh tokens
// encrypted with the old key keep working until users reconnect, then delete
// GOOGLE_TOKEN_KEY_PREVIOUS from .env.
function previousTokenKey(): Buffer | null {
  const raw = process.env.GOOGLE_TOKEN_KEY_PREVIOUS || '';
  return raw ? keyFrom(raw) : null;
}

// AES-256-GCM: iv.cipher.authTag (all hex, joined by '.')
export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', tokenKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}.${enc.toString('hex')}.${cipher.getAuthTag().toString('hex')}`;
}

export function decryptToken(packed: string): string {
  const [ivHex, encHex, tagHex] = (packed || '').split('.');
  if (!ivHex || !encHex || !tagHex) throw new Error('Bad token envelope');
  const keys = [tokenKey(), previousTokenKey()].filter((k): k is Buffer => k !== null);
  let lastError: unknown = null;
  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivHex, 'hex')
      );
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      return Buffer.concat([
        decipher.update(Buffer.from(encHex, 'hex')),
        decipher.final(),
      ]).toString('utf8');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Cannot decrypt token');
}

export function makeOAuthClient() {
  const { clientId, clientSecret, redirectUri } = googleEnv();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Signed, single-use-ish state for the OAuth round-trip (CSRF protection).
export function signState(clientId: string): string {
  const nonce = crypto.randomBytes(12).toString('hex');
  const payload = `${clientId}.${nonce}`;
  const sig = crypto.createHmac('sha256', tokenKey()).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyState(state: string): string | null {
  try {
    const raw = Buffer.from(state, 'base64url').toString('utf8');
    const parts = raw.split('.');
    if (parts.length !== 3) return null;
    const [clientId, nonce, sig] = parts;
    if (!clientId || !nonce || !sig) return null;
    const expect = crypto.createHmac('sha256', tokenKey()).update(`${clientId}.${nonce}`).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
    return clientId;
  } catch {
    return null;
  }
}

export interface GoogleClients {
  auth: InstanceType<typeof google.auth.OAuth2>;
  searchconsole: ReturnType<typeof google.searchconsole>;
  analyticsdata: ReturnType<typeof google.analyticsdata>;
  analyticsadmin: ReturnType<typeof google.analyticsadmin>;
  urlinspection: ReturnType<typeof google.searchconsole>;
}

// Authed API clients for a connection; refreshes the access token as needed
// and persists rotated refresh tokens.
export async function clientsFor(conn: IGoogleConnection): Promise<GoogleClients> {
  const oauth = makeOAuthClient();
  oauth.setCredentials({ refresh_token: decryptToken(conn.refreshTokenEnc) });
  const before = oauth.credentials.refresh_token;
  await oauth.getAccessToken().catch(() => null);
  const after = oauth.credentials.refresh_token;
  if (after && after !== before) {
    conn.refreshTokenEnc = encryptToken(after);
    conn.lastUsedAt = new Date();
    await conn.save().catch(() => null);
  } else {
    GoogleConnection.updateOne({ _id: conn._id }, { lastUsedAt: new Date() }).catch(() => null);
  }
  return {
    auth: oauth,
    searchconsole: google.searchconsole({ version: 'v1', auth: oauth }),
    analyticsdata: google.analyticsdata({ version: 'v1beta', auth: oauth }),
    analyticsadmin: google.analyticsadmin({ version: 'v1beta', auth: oauth }),
    // URL Inspection shares the searchconsole v1 client surface
    urlinspection: google.searchconsole({ version: 'v1', auth: oauth }),
  };
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Pick the GSC property matching one of the user's domains, else first available.
export async function pickGscSite(
  sc: ReturnType<typeof google.searchconsole>,
  domains: string[]
): Promise<{ site: string; all: string[] }> {
  const res = await sc.sites.list().catch(() => null);
  const all = (res?.data?.siteEntry || []).map(s => String(s.siteUrl || '')).filter(Boolean);
  const norm = (s: string) => s.toLowerCase().replace(/^https?:\/\//, '').replace(/^sc-domain:/, '').replace(/\/$/, '');
  for (const d of domains) {
    const hit = all.find(s => {
      const n = norm(s);
      const dn = norm(d);
      return n === dn || n === `www.${dn}` || dn === `www.${n}` || n.endsWith(`/${dn}`) || s === `sc-domain:${dn}` || s === `sc-domain:www.${dn}`;
    });
    if (hit) return { site: hit, all };
  }
  return { site: all[0] || '', all };
}

// First GA4 property with data access (via Admin API account summaries).
export async function pickGaProperty(
  admin: ReturnType<typeof google.analyticsadmin>
): Promise<{ property: string; all: string[] }> {
  const res = await admin.accountSummaries.list({ pageSize: 200 }).catch(() => null);
  const all: string[] = [];
  for (const acc of res?.data?.accountSummaries || []) {
    for (const p of acc.propertySummaries || []) {
      if (p.property) all.push(p.property);
    }
  }
  return { property: all[0] || '', all };
}

export { fmtDate };
