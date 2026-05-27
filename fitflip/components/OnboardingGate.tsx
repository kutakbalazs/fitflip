"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import OnboardingModal from "./OnboardingModal";

const STORAGE_KEY = "ff-onboarded";

/**
 * Global gate: shows the onboarding modal once per browser to any
 * authenticated user, regardless of which page they land on. Replaces the
 * previous home-page-only trigger so users who deep-link into /history or
 * /account also see it.
 *
 * Force re-trigger by appending `?onboarding=1` to any URL.
 */
export default function OnboardingGate() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"hu" | "en">("hu");

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
      /* If localStorage is blocked we err on the side of showing the modal
         (better than never showing it). */
    }

    // Manual force via URL param — useful for re-testing.
    let force = false;
    try {
      const params = new URLSearchParams(window.location.search);
      force = params.get("onboarding") === "1";
    } catch {
      /* ignore */
    }

    const supabase = createClient();
    let unsub: { unsubscribe: () => void } | null = null;

    const maybeShow = (signedIn: boolean) => {
      if (!signedIn) return;
      if (alreadySeen && !force) return;
      setOpen(true);
    };

    supabase.auth.getUser().then(({ data }) => {
      maybeShow(!!data.user);
    });

    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      maybeShow(!!session?.user);
    });
    unsub = sub.data.subscription;

    return () => {
      unsub?.unsubscribe();
    };
  }, []);

  return (
    <OnboardingModal
      open={open}
      onClose={() => setOpen(false)}
      lang={lang}
    />
  );
}
