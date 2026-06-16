import type { SupabaseClient } from "@supabase/supabase-js";
import { isNativePlatform, nativePlatform } from "./native";

// Sign in with Apple. Required by App Store guideline 4.8 because the app also
// offers Google sign-in. Shown only inside the native iOS app.
//   - iOS native: the native Apple sheet via @capgo/capacitor-social-login,
//     then exchange the identity token with Supabase (signInWithIdToken).
//   - Web / Android: Supabase OAuth redirect (fallback).

export type AppleSignInResult = { ok: boolean; error?: "cancelled" | string };

let appleInitialized = false;

export async function signInWithApple(
  supabase: SupabaseClient,
  next: string
): Promise<AppleSignInResult> {
  // --- Web (and Android native): OAuth redirect flow ---
  if (!isNativePlatform() || nativePlatform() !== "ios") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  // --- iOS native: native Apple sheet + signInWithIdToken ---
  try {
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    if (!appleInitialized) {
      // Empty redirectUrl on iOS keeps the flow fully native (no redirect).
      await SocialLogin.initialize({ apple: { clientId: "app.fitflip", redirectUrl: "" } });
      appleInitialized = true;
    }
    const res = await SocialLogin.login({
      provider: "apple",
      options: { scopes: ["email", "name"] },
    });
    const idToken =
      res.provider === "apple" ? res.result.idToken : null;
    if (!idToken) return { ok: false, error: "no_token" };
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: idToken,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("cancel") || msg.includes("1001")) {
      return { ok: false, error: "cancelled" };
    }
    return { ok: false, error: "apple_failed" };
  }
}
