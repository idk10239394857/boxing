export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

export const redirect = (location: string, headers: Record<string, string> = {}) =>
  new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store', ...headers } });

/** This site's own origin, from SITE_URL or the request (Vercel sets the forwarded headers). */
export function siteOrigin(request: Request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

/** Only this site's own pages may make state-changing calls. */
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === siteOrigin(request);
}
