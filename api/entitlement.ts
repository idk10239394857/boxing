import { json } from '../server/http';
import { clearCookie, newPass, open, readCookie, RECHECK_MS, seal, secretOk, setCookie, type Pass } from '../server/session';
import { activeSubscription, entitled, PLANS, priceFor, stripe, type Price, type Subscription } from '../server/stripe';

export const configured = () => secretOk(process.env.ACCESS_SECRET) && !!process.env.STRIPE_SECRET_KEY && PLANS.some((p) => priceFor(p));

/** Prices as Stripe has them, so the paywall never shows a stale number. */
async function plans() {
  const out = [];
  for (const plan of PLANS) {
    const id = priceFor(plan);
    if (!id) continue;
    try {
      const p = await stripe<Price>(`prices/${id}`);
      out.push({ plan, amount: p.unit_amount ?? 0, currency: p.currency, interval: p.recurring?.interval ?? (plan === 'yearly' ? 'year' : 'month') });
    } catch {
      // A missing price just isn't offered.
    }
  }
  return out;
}

/** Re-confirm a pass with Stripe about once a day; a cancelled or unpaid subscription locks the app. */
async function recheck(pass: Pass, secret: string): Promise<{ pass: Pass | null; cookie?: string }> {
  if (Date.now() - pass.chk < RECHECK_MS) return { pass };
  try {
    const sub = await stripe<Subscription>(`subscriptions/${pass.sub}`);
    const live = entitled(sub.status) ? sub : await activeSubscription(pass.cus);
    if (!live) return { pass: null, cookie: clearCookie() };
    const fresh = { ...newPass(pass.cus, live.id), iat: pass.iat };
    return { pass: fresh, cookie: setCookie(await seal(fresh, secret)) };
  } catch {
    // Stripe unreachable: never lock out a paying subscriber over it.
    return { pass };
  }
}

/** Is this device unlocked? If not, what can it buy? */
export async function GET(request: Request) {
  if (!configured()) return json(200, { active: false, configured: false, plans: [] });
  const secret = process.env.ACCESS_SECRET!;
  const token = readCookie(request);
  const opened = token ? await open(token, 'pass', secret) : null;
  const { pass, cookie } = opened ? await recheck(opened, secret) : { pass: null, cookie: token ? clearCookie() : undefined };
  const headers: Record<string, string> = cookie ? { 'set-cookie': cookie } : {};
  if (pass) return json(200, { active: true, configured: true }, headers);
  return json(
    200,
    {
      active: false,
      configured: true,
      plans: await plans(),
      trialDays: Number(process.env.STRIPE_TRIAL_DAYS ?? 0) || 0,
      restore: !!(process.env.RESEND_API_KEY && process.env.RESTORE_FROM_EMAIL),
    },
    headers,
  );
}
