import { isNativePlatform, nativePlatform } from "./native";

// Single initialization point for the capgo SocialLogin plugin so that Apple
// and Google providers are configured together (calling initialize separately
// per provider can clobber the other's config). Native iOS only.

let initialized = false;

// A real Google OAuth client id always ends with this suffix. Guarding on it
// means a missing/placeholder env value (e.g. a literal "NEXT_PUBLIC_..." that
// slipped into Vercel) makes us fall back to web OAuth instead of handing the
// native GoogleSignIn SDK a bogus id — which crashes the app with a
// "missing URL scheme" exception.
const GOOGLE_CLIENT_SUFFIX = ".apps.googleusercontent.com";
function validGoogleClientId(v: string | undefined): v is string {
  return typeof v === "string" && v.endsWith(GOOGLE_CLIENT_SUFFIX);
}

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
    // Google: only when BOTH OAuth client ids are present AND well-formed.
    // Until then the Google path falls back to the web OAuth redirect.
    const iosClientId = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    const webClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (validGoogleClientId(iosClientId) && validGoogleClientId(webClientId)) {
      config.google = { iOSClientId: iosClientId, webClientId };
    }
  }
  await SocialLogin.initialize(config);
  initialized = true;
}

// Whether native Google sign-in is actually wired up (both client ids present
// and well-formed).
export function nativeGoogleAvailable(): boolean {
  return (
    isNativePlatform() &&
    nativePlatform() === "ios" &&
    validGoogleClientId(process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID) &&
    validGoogleClientId(process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID)
  );
}
