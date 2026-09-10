import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Abuse protection for the signed-out ("guest") scan.
 *
 * Letting anyone analyse an image without an account opens a paid model call
 * to the open internet, so this is the cost guard. Two layers:
 *
 *  1. per-device daily allowance, keyed on the caller's IP
 *  2. a global daily ceiling — a circuit breaker for distributed abuse, so a
 *     botnet spread over many IPs still can't run the bill up. Signed-in
 *     users are unaffected when it trips.
 *
 * The IP itself is never stored: we keep a salted SHA-256 of it. That is
 * enough to count repeat callers, but it is not reversible, so we get rate
 * limiting without holding personal data (an IP address is personal data
 * under the GDPR).
 */

export const GUEST_DAILY_LIMIT = 1;

/** Ceiling across all guests per day. Generous enough that normal traffic
 *  never notices, low enough that a runaway costs little. */
export const GUEST_GLOBAL_DAILY_LIMIT = 300;

/** Salt for the IP hash. A dedicated secret is preferred; falling back to the
 *  service-role key keeps this working without extra deployment setup. Both
 *  are server-only and never reach the client. */
function salt(): string {
  return (
    process.env.GUEST_IP_SALT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "fitflip-guest"
  );
}

/** Best-effort client IP. Vercel sets x-forwarded-for; the left-most entry is
 *  the original client. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${salt()}:${ip}`).digest("hex");
}

export type GuestScanDecision = {
  allowed: boolean;
  /** How many guest scans this device has used today (after this attempt). */
  used: number;
};

/**
 * Records an attempt and says whether it may proceed. The counting happens in
 * a single SQL function so two simultaneous requests can't both slip through
 * a read-then-write gap — the whole point is that this can't be raced.
 *
 * Fails CLOSED: if the check itself errors we deny the guest scan rather than
 * risk an unmetered endpoint. Signed-in users never reach this path.
 */
export async function claimGuestScan(
  admin: SupabaseClient,
  ip: string
): Promise<GuestScanDecision> {
  try {
    const { data, error } = await admin.rpc("claim_guest_scan", {
      p_ip_hash: hashIp(ip),
      p_daily_limit: GUEST_DAILY_LIMIT,
      p_global_limit: GUEST_GLOBAL_DAILY_LIMIT,
    });
    if (error) {
      console.warn("[guest-scan] rate-limit check failed:", error.message);
      return { allowed: false, used: 0 };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      allowed: !!row?.allowed,
      used: typeof row?.used === "number" ? row.used : 0,
    };
  } catch (err) {
    console.warn("[guest-scan] rate-limit check threw:", err);
    return { allowed: false, used: 0 };
  }
}
