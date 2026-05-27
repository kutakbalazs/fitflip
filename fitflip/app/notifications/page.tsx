"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LegalFooter from "@/components/LegalFooter";
import { haptic } from "@/lib/haptics";

type ListingPreview = {
  source: string;
  title: string;
  priceHuf: number | null;
  priceLabel: string;
  url: string;
  imageUrl: string | null;
  location: string | null;
};

type NotificationRow = {
  id: string;
  watcher_id: string;
  listings: ListingPreview[];
  scan_brand: string | null;
  scan_model: string | null;
  target_price_huf: number;
  read_at: string | null;
  created_at: string;
};

const SWIPE_DELETE_THRESHOLD = 90;

function formatHuf(n: number | null): string {
  if (n === null) return "—";
  return new Intl.NumberFormat("hu-HU").format(n) + " Ft";
}

function formatDate(iso: string, lang: "hu" | "en"): string {
  return new Date(iso).toLocaleDateString(lang === "hu" ? "hu-HU" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [lang, setLang] = useState<"hu" | "en">("hu");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("ff-lang") ?? localStorage.getItem("ff_lang");
      if (savedLang === "en") setLang("en");
    } catch {
      /* ignore */
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      fetchNotifications();
    });
  }, [router, supabase]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setItems((data?.notifications as NotificationRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  };

  const deleteOne = async (id: string) => {
    setRemoving((prev) => new Set(prev).add(id));
    haptic("tap");
    // wait for slide-out animation
    await new Promise((r) => setTimeout(r, 320));
    setItems((prev) => prev.filter((n) => n.id !== id));
    setRemoving((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const markAllRead = async () => {
    haptic("tap");
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    }).catch(() => {});
  };

  const deleteAll = async () => {
    if (items.length === 0) return;
    if (!window.confirm(lang === "hu" ? "Biztos törlöd az összes értesítést?" : "Delete all notifications?")) return;
    haptic("tap");
    // staggered slide-out
    setRemoving(new Set(items.map((i) => i.id)));
    await new Promise((r) => setTimeout(r, 420));
    setItems([]);
    setRemoving(new Set());
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_all" }),
    }).catch(() => {});
  };

  const t = lang === "hu"
    ? {
        title: "Értesítések",
        back: "← Vissza",
        empty: "Még nincs értesítésed",
        emptySub: "Aktiválj árfigyelőt egy scan-eredménynél, és értesítést kapsz ha új hirdetést talál az AI a célárad alatt.",
        markAllRead: "Mind olvasott",
        deleteAll: "Összes törlése",
        priceUnder: (p: string) => `${p} Ft alatti új találat`,
        listingsCount: (n: number) => `${n} új hirdetés`,
        viewListing: "Megtekintés →",
        swipeHint: "Húzd balra a törléshez",
      }
    : {
        title: "Notifications",
        back: "← Back",
        empty: "No notifications yet",
        emptySub: "Activate a price watcher on a scan result and we'll ping you when the AI finds a new listing under your target.",
        markAllRead: "Mark all read",
        deleteAll: "Delete all",
        priceUnder: (p: string) => `New matches under ${p} Ft`,
        listingsCount: (n: number) => `${n} new listing${n === 1 ? "" : "s"}`,
        viewListing: "Open →",
        swipeHint: "Swipe left to delete",
      };

  const hasItems = items.length > 0;
  const hasUnread = items.some((n) => !n.read_at);

  return (
    <main className="min-h-dvh flex flex-col bg-white dark:bg-ink-950">
      <header className="px-6 py-5 flex items-center justify-between border-b border-ink-100 dark:border-ink-700">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-display tracking-tight">FitFlip</span>
          <span className="text-xs text-ink-500 dark:text-ink-400 hidden sm:inline">.app</span>
        </Link>
        <Link href="/" className="text-sm text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white transition">
          {t.back}
        </Link>
      </header>

      <section className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-3xl font-display tracking-tight">{t.title}</h1>
          {hasItems && (
            <div className="flex items-center gap-3 text-xs">
              {hasUnread && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white transition underline"
                >
                  {t.markAllRead}
                </button>
              )}
              <button
                type="button"
                onClick={deleteAll}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition underline"
              >
                {t.deleteAll}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center text-ink-500 dark:text-ink-400 py-12">…</div>
        ) : !hasItems ? (
          <div className="border border-ink-100 dark:border-ink-700 rounded-2xl p-10 bg-ink-50 dark:bg-ink-800 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white dark:bg-ink-950 border border-ink-100 dark:border-ink-700 flex items-center justify-center text-ink-400 dark:text-ink-500">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className="font-medium mb-1">{t.empty}</p>
            <p className="text-sm text-ink-500 dark:text-ink-400 max-w-sm mx-auto leading-relaxed">
              {t.emptySub}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                item={n}
                removing={removing.has(n.id)}
                onDelete={() => deleteOne(n.id)}
                onOpen={() => markRead(n.id)}
                t={t}
                lang={lang}
              />
            ))}
          </ul>
        )}
      </section>

      <footer className="px-6 py-6 border-t border-ink-100 dark:border-ink-700">
        <LegalFooter />
      </footer>
    </main>
  );
}

function NotificationItem({
  item,
  removing,
  onDelete,
  onOpen,
  t,
  lang,
}: {
  item: NotificationRow;
  removing: boolean;
  onDelete: () => void;
  onOpen: () => void;
  t: {
    priceUnder: (p: string) => string;
    listingsCount: (n: number) => string;
    viewListing: string;
  };
  lang: "hu" | "en";
}) {
  const [drag, setDrag] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const swipeLocked = useRef<"horizontal" | "vertical" | null>(null);

  const isUnread = !item.read_at;
  const listings = Array.isArray(item.listings) ? item.listings : [];

  const onTouchStart = (e: React.TouchEvent) => {
    if (removing) return;
    startX.current = e.touches[0]?.clientX ?? null;
    startY.current = e.touches[0]?.clientY ?? null;
    swipeLocked.current = null;
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
      // only left swipe
      const left = Math.min(0, dx);
      setDrag(left);
    }
  };
  const onTouchEnd = () => {
    if (drag <= -SWIPE_DELETE_THRESHOLD) {
      onDelete();
    } else {
      setDrag(0);
    }
    startX.current = null;
    startY.current = null;
    swipeLocked.current = null;
  };

  const removeTranslate = removing ? "-100%" : `${drag}px`;
  const removeOpacity = removing ? 0 : 1;
  const redBarOpacity = Math.min(1, Math.abs(drag) / SWIPE_DELETE_THRESHOLD);

  const handleHeaderClick = () => {
    setExpanded((v) => !v);
    if (isUnread) onOpen();
  };

  return (
    <li
      className="relative overflow-hidden rounded-2xl"
      style={{
        transition: removing ? "transform 0.32s ease, opacity 0.32s ease, max-height 0.32s ease" : undefined,
        maxHeight: removing ? 0 : 600,
      }}
    >
      {/* Red delete bar revealed during swipe */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-6 bg-red-500 text-white text-sm font-medium"
        style={{
          width: `${Math.min(100, (Math.abs(drag) / SWIPE_DELETE_THRESHOLD) * 100)}%`,
          opacity: redBarOpacity,
          minWidth: drag < 0 ? "60px" : "0",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </div>

      <div
        className="relative bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 rounded-2xl"
        style={{
          transform: `translateX(${removeTranslate})`,
          opacity: removeOpacity,
          transition: startX.current === null ? "transform 0.22s ease, opacity 0.32s ease" : "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={handleHeaderClick}
          className="w-full p-4 text-left flex items-start gap-3"
        >
          <div className="shrink-0 w-2 h-2 rounded-full mt-2"
            style={{ backgroundColor: isUnread ? "#ef4444" : "transparent" }}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm leading-snug ${isUnread ? "font-bold" : "font-normal"}`}>
              {(item.scan_brand || item.scan_model)
                ? `${item.scan_brand ?? ""}${item.scan_model ? " — " + item.scan_model : ""}`
                : (lang === "hu" ? "Új találat" : "New match")}
            </p>
            <p className={`text-xs text-ink-500 dark:text-ink-400 mt-0.5 ${isUnread ? "font-semibold" : ""}`}>
              {t.priceUnder(new Intl.NumberFormat("hu-HU").format(item.target_price_huf))} · {t.listingsCount(listings.length)}
            </p>
            <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">
              {formatDate(item.created_at, lang)}
            </p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-ink-400 dark:text-ink-500 transition shrink-0 mt-1.5 ${expanded ? "rotate-180" : ""}`} aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {expanded && (
          <ul className="border-t border-ink-100 dark:border-ink-700 divide-y divide-ink-100 dark:divide-ink-700">
            {listings.map((l, idx) => (
              <li key={`${l.url}-${idx}`}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 p-3 hover:bg-ink-50 dark:hover:bg-ink-700/40 transition"
                >
                  {l.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={l.imageUrl} alt={l.title} loading="lazy" className="w-16 h-16 rounded-lg object-cover bg-ink-50 dark:bg-ink-700 shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-ink-50 dark:bg-ink-700 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{l.title}</p>
                    <p className="text-sm mt-0.5">{l.priceLabel}</p>
                    <p className="text-[11px] uppercase tracking-wider text-ink-500 dark:text-ink-400 mt-1">
                      {l.source}
                      {l.location ? ` · ${l.location}` : ""}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
