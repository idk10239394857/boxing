/**
 * The few Stripe calls the paywall needs, over Stripe's REST API with the secret key from the
 * server environment. Nothing here ever runs in the browser.
 */
export type Plan = 'monthly' | 'yearly';
export const PLANS: Plan[] = ['monthly', 'yearly'];

/** Subscription states that keep the app unlocked (past_due: Stripe is still retrying the card). */
const ENTITLED = new Set(['active', 'trialing', 'past_due']);
export const entitled = (status: string | undefined) => !!status && ENTITLED.has(status);

export class StripeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined>;

export async function stripe<T = Record<string, unknown>>(path: string, params: Params = {}, method: 'GET' | 'POST' = 'GET', fetchImpl: typeof fetch = fetch): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError(503, 'Stripe is not configured');
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.append(k, String(v));
  const url = `https://api.stripe.com/v1/${path}${method === 'GET' && [...body].length ? `?${body}` : ''}`;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method,
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: method === 'POST' ? body : undefined,
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new StripeError(503, 'Stripe is unreachable');
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new StripeError(res.status, data.error?.message ?? `Stripe error ${res.status}`);
  return data;
}

export const priceFor = (plan: Plan) => (plan === 'yearly' ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY);

export interface Price {
  id: string;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: string; interval_count: number } | null;
}
export interface Subscription {
  id: string;
  status: string;
  customer: string;
  cancel_at_period_end?: boolean;
}
export interface CheckoutSession {
  id: string;
  url: string | null;
  status: string;
  customer: string | null;
  subscription: Subscription | string | null;
}

/** The newest subscription of a customer that still grants access, if any. */
export async function activeSubscription(customer: string, fetchImpl?: typeof fetch): Promise<Subscription | null> {
  const list = await stripe<{ data: Subscription[] }>('subscriptions', { customer, status: 'all', limit: 10 }, 'GET', fetchImpl);
  return list.data.find((s) => entitled(s.status)) ?? null;
}
