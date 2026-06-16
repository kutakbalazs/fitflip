"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { initIap } from "@/lib/iap";

// Configures RevenueCat with the signed-in Supabase user id as soon as the app
// knows who the user is, and re-configures on auth changes (login/logout). A
// no-op on the web and when no RevenueCat key is set, so it's safe to mount
// globally. Renders nothing.
export default function IapInit() {
  useEffect(() => {
    const supabase = createClient();

    const sync = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        try {
          await initIap(user.id);
        } catch {
          // Never let IAP setup break the app shell.
        }
      }
    };

    sync();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        initIap(session.user.id).catch(() => {});
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
