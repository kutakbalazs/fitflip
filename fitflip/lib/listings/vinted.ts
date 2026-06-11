import type { Listing } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

type VintedItem = {
  id?: number | string;
  title?: string;
  url?: string;
  path?: string;
  photo?: { url?: string } | null;
  price?: { amount?: string; currency_code?: string } | string;
  total_item_price?: { amount?: string; currency_code?: string };
  status?: string;
  brand_title?: string | null;
  size_title?: string | null;
};

type VintedSearchResponse = {
  items?: VintedItem[];
};

// The anonymous Vinted token is valid for a while — cache it module-level so
// a scan's 6-7 parallel searches don't each refetch the homepage (saves
// ~0.5-1s per scan). Refreshed on expiry or when a search comes back 401/403.
let authCache: { token: string; cookieHeader: string; at: number } | null = null;
const AUTH_TTL_MS = 10 * 60_000;

async function getAuthCached(force = false): Promise<{ token: string; cookieHeader: string }> {
  if (!force && authCache && Date.now() - authCache.at < AUTH_TTL_MS) {
    return authCache;
  }
  const fresh = await getAuth();
  if (fresh.token) authCache = { ...fresh, at: Date.now() };
  return fresh;
}

async function getAuth(): Promise<{ token: string; cookieHeader: string }> {
  const res = await fetch("https://www.vinted.hu/", {
    headers: {
      "User-Agent": UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "hu-HU,hu;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });

  const setCookies =
    typeof (res.headers as { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (res.headers as { getSetCookie: () => string[] }).getSetCookie()
      : [];

  let token = "";
  for (const c of setCookies) {
    if (c.startsWith("access_token_web=")) {
      const value = c.split(";")[0].split("=")[1];
      if (value) token = value;
    }
  }
  const cookieHeader = setCookies.map((c) => c.split(";")[0].trim()).join("; ");
  return { token, cookieHeader };
}

function parsePriceAmount(
  raw: VintedItem["price"] | VintedItem["total_item_price"] | null | undefined
): number | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const n = parseFloat(raw.replace(/[^0-9.,]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (typeof raw === "object" && raw.amount) {
    const n = parseFloat(raw.amount);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Vinted's structured colour IDs (from /api/v2/colors). Sellers tag the
// item's colour separately from the title, so filtering on colour IDs
// surfaces e.g. blue Spezials whose title never mentions a colour — exactly
// what a user gets when filtering manually on vinted.hu.
const VINTED_COLOR_IDS: Record<string, number[]> = {
  black: [1], fekete: [1],
  grey: [3], gray: [3], szurke: [3],
  white: [12], feher: [12],
  cream: [20], krem: [20],
  beige: [4], bezs: [4],
  apricot: [21], coral: [22],
  orange: [11], narancs: [11], narancssarga: [11],
  red: [7], piros: [7], voros: [7],
  burgundy: [23], bordo: [23],
  pink: [5, 24], rozsaszin: [24],
  purple: [6, 25], lila: [25],
  // Shade names are fuzzy — map the whole blue family for any blue word.
  blue: [9, 26, 27], kek: [9, 26, 27],
  navy: [27, 9], sotetkek: [27],
  turquoise: [17], turkiz: [17],
  mint: [30], menta: [30],
  green: [10, 28], zold: [10],
  khaki: [16],
  brown: [2], barna: [2],
  yellow: [8], sarga: [8], mustard: [29],
  silver: [13], ezust: [13],
  gold: [14], arany: [14],
};

/** Map scanned colour tokens ("light blue", "black/white/gum", "kék") to Vinted colour IDs. */
export function vintedColorIdsFor(colorTokens: string[]): number[] {
  const ids = new Set<number>();
  for (const tok of colorTokens) {
    const words = tok
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z]+/)
      .filter(Boolean);
    for (const w of words) {
      for (const id of VINTED_COLOR_IDS[w] ?? []) ids.add(id);
    }
  }
  return Array.from(ids);
}

export async function searchVinted(
  query: string,
  limit = 6,
  colorIds?: number[]
): Promise<Listing[]> {
  try {
    const { token, cookieHeader } = await getAuthCached();
    if (!token) {
      console.warn("[vinted] no access token in homepage cookies");
      return [];
    }
    const colorParam =
      colorIds && colorIds.length > 0 ? `&color_ids=${colorIds.join(",")}` : "";
    const url = `https://www.vinted.hu/api/v2/catalog/items?search_text=${encodeURIComponent(query)}&per_page=${limit}&order=relevance${colorParam}`;

    const doFetch = (auth: { token: string; cookieHeader: string }) =>
      fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "hu-HU,hu;q=0.9,en;q=0.8",
          Referer: "https://www.vinted.hu/",
          Authorization: `Bearer ${auth.token}`,
          ...(auth.cookieHeader ? { Cookie: auth.cookieHeader } : {}),
        },
      });

    let res = await doFetch({ token, cookieHeader });
    // Cached token expired mid-window — refresh once and retry.
    if (res.status === 401 || res.status === 403) {
      const fresh = await getAuthCached(true);
      if (fresh.token) res = await doFetch(fresh);
    }

    if (!res.ok) {
      console.warn("[vinted] non-OK status:", res.status);
      return [];
    }

    const data = (await res.json()) as VintedSearchResponse;
    const items = data.items ?? [];

    return items.slice(0, limit).map((item): Listing => {
      const priceAmount =
        parsePriceAmount(item.total_item_price ?? null) ??
        parsePriceAmount(item.price ?? null);
      const itemUrl =
        item.url ||
        (item.path ? `https://www.vinted.hu${item.path}` : null) ||
        (item.id ? `https://www.vinted.hu/items/${item.id}` : "https://www.vinted.hu/");
      const priceLabel =
        priceAmount !== null
          ? `${new Intl.NumberFormat("hu-HU").format(Math.round(priceAmount))} Ft`
          : "—";

      return {
        source: "vinted",
        title: item.title ?? item.brand_title ?? "Vinted hirdetés",
        priceHuf: priceAmount !== null ? Math.round(priceAmount) : null,
        priceLabel,
        url: itemUrl,
        imageUrl: item.photo?.url ?? null,
        location: null,
        condition: item.status ?? null,
        sizeLabel: item.size_title ?? null,
      };
    });
  } catch (err) {
    console.warn("[vinted] search failed:", err);
    return [];
  }
}
