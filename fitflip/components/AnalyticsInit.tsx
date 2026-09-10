"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * Fires one `app_open` per session so the funnel has a denominator: every
 * later step (scan, paywall, purchase) is measured against how many sessions
 * actually started. Mounted globally from the root layout.
 */
export default function AnalyticsInit() {
  useEffect(() => {
    track("app_open");
  }, []);

  return null;
}
