import type { SupabaseClient } from "@supabase/supabase-js";
import { nativeGoogleAvailable, ensureSocialLoginInit } from "./socialLogin";

// Google sign-in. On native iOS (when the Google OAuth client ids are
// configured) it uses the native Google sheet via capgo and exchanges the id
// token with Supabase, so the user stays inside the app. Everywhere else it
// falls back to the Supabase OAuth redirect.

export type GoogleSignInResult = { ok: boolean; error?: "cancelled" | string };

export async function signInWithGoogle(
  supabase: SupabaseClient,
  next: string
): Promise<GoogleSignInResult> {
  // --- iOS native (configured): native Google sheet + signInWithIdToken ---
  if (nativeGoogleAvailable()) {
    try {
      await ensureSocialLoginInit();
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      const res = await SocialLogin.login({
        provider: "google",
        options: { scopes: ["email", "profile"] },
      });
      const idToken =
        res.provider === "google" && "idToken" in res.result
          ? res.result.idToken
          : null;
      if (!idToken) return { ok: false, error: "no_token" };
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("cancel") || msg.includes("12501")) {
        return { ok: false, error: "cancelled" };
      }
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
