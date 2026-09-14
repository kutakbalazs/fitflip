import type { SupabaseClient } from "@supabase/supabase-js";
import { isNativePlatform, nativePlatform } from "./native";
import { ensureSocialLoginInit } from "./socialLogin";
import { hasPlugin } from "./native";

// Sign in with Apple. Required by App Store guideline 4.8 because the app also
// offers Google sign-in. Shown only inside the native iOS app.
//   - iOS native: the native Apple sheet via @capgo/capacitor-social-login,
//     then exchange the identity token with Supabase (signInWithIdToken).
//   - Web / Android: Supabase OAuth redirect (fallback).

export type AppleSignInResult = { ok: boolean; error?: "cancelled" | string };

export async function signInWithApple(
  supabase: SupabaseClient,
  next: string
): Promise<AppleSignInResult> {
  // --- Web, Android, or an iOS build that predates the plugin: OAuth redirect ---
  // hasPlugin matters because the shell only updates on install: an older
  // build has the JS but not the native side, and calling it throws.
  if (!isNativePlatform() || nativePlatform() !== "ios" || !hasPlugin("SocialLogin")) {
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
    await ensureSocialLoginInit();
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
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
