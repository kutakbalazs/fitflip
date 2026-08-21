import withPWAInit from "@ducanh2912/next-pwa";
import { withSentryConfig } from "@sentry/nextjs";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
    // Required on Next 14.2 so instrumentation.ts (Sentry server/edge init) runs.
    instrumentationHook: true,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_GIT_SHA: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7),
    // Full commit SHA as the Sentry release — MUST match the source-map upload
    // release below so minified stack traces resolve.
    NEXT_PUBLIC_SENTRY_RELEASE: process.env.VERCEL_GIT_COMMIT_SHA || "",
  },
  async headers() {
    return [
      {
        // Apple fetches this to validate Universal Links; it must be served
        // as JSON over HTTPS without a redirect.
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      {
        // Baseline security headers. Framing is denied site-wide (nothing
        // legitimately embeds us — the Capacitor WebView loads pages
        // top-level, which X-Frame-Options does not affect). HSTS is added
        // by Vercel automatically.
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  // Minimal SW: exists to satisfy Android Chrome's PWA install criteria
  // (must respond to fetch events) without aggressively caching content.
  workboxOptions: {
    runtimeCaching: [],
    navigateFallback: undefined,
  },
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
});

// Sentry wraps the fully-composed (PWA) config. Source-map upload runs only
// when SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT are present (i.e. on
// Vercel); without them the build still succeeds — errors are just captured
// with minified stack traces until the token is added.
export default withSentryConfig(withPWA(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Keep the release name identical to NEXT_PUBLIC_SENTRY_RELEASE above.
  release: { name: process.env.VERCEL_GIT_COMMIT_SHA || undefined },
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  // Do NOT enable tunnelRoute here without also excluding it from middleware.
});
