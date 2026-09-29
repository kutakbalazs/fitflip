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

  const label = lang === "hu" ? "Új scan" : "New scan";
  const galleryLabel = lang === "hu" ? "Galéria" : "Gallery";

  // The home screen is already mounted and listening, so the file goes
  // straight to it — no navigation, no round trip.
  const hand = (file: File | null) => {
    if (file) setPendingScanFile(file);
  };

  const openCamera = async () => {
    haptic("tap");
    if (isNativePlatform()) {
      hand(await captureViaNativeCamera());
      return;
    }
    cameraRef.current?.click();
  };

  const openGallery = async () => {
    haptic("tap");
    if (isNativePlatform()) {
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

      <div
        // safe-mb keeps the buttons clear of Android's gesture bar.
        className={`fixed ${cookieVisible ? "bottom-40" : "bottom-20"} safe-mb left-1/2 -translate-x-1/2 z-40 transition-all duration-300`}
      >
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            aria-label={label}
            onClick={openCamera}
            className="w-16 h-16 rounded-full bg-ink-900 dark:bg-white ring-2 ring-offset-4 ring-ink-900 dark:ring-white ring-offset-white dark:ring-offset-ink-950 text-white dark:text-ink-900 flex items-center justify-center shadow-lg shadow-black/20 active:scale-95 transition"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <span className="text-sm font-medium">{label}</span>
        </div>

        {/* Centred on the shutter's circle, so the shutter keeps the centre line. */}
        <div className="absolute right-full mr-7 top-8 -translate-y-1/2 flex flex-col items-center gap-1.5">
          <button
            type="button"
            aria-label={galleryLabel}
            onClick={openGallery}
            className="w-12 h-12 rounded-full bg-ink-100 dark:bg-ink-800 border border-ink-200 dark:border-ink-700 text-ink-900 dark:text-white flex items-center justify-center active:scale-95 transition"
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
