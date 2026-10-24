/**
 * The access pass: a cookie holding the buyer's license key and sale, sealed with AES-GCM under
 * ACCESS_SECRET. It is HttpOnly (page scripts can't read it) and authenticated (any change makes
 * it fail to open), so it can't be forged or edited without the server's secret.
 */
export const COOKIE = 'ff_access';
export const SESSION_MS = 30 * 24 * 3600 * 1000;
/** How often an open session is re-checked with Gumroad, so refunds take effect. */
export const RECHECK_MS = 24 * 3600 * 1000;
export const MIN_SECRET_LENGTH = 32;

export interface Session {
  /** Gumroad license key. */
  key: string;
  /** Gumroad sale id. */
  sale: string;
  /** Issued, last checked with Gumroad, expires (ms since epoch). */
  iat: number;
  chk: number;
  exp: number;
}

const te = new TextEncoder();
const td = new TextDecoder();

const b64url = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

export const secretOk = (secret: string | undefined): secret is string => !!secret && secret.length >= MIN_SECRET_LENGTH;

async function keyFor(secret: string) {
  const raw = await crypto.subtle.digest('SHA-256', te.encode(secret));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function seal(session: Session, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(secret), te.encode(JSON.stringify(session))));
  return `${b64url(iv)}.${b64url(ct)}`;
}

/** The session inside `token`, or null if it was tampered with, sealed with another secret, or expired. */
export async function open(token: string, secret: string, now = Date.now()): Promise<Session | null> {
  try {
    const [iv, ct] = token.split('.');
    if (!iv || !ct) return null;
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64url(iv) }, await keyFor(secret), fromB64url(ct));
    const s = JSON.parse(td.decode(plain)) as Session;
    if (typeof s.key !== 'string' || typeof s.exp !== 'number' || s.exp <= now) return null;
    return s;
  } catch {
    return null;
  }
}

export const newSession = (key: string, sale: string, now = Date.now()): Session => ({ key, sale, iat: now, chk: now, exp: now + SESSION_MS });

export const setCookie = (token: string) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MS / 1000}`;
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export function readCookie(request: Request, name = COOKIE): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}
