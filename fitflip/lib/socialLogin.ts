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
    google?: { iOSClientId?: string; webClientId: string };
  } = {};
  const webClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (nativePlatform() === "ios") {
    // Apple: bound to the app bundle id; empty redirectUrl keeps it native.
    config.apple = { clientId: "app.fitflip", redirectUrl: "" };
    // Google: only when BOTH OAuth client ids are present AND well-formed.
    // Until then the Google path falls back to the web OAuth redirect.
    const iosClientId = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    if (validGoogleClientId(iosClientId) && validGoogleClientId(webClientId)) {
      config.google = { iOSClientId: iosClientId, webClientId };
    }
  } else if (nativePlatform() === "android") {
    // Android's native Google sign-in only needs the web (server) client id —
    // the app is authorised via a separate Android OAuth client (registered
    // with the app's SHA-1 in Google Cloud). We gate on the Android client id
    // env being present as the "configured" signal; until it is, we fall back
    // to web OAuth so Google login never breaks on Android.
    const androidClientId = process.env.NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    if (validGoogleClientId(webClientId) && validGoogleClientId(androidClientId)) {
      config.google = { webClientId };
    }
  }
  await SocialLogin.initialize(config);
  initialized = true;
}

// Whether native Google sign-in is actually wired up for the current platform
// (all required client ids present and well-formed). Anything else falls back
// to the web OAuth redirect.
export function nativeGoogleAvailable(): boolean {
  if (!isNativePlatform()) return false;
  const webOk = validGoogleClientId(process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  if (nativePlatform() === "ios") {
    return webOk && validGoogleClientId(process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  }
  if (nativePlatform() === "android") {
    return webOk && validGoogleClientId(process.env.NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
  }
  return false;
}
