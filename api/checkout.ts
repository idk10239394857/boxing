import { json, sameOrigin, siteOrigin } from '../server/http';
import { PLANS, priceFor, stripe, StripeError, type CheckoutSession, type Plan } from '../server/stripe';
import { configured } from './entitlement';

/** Start Stripe Checkout for a plan; the browser is sent to the returned Stripe-hosted page. */
export async function POST(request: Request) {
  if (!configured()) return json(503, { error: 'not_configured' });
  if (!sameOrigin(request)) return json(403, { error: 'forbidden' });
  const body = (await request.json().catch(() => ({}))) as { plan?: string };
  const plan = body.plan as Plan;
  const price = PLANS.includes(plan) ? priceFor(plan) : undefined;
  if (!price) return json(400, { error: 'unknown_plan' });
  const origin = siteOrigin(request);
  const trial = Number(process.env.STRIPE_TRIAL_DAYS ?? 0) || 0;
  try {
    const session = await stripe<CheckoutSession>(
      'checkout/sessions',
      {
        mode: 'subscription',
        'line_items[0][price]': price,
        'line_items[0][quantity]': 1,
        allow_promotion_codes: true,
        success_url: `${origin}/api/checkout-return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?checkout=cancelled`,
        'subscription_data[trial_period_days]': trial > 0 ? trial : undefined,
      },
      'POST',
    );
    return json(200, { url: session.url });
  } catch (e) {
    return json(e instanceof StripeError && e.status < 500 ? 400 : 503, { error: 'stripe', message: 'Checkout is unavailable right now. Try again in a minute.' });
  }
}
