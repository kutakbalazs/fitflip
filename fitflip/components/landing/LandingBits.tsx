"use client";

import Link from "next/link";
import type { Lang } from "@/lib/lang";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/landing";
import type { LandingCopy } from "./copy";

/* FitFlip wordmark — Playfair Display, editorial masthead. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-l-display font-black tracking-[-0.02em] text-ink ${className}`}
    >
      FitFlip
    </span>
  );
}

/* Animated "water" hero background — three ambient layers (spec §2). */
export function WaterBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ background: "linear-gradient(175deg, #FFFFFF 0%, #EEF3F7 55%, #E6EDF3 100%)" }}
    >
      <div
        className="absolute animate-water-a"
        style={{
          inset: "-25%",
          opacity: 0.55,
          filter: "blur(1px)",
          background:
            "repeating-linear-gradient(102deg, rgba(30,58,90,0.075) 0 2px, transparent 2px 11px), radial-gradient(55% 40% at 25% 25%, rgba(255,255,255,.95), transparent 65%)",
        }}
      />
      <div
        className="absolute animate-water-b"
        style={{
          inset: "-25%",
          opacity: 0.4,
          filter: "blur(1.5px)",
          background:
            "repeating-linear-gradient(72deg, rgba(30,58,90,0.07) 0 1px, transparent 1px 8px), radial-gradient(45% 35% at 75% 70%, rgba(255,255,255,.9), transparent 60%)",
        }}
      />
      <div
        className="absolute animate-shine"
        style={{
          top: "-30%",
          bottom: "-30%",
          left: 0,
          width: "42%",
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,.85) 50%, transparent)",
        }}
      />
    </div>
  );
}

/* App Store + Google Play badges (image links to the real store URLs). */
export function StoreBadges({ heightClass = "h-[60px]" }: { heightClass?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="App Store">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/badge-app-store.png" alt="Download on the App Store" className={`${heightClass} w-auto`} />
      </a>
      <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Google Play">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/badge-google-play.png" alt="Get it on Google Play" className={`${heightClass} w-auto`} />
      </a>
    </div>
  );
}

/* HU / EN segmented toggle (spec §1). */
export function LangToggle({
  lang,
  onChange,
  size = "md",
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
  size?: "md" | "sm";
}) {
  const pad = size === "sm" ? "px-2.5 py-2 text-[11px]" : "px-3 py-2.5 text-[12px]";
  const cell = (l: Lang, label: string) => (
    <button
      type="button"
      onClick={() => onChange(l)}
      aria-pressed={lang === l}
      className={`${pad} font-semibold uppercase tracking-[0.08em] transition-colors ${
        lang === l ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex border border-line-2 select-none">
      {cell("hu", "HU")}
      {cell("en", "EN")}
    </div>
  );
}

/* Striped photo placeholder with a monospace caption (spec §Fotó-placeholder).
   Real product photos replace these later. */
export function Photo({
  label,
  className = "",
  variant = "a",
}: {
  label: string;
  className?: string;
  variant?: "a" | "b";
}) {
  const bg =
    variant === "a"
      ? "repeating-linear-gradient(45deg, #F5F5F5 0 10px, #EAEAEA 10px 20px)"
      : "repeating-linear-gradient(45deg, #F5F5F5 0 9px, #E8E8E8 9px 18px)";
  return (
    <div className={`relative ${className}`} style={{ background: bg }} aria-hidden>
      <span className="absolute bottom-3 left-3 font-l-mono text-[11px] text-muted">
        [ {label} ]
      </span>
    </div>
  );
}

/* Floating scan-result card shown over the hero photo (spec §2). */
export function FloatingResultCard({
  copy,
  className = "",
}: {
  copy: LandingCopy;
  className?: string;
}) {
  const c = copy.card;
  return (
    <div
      className={`bg-white border border-line shadow-float p-4 animate-float [will-change:transform] ${className}`}
    >
      <Photo label={copy.ph.scan} className="h-24 w-full" variant="b" />
      <p className="mt-3 font-l-display font-extrabold text-[17px] text-ink">{c.model}</p>
      <p className="text-[11px] uppercase tracking-[0.1em] text-[#777]">{c.meta}</p>
      <div className="mt-3 border-t border-line pt-3">
        <p className="text-[10px] uppercase tracking-[0.08em] text-[#777]">{c.estLabel}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-l-display font-extrabold text-[20px] text-ink">{c.est}</span>
          <span className="text-[11px] font-semibold text-emerald">{c.hype}</span>
        </div>
      </div>
    </div>
  );
}

/* Legal footer links reused by both layouts. */
export function LegalLinks({ copy, className = "" }: { copy: LandingCopy; className?: string }) {
  return (
    <div className={`flex gap-6 text-[13px] text-muted-2 ${className}`}>
      <Link href="/terms">{copy.footer.terms}</Link>
      <Link href="/privacy">{copy.footer.privacy}</Link>
    </div>
  );
}
