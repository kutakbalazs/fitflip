import type { Listing } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

type JofogasAd = {
  list_id?: number;
  url?: string;
  subject?: string;
  price?: { value?: number; label?: string } | null;
  images?: Array<{ url?: string; image_size_variations?: Array<{ type?: string; url?: string }> }>;
  region?: { label?: string } | string | null;
  parameters?: Array<{ key?: string; label?: string; value?: string }>;
  type?: string;
};

function pickImageUrl(ad: JofogasAd): string | null {
  const img = ad.images?.[0];
  if (!img) return null;
  if (img.image_size_variations) {
    const big = img.image_size_variations.find((v) => v.type === "bigthumbs" || v.type === "images");
    if (big?.url) return big.url;
  }
  return img.url ?? null;
}

function pickRegion(ad: JofogasAd): string | null {
  if (!ad.region) return null;
  if (typeof ad.region === "string") return ad.region;
  return ad.region.label ?? null;
}

function pickCondition(ad: JofogasAd): string | null {
  if (!ad.parameters) return null;
  const cond = ad.parameters.find((p) => p.key === "state" || p.key === "condition" || /állapot/i.test(p.label ?? ""));
  return cond?.value ?? null;
}

export async function searchJofogas(query: string, limit = 6): Promise<Listing[]> {
  try {
    const url = `https://www.jofogas.hu/magyarorszag?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "hu-HU,hu;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) {
      console.warn("[jofogas] non-OK status:", res.status);
      return [];
    }
    const html = await res.text();

    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) {
      console.warn("[jofogas] no __NEXT_DATA__ found");
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch (err) {
      console.warn("[jofogas] JSON parse failed:", err);
      return [];
    }

    const ads = (parsed as { props?: { pageProps?: { adList?: { ads?: JofogasAd[] } } } })
      .props?.pageProps?.adList?.ads;
    if (!Array.isArray(ads)) return [];

    return ads.slice(0, limit).map((ad): Listing => {
      const priceFt = ad.price?.value ?? null;
      const priceLabel = priceFt !== null
        ? `${new Intl.NumberFormat("hu-HU").format(priceFt)} Ft`
        : ad.price?.label ?? "—";

      return {
        source: "jofogas",
        title: ad.subject ?? "Jófogás hirdetés",
        priceHuf: priceFt,
        priceLabel,
        url: ad.url ?? "https://www.jofogas.hu/",
        imageUrl: pickImageUrl(ad),
        location: pickRegion(ad),
        condition: pickCondition(ad),
      };
    });
  } catch (err) {
    console.warn("[jofogas] search failed:", err);
    return [];
  }
}
