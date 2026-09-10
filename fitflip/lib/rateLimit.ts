import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Per-user daily caps for the endpoints that call a paid model.
 *
 * /api/analyze already meters itself through the daily scan allowance, but
 * quick-id, story, translate-scan and listings had no ceiling at all: a single
 * compromised or scripted account could call them without limit and run up an
 * arbitrary bill. Nothing leaks — these are all behind auth — this is purely
 * a cost guard.
 *
 * The numbers are deliberately far above real use (a free account gets 3
 * scans a day, a heavy premium user maybe a few dozen), so a genuine user
 * will never see one. They exist to turn "unbounded" into "bounded".
 */
export const API_DAILY_LIMITS = {
  /** Fires once per scan attempt. */
  "quick-id": 150,
  /** User-triggered per result. */
  story: 100,
  /** User-triggered per result. */
  "translate-scan": 100,
  /** Re-runs and refinements; each one can trigger vision verification. */
  listings: 150,
  /** User-triggered per result, once they're ready to actually sell it. */
  "listing-draft": 100,
} as const;

export type RateLimitedEndpoint = keyof typeof API_DAILY_LIMITS;

export type RateLimitDecision = {
  allowed: boolean;
  used: number;
  limit: number;
};

/**
 * Counts one call and reports whether it may proceed.
 *
 * Fails OPEN, unlike the signed-out guest check. The caller here is an
 * authenticated, identifiable account, and a database hiccup should not take
 * working features away from paying users — the abuse case this guards
 * against requires a compromised account, which is rare and traceable. The
 * guest path is the opposite (fails closed) because there the caller is
 * anonymous and the endpoint would otherwise be unmetered.
 */
export async function claimApiCall(
  admin: SupabaseClient,
  userId: string,
  endpoint: RateLimitedEndpoint
): Promise<RateLimitDecision> {
  const limit = API_DAILY_LIMITS[endpoint];
  try {
    const { data, error } = await admin.rpc("claim_api_call", {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_daily_limit: limit,
    });
    if (error) {
      console.warn(`[rate-limit] check failed for ${endpoint}:`, error.message);
      return { allowed: true, used: 0, limit };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      allowed: row?.allowed !== false,
      used: typeof row?.used === "number" ? row.used : 0,
      limit,
    };
  } catch (err) {
    console.warn(`[rate-limit] check threw for ${endpoint}:`, err);
    return { allowed: true, used: 0, limit };
  }
}
