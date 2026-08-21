// Sentry — browser SDK. This file runs in every browser AND inside the
// Capacitor native WebView (the iOS/Android apps load the same remote URL), so
// a single init captures JS runtime errors for web and native-app users alike.
//
// Privacy posture: FitFlip does NO user tracking (App Store ATT stance). This
// config keeps it that way — no Session Replay, no default PII, query strings
// (which can carry auth tokens) are stripped before an event is sent.
import * as Sentry from "@sentry/nextjs";
import { nativePlatform } from "@/lib/native";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // Only report from real production builds, and only once a DSN is set — so
  // local `next dev` and any pre-configuration deploy stay silent no-ops.
  enabled: process.env.NODE_ENV === "production" && !!dsn,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  // No IP address, no cookies, no headers attached to events.
  sendDefaultPii: false,
  // Errors are the priority; keep a light performance sample.
  tracesSampleRate: 0.1,

  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications.",
    "Non-Error promise rejection captured",
    /network request failed/i,
    /load failed/i, // iOS WebView offline fetch
    "AbortError",
  ],

  beforeSend(event) {
    try {
      // Drop query strings (magic-link token_hash, reset tokens, …) from the
      // reported URL.
      if (event.request?.url) {
        event.request.url = event.request.url.split("?")[0];
      }
      // Belt-and-braces: never let an email / IP ride along in user context.
      if (event.user) {
        delete (event.user as Record<string, unknown>).email;
        delete (event.user as Record<string, unknown>).ip_address;
      }
    } catch {
      /* never let scrubbing throw */
    }
    return event;
  },
});

// Tag every event with the runtime surface, so native-app (WebView) errors can
// be filtered apart from plain web-browser errors in the Sentry dashboard.
const platform = nativePlatform(); // "ios" | "android" | "web"
Sentry.setTag("platform", platform);
Sentry.setTag("surface", platform === "web" ? "web" : "native-app");
