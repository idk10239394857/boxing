/**
 * Sealed tokens: JSON encrypted and authenticated with AES-GCM under ACCESS_SECRET. Used for the
 * subscriber's access pass (an HttpOnly cookie) and for short-lived restore links. Changing any
 * byte makes a token fail to open, so they can't be forged or edited without the server's secret.
 */
export const COOKIE = 'ff_pass';
export const PASS_MS = 30 * 24 * 3600 * 1000;
/** How often a pass is re-checked with Stripe, so cancellations and failed payments take effect. */
export const RECHECK_MS = 24 * 3600 * 1000;
export const MIN_SECRET_LENGTH = 32;

/** A subscriber's access pass. */
export interface Pass {
  kind: 'pass';
  /** Stripe customer and subscription. */
  cus: string;
  sub: string;
  /** Issued, last checked with Stripe, expires (ms since epoch). */
  iat: number;
  chk: number;
  exp: number;
}

/** A one-time sign-in link for restoring a purchase on another device. */
export interface RestoreToken {
  kind: 'restore';
  cus: string;
  sub: string;
  exp: number;
}

type Sealed = Pass | RestoreToken;

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

export async function seal(value: Sealed, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(secret), te.encode(JSON.stringify(value))));
  return `${b64url(iv)}.${b64url(ct)}`;
}

/** The value inside `token` if it is intact, of the expected kind and unexpired; otherwise null. */
export async function open<K extends Sealed['kind']>(token: string, kind: K, secret: string, now = Date.now()): Promise<Extract<Sealed, { kind: K }> | null> {
  try {
    const [iv, ct] = token.split('.');
    if (!iv || !ct) return null;
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64url(iv) }, await keyFor(secret), fromB64url(ct));
    const v = JSON.parse(td.decode(plain)) as Sealed;
    if (v.kind !== kind || typeof v.cus !== 'string' || typeof v.exp !== 'number' || v.exp <= now) return null;
    return v as Extract<Sealed, { kind: K }>;
  } catch {
    return null;
  }
}

export const newPass = (cus: string, sub: string, now = Date.now()): Pass => ({ kind: 'pass', cus, sub, iat: now, chk: now, exp: now + PASS_MS });

export const setCookie = (token: string) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${PASS_MS / 1000}`;
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
