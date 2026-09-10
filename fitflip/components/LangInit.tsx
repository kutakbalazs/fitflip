"use client";

import { useEffect } from "react";
import { deviceLang, hasStoredLang, writeLang } from "@/lib/lang";

/**
 * First-run language pick. The app used to always start in Hungarian, so an
 * English-speaking user saw Hungarian even though the app is bilingual (and
 * has its own English App Store listing).
 *
 * This runs once, in an effect, and only when nothing is stored yet — so it
 * never fights an explicit choice, and it can't cause a hydration mismatch
 * (the first render still uses the stored value). Switching writes through
 * writeLang(), which fires "ff-lang-changed", and every language-aware
 * component already subscribes to that.
 *
 * Hungarian is the stored-nothing default, so we only write when the device
 * says something else — that keeps the common case free of a needless write.
 */
export default function LangInit() {
  useEffect(() => {
    if (hasStoredLang()) return;
    const l = deviceLang();
    if (l !== "hu") writeLang(l);
  }, []);

  return null;
}
