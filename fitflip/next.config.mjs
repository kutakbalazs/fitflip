import withPWAInit from "@ducanh2912/next-pwa";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_GIT_SHA: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7),
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

export default withPWA(nextConfig);
