// Next.js instrumentation hook — loads the right Sentry init per runtime and
// forwards nested React Server Component / route-handler errors to Sentry.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown while rendering the App Router on the server.
export const onRequestError = Sentry.captureRequestError;
