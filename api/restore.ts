import { json, redirect, sameOrigin, siteOrigin } from '../server/http';
import { newPass, open, seal, secretOk, setCookie } from '../server/session';
import { activeSubscription, entitled, stripe, type Subscription } from '../server/stripe';
import { configured } from './entitlement';

const LINK_MS = 15 * 60 * 1000;

/**
 * Restore on a new device: email a 15-minute sign-in link to the subscriber's address. The reply
 * is the same whether or not the address has a subscription, so it can't be used to probe emails.
 */
export async function POST(request: Request) {
  const secret = process.env.ACCESS_SECRET;
  const { RESEND_API_KEY, RESTORE_FROM_EMAIL } = process.env;
  if (!configured() || !RESEND_API_KEY || !RESTORE_FROM_EMAIL || !secretOk(secret)) return json(503, { error: 'not_configured' });
  if (!sameOrigin(request)) return json(403, { error: 'forbidden' });
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return json(400, { error: 'bad_email' });

  try {
    const customers = await stripe<{ data: { id: string }[] }>('customers', { email, limit: 10 });
    for (const c of customers.data) {
      const sub = await activeSubscription(c.id);
      if (!sub) continue;
      const token = await seal({ kind: 'restore', cus: c.id, sub: sub.id, exp: Date.now() + LINK_MS }, secret);
      const link = `${siteOrigin(request)}/api/restore?token=${encodeURIComponent(token)}`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: RESTORE_FROM_EMAIL,
          to: email,
          subject: 'Your FightFlow sign-in link',
          html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5"><p>Tap to open FightFlow on this device. The link works for 15 minutes.</p><p><a href="${link}" style="display:inline-block;background:#E8202A;color:#fff;padding:14px 24px;text-decoration:none;font-weight:700">Open FightFlow</a></p><p style="color:#777">If you didn't ask for this, ignore this email.</p></div>`,
        }),
      });
      break;
    }
  } catch {
    // Same reply either way.
  }
  return json(200, { ok: true });
}

/** The link from the email: re-confirm the subscription, then unlock this device. */
export async function GET(request: Request) {
  const secret = process.env.ACCESS_SECRET;
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!secretOk(secret)) return redirect('/?restore=failed');
  const r = await open(token, 'restore', secret);
  if (!r) return redirect('/?restore=expired');
  try {
    const sub = await stripe<Subscription>(`subscriptions/${r.sub}`);
    const live = entitled(sub.status) ? sub : await activeSubscription(r.cus);
    if (!live) return redirect('/?restore=failed');
    return redirect('/?welcome=1', { 'set-cookie': setCookie(await seal(newPass(r.cus, live.id), secret)) });
  } catch {
    return redirect('/?restore=failed');
  }
}
