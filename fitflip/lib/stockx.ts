/**
 * Optional "view on StockX" link for hyped items.
 *
 * Deliberately a LINK, not a price source. StockX is a global market whose
 * prices run higher than the Hungarian one, and its prices vary a lot by
 * size — folding either into our estimate would make it less accurate, not
 * more. Sending the user to StockX lets them see the real, per-size numbers
 * themselves while our own estimate stays about the Hungarian market.
 *
 * It links to StockX SEARCH rather than a product page on purpose: resolving
 * a product URL would need an API we don't have or scraping a site with
 * strong bot protection. A search link needs neither and cannot break.
 */

/** Kill switch — set to false to remove the button everywhere. */
export const STOCKX_ENABLED = true;

/**
 * Hype threshold. Not an arbitrary number: it's the same cut-off the app
 * already uses for its own "Hyped / Heat / Cult piece" badge (lib/hype.ts),
 * so the button appears exactly when the app is already telling the user the
 * piece is sought-after. Checked against real scans: at >= 7 the matches are
 * Supreme Box Logo, Jordan 1 Dark Mocha, Jordan 4 SB, Handball Spezial,
 * Palace tees — all StockX staples — while ordinary items score far lower.
 */
const MIN_HYPE = 7;

/** Query text for the StockX search, or null when there's nothing to search. */
function searchTerm(brand?: string | null, model?: string | null): string | null {
  const parts = [brand, model]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0);
  if (parts.length === 0) return null;

  // Models sometimes repeat the brand ("Air Jordan" + "Air Jordan 4 Retro").
  // StockX search copes, but a clean query returns tighter results.
  let term = parts.join(" ");
  if (parts.length === 2 && parts[1].toLowerCase().startsWith(parts[0].toLowerCase())) {
    term = parts[1];
  }
  return term.replace(/\s+/g, " ").trim().slice(0, 120);
}

/**
 * Whether to offer the StockX link for this result. No category gate: a hyped
 * vintage piece is as likely to be listed there as a sneaker, and the hype
 * score already separates the two cases well.
 */
export function shouldShowStockx(
  hypeScore: number | null | undefined,
  brand?: string | null,
  model?: string | null
): boolean {
  if (!STOCKX_ENABLED) return false;
  if (typeof hypeScore !== "number" || hypeScore < MIN_HYPE) return false;
  return searchTerm(brand, model) !== null;
}

/** StockX search URL for the item, or null when it isn't a fit. */
export function stockxSearchUrl(
  hypeScore: number | null | undefined,
  brand?: string | null,
  model?: string | null
): string | null {
  if (!shouldShowStockx(hypeScore, brand, model)) return null;
  const term = searchTerm(brand, model);
  if (!term) return null;
  return `https://stockx.com/search?s=${encodeURIComponent(term)}`;
}
