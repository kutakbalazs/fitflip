"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isNativePlatform, nativePlatform } from "@/lib/native";
import { readLang } from "@/lib/lang";

/**
 * Makes Android's back gesture behave like Android.
 *
 * With no listener registered, Capacitor's default is to close the app. So a
 * user three screens deep who swiped back — the most ordinary gesture on the
 * platform — was thrown out of FitFlip entirely. A tester hit it within
 * minutes of opening the app.
 *
 * The rule is the one every Android app follows: go back if there is
 * somewhere to go, otherwise return home, and only leave from home. Leaving
 * takes two presses, because a single press on the home screen is far more
 * often a misfire than a decision to quit.
 */
export default function AndroidBackButton() {
  const router = useRouter();
  const [hint, setHint] = useState(false);
  const armedUntil = useRef(0);

  useEffect(() => {
    if (!isNativePlatform() || nativePlatform() !== "android") return;

    let remove: (() => void) | undefined;

    void (async () => {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack && window.history.length > 1) {
          router.back();
          return;
        }
        if (window.location.pathname !== "/") {
          router.push("/");
          return;
        }
        const now = Date.now();
        if (now < armedUntil.current) {
          void App.exitApp();
          return;
        }
        armedUntil.current = now + 2000;
        setHint(true);
        setTimeout(() => setHint(false), 2000);
      });
      remove = () => handle.remove();
    })();

    return () => remove?.();
    // pathname is deliberately absent: re-registering the listener on every
    // navigation would leave stale handlers behind. The current path is read
    // from location at the moment the gesture happens instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (!hint) return null;

  return (
    <div className="fixed bottom-24 safe-mb left-1/2 -translate-x-1/2 z-50 rounded-full bg-ink-900/90 dark:bg-white/90 px-4 py-2 text-xs text-white dark:text-ink-900 pointer-events-none">
      {readLang() === "hu" ? "Nyomd meg még egyszer a kilépéshez" : "Press back again to exit"}
    </div>
  );
}
