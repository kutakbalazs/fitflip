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

export async function searchVinted(query: string, limit = 6): Promise<Listing[]> {
  try {
    const { token, cookieHeader } = await getAuth();
    if (!token) {
      console.warn("[vinted] no access token in homepage cookies");
      return [];
    }
    const url = `https://www.vinted.hu/api/v2/catalog/items?search_text=${encodeURIComponent(query)}&per_page=${limit}&order=relevance`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "hu-HU,hu;q=0.9,en;q=0.8",
        Referer: "https://www.vinted.hu/",
        Authorization: `Bearer ${token}`,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

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
      };
    });
  } catch (err) {
    console.warn("[vinted] search failed:", err);
    return [];
  }
}
