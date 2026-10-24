import { clearCookie } from '../server/session';

/** Sign this device out: drop the access pass and go back to the unlock page. */
export function GET() {
  return new Response(null, { status: 303, headers: { location: '/unlock', 'set-cookie': clearCookie(), 'cache-control': 'no-store' } });
}
export const POST = GET;
