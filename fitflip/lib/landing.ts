// Shared state + constants for the web marketing landing.
//
// The landing is WEB-ONLY. The native (Capacitor) apps must never see it —
// that gating lives in LandingGate / OnboardingGate via isNativePlatform().

// Set once a mobile-web visitor taps "Kipróbálom" / "Belépés" on the landing.
// After that the landing is skipped and they go straight to the app.
const ENTERED_KEY = "ff-web-entered";

export function hasEnteredWebApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!localStorage.getItem(ENTERED_KEY);
  } catch {
    return false;
  }
}

export function markEnteredWebApp(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ENTERED_KEY, "1");
  } catch {
    /* ignore */
  }
}

// Store + legal links used by the landing CTAs.
export const APP_STORE_URL = "https://apps.apple.com/app/id6780652868";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=app.fitflip";
export const SITE_URL = "https://www.fitflip.app";
