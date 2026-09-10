"use client";

import { stockxSearchUrl } from "@/lib/stockx";
import { track } from "@/lib/analytics";
import { translations } from "@/lib/translations";

/**
 * "View on StockX" link, shown only for hyped pieces.
 *
 * Renders nothing when the item isn't a fit, so it can be dropped in above
 * any listings block without a surrounding condition. Text only — no StockX
 * logo, to stay clear of trademark/brand-guideline questions.
 *
 * Tracked as a listing_click with source "stockx", so it sits in the same
 * measurement as every other marketplace and can be judged on whether anyone
 * actually uses it.
 */
export default function StockxButton({
  hypeScore,
  brand,
  model,
  hu,
}: {
  hypeScore: number | null | undefined;
  brand: string | null | undefined;
  model: string | null | undefined;
  hu: boolean;
}) {
  const url = stockxSearchUrl(hypeScore, brand, model);
  if (!url) return null;

  const t = hu ? translations.hu : translations.en;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("listing_click", { source: "stockx" })}
      className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950 px-4 py-3 transition hover:border-ink-400 dark:hover:border-ink-500"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{t.stockxCta}</span>
        <span className="block text-xs text-ink-500 dark:text-ink-400">
          {t.stockxHint}
        </span>
      </span>
      <span aria-hidden className="shrink-0 text-ink-400 dark:text-ink-500">
        →
      </span>
    </a>
  );
}
