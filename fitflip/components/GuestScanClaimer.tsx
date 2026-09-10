"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  clearPendingGuestScan,
  readPendingGuestScan,
} from "@/lib/guestPending";
import { track } from "@/lib/analytics";

/**
 * Moves a signed-out scan into the user's history the moment they have an
 * account. Mounted globally so it works no matter where the sign-in finished
 * (email, Google, Apple) and whether that was a redirect or an in-place
 * token exchange.
 *
 * Never re-runs the analysis — it only persists a result already paid for.
 */
export default function GuestScanClaimer() {
  const claiming = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const claim = async () => {
      if (claiming.current) return;
      const pending = readPendingGuestScan();
      if (!pending) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return; // still a guest — keep holding it

      claiming.current = true;
      try {
        const res = await fetch("/api/scans/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result: pending.result, image: pending.image }),
        });
        if (res.ok) {
          clearPendingGuestScan();
          track("signup_complete", { claimedGuestScan: true });
        }
      } catch {
        // Leave it pending: the next auth change or reload tries again.
      } finally {
        claiming.current = false;
      }
    };

    void claim();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) void claim();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
