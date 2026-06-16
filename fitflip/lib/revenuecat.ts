// Server-side RevenueCat REST helper. Uses the SECRET API key (never exposed
// to the client) to read the authoritative entitlement state for a user, so we
// can set profiles.is_premium based on what RevenueCat actually recorded rather
// than trusting the client. Returns null when RevenueCat isn't configured yet.

const RC_API = "https://api.revenuecat.com/v1";

// Must match the entitlement identifier in the RevenueCat dashboard and the
// client-side PRO_ENTITLEMENT in lib/iap.ts.
const PRO_ENTITLEMENT = "pro";

export type ProEntitlement = {
  active: boolean;
  expiresAt: string | null;
  productId: string | null;
};

export function revenueCatConfigured(): boolean {
  return !!process.env.RC_SECRET_KEY;
}

export async function fetchProEntitlement(appUserId: string): Promise<ProEntitlement | null> {
  const key = process.env.RC_SECRET_KEY;
  if (!key || !appUserId) return null;
  let res: Response;
  try {
    res = await fetch(`${RC_API}/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
  } catch (err) {
    console.error("[revenuecat] fetch subscriber failed:", err);
    return null;
  }
  // 404 = unknown subscriber (never purchased) → treat as no entitlement.
  if (res.status === 404) return { active: false, expiresAt: null, productId: null };
  if (!res.ok) {
    console.error("[revenuecat] subscriber lookup status", res.status);
    return null;
  }
  const data = await res.json().catch(() => null);
  const ent = data?.subscriber?.entitlements?.[PRO_ENTITLEMENT];
  if (!ent) return { active: false, expiresAt: null, productId: null };
  const expires: string | null = ent.expires_date ?? null;
  // expires_date null = non-expiring; otherwise active while in the future.
  const active = expires === null || new Date(expires).getTime() > Date.now();
  return { active, expiresAt: expires, productId: ent.product_identifier ?? null };
}
