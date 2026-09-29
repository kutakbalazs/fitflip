"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { readLang } from "@/lib/lang";
import { haptic } from "@/lib/haptics";
import { setPendingScanFile } from "@/lib/pendingScan";
import { isNativePlatform } from "@/lib/native";
import { captureViaNativeCamera, pickFromNativeGallery } from "@/lib/quickScan";

/**
 * The shutter, on the home screen only.
 *
 * It used to follow the user around every page as a pill. It doesn't any
 * more: scanning starts at home, the pages that want their own way back to it
 * already have one inline, and a floating button on top of a list someone is
 * reading is in the way of the reading.
 *
 * The camera sits on the centre line — it is the thing the screen is for —
 * and the gallery hangs off to its left rather than sharing the centre with
 * it, so the primary control stays where a thumb expects it.
 */
export default function ScanFab() {
  const pathname = usePathname();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [lang, setLang] = useState<"hu" | "en">("hu");
  // While the cookie banner is on screen the buttons lift above it so the two
  // fixed bottom elements never overlap; they slide back down on consent.
  const [cookieVisible, setCookieVisible] = useState(false);

  useEffect(() => {
    setLang(readLang());
  }, [pathname]);

  useEffect(() => {
    const onBanner = (e: Event) => {
      setCookieVisible(!!(e as CustomEvent).detail?.visible);
    };
    window.addEventListener("ff-cookie-banner", onBanner);
    return () => window.removeEventListener("ff-cookie-banner", onBanner);
  }, []);

  if (pathname !== "/") return null;

  const native = isNativePlatform();

  const label = lang === "hu" ? "Új scan" : "New scan";
  const galleryLabel = lang === "hu" ? "Galéria" : "Gallery";

  // The home screen is already mounted and listening, so the file goes
  // straight to it — no navigation, no round trip.
  const hand = (file: File | null) => {
    if (file) setPendingScanFile(file);
  };

  const openCamera = async () => {
    haptic("tap");
    if (native) {
      hand(await captureViaNativeCamera());
      return;
    }
    cameraRef.current?.click();
  };

  const openGallery = async () => {
    haptic("tap");
    if (native) {
      // Straight into the library. A plain file input makes iOS ask "Photo
      // Library / Take Photo / Choose File" first, which is a question the
      // user answered by pressing this button rather than the shutter.
      hand(await pickFromNativeGallery());
      return;
    }
    galleryRef.current?.click();
  };

  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = ""; // so picking the same file again still fires
          hand(file);
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          hand(file);
        }}
      />

      {/* A bar, not a floating button. Floating over a scrolling page means
          floating over whatever happens to be under it — here, the row of
          recent items — and no amount of bottom padding fixes that, because
          the page keeps moving and the button does not. With its own
          background it stops being something in the way and becomes the edge
          of the screen. */}
      <div
        className={`fixed left-0 right-0 ${cookieVisible ? "bottom-24" : "bottom-0"} z-40 bg-white/95 dark:bg-ink-950/95 backdrop-blur border-t border-ink-100 dark:border-ink-800 transition-all duration-300`}
      >
        <div className="relative flex flex-col items-center gap-1 px-6 pt-3 pb-3 safe-mb">
          <button
            type="button"
            aria-label={label}
            onClick={openCamera}
            className="w-14 h-14 rounded-full bg-ink-900 dark:bg-white ring-2 ring-offset-2 ring-ink-900 dark:ring-white ring-offset-white dark:ring-offset-ink-950 text-white dark:text-ink-900 flex items-center justify-center active:scale-95 transition"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <span className="text-sm font-medium">{label}</span>
        </div>

        {/* Off to the left, so the shutter keeps the centre line. */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
          <button
            type="button"
            aria-label={galleryLabel}
            onClick={openGallery}
            className="w-11 h-11 rounded-full bg-ink-100 dark:bg-ink-800 border border-ink-200 dark:border-ink-700 text-ink-900 dark:text-white flex items-center justify-center active:scale-95 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L4 20" />
            </svg>
          </button>
          <span className="text-xs text-ink-500 dark:text-ink-400">{galleryLabel}</span>
        </div>
      </div>
    </>
  );
}
