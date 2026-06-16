"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readLang, type Lang } from "@/lib/lang";
import { hypeBadgeLabel } from "@/lib/hype";
import { haptic } from "@/lib/haptics";
import { setPendingScanFile } from "@/lib/pendingScan";
import StoryModal from "@/components/StoryModal";
import AllListingsOverlay from "@/components/AllListingsOverlay";
import type { Listing } from "@/lib/listings/types";

export type ScanDetailData = {
  id: string;
  recognized: boolean;
  itemType: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  era: string | null;
  condition: string | null;
  estimatedValueMinHuf: number | null;
  estimatedValueMaxHuf: number | null;
  description: string | null;
  searchQuery: string | null;
  sellingTip: string | null;
  confidence: "low" | "medium" | "high" | null;
  defects: string[];
  conditionDiscountPct: number | null;
  isDefinitelyNew: boolean | null;
  story: string | null;
  hypeScore: number | null;
  hypeLabel: string | null;
  imageUrl: string | null;
};

function formatHuf(n: number | null): string {
  if (n === null) return "—";
  return `${n.toLocaleString("hu-HU").replace(/,/g, " ")} Ft`;
}

// Inline preview of a few "similar" listings (rejected by the visual
// verifier — other colorway/finish) shown under the exact matches.
function SimilarSection({ items, hu }: { items: Listing[]; hu: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-2">
        {hu ? "Hasonló darabok" : "Similar items"}
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((l, idx) => (
          <li
            key={`sim-${l.source}-${idx}`}
            className="border border-ink-100 dark:border-ink-700 rounded-2xl overflow-hidden bg-white dark:bg-ink-950 hover:border-ink-300 transition"
          >
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
                  {l.source === "vinted"
                    ? "Vinted"
                    : l.source === "jofogas"
                      ? "Jófogás"
                      : l.source === "ebay"
                        ? "eBay"
                        : (l.source as string)}
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function hypeBadgeStyle(score: number): string {
  if (score >= 9) return "bg-ink-900 text-white";
  if (score >= 7) return "bg-amber-100 text-amber-900 dark:text-amber-200";
  return "bg-white dark:bg-ink-950 text-ink-700 dark:text-ink-200 border border-ink-200 dark:border-ink-700";
}

export default function ScanDetail({ data }: { data: ScanDetailData }) {
  const router = useRouter();
  const newScanInputRef = useRef<HTMLInputElement>(null);
  const [lang, setLang] = useState<Lang>("hu");
  const [showStory, setShowStory] = useState(false);
  const [storyText, setStoryText] = useState<string | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyUnavailable, setStoryUnavailable] = useState(false);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [showAllListings, setShowAllListings] = useState(false);
  const [listingsExact, setListingsExact] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Shared in-flight story request (prefetch + button tap join the same
  // promise, so the story is never generated twice).
  const storyFetchRef = useRef<Promise<string | null> | null>(null);
  const fetchStory = (language: Lang): Promise<string | null> => {
    if (!storyFetchRef.current) {
      storyFetchRef.current = fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_id: data.id, lang: language }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => (typeof d?.story === "string" && d.story.trim().length > 0 ? d.story : null))
        .catch(() => null);
    }
    return storyFetchRef.current;
  };

  useEffect(() => {
    const l = readLang();
    setLang(l);
    // Background prefetch: hyped item without a stored story → start
    // generating right away so the button opens (nearly) instantly.
    if (
      !(data.story && data.story.trim().length > 0) &&
      typeof data.hypeScore === "number" &&
      data.hypeScore >= 7 &&
      data.brand
    ) {
      setStoryLoading(true);
      fetchStory(l).then((s) => {
        setStoryLoading(false);
        if (s) setStoryText(s);
        else setStoryUnavailable(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hu = lang === "hu";
  const title = `${data.brand ?? ""}${data.model ? ` — ${data.model}` : ""}`.trim();

  const runSearch = async () => {
    setLoading(true);
    setSearched(true);
    haptic("tap");
    try {
      const brand = data.brand?.trim() ?? "";
      const model = data.model?.trim() ?? "";
      const color = data.color?.trim() ?? "";
      const sq = data.searchQuery?.trim() ?? "";
      const brandTokens = brand ? brand.split(/\s+/).filter(Boolean) : [];
      const modelTokens = model ? model.split(/\s+/).filter(Boolean) : [];
      const colorTokens = color ? color.split(/\s+/).filter(Boolean) : [];

      // Same query-variant strategy as the fresh-scan flow: different
      // marketplaces respond to different phrasings, so cast a wide net.
      const lastBrand = brandTokens[brandTokens.length - 1] ?? "";
      const firstModel = modelTokens[0] ?? "";
      const firstColor = colorTokens[0] ?? "";
      const lastColor = colorTokens[colorTokens.length - 1] ?? "";
      const queries: string[] = [];
      const push = (q: string) => {
        const t = q.trim();
        if (t && !queries.includes(t)) queries.push(t);
      };
      if (brand) push(`${brand} ${model}`.trim());
      if (sq) push(sq);
      if (lastBrand && firstModel) push(`${lastBrand} ${firstModel}`);
      if (lastBrand && firstModel && firstColor) push(`${lastBrand} ${firstModel} ${firstColor}`);
      if (lastBrand && lastColor) push(`${lastBrand} ${lastColor}`);
      if (queries.length === 0 && model) push(model);

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries,
          brandTokens,
          modelTokens,
          colorTokens,
          brand,
          model,
          color,
          itemType: data.itemType ?? "",
          scanId: data.id,
        }),
      });
      const json = await res.json();
      setListings(Array.isArray(json?.listings) ? json.listings : []);
      setSimilarListings(Array.isArray(json?.similar) ? json.similar : []);
      setListingsExact(json?.exact !== false);
    } catch {
      setListings([]);
      setSimilarListings([]);
      setListingsExact(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-6 pb-5 safe-pt-5 flex items-center justify-between border-b border-ink-100 dark:border-ink-700">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-display tracking-tight">FitFlip</span>
        </Link>
        <Link
          href="/history"
          className="text-sm text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white transition"
        >
          {hu ? "← Előzmények" : "← History"}
        </Link>
      </header>

      <section className="flex-1 px-6 py-6 max-w-2xl mx-auto w-full pb-10">
        {/* Image + hype badge */}
        {data.imageUrl && (
          <div className="relative aspect-square w-full max-w-xs mx-auto rounded-2xl overflow-hidden bg-ink-50 dark:bg-ink-800 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.imageUrl} alt={title} className="w-full h-full object-contain" />
            {data.hypeLabel && typeof data.hypeScore === "number" && data.hypeScore >= 7 && (
              <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm backdrop-blur-sm ${hypeBadgeStyle(data.hypeScore)}`}>
                {data.hypeScore >= 9 && <span className="mr-1">🔥</span>}
                {hypeBadgeLabel(data.hypeScore, lang)}
              </div>
            )}
          </div>
        )}

        {/* Result card */}
        <div className="border border-ink-100 dark:border-ink-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-ink-100 dark:border-ink-700">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-medium">
                  {data.brand}{" "}
                  {data.model && <span className="text-ink-500 dark:text-ink-400">— {data.model}</span>}
                </h1>
                {data.era && <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">{data.era}</p>}
              </div>
              {data.confidence && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  data.confidence === "high"
                    ? "bg-green-50 text-green-800"
                    : data.confidence === "medium"
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                      : "bg-ink-50 dark:bg-ink-800 text-ink-500 dark:text-ink-400"
                }`}>
                  {data.confidence === "high" ? (hu ? "Magas megbízhatóság" : "High confidence") : data.confidence === "medium" ? (hu ? "Közepes" : "Medium") : (hu ? "Alacsony" : "Low")}
                </span>
              )}
            </div>
          </div>

          <dl className="divide-y divide-ink-100 dark:divide-ink-800">
            {data.condition && (
              <div className="flex justify-between px-6 py-3 text-sm">
                <dt className="text-ink-500 dark:text-ink-400">{hu ? "Állapot" : "Condition"}</dt>
                <dd className="font-medium">{data.condition}</dd>
              </div>
            )}
            {(data.estimatedValueMinHuf !== null || data.estimatedValueMaxHuf !== null) && (
              <div className="flex justify-between px-6 py-3 text-sm">
                <dt className="text-ink-500 dark:text-ink-400">{hu ? "Becsült piaci ár" : "Estimated value"}</dt>
                <dd className="font-medium text-right">
                  {data.estimatedValueMinHuf === data.estimatedValueMaxHuf
                    ? formatHuf(data.estimatedValueMinHuf)
                    : `${formatHuf(data.estimatedValueMinHuf)} – ${formatHuf(data.estimatedValueMaxHuf)}`}
                </dd>
              </div>
            )}
          </dl>

          {data.defects.length > 0 && (
            <div className="px-6 py-4 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-100 text-sm text-amber-900 dark:text-amber-200">
              <p className="font-medium mb-2">{hu ? "Észlelt hibák" : "Detected flaws"}</p>
              <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
                {data.defects.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}

          {/* Description — exactly as originally generated (stored in DB) */}
          {data.description && (
            <div className="px-6 py-4 bg-ink-50 dark:bg-ink-800 text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
              {data.description}
            </div>
          )}

          {!storyUnavailable &&
            ((data.story && data.story.trim().length > 0) ||
              storyText ||
              (typeof data.hypeScore === "number" && data.hypeScore >= 7 && data.brand)) && (
            <button
              type="button"
              disabled={storyLoading}
              onClick={async () => {
                haptic("tap");
                const existing = storyText ?? (data.story?.trim() ? data.story : null);
                if (existing) {
                  setShowStory(true);
                  return;
                }
                // Joins the in-flight background prefetch (or starts one).
                setStoryLoading(true);
                const s = await fetchStory(lang);
                setStoryLoading(false);
                if (s) {
                  setStoryText(s);
                  setShowStory(true);
                } else {
                  setStoryUnavailable(true);
                }
              }}
              className="w-full flex items-center justify-between gap-3 px-6 py-3.5 border-t border-ink-100 dark:border-ink-700 text-left hover:bg-ink-50 dark:hover:bg-ink-800 transition group disabled:opacity-60"
            >
              <span className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-ink-900 text-white text-sm flex items-center justify-center" aria-hidden="true">★</span>
                <span className="text-sm font-medium">
                  {storyLoading
                    ? hu ? "Sztori betöltése…" : "Loading story…"
                    : hu ? "A darab története" : "The story of this piece"}
                </span>
              </span>
              {storyLoading ? (
                <span className="w-4 h-4 rounded-full border-2 border-ink-300 border-t-ink-900 dark:border-ink-600 dark:border-t-white animate-spin" aria-hidden="true" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-500 dark:text-ink-400 group-hover:text-ink-900 dark:group-hover:text-white transition" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Listings — not run automatically; user triggers a fresh search */}
        <div className="mt-6">
          <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-3">
            {hu ? "Hirdetések a piacról" : "Listings on the marketplace"}
          </p>

          {!searched && (
            <button
              type="button"
              onClick={runSearch}
              className="w-full px-6 py-3.5 rounded-2xl bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-medium hover:opacity-90 transition text-sm flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              {hu ? "Hirdetéskeresés futtatása" : "Run a listings search"}
            </button>
          )}

          {loading && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="border border-ink-100 dark:border-ink-700 rounded-2xl overflow-hidden bg-white dark:bg-ink-950">
                  <div className="flex gap-3 p-3">
                    <div className="w-20 h-20 rounded-lg bg-ink-100 dark:bg-ink-800 shrink-0 pulse-slow" />
                    <div className="flex-1 min-w-0 space-y-2 py-1">
                      <div className="h-3 w-4/5 rounded bg-ink-100 dark:bg-ink-800 pulse-slow" />
                      <div className="h-3 w-2/5 rounded bg-ink-100 dark:bg-ink-800 pulse-slow" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loading && searched && listings && listings.length > 0 && (
            <>
              {!listingsExact && (
                <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 text-sky-900 dark:text-sky-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <p className="text-xs leading-snug">
                    <strong className="font-semibold">
                      {hu ? "Hasonló találatok" : "Similar matches"}
                    </strong>
                    {" — "}
                    {hu
                      ? "ebben a pontos modellben/színben nincs aktuális hirdetés. Az alábbiak kapcsolódó találatok."
                      : "no listings for this exact model/colorway. The ones below are related matches."}
                  </p>
                </div>
              )}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {listings.slice(0, 6).map((l, idx) => (
                  <li key={`${l.source}-${idx}`} className="border border-ink-100 dark:border-ink-700 rounded-2xl overflow-hidden bg-white dark:bg-ink-950 hover:border-ink-300 transition">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-3">
                      {l.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={l.imageUrl} alt={l.title} loading="lazy" className="w-20 h-20 rounded-lg object-cover bg-ink-50 dark:bg-ink-800 shrink-0" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-ink-50 dark:bg-ink-800 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{l.title}</p>
                        <p className="text-sm text-ink-900 dark:text-ink-50 mt-1">{l.priceLabel}</p>
                        <p className="text-[11px] uppercase tracking-wider text-ink-500 dark:text-ink-400 mt-1">
                          {l.source === "vinted" ? "Vinted" : l.source === "jofogas" ? "Jófogás" : l.source === "ebay" ? "eBay" : (l.source as string)}
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
              {similarListings.length > 0 && (
                <SimilarSection items={similarListings.slice(0, 3)} hu={hu} />
              )}
              {(listings.length > 6 || similarListings.length > 3) && (
                <button
                  type="button"
                  onClick={() => {
                    haptic("tap");
                    setShowAllListings(true);
                  }}
                  className="w-full mt-3 px-4 py-2.5 rounded-full border border-ink-200 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-800 transition text-sm font-medium"
                >
                  {hu
                    ? `Összes megjelenítése (${listings.length + similarListings.length})`
                    : `Show all (${listings.length + similarListings.length})`}
                </button>
              )}
              <button
                type="button"
                onClick={runSearch}
                className="w-full mt-3 px-4 py-2.5 rounded-full border border-ink-100 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-800 transition text-sm font-medium"
              >
                {hu ? "Keresés frissítése" : "Refresh search"}
              </button>
            </>
          )}

          {!loading && searched && listings && listings.length === 0 && (
            <>
              <div className="border border-ink-100 dark:border-ink-700 rounded-2xl p-5 bg-ink-50 dark:bg-ink-800 text-center text-sm text-ink-500 dark:text-ink-400">
                {hu ? "Most nincs pontos találat ehhez a darabhoz." : "No exact matches for this piece right now."}
              </div>
              {similarListings.length > 0 && (
                <SimilarSection items={similarListings.slice(0, 3)} hu={hu} />
              )}
              {similarListings.length > 3 && (
                <button
                  type="button"
                  onClick={() => {
                    haptic("tap");
                    setShowAllListings(true);
                  }}
                  className="w-full mt-3 px-4 py-2.5 rounded-full border border-ink-200 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-800 transition text-sm font-medium"
                >
                  {hu
                    ? `Összes megjelenítése (${similarListings.length})`
                    : `Show all (${similarListings.length})`}
                </button>
              )}
            </>
          )}
        </div>

        {data.sellingTip && (
          <div className="mt-4 border border-ink-100 dark:border-ink-700 rounded-2xl p-6 bg-ink-50 dark:bg-ink-800">
            <p className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-2">{hu ? "Eladási tipp" : "Selling tip"}</p>
            <p className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">{data.sellingTip}</p>
          </div>
        )}

        {/* Inline "new scan" button (this page has no floating button) */}
        <input
          ref={newScanInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setPendingScanFile(file);
            router.push("/");
          }}
        />
        <button
          type="button"
          onClick={() => {
            haptic("tap");
            newScanInputRef.current?.click();
          }}
          className="w-full mt-8 px-6 py-3.5 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 font-medium text-sm hover:opacity-90 active:scale-[0.99] transition flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          {hu ? "Új scan" : "New scan"}
        </button>
      </section>

      <AllListingsOverlay
        open={showAllListings}
        onClose={() => setShowAllListings(false)}
        lang={lang}
        exactListings={listings ?? []}
        similarListings={similarListings}
      />

      {(storyText || data.story) && (
        <StoryModal
          open={showStory}
          onClose={() => setShowStory(false)}
          title={title || (hu ? "Sztori" : "Story")}
          story={storyText ?? data.story ?? ""}
          lang={lang}
        />
      )}
    </main>
  );
}
