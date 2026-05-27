"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { haptic } from "@/lib/haptics";
import InfoSheet from "./InfoSheet";

type Props = {
  scanId: string | null;
  isPremium: boolean;
  lang: "hu" | "en";
  /** Default suggested target price (typically the listings min or median). */
  suggestedPriceHuf: number;
  /** Reasonable upper bound for the slider (typically max price × 1.5). */
  maxPriceHuf: number;
  /** Existing listing URLs at scan time, snapshotted as the baseline. */
  baselineUrls: string[];
  /** Original scan info for re-running search server-side. */
  search: {
    brand: string;
    model: string;
    color: string;
    itemType: string;
    queries: string[];
    brandTokens: string[];
    modelTokens: string[];
    colorTokens: string[];
  };
};

type WatcherState =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "active"; id: string; targetPrice: number; size: string | null };

const STEP = 500;
const PREMIUM_LIMIT = 5;

export default function WatcherWidget(props: Props) {
  const {
    scanId,
    isPremium,
    lang,
    suggestedPriceHuf,
    maxPriceHuf,
    baselineUrls,
    search,
  } = props;

  const [state, setState] = useState<WatcherState>({ kind: "loading" });
  const [activeCount, setActiveCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [target, setTarget] = useState(
    Math.max(1000, Math.round(suggestedPriceHuf / STEP) * STEP),
  );
  const [sizeInput, setSizeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [toast, setToast] = useState<null | "premium" | "limit">(null);

  useEffect(() => {
    if (!scanId) {
      setState({ kind: "none" });
      return;
    }
    let cancelled = false;
    fetch("/api/watchers")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = (data?.watchers as Array<{
          id: string;
          scan_id: string;
          target_price_huf: number;
          size_filter?: string | null;
          active: boolean;
        }> | undefined) ?? [];
        const active = list.filter((w) => w.active !== false);
        setActiveCount(active.length);
        const mine = active.find((x) => x.scan_id === scanId);
        if (mine)
          setState({
            kind: "active",
            id: mine.id,
            targetPrice: mine.target_price_huf,
            size: mine.size_filter ?? null,
          });
        else setState({ kind: "none" });
      })
      .catch(() => setState({ kind: "none" }));
    return () => {
      cancelled = true;
    };
  }, [scanId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const t = lang === "hu"
    ? {
        label: "Árfigyelő",
        sublabelOff: "Új hirdetéseket figyelek alacsonyabb áron",
        sublabelOn: (price: string, size: string | null) =>
          `Aktív · ${price} Ft alatt${size ? ` · méret: ${size}` : ""}`,
        sliderLabel: "Értesíts, ha az új hirdetés ennél olcsóbb:",
        sizeLabel: "Méret (opcionális)",
        sizePlaceholder: "pl. 42 EU, M, 32W 34L",
        sizeHelp: "Ha üresen hagyod, MINDEN új hirdetésről értesítünk. Ha megadod, csak az ilyen méretűekről.",
        activate: "Aktiválom",
        cancel: "Mégse",
        deactivate: "Figyelő kikapcsolása",
        infoBtn: "Mit csinál ez?",
        sheetEyebrow: "Árfigyelő",
        sheetTitle: "Hogy működik?",
        sheetP1: "Beállítasz egy célárat. Naponta egyszer átnézzük a Vinted, Jófogás és eBay új hirdetéseit ehhez a darabhoz.",
        sheetP2: "Ha valaki a célárad alá tesz fel egy új hirdetést, kapsz egy értesítést az Értesítések menüben. Csak a NEM-látott hirdetéseket dobjuk fel — amik a scankor még nem voltak fent.",
        sheetLimit: "Egyszerre legfeljebb 5 árfigyelőd lehet (prémium).",
        premiumOnly: "Az árfigyelő prémium funkció",
        limitReached: `Elérted a maximum ${PREMIUM_LIMIT} aktív árfigyelőt. Kapcsolj ki egy meglévőt a Követett termékeim menüben.`,
        upgradeCta: "Ugrás a fiókodra",
        manageCta: "Követett termékeim",
      }
    : {
        label: "Price watcher",
        sublabelOff: "Watch for new listings under your price",
        sublabelOn: (price: string, size: string | null) =>
          `Active · ping me below ${price} Ft${size ? ` · size: ${size}` : ""}`,
        sliderLabel: "Notify me if a new listing is cheaper than:",
        sizeLabel: "Size (optional)",
        sizePlaceholder: "e.g. 42 EU, M, 32W 34L",
        sizeHelp: "Leave blank to be notified about ALL new listings. Provide a size to filter by size.",
        activate: "Activate",
        cancel: "Cancel",
        deactivate: "Turn watcher off",
        infoBtn: "What does this do?",
        sheetEyebrow: "Price watcher",
        sheetTitle: "How it works",
        sheetP1: "Set a target price. Once a day we rescan Vinted, Jófogás and eBay for new listings of this item.",
        sheetP2: "If someone posts a NEW listing under your target, you get an in-app notification in the Notifications menu. Only listings that weren't in the original scan are surfaced.",
        sheetLimit: "You can have up to 5 active watchers at once (premium).",
        premiumOnly: "Price watcher is a premium feature",
        limitReached: `You've reached the max ${PREMIUM_LIMIT} active watchers. Turn one off in Followed items.`,
        upgradeCta: "Go to your account",
        manageCta: "Followed items",
      };

  const handleCheckboxClick = () => {
    if (!isPremium) {
      haptic("error");
      setToast("premium");
      return;
    }
    if (state.kind === "active") {
      if (!window.confirm(lang === "hu" ? "Biztos kikapcsolod az árfigyelőt?" : "Turn off this watcher?")) return;
      void deactivate();
      return;
    }
    // Pre-emptive limit check before opening the slider.
    if (activeCount >= PREMIUM_LIMIT) {
      haptic("error");
      setToast("limit");
      return;
    }
    haptic("tap");
    setExpanded((v) => !v);
  };

  const formatHuf = (n: number) => new Intl.NumberFormat("hu-HU").format(n);

  const activate = async () => {
    if (!scanId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/watchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scan_id: scanId,
          target_price_huf: target,
          baseline_urls: baselineUrls,
          search_brand: search.brand,
          search_model: search.model,
          search_color: search.color,
          search_item_type: search.itemType,
          search_queries: search.queries,
          search_brand_tokens: search.brandTokens,
          search_model_tokens: search.modelTokens,
          search_color_tokens: search.colorTokens,
          size_filter: sizeInput.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        haptic("error");
        if (data?.error === "premium_required") setToast("premium");
        else if (data?.error === "watcher_limit_reached") setToast("limit");
        else alert(lang === "hu" ? "Nem sikerült aktiválni." : "Activation failed.");
        return;
      }
      haptic("success");
      setActiveCount((c) => c + 1);
      setState({
        kind: "active",
        id: data.id,
        targetPrice: target,
        size: sizeInput.trim() || null,
      });
      setExpanded(false);
    } finally {
      setSubmitting(false);
    }
  };

  const deactivate = async () => {
    if (state.kind !== "active") return;
    const id = state.id;
    setSubmitting(true);
    try {
      await fetch(`/api/watchers/${id}`, { method: "DELETE" });
      haptic("tap");
      setActiveCount((c) => Math.max(0, c - 1));
      setState({ kind: "none" });
      setExpanded(false);
      setSizeInput("");
    } finally {
      setSubmitting(false);
    }
  };

  if (state.kind === "loading") return null;
  if (!scanId) return null;

  const isActive = state.kind === "active";
  const sliderMax = Math.max(maxPriceHuf, target, suggestedPriceHuf || 50000, 50000);

  return (
    <div className="border-t border-ink-100 dark:border-ink-700">
      <div className="px-6 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCheckboxClick}
            className="flex items-start gap-2.5 text-left flex-1 min-w-0 group"
          >
            <span
              className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                isActive || expanded
                  ? "bg-ink-900 dark:bg-white border-ink-900 dark:border-white"
                  : "border-ink-300 dark:border-ink-500 group-hover:border-ink-700 dark:group-hover:border-ink-300"
              }`}
            >
              {(isActive || expanded) && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white dark:text-ink-900">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span className="text-sm font-medium block">{t.label}</span>
              <span className="text-xs text-ink-500 dark:text-ink-400 block leading-relaxed">
                {state.kind === "active"
                  ? t.sublabelOn(formatHuf(state.targetPrice), state.size)
                  : t.sublabelOff}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            aria-label={t.infoBtn}
            className="shrink-0 w-6 h-6 rounded-full border border-ink-200 dark:border-ink-600 text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white hover:border-ink-400 transition flex items-center justify-center text-xs font-semibold"
          >
            i
          </button>
        </div>

        {!isPremium && toast === "premium" && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3">
            <span>{t.premiumOnly}</span>
            <Link href="/account" className="font-semibold underline whitespace-nowrap">
              {t.upgradeCta} →
            </Link>
          </div>
        )}

        {isPremium && toast === "limit" && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex items-start justify-between gap-3">
            <span className="leading-snug">{t.limitReached}</span>
            <Link href="/watchers" className="font-semibold underline whitespace-nowrap shrink-0">
              {t.manageCta} →
            </Link>
          </div>
        )}

        {isPremium && !isActive && expanded && (
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-xs text-ink-500 dark:text-ink-400 block mb-1">
                {t.sliderLabel}
              </span>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-display tracking-tight">
                  {formatHuf(target)} Ft
                </span>
              </div>
              <input
                type="range"
                min={1000}
                max={sliderMax}
                step={STEP}
                value={target}
                onChange={(e) => setTarget(parseInt(e.target.value, 10))}
                className="w-full accent-ink-900 dark:accent-white"
              />
              <div className="flex justify-between text-[10px] text-ink-400 dark:text-ink-500 mt-1">
                <span>{formatHuf(1000)} Ft</span>
                <span>{formatHuf(sliderMax)} Ft</span>
              </div>
            </label>
            <div>
              <label htmlFor="ff-watcher-size" className="text-xs text-ink-500 dark:text-ink-400 block mb-1">
                {t.sizeLabel}
              </label>
              <input
                id="ff-watcher-size"
                type="text"
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                placeholder={t.sizePlaceholder}
                maxLength={60}
                className="w-full px-3 py-2 rounded-lg border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900/10"
              />
              <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1 leading-relaxed">
                {t.sizeHelp}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={activate}
                disabled={submitting}
                className="px-4 py-2 rounded-full bg-ink-900 dark:bg-white text-white dark:text-ink-900 text-sm font-medium hover:bg-ink-700 dark:hover:bg-ink-100 transition disabled:opacity-40"
              >
                {submitting ? "…" : t.activate}
              </button>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-full border border-ink-200 dark:border-ink-700 text-sm hover:bg-ink-50 dark:hover:bg-ink-800 transition disabled:opacity-50"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        )}
      </div>

      <InfoSheet
        open={showInfo}
        onClose={() => setShowInfo(false)}
        title={t.sheetTitle}
        eyebrow={t.sheetEyebrow}
        lang={lang}
      >
        <p>{t.sheetP1}</p>
        <p>{t.sheetP2}</p>
        <p className="text-ink-500 dark:text-ink-400 text-xs">{t.sheetLimit}</p>
      </InfoSheet>
    </div>
  );
}
