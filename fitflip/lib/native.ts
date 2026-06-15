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
