// Sentry — Node.js server SDK (API routes, server components, server actions).
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: process.env.NODE_ENV === "production" && !!dsn,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
});

Sentry.setTag("surface", "server");
