/**
 * First-party product analytics.
 *
 * Deliberately NOT a third-party SDK: events go to our own Supabase table via
 * our own API route. Nothing is shared with anyone else, so this adds no new
 * data processor to the privacy policy and stays clear of App Tracking
 * Transparency (which is about tracking across other companies' apps and
 * sites — this never leaves FitFlip).
 *
 * What we never collect: IP address, device fingerprint, precise location,
 * ad identifiers, or any persistent cross-session device id. The session id
 * lives in sessionStorage, so it dies with the browser tab / app session and
 * cannot be used to follow someone over time.
 */

import { nativePlatform } from "@/lib/native";

/** The complete event vocabulary. Adding an event means adding it here AND to
 *  the server-side allowlist — a typo then fails to compile instead of
 *  silently polluting the data. */
export const ANALYTICS_EVENTS = [
  // lifecycle
  "app_open",
  // onboarding
  "onboarding_start",
  "onboarding_complete",
  "onboarding_skip",
  // auth
  "signup_complete",
  "login_complete",
  // the core loop
  "scan_start",
  "scan_success",
  "scan_failed",
  "result_view",
  "listings_view",
  "listing_click",
  "watcher_create",
  /** The "Sell." half of the promise: they asked us to write the ad. */
  "listing_draft_created",
  // monetisation
  "limit_reached",
  "paywall_view",
  "checkout_start",
  "purchase_success",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

const SESSION_KEY = "ff-analytics-session";

/** Anonymous, session-scoped id. Not a device id: sessionStorage is cleared
 *  when the session ends, so it cannot link visits over time. */
function sessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** "ios" | "android" | "web" — lets us split the funnel per surface. */
function platform(): string {
  return nativePlatform();
}

/**
 * Record an event. Fire-and-forget: never awaited, never throws, and never
 * blocks or breaks the UI if the request fails. Analytics must not be able to
 * take the app down.
 */
export function track(
  event: AnalyticsEvent,
  props: Record<string, string | number | boolean | null> = {}
): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      event,
      props,
      sessionId: sessionId(),
      platform: platform(),
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      lang:
        (() => {
          try {
            return localStorage.getItem("ff-lang") ?? localStorage.getItem("ff_lang");
          } catch {
            return null;
          }
        })() ?? null,
    });

    // keepalive lets the event survive a navigation away from the page.
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      // Send the auth cookie so the server can attribute the event to the
      // signed-in user without the client ever passing a user id.
      credentials: "include",
    }).catch(() => {
      /* analytics must never surface an error to the user */
    });
  } catch {
    /* ignore */
  }
}
