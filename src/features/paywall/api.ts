/**
 * Calls to FightFlow's own server (Vercel functions in /api). The browser only ever talks to
 * these; Stripe keys and checks stay on the server.
 */
export type PlanId = 'monthly' | 'yearly';
export interface PlanInfo {
  plan: PlanId;
  /** Smallest currency unit, as Stripe reports it. */
  amount: number;
  currency: string;
  interval: string;
}
export type Entitlement =
  | { active: true; configured: true }
  | { active: false; configured: boolean; plans: PlanInfo[]; trialDays?: number; restore?: boolean };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data as { message?: string }).message ?? `Request failed (${res.status})`), { status: res.status });
  return data as T;
}
const post = <T>(path: string, body: unknown = {}) =>
  call<T>(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export const getEntitlement = () => call<Entitlement>('/api/entitlement');
export const startCheckout = (plan: PlanId) => post<{ url: string }>('/api/checkout', { plan });
export const requestRestore = (email: string) => post<{ ok: true }>('/api/restore', { email });
export const openPortal = () => post<{ url: string }>('/api/portal');

export function formatPrice(amount: number, currency: string) {
  const value = amount / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: value % 1 ? 2 : 0 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/** Messages carried back in the URL from Stripe, the restore link or sign-out, read once. */
export function takeReturnNotice(): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  const q = new URLSearchParams(window.location.search);
  const notice =
    q.get('checkout') === 'cancelled' ? 'Checkout cancelled. You were not charged.'
    : q.get('checkout') === 'failed' ? "We couldn't confirm that payment. If you were charged, use Restore purchase."
    : q.get('restore') === 'expired' ? 'That sign-in link expired. Ask for a new one below.'
    : q.get('restore') === 'failed' ? "We couldn't find an active membership for that link."
    : q.get('welcome') ? 'welcome'
    : null;
  if (notice) {
    for (const k of ['checkout', 'restore', 'welcome']) q.delete(k);
    const rest = q.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);
  }
  return notice;
}
