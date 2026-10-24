import { verifyLicense } from './server/gumroad';
import { clearCookie, COOKIE, open, RECHECK_MS, readCookie, seal, secretOk, SESSION_MS, setCookie } from './server/session';

/*
 * The paywall. Every request for the app (pages, JS bundles, fonts, images) needs a valid access
 * pass; only the unlock page, its assets and the access API are public. Missing configuration
 * fails closed: nothing is served until ACCESS_SECRET is set.
 */
export const config = {
  matcher: ['/((?!api/|unlock|paywall/|favicon.ico).*)'],
};

/** Let the request through (what @vercel/functions' next() does), optionally setting headers. */
const pass = (headers: Record<string, string> = {}) => new Response(null, { headers: { ...headers, 'x-middleware-next': '1' } });

const isPage = (request: Request) =>
  request.method === 'GET' && (request.headers.get('sec-fetch-dest') === 'document' || (request.headers.get('accept') ?? '').includes('text/html'));

function deny(request: Request, reason?: string, clear = false) {
  const headers: Record<string, string> = { 'cache-control': 'no-store' };
  if (clear) headers['set-cookie'] = clearCookie();
  if (!isPage(request)) return new Response('Payment required', { status: 401, headers });
  const url = new URL(request.url);
  const to = new URL('/unlock', url);
  if (url.pathname !== '/') to.searchParams.set('next', url.pathname + url.search);
  if (reason) to.searchParams.set('reason', reason);
  return new Response(null, { status: 307, headers: { ...headers, location: to.pathname + to.search } });
}

export default async function middleware(request: Request) {
  const secret = process.env.ACCESS_SECRET;
  if (!secretOk(secret)) return deny(request);

  const token = readCookie(request, COOKIE);
  const session = token ? await open(token, secret) : null;
  if (!session) return deny(request, undefined, !!token);

  // About once a day, on a page load, ask Gumroad again so refunds and ended memberships lock out.
  const productId = process.env.GUMROAD_PRODUCT_ID;
  const now = Date.now();
  if (productId && isPage(request) && now - session.chk > RECHECK_MS) {
    const verdict = await verifyLicense(session.key, productId, { increment: false });
    if (verdict.ok) {
      const fresh = await seal({ ...session, chk: now, exp: now + SESSION_MS }, secret);
      return pass({ 'set-cookie': setCookie(fresh) });
    }
    // Gumroad being down never locks out a paying customer; a definite "no" does.
    if (verdict.reason !== 'unavailable') return deny(request, 'revoked', true);
  }
  return pass();
}
