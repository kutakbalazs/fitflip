import type { Listing } from "./types";
// FX table lives in the eBay adapter (first one to need it) — imported rather
// than duplicated so rates are maintained in one place.
import { toHuf } from "./ebay";

/**
 * Etsy adapter — official API v3, read-only public listing search.
 *
 * Etsy earns its place for genuine vintage clothing, which the other sources
 * cover thinly. It is NOT useful for sneakers, so the aggregate only sends it
 * the primary query (see the call site).
 *
 * Two Etsy quirks shape this file:
 *
 *  1. Etsy is mostly a HANDMADE marketplace. A made-to-order new leather
 *     jacket is not a comparable price point for someone selling a used one,
 *     so those are filtered out — we keep only second-hand/vintage stock.
 *  2. The search response carries no images. Fetching them per listing would
 *     be one request each, which the 5 requests/second quota can't take, so
 *     images come from a single batch call for the whole page.
 */

const BASE = "https://openapi.etsy.com/v3/application";

/** Kill switch — set to false to drop Etsy out of the source mix. */
export const ETSY_ENABLED = true;

/**
 * Etsy wants "keystring:shared_secret" in x-api-key — not the keystring on its
 * own, which fails with a misleading "shared secret is required" error. Stored
 * as one combined value so deployment is a single variable.
 */
function apiKey(): string | null {
  const key = (process.env.ETSY_API_KEY ?? "").trim();
  return key.length > 0 ? key : null;
}

type EtsyPrice = { amount?: number; divisor?: number; currency_code?: string };
type EtsyListing = {
  listing_id?: number;
  title?: string;
  url?: string;
  price?: EtsyPrice;
  who_made?: string;
  when_made?: string;
};
type EtsyImage = { url_570xN?: string; url_fullxfull?: string };

/**
 * Second-hand only. `who_made: "i_did"` is the seller's own craft work, and
 * `made_to_order` is produced on demand — neither is a used-market comparable.
 */
function isSecondHand(l: EtsyListing): boolean {
  if (l.who_made === "i_did") return false;
  if (l.when_made === "made_to_order") return false;
  return true;
}

/** Etsy prices arrive as minor units: { amount: 24999, divisor: 100 }. */
function priceOf(p: EtsyPrice | undefined): { huf: number | null; label: string } {
  const amount = typeof p?.amount === "number" ? p.amount : NaN;
  const divisor = typeof p?.divisor === "number" && p.divisor > 0 ? p.divisor : 100;
  const currency = (p?.currency_code ?? "EUR").toUpperCase();
  if (!Number.isFinite(amount)) return { huf: null, label: "—" };

  const value = amount / divisor;
  const huf = toHuf(value, currency);
  return {
    huf,
    label:
      huf !== null
        ? `${new Intl.NumberFormat("hu-HU").format(huf)} Ft`
        : `${value.toFixed(2)} ${currency}`,
  };
}

/** Images for a page of listings in ONE request, keyed by listing id. */
async function fetchImages(
  key: string,
  ids: number[]
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (ids.length === 0) return out;
  try {
    const url = `${BASE}/listings/batch?listing_ids=${ids.join(",")}&includes=Images`;
    const res = await fetch(url, { headers: { "x-api-key": key } });
    if (!res.ok) return out;
    const data = (await res.json()) as {
      results?: Array<{ listing_id?: number; images?: EtsyImage[] }>;
    };
    for (const row of data.results ?? []) {
      const img = row.images?.[0];
      const src = img?.url_570xN ?? img?.url_fullxfull ?? null;
      if (typeof row.listing_id === "number" && src) out.set(row.listing_id, src);
    }
  } catch {
    /* thumbnails are a nicety — never fail the search over them */
  }
  return out;
}

export async function searchEtsy(query: string, limit = 12): Promise<Listing[]> {
  if (!ETSY_ENABLED) return [];
  const key = apiKey();
  if (!key) return []; // not configured — stay silent, other sources carry on

  try {
    const url = new URL(`${BASE}/listings/active`);
    url.searchParams.set("keywords", query);
    // Over-fetch: the second-hand filter below removes a chunk of the page.
    url.searchParams.set("limit", String(Math.min(limit * 2, 50)));
    // European sellers only — a Hungarian buyer pays no customs inside the
    // EU, which is the same reason eBay is limited to DE/IT/FR.
    url.searchParams.set("shop_location", "Europe");

    const res = await fetch(url.toString(), { headers: { "x-api-key": key } });
    if (!res.ok) {
      console.warn("[etsy] search failed:", res.status);
      return [];
    }

    const data = (await res.json()) as { results?: EtsyListing[] };
    const usable = (data.results ?? [])
      .filter(isSecondHand)
      .filter((l) => typeof l.listing_id === "number" && l.url)
      .slice(0, limit);

    if (usable.length === 0) return [];

    const images = await fetchImages(
      key,
      usable.map((l) => l.listing_id as number)
    );

    return usable.map((l): Listing => {
      const { huf, label } = priceOf(l.price);
      return {
        source: "etsy",
        // Etsy titles arrive HTML-escaped (&#39; for an apostrophe).
        title: (l.title ?? "Etsy listing")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&"),
        priceHuf: huf,
        priceLabel: label,
        url: l.url as string,
        imageUrl: images.get(l.listing_id as number) ?? null,
        location: null,
        // when_made doubles as the era ("1980s", "before_2007") — more useful
        // to a buyer than a generic "used".
        condition: l.when_made ?? null,
      };
    });
  } catch (err) {
    console.warn("[etsy] search threw:", err);
    return [];
  }
}
