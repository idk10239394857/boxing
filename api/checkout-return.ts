import { redirect } from '../server/http';
import { newPass, seal, secretOk, setCookie } from '../server/session';
import { entitled, stripe, type CheckoutSession, type Subscription } from '../server/stripe';

/**
 * Stripe sends the buyer here after paying. The session is looked up server-side and only a
 * completed checkout with a live subscription earns the access pass.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('session_id') ?? '';
  const secret = process.env.ACCESS_SECRET;
  if (!/^cs_[A-Za-z0-9_]+$/.test(id) || !secretOk(secret)) return redirect('/?checkout=failed');
  try {
    const s = await stripe<CheckoutSession>(`checkout/sessions/${id}`, { 'expand[]': 'subscription' });
    const sub = s.subscription as Subscription | null;
    if (s.status !== 'complete' || !s.customer || !sub || typeof sub !== 'object' || !entitled(sub.status)) return redirect('/?checkout=failed');
    return redirect('/?welcome=1', { 'set-cookie': setCookie(await seal(newPass(s.customer, sub.id), secret)) });
  } catch {
    return redirect('/?checkout=failed');
  }
}
