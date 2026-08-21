"use client";

// Top-level React error boundary. Next.js renders this only when the root
// layout itself throws; it must provide its own <html>/<body>. We report the
// error to Sentry and show a minimal, on-brand fallback.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="hu">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 24,
          background: "#0a0a0a",
          color: "#fff",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 17, lineHeight: 1.5, maxWidth: 320 }}>
          Hoppá, valami hiba történt. Próbáld újra egy pillanat múlva.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            border: "none",
            background: "#f59e0b",
            color: "#0a0a0a",
            fontWeight: 700,
            fontSize: 16,
            padding: "14px 28px",
            cursor: "pointer",
          }}
        >
          Újratöltés
        </button>
      </body>
    </html>
  );
}
