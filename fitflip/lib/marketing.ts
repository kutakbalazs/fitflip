import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Marketing-email consent.
 *
 * Hungarian law (Grt. 2008/XLVIII § 6) requires prior, explicit, voluntary
 * consent before sending advertising by email, on top of the GDPR. So:
 *
 *  - the signup checkbox starts UNCHECKED (a pre-ticked box is not consent)
 *  - we record WHEN consent was given, because "we have consent" is a claim
 *    that has to be evidenced
 *  - every message carries an unsubscribe link that works without signing in
 *
 * Consent is never assumed for existing accounts: anyone who registered
 * before this existed simply isn't reachable, and that's the correct outcome.
 */

/**
 * Secret for signing unsubscribe links. A dedicated value is preferred;
 * falling back to the service-role key avoids an extra deployment step. Both
 * are server-only and never reach the client.
 */
function secret(): string {
  return (
    process.env.MARKETING_UNSUB_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "fitflip-unsub"
  );
}

function sign(userId: string): string {
  return createHmac("sha256", secret()).update(userId).digest("base64url");
}

/**
 * Unsubscribe token: the user id plus a signature over it.
 *
 * Stateless on purpose — no token column to store, expire or clean up, and a
 * link stays valid for as long as the account does (an unsubscribe link that
 * has quietly expired is worse than useless).
 *
 * It is not guessable without the server secret, and it only ever grants one
 * action: turning marketing email OFF. Even a leaked link cannot read data,
 * change anything else, or re-subscribe anyone.
 */
export function unsubscribeToken(userId: string): string {
  return `${Buffer.from(userId).toString("base64url")}.${sign(userId)}`;
}

/** Returns the user id if the token is authentic, otherwise null. */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const [idPart, sigPart] = token.split(".");
    if (!idPart || !sigPart) return null;
    const userId = Buffer.from(idPart, "base64url").toString("utf8");
    if (!userId) return null;

    const expected = Buffer.from(sign(userId));
    const given = Buffer.from(sigPart);
    // Length check first: timingSafeEqual throws on a length mismatch.
    if (expected.length !== given.length) return null;
    if (!timingSafeEqual(expected, given)) return null;

    return userId;
  } catch {
    return null;
  }
}

/** Absolute unsubscribe URL to embed in an email. */
export function unsubscribeUrl(userId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fitflip.app";
  return `${base}/unsubscribe?t=${unsubscribeToken(userId)}`;
}
