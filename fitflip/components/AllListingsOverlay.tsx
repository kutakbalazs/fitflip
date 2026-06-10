"use client";

import { useEffect } from "react";
import type { Listing } from "@/lib/listings/types";

type Props = {
  open: boolean;
  onClose: () => void;
  lang: "hu" | "en";
  /** Visually confirmed same-product matches. */
  exactListings: Listing[];
  /** Same search, rejected by visual verification (other colorway etc.). */
  similarListings: Listing[];
};

function sourceLabel(source: string): string {
  if (source === "vinted") return "Vinted";
  if (source === "jofogas") return "Jófogás";
  if (source === "ebay") return "eBay";
  return source;
}

/**
 * Full-screen "all listings" view: a single-column list of every found
 * listing. On mobile it covers the whole screen like a card; on desktop it
 * renders as a page-like surface with a close (X) button.
 */
export default function AllListingsOverlay({
  open,
  onClose,
  lang,
  exactListings,
  similarListings,
}: Props) {
  // Lock body scroll while the overlay is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const hu = lang === "hu";
  const total = exactListings.length + similarListings.length;

  const Card = ({ l }: { l: Listing }) => (
    <li className="border border-ink-100 dark:border-ink-700 rounded-2xl overflow-hidden bg-white dark:bg-ink-950 hover:border-ink-300 transition">
      <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-3">
        {l.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={l.imageUrl}
            alt={l.title}
            loading="lazy"
            className="w-20 h-20 rounded-lg object-cover bg-ink-50 dark:bg-ink-800 shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-ink-50 dark:bg-ink-800 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2">{l.title}</p>
          <p className="text-sm text-ink-900 dark:text-ink-50 mt-1">{l.priceLabel}</p>
          <p className="text-[11px] uppercase tracking-wider text-ink-500 dark:text-ink-400 mt-1">
            {sourceLabel(l.source)}
            {l.location ? ` · ${l.location}` : ""}
          </p>
        </div>
      </a>
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-ink-950 overflow-y-auto overscroll-contain">
      {/* Sticky header with title + close */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-ink-950/95 backdrop-blur-sm border-b border-ink-100 dark:border-ink-700">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-display tracking-tight">
            {hu ? `Összes hirdetés (${total})` : `All listings (${total})`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={hu ? "Bezárás" : "Close"}
            className="w-9 h-9 rounded-full border border-ink-200 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white flex items-center justify-center transition shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 pb-16">
        {exactListings.length > 0 && (
          <>
            <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-3">
              {hu ? `Pontos találatok (${exactListings.length})` : `Exact matches (${exactListings.length})`}
            </p>
            <ul className="space-y-3 mb-8">
              {exactListings.map((l, i) => (
                <Card key={`e-${l.url}-${i}`} l={l} />
              ))}
            </ul>
          </>
        )}

        {similarListings.length > 0 && (
          <>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 text-sky-900 dark:text-sky-200 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p className="text-xs leading-snug">
                {hu
                  ? "Hasonló darabok — ugyanaz a modell, de eltérő szín/kivitel, vagy a fotó alapján nem erősíthető meg az egyezés."
                  : "Similar items — same model but different colorway/finish, or the match couldn't be confirmed from the photo."}
              </p>
            </div>
            <ul className="space-y-3">
              {similarListings.map((l, i) => (
                <Card key={`s-${l.url}-${i}`} l={l} />
              ))}
            </ul>
          </>
        )}

        {total === 0 && (
          <p className="text-sm text-ink-500 dark:text-ink-400 text-center py-10">
            {hu ? "Nincs megjeleníthető hirdetés." : "No listings to show."}
          </p>
        )}
      </div>
    </div>
  );
}
