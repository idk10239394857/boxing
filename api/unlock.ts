import { looksLikeKey, verifyLicense } from '../server/gumroad';
import { newSession, seal, secretOk, setCookie } from '../server/session';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

const configured = () => secretOk(process.env.ACCESS_SECRET) && !!process.env.GUMROAD_PRODUCT_ID;

/** What the unlock page needs to know: whether the store is connected, and where to buy. */
export function GET() {
  return json(200, { configured: configured(), buyUrl: process.env.GUMROAD_BUY_URL || null });
}

const MESSAGES = {
  invalid: "That key doesn't match a FightFlow purchase. Copy it from your Gumroad receipt.",
  refunded: 'This purchase was refunded or disputed, so the key no longer unlocks FightFlow.',
  ended: 'This membership has ended. Renew it on Gumroad to get back in.',
  limit: 'This key has been used on too many devices. Contact support to reset it.',
  unavailable: "We couldn't reach Gumroad to check your key. Try again in a minute.",
} as const;

/** Check a license key with Gumroad and, if it's a paid, active purchase, hand back the access pass. */
export async function POST(request: Request) {
  if (!configured()) return json(503, { error: 'not_configured', message: 'Purchases are not connected yet.' });

  // Only this site's own unlock page may post here.
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return json(403, { error: 'forbidden' });

  let key = '';
  try {
    const body = (await request.json()) as { licenseKey?: unknown };
    key = typeof body.licenseKey === 'string' ? body.licenseKey.trim() : '';
  } catch {
    return json(400, { error: 'bad_request' });
  }
  if (!looksLikeKey(key)) return json(400, { error: 'invalid', message: MESSAGES.invalid });

  const maxUses = Number(process.env.MAX_ACTIVATIONS ?? 10);
  const verdict = await verifyLicense(key, process.env.GUMROAD_PRODUCT_ID!, { increment: true, maxUses });
  if (!verdict.ok) {
    const status = verdict.reason === 'unavailable' ? 503 : verdict.reason === 'invalid' ? 401 : 403;
    return json(status, { error: verdict.reason, message: MESSAGES[verdict.reason] });
  }
  const token = await seal(newSession(key, verdict.sale), process.env.ACCESS_SECRET!);
  return json(200, { ok: true }, { 'set-cookie': setCookie(token) });
}
