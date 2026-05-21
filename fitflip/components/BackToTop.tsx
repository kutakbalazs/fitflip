"use client";

import { useEffect, useState } from "react";
import { haptic } from "@/lib/haptics";

type Props = {
  /**
   * Show the button only after the user has scrolled at least this many
   * pixels down. Defaults to 600 (≈ one viewport on mobile).
   */
  threshold?: number;
  lang?: "hu" | "en";
};

export default function BackToTop({ threshold = 600, lang = "hu" }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > threshold);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  if (!visible) return null;

  const label = lang === "hu" ? "Vissza a tetejére" : "Back to top";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        haptic("tap");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-ink-900 text-white shadow-lg hover:bg-ink-700 transition fade-in flex items-center justify-center"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}
