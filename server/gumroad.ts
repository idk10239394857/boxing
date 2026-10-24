/**
 * Gumroad license check (POST https://api.gumroad.com/v2/licenses/verify). Runs on the server
 * only. The product id isn't a secret, but it's kept server-side with everything else.
 */
export type Verdict =
  | { ok: true; sale: string; uses: number }
  | { ok: false; reason: 'invalid' | 'refunded' | 'ended' | 'limit' | 'unavailable' };

/** Gumroad keys look like 85DB562A-C11D4B06-A2335A6B-8C079166. */
export const looksLikeKey = (key: string) => /^[A-Za-z0-9]{8}(-[A-Za-z0-9]{8}){3}$/.test(key);

interface Purchase {
  sale_id?: string;
  refunded?: boolean;
  chargebacked?: boolean;
  disputed?: boolean;
  dispute_won?: boolean;
  subscription_ended_at?: string | null;
  subscription_failed_at?: string | null;
}

export async function verifyLicense(
  key: string,
  productId: string,
  opts: { increment: boolean; maxUses?: number },
  fetchImpl: typeof fetch = fetch,
): Promise<Verdict> {
  let res: Response;
  try {
    res = await fetchImpl('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ product_id: productId, license_key: key, increment_uses_count: String(opts.increment) }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  let data: { success?: boolean; uses?: number; purchase?: Purchase } | null = null;
  try {
    data = await res.json();
  } catch {
    // not JSON: treated below
  }
  if (res.status >= 500 || !data) return { ok: false, reason: 'unavailable' };
  if (!data.success || !data.purchase) return { ok: false, reason: 'invalid' };
  const p = data.purchase;
  if (p.refunded || p.chargebacked || (p.disputed && !p.dispute_won)) return { ok: false, reason: 'refunded' };
  if (p.subscription_ended_at || p.subscription_failed_at) return { ok: false, reason: 'ended' };
  const uses = Number(data.uses ?? 0);
  if (opts.increment && opts.maxUses && uses > opts.maxUses) return { ok: false, reason: 'limit' };
  return { ok: true, sale: String(p.sale_id ?? ''), uses };
}
