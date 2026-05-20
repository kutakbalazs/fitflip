import withPWAInit from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
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
