"use client";

import { useEffect, useState } from "react";
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

type WatcherRow = {
  id: string;
  scan_id: string;
  target_price_huf: number;
  search_brand: string | null;
  search_model: string | null;
  search_color: string | null;
  search_item_type: string | null;
  size_filter: string | null;
  active: boolean;
  created_at: string;
  last_checked_at: string | null;
};

// Human-readable fallback name when brand+model are unknown.
function fallbackName(
  itemType: string | null,
  color: string | null,
  lang: "hu" | "en",
): string {
  const TYPE_HU: Record<string, string> = {
    sneaker: "Sneaker", boot: "Bakancs", sandal: "Szandál",
    "t-shirt": "Póló", longsleeve: "Hosszúujjú", hoodie: "Hoodie",
    sweatshirt: "Pulóver", jacket: "Kabát", coat: "Kabát", vest: "Mellény",
    pants: "Nadrág", jeans: "Farmer", shorts: "Rövidnadrág",
    skirt: "Szoknya", dress: "Ruha", cap: "Sapka", hat: "Kalap",
    beanie: "Kötött sapka", bag: "Táska", belt: "Öv", scarf: "Sál",
    gloves: "Kesztyű", accessory: "Kiegészítő", other: "Darab",
  };
  const TYPE_EN: Record<string, string> = {
    sneaker: "Sneaker", boot: "Boot", sandal: "Sandal",
    "t-shirt": "T-shirt", longsleeve: "Longsleeve", hoodie: "Hoodie",
    sweatshirt: "Sweatshirt", jacket: "Jacket", coat: "Coat", vest: "Vest",
    pants: "Pants", jeans: "Jeans", shorts: "Shorts",
    skirt: "Skirt", dress: "Dress", cap: "Cap", hat: "Hat",
    beanie: "Beanie", bag: "Bag", belt: "Belt", scarf: "Scarf",
    gloves: "Gloves", accessory: "Accessory", other: "Item",
  };
  const map = lang === "hu" ? TYPE_HU : TYPE_EN;
  const noun = itemType && map[itemType] ? map[itemType] : map.other;
  if (color && color.trim().length > 0) {
    // HU: "Fekete sneaker" / EN: "Black sneaker"
    const cap = color.charAt(0).toUpperCase() + color.slice(1);
    return lang === "hu" ? `${cap} ${noun.toLowerCase()}` : `${cap} ${noun.toLowerCase()}`;
  }
  return noun;
}

type NotificationRow = {
  id: string;
  watcher_id: string;
  listings: ListingPreview[];
  created_at: string;
};

function formatHuf(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("hu-HU").format(n) + " Ft";
}

function formatDate(iso: string, lang: "hu" | "en"): string {
  return new Date(iso).toLocaleDateString(lang === "hu" ? "hu-HU" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function WatchersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [lang, setLang] = useState<"hu" | "en">("hu");
  const [loading, setLoading] = useState(true);
  const [watchers, setWatchers] = useState<WatcherRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
      void refresh();
    });
  }, [router, supabase]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [wRes, nRes] = await Promise.all([
        fetch("/api/watchers"),
        fetch("/api/notifications"),
      ]);
      const wData = await wRes.json().catch(() => ({}));
      const nData = await nRes.json().catch(() => ({}));
      setWatchers((wData?.watchers as WatcherRow[]) ?? []);
      setNotifications((nData?.notifications as NotificationRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async (id: string) => {
    const ok = window.confirm(
      lang === "hu"
        ? "Biztos kikapcsolod ezt az árfigyelőt?"
        : "Turn off this watcher?",
    );
    if (!ok) return;
    haptic("tap");
    setWatchers((prev) => prev.filter((w) => w.id !== id));
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await fetch(`/api/watchers/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group notifications by watcher_id, dedup listings by URL (newest first).
  const findingsFor = (watcherId: string): ListingPreview[] => {
    const seen = new Set<string>();
    const result: ListingPreview[] = [];
    const matches = notifications
      .filter((n) => n.watcher_id === watcherId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    for (const n of matches) {
      for (const l of n.listings ?? []) {
        if (seen.has(l.url)) continue;
        seen.add(l.url);
        result.push(l);
      }
    }
    return result;
  };

  const t = lang === "hu"
    ? {
        title: "Követett termékeim",
        back: "← Vissza",
        empty: "Még nincs aktív árfigyelőd",
        emptySub: "Aktiválj egyet egy scan-eredménynél, és itt megtalálod a futó figyeléseidet.",
        newScan: "Új scan",
        targetUnder: (p: string) => `Célár: ${p} alatt`,
        sizeLabel: (s: string) => `Méret: ${s}`,
        sinceLabel: (d: string) => `Aktív ${d} óta`,
        findingsCount: (n: number) => (n === 0 ? "Még nincs új találat" : `${n} új találat`),
        unsubscribe: "Leiratkozás",
        unknown: "Ismeretlen darab",
      }
    : {
        title: "Followed items",
        back: "← Back",
        empty: "No active watchers yet",
        emptySub: "Activate one on a scan result — your running watchers will show up here.",
        newScan: "New scan",
        targetUnder: (p: string) => `Target: under ${p}`,
        sizeLabel: (s: string) => `Size: ${s}`,
        sinceLabel: (d: string) => `Active since ${d}`,
        findingsCount: (n: number) => (n === 0 ? "No new findings yet" : `${n} new finding${n === 1 ? "" : "s"}`),
        unsubscribe: "Unsubscribe",
        unknown: "Unknown item",
      };

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
        <h1 className="text-3xl font-display tracking-tight mb-8">{t.title}</h1>

        {loading ? (
          <div className="text-center text-ink-500 dark:text-ink-400 py-12">…</div>
        ) : watchers.length === 0 ? (
          <div className="border border-ink-100 dark:border-ink-700 rounded-2xl p-10 bg-ink-50 dark:bg-ink-800 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white dark:bg-ink-950 border border-ink-100 dark:border-ink-700 flex items-center justify-center text-ink-400 dark:text-ink-500">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 14" />
              </svg>
            </div>
            <p className="font-medium mb-1">{t.empty}</p>
            <p className="text-sm text-ink-500 dark:text-ink-400 max-w-sm mx-auto leading-relaxed mb-5">
              {t.emptySub}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 text-sm font-medium hover:bg-ink-700 dark:hover:bg-ink-100 transition"
            >
              {t.newScan}
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {watchers.map((w) => {
              const findings = findingsFor(w.id);
              const isOpen = expanded.has(w.id);
              const title = (w.search_brand || w.search_model)
                ? `${w.search_brand ?? ""}${w.search_model ? " — " + w.search_model : ""}`.trim()
                : fallbackName(w.search_item_type, w.search_color, lang);
              return (
                <li
                  key={w.id}
                  className="border border-ink-100 dark:border-ink-700 rounded-2xl bg-white dark:bg-ink-800"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(w.id)}
                    className="w-full p-4 text-left flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">
                        {title}
                      </p>
                      <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
                        {t.targetUnder(formatHuf(w.target_price_huf))}
                        {w.size_filter ? ` · ${t.sizeLabel(w.size_filter)}` : ""}
                        {" · "}
                        {t.findingsCount(findings.length)}
                      </p>
                      <p className="text-[11px] text-ink-400 dark:text-ink-500 mt-1">
                        {t.sinceLabel(formatDate(w.created_at, lang))}
                      </p>
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-ink-400 dark:text-ink-500 transition shrink-0 mt-1.5 ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="border-t border-ink-100 dark:border-ink-700">
                      {findings.length === 0 ? (
                        <p className="px-4 py-5 text-xs text-ink-500 dark:text-ink-400 text-center">
                          {t.findingsCount(0)}
                        </p>
                      ) : (
                        <ul className="divide-y divide-ink-100 dark:divide-ink-700">
                          {findings.map((l, idx) => (
                            <li key={`${l.url}-${idx}`}>
                              <a
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex gap-3 p-3 hover:bg-ink-50 dark:hover:bg-ink-700/40 transition"
                              >
                                {l.imageUrl ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={l.imageUrl}
                                    alt={l.title}
                                    loading="lazy"
                                    className="w-16 h-16 rounded-lg object-cover bg-ink-50 dark:bg-ink-700 shrink-0"
                                  />
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
                      <div className="border-t border-ink-100 dark:border-ink-700 p-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => unsubscribe(w.id)}
                          className="px-3 py-1.5 rounded-full border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        >
                          {t.unsubscribe}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <footer className="px-6 py-6 border-t border-ink-100 dark:border-ink-700">
        <LegalFooter />
      </footer>
    </main>
  );
}
