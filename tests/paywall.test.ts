import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { GET as config, POST as unlock } from '../api/unlock';
import middleware from '../middleware';
import { looksLikeKey, verifyLicense } from '../server/gumroad';
import { COOKIE, newSession, open, RECHECK_MS, seal } from '../server/session';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const KEY = '85DB562A-C11D4B06-A2335A6B-8C079166';
const realFetch = globalThis.fetch;

/** A stand-in for Gumroad's verify endpoint. */
function gumroad(reply: { status?: number; body?: unknown; fail?: boolean }) {
  const calls: URLSearchParams[] = [];
  const fake = (async (_url: string, init?: RequestInit) => {
    calls.push(new URLSearchParams(String(init?.body)));
    if (reply.fail) throw new TypeError('network down');
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 });
  }) as typeof fetch;
  return { fake, calls };
}
const paid = (extra: Record<string, unknown> = {}, uses = 1) => ({ body: { success: true, uses, purchase: { sale_id: 'sale_1', refunded: false, chargebacked: false, disputed: false, ...extra } } });

beforeEach(() => {
  process.env.ACCESS_SECRET = SECRET;
  process.env.GUMROAD_PRODUCT_ID = 'prod_123';
  process.env.GUMROAD_BUY_URL = 'https://example.gumroad.com/l/fightflow';
  delete process.env.MAX_ACTIVATIONS;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const page = (path = '/', cookie?: string) =>
  new Request(`https://fightflow.example${path}`, { headers: { accept: 'text/html', 'sec-fetch-dest': 'document', ...(cookie ? { cookie: `${COOKIE}=${cookie}` } : {}) } });
const asset = (cookie?: string) => new Request('https://fightflow.example/_expo/static/js/web/entry.js', { headers: cookie ? { cookie: `${COOKIE}=${cookie}` } : {} });
const post = (body: unknown, origin = 'https://fightflow.example') =>
  new Request('https://fightflow.example/api/unlock', { method: 'POST', headers: { 'content-type': 'application/json', origin, host: 'fightflow.example' }, body: JSON.stringify(body) });

test('the access pass round-trips and rejects tampering, other secrets and expiry', async () => {
  const s = newSession(KEY, 'sale_1');
  const token = await seal(s, SECRET);
  assert.deepEqual(await open(token, SECRET), s);
  const flipped = token.slice(0, -2) + (token.endsWith('A') ? 'B' : 'A') + token.slice(-1);
  assert.equal(await open(flipped, SECRET), null);
  assert.equal(await open(token, SECRET + 'x'), null);
  assert.equal(await open(token, SECRET, s.exp + 1), null);
  assert.equal(await open('not-a-token', SECRET), null);
  assert.ok(!token.includes(KEY), 'the key is never readable in the cookie');
});

test('license verdicts: paid, unknown key, refunded, disputed, ended membership, too many devices, Gumroad down', async () => {
  const check = async (reply: Parameters<typeof gumroad>[0], max?: number) => verifyLicense(KEY, 'prod_123', { increment: true, maxUses: max }, gumroad(reply).fake);
  assert.deepEqual(await check(paid()), { ok: true, sale: 'sale_1', uses: 1 });
  assert.deepEqual(await check({ status: 404, body: { success: false, message: 'That license does not exist for the provided product.' } }), { ok: false, reason: 'invalid' });
  assert.deepEqual(await check(paid({ refunded: true })), { ok: false, reason: 'refunded' });
  assert.deepEqual(await check(paid({ disputed: true })), { ok: false, reason: 'refunded' });
  assert.deepEqual((await check(paid({ disputed: true, dispute_won: true }))).ok, true);
  assert.deepEqual(await check(paid({ subscription_ended_at: '2026-10-01' })), { ok: false, reason: 'ended' });
  assert.deepEqual(await check(paid({}, 11), 10), { ok: false, reason: 'limit' });
  assert.deepEqual(await check({ fail: true }), { ok: false, reason: 'unavailable' });
  assert.deepEqual(await check({ status: 502, body: null }), { ok: false, reason: 'unavailable' });
  assert.ok(looksLikeKey(KEY));
  assert.ok(!looksLikeKey('hello'));
});

test('unlock: a paid key gets an HttpOnly, Secure access pass; the product id goes to Gumroad server-side', async () => {
  const g = gumroad(paid());
  globalThis.fetch = g.fake;
  const res = await unlock(post({ licenseKey: KEY }));
  assert.equal(res.status, 200);
  const cookie = res.headers.get('set-cookie')!;
  assert.match(cookie, new RegExp(`^${COOKIE}=`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.equal(g.calls[0].get('product_id'), 'prod_123');
  assert.equal(g.calls[0].get('increment_uses_count'), 'true');
  const token = cookie.split(';')[0].slice(COOKIE.length + 1);
  assert.equal((await open(token, SECRET))?.key, KEY);
});

test('unlock refuses bad keys, refunds, other sites, and fails closed without configuration', async () => {
  globalThis.fetch = gumroad({ status: 404, body: { success: false } }).fake;
  assert.equal((await unlock(post({ licenseKey: KEY }))).status, 401);
  assert.equal((await unlock(post({ licenseKey: 'nope' }))).status, 400);
  globalThis.fetch = gumroad(paid({ refunded: true })).fake;
  const refunded = await unlock(post({ licenseKey: KEY }));
  assert.equal(refunded.status, 403);
  assert.equal(refunded.headers.get('set-cookie'), null);
  assert.equal((await unlock(post({ licenseKey: KEY }, 'https://evil.example'))).status, 403);
  delete process.env.ACCESS_SECRET;
  assert.equal((await unlock(post({ licenseKey: KEY }))).status, 503);
  const c = await config().json();
  assert.equal(c.configured, false);
  assert.equal(c.buyUrl, 'https://example.gumroad.com/l/fightflow');
});

test('middleware: no pass sends pages to /unlock and blocks app files', async () => {
  const r = await middleware(page('/strikes'));
  assert.equal(r.status, 307);
  assert.equal(r.headers.get('location'), '/unlock?next=%2Fstrikes');
  assert.equal((await middleware(asset())).status, 401);
  const forged = await middleware(page('/', 'abc.def'));
  assert.equal(forged.status, 307);
  assert.match(forged.headers.get('set-cookie') ?? '', /Max-Age=0/);
});

test('middleware: a valid pass goes straight through without calling Gumroad', async () => {
  const g = gumroad(paid());
  globalThis.fetch = g.fake;
  const token = await seal(newSession(KEY, 'sale_1'), SECRET);
  const r = await middleware(page('/', token));
  assert.equal(r.headers.get('x-middleware-next'), '1');
  assert.equal((await middleware(asset(token))).headers.get('x-middleware-next'), '1');
  assert.equal(g.calls.length, 0);
});

test('middleware: daily re-check renews a paid pass, revokes a refunded one, and survives Gumroad outages', async () => {
  const old = Date.now() - RECHECK_MS - 1000;
  const stale = await seal({ ...newSession(KEY, 'sale_1'), chk: old }, SECRET);

  const ok = gumroad(paid());
  globalThis.fetch = ok.fake;
  const renewed = await middleware(page('/', stale));
  assert.equal(renewed.headers.get('x-middleware-next'), '1');
  assert.match(renewed.headers.get('set-cookie') ?? '', new RegExp(`^${COOKIE}=`));
  assert.equal(ok.calls[0].get('increment_uses_count'), 'false');

  globalThis.fetch = gumroad(paid({ refunded: true })).fake;
  const revoked = await middleware(page('/', stale));
  assert.equal(revoked.status, 307);
  assert.equal(revoked.headers.get('location'), '/unlock?reason=revoked');
  assert.match(revoked.headers.get('set-cookie') ?? '', /Max-Age=0/);

  globalThis.fetch = gumroad({ fail: true }).fake;
  assert.equal((await middleware(page('/', stale))).headers.get('x-middleware-next'), '1');
});

test('middleware fails closed when ACCESS_SECRET is missing or weak', async () => {
  const token = await seal(newSession(KEY, 'sale_1'), SECRET);
  process.env.ACCESS_SECRET = 'short';
  assert.equal((await middleware(page('/', token))).status, 307);
  delete process.env.ACCESS_SECRET;
  assert.equal((await middleware(asset(token))).status, 401);
});
