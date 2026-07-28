"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isNativePlatform } from "@/lib/native";
import { readLang, writeLang, onLangChange, type Lang } from "@/lib/lang";
import { hasEnteredWebApp, markEnteredWebApp } from "@/lib/landing";
import HomeApp from "@/components/home/HomeApp";
import DesktopLanding from "./DesktopLanding";
import MobileLanding from "./MobileLanding";

const MOBILE_QUERY = "(max-width: 859px)"; // < 860px = mobile (design breakpoint)

/**
 * Decides what to render at `/`:
 *   - native app (Capacitor)     → the app, never the landing
 *   - web, desktop (≥860px)      → DesktopLanding (no functionality)
 *   - web, mobile (<860px)       → MobileLanding until the visitor taps
 *                                   "Kipróbálom"/"Belépés", then the app
 *
 * Rendering is deferred until mount so the native/viewport/entered signals are
 * known — on native the native splash covers the brief blank, and the app is
 * never replaced by the landing. Anything uncertain falls through to the app.
 */
export default function LandingGate() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [native, setNative] = useState(true); // assume native until proven web
  const [isMobile, setIsMobile] = useState(false);
  const [entered, setEntered] = useState(true); // assume entered until proven not
  const [lang, setLangState] = useState<Lang>("hu");

  useEffect(() => {
    setNative(isNativePlatform());
    setEntered(hasEnteredWebApp());
    setLangState(readLang());
    const mql = window.matchMedia(MOBILE_QUERY);
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    const off = onLangChange(setLangState);
    setMounted(true);
    return () => {
      mql.removeEventListener("change", apply);
      off();
    };
  }, []);

  const setLang = (l: Lang) => {
    writeLang(l); // shared with the app; onLangChange keeps this in sync too
    setLangState(l);
  };

  const enterApp = () => {
    markEnteredWebApp();
    setEntered(true);
  };
  const goLogin = () => {
    markEnteredWebApp();
    router.push("/login");
  };

  // Before mount we don't know the platform — render a neutral screen (covered
  // by the native splash) rather than risk flashing the landing inside the app.
  if (!mounted) return <div className="min-h-dvh bg-white dark:bg-ink-950" />;

  // Native app, or a mobile-web visitor who already entered → the real app.
  if (native || (isMobile && entered)) return <HomeApp />;

  // Web desktop → marketing landing, no functionality.
  if (!isMobile) return <DesktopLanding lang={lang} setLang={setLang} />;

  // Web mobile → landing with a way into the app.
  return <MobileLanding lang={lang} setLang={setLang} onEnter={enterApp} onLogin={goLogin} />;
}
