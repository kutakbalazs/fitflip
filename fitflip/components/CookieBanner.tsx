"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { readLang } from "@/lib/lang";

const STORAGE_KEY = "ff-cookie-consent";

// Other fixed bottom UI (the floating scan button) listens for this event
// and lifts itself above the banner while it's on screen.
function announceVisibility(visible: boolean) {
  try {
    window.dispatchEvent(new CustomEvent("ff-cookie-banner", { detail: { visible } }));
  } catch {
    /* ignore */
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [lang, setLang] = useState<"hu" | "en">("hu");

  useEffect(() => {
    try {
      const consented = localStorage.getItem(STORAGE_KEY);
      if (!consented) {
        setVisible(true);
        announceVisibility(true);
      }
    } catch {
      /* ignore */
    }
    setLang(readLang());
  }, []);

  const dismiss = (choice: "all" | "necessary") => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* ignore */
    }
    setVisible(false);
    announceVisibility(false);
  };

  if (!visible) return null;

  const t =
    lang === "hu"
      ? {
          text:
            "A FitFlip működéséhez szükséges sütiket használunk (bejelentkezés, nyelvi beállítás). Analitikai vagy marketing célú harmadik féltől származó sütiket nem.",
          more: "Részletek",
          accept: "Rendben",
          necessary: "Csak szükségesek",
        }
      : {
          text:
            "FitFlip uses only the cookies required to operate (authentication, language preference). No third-party analytics or marketing cookies.",
          more: "Details",
          accept: "OK",
          necessary: "Only necessary",
        };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto max-w-3xl mx-auto bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-700 rounded-2xl shadow-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-xs text-ink-700 dark:text-ink-200 leading-relaxed flex-1">
          {t.text}{" "}
          <Link href="/cookies" className="underline hover:text-ink-900 dark:hover:text-white">
            {t.more}
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => dismiss("necessary")}
            className="px-3 py-1.5 rounded-full border border-ink-200 dark:border-ink-700 text-xs text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800 transition"
          >
            {t.necessary}
          </button>
          <button
            type="button"
            onClick={() => dismiss("all")}
            className="px-3 py-1.5 rounded-full bg-ink-900 text-white text-xs font-medium hover:bg-ink-700 transition"
          >
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
