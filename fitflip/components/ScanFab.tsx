"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readLang } from "@/lib/lang";
import { haptic } from "@/lib/haptics";
import { setPendingScanFile } from "@/lib/pendingScan";

// Routes where the floating scan button should NOT appear.
const HIDDEN_PATHS = ["/", "/account", "/welcome", "/pro", "/login", "/signup", "/forgot-password", "/reset-password", "/auth"];

/**
 * Fixed bottom-centre "scan" button shown on every page except the home
 * screen and the account/subscription page.
 *
 * Tapping it opens the camera DIRECTLY (a hidden capture input is clicked in
 * the same user gesture — this is the only reliable way to open the camera on
 * mobile). Once a photo is captured, the File is stashed in the pendingScan
 * module and we navigate to the home screen, which processes it on mount.
 *
 * Sits above the very bottom so the footer stays visible — except on the
 * history page, where it sits much lower per design.
 */
export default function ScanFab() {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [lang, setLang] = useState<"hu" | "en">("hu");

  useEffect(() => {
    setLang(readLang());
  }, [pathname]);

  if (!pathname || HIDDEN_PATHS.includes(pathname)) return null;

  const label = lang === "hu" ? "Új scan" : "New scan";
  // History page wants the button much lower; elsewhere keep it clear of the footer.
  const bottomClass = pathname.startsWith("/history") ? "bottom-6" : "bottom-24";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so picking the same file again still fires onChange next time.
          e.target.value = "";
          if (!file) return; // user cancelled the camera
          setPendingScanFile(file);
          router.push("/");
        }}
      />
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          haptic("tap");
          inputRef.current?.click();
        }}
        className={`fixed ${bottomClass} left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-6 py-3.5 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-medium text-sm shadow-lg shadow-black/20 hover:opacity-90 active:scale-95 transition`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        {label}
      </button>
    </>
  );
}
