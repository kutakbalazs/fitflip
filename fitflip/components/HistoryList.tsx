"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readLang, onLangChange, type Lang } from "@/lib/lang";
import { haptic } from "@/lib/haptics";

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

const SWIPE_DELETE_THRESHOLD = 90;

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

type Texts = {
  notRecognized: string;
  condition: string;
  estValue: string;
  discount: (n: number) => string;
  defects: string;
  confirmDelete: string;
};

/**
 * Client-side history list: the server page fetches the data, this renders
 * it in the user's UI language. Each row can be swiped left to delete (with a
 * confirmation); the deleted scan is removed from the DB so it also disappears
 * from the home screen's recent items.
 */
export default function HistoryList({ items: initialItems }: { items: HistoryScan[] }) {
  const [lang, setLang] = useState<Lang>("hu");
  const [items, setItems] = useState<HistoryScan[]>(initialItems);

  useEffect(() => {
    setLang(readLang());
    return onLangChange(setLang);
  }, []);

  // Keep in sync if the server passes a fresh list (e.g. after navigation).
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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
    confirmDelete: hu
      ? "Biztosan törlöd ezt a scant az előzményekből?"
      : "Delete this scan from your history?",
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((s) => s.id !== id));

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
              className="inline-block px-6 py-2.5 rounded-full bg-ink-900 dark:bg-ink-700 text-white text-sm font-medium hover:bg-ink-700 transition"
            >
              {t.newScan}
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((scan) => (
              <HistoryItem
                key={scan.id}
                scan={scan}
                lang={lang}
                t={t}
                onDeleted={() => removeItem(scan.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function HistoryItem({
  scan,
  lang,
  t,
  onDeleted,
}: {
  scan: HistoryScan;
  lang: Lang;
  t: Texts;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [drag, setDrag] = useState(0);
  const [removing, setRemoving] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const swipeLocked = useRef<"horizontal" | "vertical" | null>(null);
  const didSwipe = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (removing) return;
    startX.current = e.touches[0]?.clientX ?? null;
    startY.current = e.touches[0]?.clientY ?? null;
    swipeLocked.current = null;
    didSwipe.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null || removing) return;
    const dx = (e.touches[0]?.clientX ?? 0) - startX.current;
    const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
    if (!swipeLocked.current) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        swipeLocked.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      }
    }
    if (swipeLocked.current === "horizontal") {
      didSwipe.current = true;
      setDrag(Math.min(0, dx)); // left swipe only
    }
  };
  const onTouchEnd = () => {
    if (drag <= -SWIPE_DELETE_THRESHOLD) {
      askDelete();
    } else {
      setDrag(0);
    }
    startX.current = null;
    startY.current = null;
    swipeLocked.current = null;
  };

  const askDelete = () => {
    const ok = window.confirm(t.confirmDelete);
    if (!ok) {
      setDrag(0);
      return;
    }
    void doDelete();
  };

  const doDelete = async () => {
    setRemoving(true);
    haptic("tap");
    // wait for the slide-out animation before unmounting
    await new Promise((r) => setTimeout(r, 320));
    onDeleted();
    fetch(`/api/scans/${scan.id}`, { method: "DELETE" }).catch(() => {});
  };

  const handleClick = () => {
    // A swipe just happened — don't treat the touch-end as a navigation tap.
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    if (scan.recognized) router.push(`/scan/${scan.id}`);
  };

  const removeTranslate = removing ? "-100%" : `${drag}px`;
  const redBarOpacity = Math.min(1, Math.abs(drag) / SWIPE_DELETE_THRESHOLD);

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
      className="relative overflow-hidden rounded-2xl"
      style={{
        transition: removing ? "max-height 0.32s ease, opacity 0.32s ease" : undefined,
        maxHeight: removing ? 0 : 1000,
        opacity: removing ? 0 : 1,
      }}
    >
      {/* Red delete bar revealed during the left swipe */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-6 bg-red-500 text-white"
        style={{
          width: `${Math.min(100, (Math.abs(drag) / SWIPE_DELETE_THRESHOLD) * 100)}%`,
          opacity: redBarOpacity,
          minWidth: drag < 0 ? "60px" : "0",
        }}
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </div>

      <div
        className={`relative bg-white dark:bg-ink-950 border border-ink-100 dark:border-ink-700 rounded-2xl p-5 ${scan.recognized ? "cursor-pointer hover:bg-ink-50 dark:hover:bg-ink-800" : ""} transition`}
        style={{
          transform: `translateX(${removeTranslate})`,
          transition: startX.current === null ? "transform 0.22s ease" : "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
      >
        {inner}
      </div>
    </li>
  );
}
