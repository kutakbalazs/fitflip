"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import OnboardingModal from "./OnboardingModal";

const STORAGE_KEY = "ff-onboarded";

/**
 * Global onboarding gate. Triggers on first visit per browser, regardless
 * of whether the user is signed in — the modal doubles as a teaser to
 * encourage signup. Once dismissed, never shows again (until localStorage
 * is cleared).
 *
 * Force re-trigger via `?onboarding=1`.
 */
export default function OnboardingGate() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"hu" | "en">("hu");
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    try {
      const savedLang =
        localStorage.getItem("ff_lang") ?? localStorage.getItem("ff-lang");
      if (savedLang === "en") setLang("en");
    } catch {
      /* ignore */
    }

    let alreadySeen = false;
    try {
      alreadySeen = !!localStorage.getItem(STORAGE_KEY);
    } catch {
      /* localStorage blocked — fall through and show the modal. Better
         than never showing it. */
    }

    let force = false;
    try {
      const params = new URLSearchParams(window.location.search);
      force = params.get("onboarding") === "1";
    } catch {
      /* ignore */
    }

    if (!alreadySeen || force) {
      setOpen(true);
    }

    // Track auth state purely to render the right CTA inside the modal
    // (signup vs "let's go") — does NOT gate visibility.
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setAuthenticated(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session?.user);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <OnboardingModal
      open={open}
      onClose={() => setOpen(false)}
      lang={lang}
      authenticated={authenticated}
    />
  );
}
