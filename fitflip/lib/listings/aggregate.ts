import type { Listing } from "./types";
import { searchVinted } from "./vinted";
import { searchJofogas } from "./jofogas";

const HU_COLOR_ALIASES: Record<string, string[]> = {
  black: ["black", "fekete"],
  white: ["white", "fehér", "feher"],
  red: ["red", "piros", "vörös", "voros"],
  blue: ["blue", "kék", "kek"],
  navy: ["navy", "sötétkék", "sotetkek"],
  green: ["green", "zöld", "zold"],
  olive: ["olive", "olíva", "oliva"],
  yellow: ["yellow", "sárga", "sarga"],
  orange: ["orange", "narancs", "narancssárga"],
  pink: ["pink", "rózsaszín", "rozsaszin"],
  purple: ["purple", "lila"],
  brown: ["brown", "barna"],
  beige: ["beige", "bézs", "bezs"],
  grey: ["grey", "gray", "szürke", "szurke"],
  gold: ["gold", "arany"],
  silver: ["silver", "ezüst", "ezust"],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasesFor(keyword: string): string[] {
  const norm = normalize(keyword);
  if (!norm) return [];
  if (HU_COLOR_ALIASES[norm]) return HU_COLOR_ALIASES[norm].map(normalize);
  for (const variants of Object.values(HU_COLOR_ALIASES)) {
    if (variants.map(normalize).includes(norm)) return variants.map(normalize);
  }
  return [norm];
}

function titleMatchesAllKeywords(listing: Listing, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const titleNorm = normalize(listing.title);
  return keywords.every((kw) => {
    const variants = aliasesFor(kw);
    return variants.some((v) => v.length > 0 && titleNorm.includes(v));
  });
}

export type SearchResult = { listings: Listing[]; exact: boolean };

export async function searchAllMarketplaces(
  query: string,
  keywords: string[] = []
): Promise<SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) return { listings: [], exact: true };

  const results = await Promise.allSettled([
    searchVinted(trimmed, 20),
    searchJofogas(trimmed, 20),
  ]);

  const all: Listing[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  if (keywords.length === 0) {
    return { listings: all.slice(0, 12), exact: true };
  }

  // Pass 1: strict — every keyword must match (brand + model tokens + color)
  const strict = all.filter((l) => titleMatchesAllKeywords(l, keywords));
  if (strict.length > 0) {
    return { listings: strict.slice(0, 12), exact: true };
  }

  // Pass 2: drop the LAST keyword (color is appended last → drop it)
  if (keywords.length > 1) {
    const droppedColor = keywords.slice(0, -1);
    const broader = all.filter((l) => titleMatchesAllKeywords(l, droppedColor));
    if (broader.length > 0) {
      return { listings: broader.slice(0, 12), exact: false };
    }
  }

  // Pass 3: drop brand too (first keyword) → keep just model tokens
  if (keywords.length > 2) {
    const justModel = keywords.slice(1, -1);
    if (justModel.length > 0) {
      const looser = all.filter((l) => titleMatchesAllKeywords(l, justModel));
      if (looser.length > 0) {
        return { listings: looser.slice(0, 12), exact: false };
      }
    }
  }

  return { listings: [], exact: true };
}
