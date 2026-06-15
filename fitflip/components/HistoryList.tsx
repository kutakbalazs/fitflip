"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readLang, onLangChange, type Lang } from "@/lib/lang";

export type HistoryScan = {
  id: string;
  created_at: string;
  recognized: boolean;
  brand: string | null;
  model: string | null;
  era: string | null;
  condition: string | null;
  estimated_value_min_huf: number | null;
  estimated_value_max_huf: number | null;
  description: string | null;
  confidence: string | null;
  image_path: string | null;
  defects: string[] | null;
  condition_discount_pct: number | null;
  imageUrl: string | null;
};

function formatHuf(n: number | null): string {
  if (n === null) return "—";
  return new Intl.NumberFormat("hu-HU").format(n) + " Ft";
}

function formatDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === "hu" ? "hu-HU" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Client-side history list: the server page fetches the data, this renders
 * it in the user's UI language (and switches live with the language event).
 */
export default function HistoryList({ items }: { items: HistoryScan[] }) {
  const [lang, setLang] = useState<Lang>("hu");

  useEffect(() => {
    setLang(readLang());
    return onLangChange(setLang);
  }, []);

  const hu = lang === "hu";
  const t = {
    title: hu ? "Scan előzmények" : "Scan history",
    back: hu ? "← Vissza" : "← Back",
    empty: hu ? "Még nincs scan-ed" : "No scans yet",
    emptySub: hu
      ? "Töltsd fel az első darabodat — sneakert, ruhát, bármit."
      : "Upload your first piece — sneakers, clothing, anything.",
    newScan: hu ? "Új scan" : "New scan",
    notRecognized: hu ? "Nem azonosított" : "Not identified",
    condition: hu ? "Állapot: " : "Condition: ",
    estValue: hu ? "Becsült érték: " : "Estimated value: ",
    discount: (n: number) =>
      hu ? ` (${n}% levonva sérülés miatt)` : ` (${n}% deducted for damage)`,
    defects: hu ? "Látható hibák" : "Visible flaws",
  };

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-6 pb-5 safe-pt-5 flex items-center justify-between border-b border-ink-100 dark:border-ink-700">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-display tracking-tight">FitFlip</span>
          <span className="text-xs text-ink-500 dark:text-ink-400 hidden sm:inline">.app</span>
        </Link>
        <Link href="/" className="text-sm text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white transition">
          {t.back}
        </Link>
      </header>

      <section className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-display tracking-tight mb-8">{t.title}</h1>

        {items.length === 0 ? (
          <div className="border border-ink-100 dark:border-ink-700 rounded-2xl p-10 bg-ink-50 dark:bg-ink-800 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white dark:bg-ink-950 border border-ink-100 dark:border-ink-700 flex items-center justify-center text-ink-400 dark:text-ink-500">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-4-4-8 8" />
              </svg>
            </div>
            <p className="font-medium mb-1">{t.empty}</p>
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-5">{t.emptySub}</p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-full bg-ink-900 text-white text-sm font-medium hover:bg-ink-700 transition"
            >
              {t.newScan}
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((scan) => {
              const inner = (
                <div className="flex gap-4">
                  {scan.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={scan.imageUrl}
                      alt={scan.brand ?? "scan"}
                      loading="lazy"
                      className="w-20 h-20 rounded-lg object-cover bg-ink-50 dark:bg-ink-800 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-ink-50 dark:bg-ink-800 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h2 className="font-medium truncate">
                          {scan.recognized
                            ? <>{scan.brand ?? "—"}{scan.model ? <span className="text-ink-500 dark:text-ink-400"> — {scan.model}</span> : null}</>
                            : <span className="text-ink-500 dark:text-ink-400">{t.notRecognized}</span>
                          }
                        </h2>
                        {scan.era && (
                          <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{scan.era}</p>
                        )}
                      </div>
                      <time className="text-xs text-ink-500 dark:text-ink-400 shrink-0">
                        {formatDate(scan.created_at, lang)}
                      </time>
                    </div>
                    {scan.recognized && (
                      <div className="text-sm text-ink-700 dark:text-ink-200 space-y-1 mt-1">
                        {scan.condition && (
                          <p>
                            <span className="text-ink-500 dark:text-ink-400">{t.condition}</span>
                            {scan.condition}
                          </p>
                        )}
                        {(scan.estimated_value_min_huf !== null || scan.estimated_value_max_huf !== null) && (
                          <p>
                            <span className="text-ink-500 dark:text-ink-400">{t.estValue}</span>
                            {formatHuf(scan.estimated_value_min_huf)} – {formatHuf(scan.estimated_value_max_huf)}
                            {scan.condition_discount_pct && scan.condition_discount_pct > 0 ? (
                              <span className="text-ink-500 dark:text-ink-400">{t.discount(scan.condition_discount_pct)}</span>
                            ) : null}
                          </p>
                        )}
                      </div>
                    )}
                    {scan.defects && scan.defects.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                        <p className="text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">
                          {t.defects}
                        </p>
                        <ul className="text-xs text-amber-900 dark:text-amber-200 space-y-0.5">
                          {scan.defects.map((d, i) => (
                            <li key={i}>• {d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {scan.description && (
                      <p className="text-xs text-ink-500 dark:text-ink-400 mt-3 leading-relaxed">
                        {scan.description}
                      </p>
                    )}
                  </div>
                </div>
              );
              return (
                <li
                  key={scan.id}
                  className="border border-ink-100 dark:border-ink-700 rounded-2xl overflow-hidden"
                >
                  {scan.recognized ? (
                    <Link
                      href={`/scan/${scan.id}`}
                      className="block p-5 hover:bg-ink-50 dark:hover:bg-ink-800 transition"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="p-5">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
