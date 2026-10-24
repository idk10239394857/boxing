import { json, sameOrigin, siteOrigin } from '../server/http';
import { open, readCookie, secretOk } from '../server/session';
import { stripe } from '../server/stripe';

/** Stripe's customer portal for this subscriber: change plan, update card, cancel. */
export async function POST(request: Request) {
  const secret = process.env.ACCESS_SECRET;
  if (!secretOk(secret)) return json(503, { error: 'not_configured' });
  if (!sameOrigin(request)) return json(403, { error: 'forbidden' });
  const token = readCookie(request);
  const pass = token ? await open(token, 'pass', secret) : null;
  if (!pass) return json(401, { error: 'not_subscribed' });
  try {
    const s = await stripe<{ url: string }>('billing_portal/sessions', { customer: pass.cus, return_url: `${siteOrigin(request)}/` }, 'POST');
    return json(200, { url: s.url });
  } catch {
    return json(503, { error: 'stripe', message: 'Billing is unavailable right now. Try again in a minute.' });
  }
}
