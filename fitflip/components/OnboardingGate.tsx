"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "ff-onboarded";

/**
 * Global onboarding gate. On first visit (no `ff-onboarded` flag in
 * localStorage), redirects the user to the full-page `/welcome` flow.
 * Once the user finishes or skips, the flag is set and they never see
 * the redirect again — until localStorage is cleared.
 *
 * Force re-trigger via `?onboarding=1` on any route.
 *
 * Routes that should NEVER redirect (auth flows, the onboarding itself,
 * legal pages reached from external links): see `SKIP_PATHS` below.
 */
const SKIP_PATHS = [
  "/welcome",
  "/pro",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  // Public legal pages reached from external links (App Store / Play Store
  // listings, the privacy-policy URL Google crawls). These must render their
  // own content directly — redirecting them to /welcome made Google Play see
  // the onboarding screen at the privacy-policy URL and reject the listing.
  "/privacy",
  "/terms",
  "/cookies",
  "/delete-account",
];

export default function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    // Don't redirect from auth / onboarding routes themselves.
    if (SKIP_PATHS.some((p) => pathname.startsWith(p))) return;

    let alreadySeen = false;
    try {
      alreadySeen = !!localStorage.getItem(STORAGE_KEY);
    } catch {
      /* localStorage blocked — skip (avoid redirect loop) */
      return;
    }

    let force = false;
    try {
      const params = new URLSearchParams(window.location.search);
      force = params.get("onboarding") === "1";
    } catch {
      /* ignore */
    }

    if (!alreadySeen || force) {
      router.replace("/welcome");
    }
  }, [pathname, router]);

  return null;
}
