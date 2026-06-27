import { isNativePlatform, nativePlatform } from "./native";

// Single initialization point for the capgo SocialLogin plugin so that Apple
// and Google providers are configured together (calling initialize separately
// per provider can clobber the other's config). Native iOS only.

let initialized = false;

export async function ensureSocialLoginInit(): Promise<void> {
  if (initialized || !isNativePlatform()) return;
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  const config: {
    apple?: { clientId: string; redirectUrl: string };
    google?: { iOSClientId: string; webClientId: string };
  } = {};
  if (nativePlatform() === "ios") {
    // Apple: bound to the app bundle id; empty redirectUrl keeps it native.
    config.apple = { clientId: "app.fitflip", redirectUrl: "" };
    // Google: only when the OAuth client ids are configured (env). Until then
    // the Google path falls back to the web OAuth redirect.
    const iosClientId = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    const webClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (iosClientId && webClientId) {
      config.google = { iOSClientId: iosClientId, webClientId };
    }
  }
  await SocialLogin.initialize(config);
  initialized = true;
}

// Whether native Google sign-in is actually wired up (env present).
export function nativeGoogleAvailable(): boolean {
  return (
    isNativePlatform() &&
    nativePlatform() === "ios" &&
    !!process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID &&
    !!process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID
  );
}
