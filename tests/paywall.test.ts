import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { POST as checkout } from '../api/checkout';
import { GET as checkoutReturn } from '../api/checkout-return';
import { GET as entitlement } from '../api/entitlement';
import { POST as portal } from '../api/portal';
import { GET as restoreLink, POST as restore } from '../api/restore';
import { COOKIE, newPass, open, RECHECK_MS, seal } from '../server/session';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const ORIGIN = 'https://fightflow.example';
const realFetch = globalThis.fetch;

/** A stand-in for Stripe (and Resend): routes by URL, records every call. */
function fakeStripe(routes: Record<string, (body: URLSearchParams, url: URL) => [number, unknown]>) {
  const calls: { url: URL; body: URLSearchParams; auth: string | null }[] = [];
  globalThis.fetch = (async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const body = new URLSearchParams(typeof init?.body === 'string' || init?.body instanceof URLSearchParams ? String(init.body) : '');
    calls.push({ url, body, auth: new Headers(init?.headers).get('authorization') });
    const key = Object.keys(routes).find((k) => `${init?.method ?? 'GET'} ${url.hostname}${url.pathname}`.startsWith(k));
    if (!key) return new Response(JSON.stringify({ error: { message: 'no route' } }), { status: 404 });
    const [status, data] = routes[key](body, url);
    return new Response(JSON.stringify(data), { status });
  }) as typeof fetch;
  return calls;
}

const PRICES = {
  'GET api.stripe.com/v1/prices/price_month': () => [200, { id: 'price_month', unit_amount: 999, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } }],
  'GET api.stripe.com/v1/prices/price_year': () => [200, { id: 'price_year', unit_amount: 7999, currency: 'usd', recurring: { interval: 'year', interval_count: 1 } }],
} as const;

beforeEach(() => {
  Object.assign(process.env, { ACCESS_SECRET: SECRET, STRIPE_SECRET_KEY: 'sk_test_123', STRIPE_PRICE_MONTHLY: 'price_month', STRIPE_PRICE_YEARLY: 'price_year', SITE_URL: ORIGIN });
  for (const k of ['STRIPE_TRIAL_DAYS', 'RESEND_API_KEY', 'RESTORE_FROM_EMAIL']) delete process.env[k];
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const get = (path: string, cookie?: string) => new Request(`${ORIGIN}${path}`, { headers: cookie ? { cookie: `${COOKIE}=${cookie}` } : {} });
const post = (path: string, body: unknown, { origin = ORIGIN, cookie }: { origin?: string; cookie?: string } = {}) =>
  new Request(`${ORIGIN}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin, ...(cookie ? { cookie: `${COOKIE}=${cookie}` } : {}) }, body: JSON.stringify(body) });
const tokenFrom = (res: Response) => res.headers.get('set-cookie')!.split(';')[0].slice(COOKIE.length + 1);

test('a new visitor is locked and sees live Stripe prices; nothing secret is in the reply', async () => {
  fakeStripe(PRICES);
  const res = await entitlement(get('/api/entitlement'));
  const body = await res.json();
  assert.equal(body.active, false);
  assert.deepEqual(body.plans.map((p: { plan: string; amount: number }) => [p.plan, p.amount]), [['monthly', 999], ['yearly', 7999]]);
  assert.ok(!JSON.stringify(body).includes('sk_test'));
});

test('fails closed when Stripe or the secret is not configured', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  assert.deepEqual(await (await entitlement(get('/api/entitlement'))).json(), { active: false, configured: false, plans: [] });
  assert.equal((await checkout(post('/api/checkout', { plan: 'monthly' }))).status, 503);
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.ACCESS_SECRET = 'short';
  assert.equal((await (await entitlement(get('/api/entitlement'))).json()).configured, false);
});

test('checkout creates a subscription session server-side with the secret key', async () => {
  process.env.STRIPE_TRIAL_DAYS = '7';
  const calls = fakeStripe({ 'POST api.stripe.com/v1/checkout/sessions': () => [200, { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }] });
  const res = await checkout(post('/api/checkout', { plan: 'yearly' }));
  assert.deepEqual(await res.json(), { url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
  const b = calls[0].body;
  assert.equal(calls[0].auth, 'Bearer sk_test_123');
  assert.equal(b.get('mode'), 'subscription');
  assert.equal(b.get('line_items[0][price]'), 'price_year');
  assert.equal(b.get('subscription_data[trial_period_days]'), '7');
  assert.equal(b.get('success_url'), `${ORIGIN}/api/checkout-return?session_id={CHECKOUT_SESSION_ID}`);
  assert.equal((await checkout(post('/api/checkout', { plan: 'lifetime' }))).status, 400);
  assert.equal((await checkout(post('/api/checkout', { plan: 'monthly' }, { origin: 'https://evil.example' }))).status, 403);
});

test('returning from Stripe unlocks only a completed checkout with a live subscription', async () => {
  fakeStripe({
    'GET api.stripe.com/v1/checkout/sessions/cs_paid': () => [200, { id: 'cs_paid', status: 'complete', customer: 'cus_1', subscription: { id: 'sub_1', status: 'active', customer: 'cus_1' } }],
    'GET api.stripe.com/v1/checkout/sessions/cs_open': () => [200, { id: 'cs_open', status: 'open', customer: null, subscription: null }],
    'GET api.stripe.com/v1/checkout/sessions/cs_unpaid': () => [200, { id: 'cs_unpaid', status: 'complete', customer: 'cus_2', subscription: { id: 'sub_2', status: 'incomplete', customer: 'cus_2' } }],
  });
  const ok = await checkoutReturn(get('/api/checkout-return?session_id=cs_paid'));
  assert.equal(ok.headers.get('location'), '/?welcome=1');
  const cookie = ok.headers.get('set-cookie')!;
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.equal((await open(tokenFrom(ok), 'pass', SECRET))?.sub, 'sub_1');
  for (const id of ['cs_open', 'cs_unpaid', 'cs_missing', '../../evil']) {
    const r = await checkoutReturn(get(`/api/checkout-return?session_id=${encodeURIComponent(id)}`));
    assert.equal(r.headers.get('location'), '/?checkout=failed', id);
    assert.equal(r.headers.get('set-cookie'), null, id);
  }
});

test('a valid pass unlocks without calling Stripe; forged or tampered passes do not', async () => {
  const calls = fakeStripe(PRICES);
  const token = await seal(newPass('cus_1', 'sub_1'), SECRET);
  assert.deepEqual(await (await entitlement(get('/api/entitlement', token))).json(), { active: true, configured: true });
  assert.equal(calls.length, 0);
  const tampered = token.slice(0, -3) + (token.endsWith('AAA') ? 'BBB' : 'AAA');
  const res = await entitlement(get('/api/entitlement', tampered));
  assert.equal((await res.json()).active, false);
  assert.match(res.headers.get('set-cookie') ?? '', /Max-Age=0/);
  assert.equal((await (await entitlement(get('/api/entitlement', await seal(newPass('cus_1', 'sub_1'), SECRET + 'x')))).json()).active, false);
});

test('the daily re-check renews active subscribers, locks cancelled ones, and survives a Stripe outage', async () => {
  const stale = await seal({ ...newPass('cus_1', 'sub_1'), chk: Date.now() - RECHECK_MS - 1000 }, SECRET);
  fakeStripe({ 'GET api.stripe.com/v1/subscriptions/sub_1': () => [200, { id: 'sub_1', status: 'active', customer: 'cus_1' }] });
  const renewed = await entitlement(get('/api/entitlement', stale));
  assert.equal((await renewed.json()).active, true);
  assert.match(renewed.headers.get('set-cookie') ?? '', new RegExp(`^${COOKIE}=`));

  fakeStripe({
    ...PRICES,
    'GET api.stripe.com/v1/subscriptions/sub_1': () => [200, { id: 'sub_1', status: 'canceled', customer: 'cus_1' }],
    'GET api.stripe.com/v1/subscriptions': () => [200, { data: [{ id: 'sub_1', status: 'canceled', customer: 'cus_1' }] }],
  });
  const locked = await entitlement(get('/api/entitlement', stale));
  assert.equal((await locked.json()).active, false);
  assert.match(locked.headers.get('set-cookie') ?? '', /Max-Age=0/);

  globalThis.fetch = (async () => {
    throw new TypeError('down');
  }) as typeof fetch;
  assert.equal((await (await entitlement(get('/api/entitlement', stale))).json()).active, true);
});

test('restore emails a short-lived link only for an active subscriber, and answers the same either way', async () => {
  Object.assign(process.env, { RESEND_API_KEY: 're_test', RESTORE_FROM_EMAIL: 'FightFlow <hi@fightflow.example>' });
  const calls = fakeStripe({
    'GET api.stripe.com/v1/customers': (_b, url) => [200, { data: url.searchParams.get('email') === 'pro@example.com' ? [{ id: 'cus_1' }] : [] }],
    'GET api.stripe.com/v1/subscriptions': () => [200, { data: [{ id: 'sub_1', status: 'active', customer: 'cus_1' }] }],
    'GET api.stripe.com/v1/subscriptions/sub_1': () => [200, { id: 'sub_1', status: 'active', customer: 'cus_1' }],
    'POST api.resend.com/emails': () => [200, { id: 'email_1' }],
  });
  const a = await restore(post('/api/restore', { email: 'Pro@Example.com' }));
  const b = await restore(post('/api/restore', { email: 'nobody@example.com' }));
  assert.deepEqual([a.status, await a.json()], [200, { ok: true }]);
  assert.deepEqual([b.status, await b.json()], [200, { ok: true }]);
  const sentEmails = calls.filter((c) => c.url.hostname === 'api.resend.com');
  assert.equal(sentEmails.length, 1);

  const { seal: s } = await import('../server/session');
  const link = await s({ kind: 'restore', cus: 'cus_1', sub: 'sub_1', exp: Date.now() + 60_000 }, SECRET);
  const used = await restoreLink(get(`/api/restore?token=${encodeURIComponent(link)}`));
  assert.equal(used.headers.get('location'), '/?welcome=1');
  assert.ok(await open(tokenFrom(used), 'pass', SECRET));

  const expired = await s({ kind: 'restore', cus: 'cus_1', sub: 'sub_1', exp: Date.now() - 1 }, SECRET);
  assert.equal((await restoreLink(get(`/api/restore?token=${encodeURIComponent(expired)}`))).headers.get('location'), '/?restore=expired');
  // A pass can't be replayed as a restore link, or the other way round.
  const pass = await seal(newPass('cus_1', 'sub_1'), SECRET);
  assert.equal((await restoreLink(get(`/api/restore?token=${encodeURIComponent(pass)}`))).headers.get('location'), '/?restore=expired');
  assert.equal((await (await entitlement(get('/api/entitlement', link))).json()).active, false);
});

test('the billing portal is only for subscribers', async () => {
  fakeStripe({ 'POST api.stripe.com/v1/billing_portal/sessions': (b) => [200, { url: `https://billing.stripe.com/p/session/${b.get('customer')}` }] });
  assert.equal((await portal(post('/api/portal', {}))).status, 401);
  const token = await seal(newPass('cus_1', 'sub_1'), SECRET);
  assert.deepEqual(await (await portal(post('/api/portal', {}, { cookie: token }))).json(), { url: 'https://billing.stripe.com/p/session/cus_1' });
});
