import type { SupabaseClient } from "@supabase/supabase-js";
import { isNativePlatform, nativePlatform } from "./native";

// Sign in with Apple. Required by App Store guideline 4.8 because the app also
// offers Google sign-in. Two paths:
//   - Web: standard Supabase OAuth redirect (like Google).
//   - Native iOS: the native Apple sheet via @capacitor-community/apple-sign-in,
//     then exchange the identity token with Supabase (signInWithIdToken).

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomNonce(length = 32): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values)
    .map((v) => charset[v % charset.length])
    .join("");
}

export type AppleSignInResult = { ok: boolean; error?: "cancelled" | string };

export async function signInWithApple(
  supabase: SupabaseClient,
  next: string
): Promise<AppleSignInResult> {
  // --- Web (and Android native): OAuth redirect flow ---
  // The native Apple sheet is iOS-only; everywhere else use the web OAuth flow.
  if (!isNativePlatform() || nativePlatform() !== "ios") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  // --- Native iOS: native Apple sheet + signInWithIdToken ---
  // Apple returns the SHA-256 hash of the nonce inside the identity token;
  // Supabase re-hashes the raw nonce we give it and compares the two.
  const rawNonce = randomNonce();
  const hashedNonce = await sha256Hex(rawNonce);
  try {
    const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
    const result = await SignInWithApple.authorize({
      clientId: "app.fitflip",
      // Unused on native iOS (credential is bound to the app), required by the
      // plugin's type for the Android/web fallback.
      redirectURI: "https://www.fitflip.app/auth/callback",
      scopes: "name email",
      nonce: hashedNonce,
    });
    const idToken = result.response?.identityToken;
    if (!idToken) return { ok: false, error: "no_token" };
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: idToken,
      nonce: rawNonce,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (err: unknown) {
    // User dismissed the sheet, or the native call failed.
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("cancel") || msg.includes("1001")) {
      return { ok: false, error: "cancelled" };
    }
    return { ok: false, error: "apple_failed" };
  }
}
