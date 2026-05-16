import type { Listing } from "./types";

const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
const MARKETPLACE = "EBAY_DE"; // EU-based, no customs for HU buyers
const SCOPE = "https://api.ebay.com/oauth/api_scope";

type EbayPrice = { value?: string; currency?: string };
type EbayImage = { imageUrl?: string };
type EbayLocation = { country?: string };
type EbayItemSummary = {
  itemId?: string;
  title?: string;
  price?: EbayPrice;
  itemWebUrl?: string;
  image?: EbayImage;
  thumbnailImages?: EbayImage[];
  itemLocation?: EbayLocation;
  condition?: string;
};
type EbaySearchResponse = {
  itemSummaries?: EbayItemSummary[];
};

// Very rough static FX rates (Aug 2026). eBay returns prices in marketplace
// currency (EUR for EBAY_DE); we just need them in HUF for the UI. Refreshed
// occasionally; small inaccuracies don't matter here.
const FX_TO_HUF: Record<string, number> = {
  EUR: 405,
  USD: 365,
  GBP: 470,
  HUF: 1,
};

function toHuf(amount: number, currency: string): number | null {
  const rate = FX_TO_HUF[currency.toUpperCase()];
  if (!rate) return null;
  return Math.round(amount * rate);
}

async function getAppToken(): Promise<string | null> {
  // Trim defensively — copy-paste into Vercel sometimes drags in trailing
  // whitespace that silently breaks Basic auth without showing why.
  const clientId = (process.env.EBAY_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.EBAY_CLIENT_SECRET ?? "").trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=client_credentials&scope=${encodeURIComponent(SCOPE)}`,
    });
    if (!res.ok) {
      console.warn("[ebay] token request failed:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (err) {
    console.warn("[ebay] token request threw:", err);
    return null;
  }
}

export async function searchEbay(query: string, limit = 12): Promise<Listing[]> {
  try {
    const token = await getAppToken();
    if (!token) {
      // Credentials missing or keyset disabled — silently skip so the rest of
      // the pipeline keeps working.
      return [];
    }

    const url = new URL(SEARCH_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(Math.min(limit, 50)));
    url.searchParams.set("filter", "buyingOptions:{FIXED_PRICE},itemLocationCountry:{HU|DE|AT|SK|RO|CZ|PL|IT|FR|NL|BE|ES|PT|SE|FI|DK|IE|GR|HR|SI|BG|LT|LV|EE|LU|MT|CY}");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE,
        "X-EBAY-C-ENDUSERCTX": "contextualLocation=country=HU",
      },
    });
    if (!res.ok) {
      console.warn("[ebay] search failed:", res.status);
      return [];
    }
    const data = (await res.json()) as EbaySearchResponse;
    const items = data.itemSummaries ?? [];

    return items.slice(0, limit).map((item): Listing => {
      const priceAmount = item.price?.value ? parseFloat(item.price.value) : NaN;
      const currency = (item.price?.currency ?? "EUR").toUpperCase();
      const priceHuf =
        Number.isFinite(priceAmount) ? toHuf(priceAmount, currency) : null;
      const priceLabel =
        priceHuf !== null
          ? `${new Intl.NumberFormat("hu-HU").format(priceHuf)} Ft`
          : Number.isFinite(priceAmount)
            ? `${priceAmount.toFixed(2)} ${currency}`
            : "—";

      // Strip session/tracking params (?_skw, ?hash, ?amdata, …). They change
      // every request, which breaks dedup across queries and makes the same
      // item appear multiple times in the result pool, crowding out others.
      const rawUrl = item.itemWebUrl ?? "https://www.ebay.de/";
      const stableUrl = rawUrl.split("?")[0];

      return {
        source: "ebay",
        title: item.title ?? "eBay listing",
        priceHuf,
        priceLabel,
        url: stableUrl,
        imageUrl:
          item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? null,
        location: item.itemLocation?.country ?? null,
        condition: item.condition ?? null,
      };
    });
  } catch (err) {
    console.warn("[ebay] search threw:", err);
    return [];
  }
}
