import { redirect } from '../server/http';
import { clearCookie } from '../server/session';

/** Sign this device out of the subscription. */
export function POST() {
  return redirect('/', { 'set-cookie': clearCookie() });
}
export const GET = POST;
