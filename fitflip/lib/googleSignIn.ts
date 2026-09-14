import type { SupabaseClient } from "@supabase/supabase-js";
import { nativeGoogleAvailable, ensureSocialLoginInit } from "./socialLogin";

// Google sign-in. On native iOS (when the Google OAuth client ids are
// configured) it uses the native Google sheet via capgo and exchanges the id
// token with Supabase, so the user stays inside the app. Everywhere else it
// falls back to the Supabase OAuth redirect.

export type GoogleSignInResult = { ok: boolean; error?: "cancelled" | string };

// Random hex string for the OIDC nonce.
function randomNonce(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

// SHA-256 hex digest. Google echoes the nonce we send into the id_token
// unchanged, while Supabase compares SHA-256(passed nonce) to the token's
// nonce — so we send the HASH to Google and the RAW value to Supabase.
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Send a failed native sign-in to Sentry.
 *
 * A broken Google button produces no server request and no log — the user
 * simply taps and nothing happens, and that is exactly how it reached us:
 * "Google sign-up doesn't work", with nothing to diagnose. A configuration
 * fault here breaks sign-up for every Android user at once, so it is worth
 * knowing about without waiting for someone to mention it.
 */
async function reportSignInFault(kind: string, err: unknown): Promise<void> {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { area: "auth", provider: "google", fault: kind },
    });
  } catch {
    /* monitoring must never be the thing that breaks sign-in */
  }
}

export async function signInWithGoogle(
  supabase: SupabaseClient,
  next: string
): Promise<GoogleSignInResult> {
  // --- iOS native (configured): native Google sheet + signInWithIdToken ---
  if (nativeGoogleAvailable()) {
    try {
      await ensureSocialLoginInit();
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      // capgo always puts a nonce in the id_token; Supabase then requires the
      // matching raw nonce, otherwise it rejects with "Passed nonce and nonce
      // in id_token should either both exist or not."
      const rawNonce = randomNonce();
      const hashedNonce = await sha256Hex(rawNonce);
      const res = await SocialLogin.login({
        provider: "google",
        // forcePrompt skips capgo's restorePreviousSignIn path — otherwise a
        // cached token (with a stale/empty nonce) is returned instead of a
        // fresh sign-in carrying our nonce, which fails Supabase's check.
        options: { scopes: ["email", "profile"], nonce: hashedNonce, forcePrompt: true },
      });
      const idToken =
        res.provider === "google" && "idToken" in res.result
          ? res.result.idToken
          : null;
      if (!idToken) return { ok: false, error: "no_token" };
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
        nonce: rawNonce,
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("cancel") || msg.includes("12501")) {
        return { ok: false, error: "cancelled" };
      }
      // Android status 10 is DEVELOPER_ERROR: Google checks the package name
      // together with the signing certificate, and refuses when the pair
      // isn't registered on the OAuth client. In practice that means the
      // Android OAuth client carries the debug or upload fingerprint while
      // the installed build was signed by Play. It is worth naming, because
      // the symptom — sign-in that simply doesn't happen — looks identical to
      // the user cancelling, and it was reported to us as "Google sign-up
      // doesn't work" with nothing to go on.
      if (msg.includes("10:") || msg.includes("developer_error") || msg.includes("status code 10")) {
        void reportSignInFault("google_config", err);
        return { ok: false, error: "google_config" };
      }
      void reportSignInFault("google_failed", err);
      return { ok: false, error: "google_failed" };
    }
  }

  // --- Web / Android / not-yet-configured: OAuth redirect ---
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
