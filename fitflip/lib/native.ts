import { Capacitor } from "@capacitor/core";

// True only inside the Capacitor native shell (iOS/Android app), false in any
// browser — including the same web app loaded at fitflip.app. Used to switch
// between native in-app purchases and Stripe Checkout.
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function nativePlatform(): "ios" | "android" | "web" {
  try {
    const p = Capacitor.getPlatform();
    return p === "ios" || p === "android" ? p : "web";
  } catch {
    return "web";
  }
}

/**
 * Does the INSTALLED binary actually carry this Capacitor plugin?
 *
 * The app loads its web layer from a remote URL, so a deploy reaches every
 * phone immediately while the native shell only changes when someone installs
 * a new build from the store. Any plugin added after a release is therefore
 * absent from the copies people are running, and calling it throws
 * `"X" plugin is not implemented on android`.
 *
 * This has now bitten twice — PushNotifications, then App, the latter
 * breaking deep links on every Android install in the store. Check before
 * calling, always.
 */
export function hasPlugin(name: string): boolean {
  try {
    return Capacitor.isPluginAvailable(name);
  } catch {
    return false;
  }
}
