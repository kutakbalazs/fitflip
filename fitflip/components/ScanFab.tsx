"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readLang } from "@/lib/lang";
import { haptic } from "@/lib/haptics";

// Routes where the floating scan button should NOT appear.
const HIDDEN_PATHS = ["/", "/account", "/welcome", "/pro", "/login", "/signup", "/forgot-password", "/reset-password", "/auth"];

/**
 * Fixed bottom-centre "scan" button shown on every page except the home
 * screen and the account/subscription page. Tapping it sends the user to the
 * home page with ?scan=camera, which auto-opens the camera capture input.
 */
export default function ScanFab() {
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<"hu" | "en">("hu");

  useEffect(() => {
    setLang(readLang());
  }, [pathname]);

  if (!pathname || HIDDEN_PATHS.includes(pathname)) return null;

  const label = lang === "hu" ? "Új scan" : "New scan";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        haptic("tap");
        router.push("/?scan=camera");
      }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-6 py-3.5 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-medium text-sm shadow-lg shadow-black/20 hover:opacity-90 active:scale-95 transition"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      {label}
    </button>
  );
}
