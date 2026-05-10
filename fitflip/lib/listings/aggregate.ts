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

export async function searchAllMarketplaces(
  query: string,
  keywords: string[] = []
): Promise<Listing[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results = await Promise.allSettled([
    searchVinted(trimmed, 20),
    searchJofogas(trimmed, 20),
  ]);

  const all: Listing[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  if (keywords.length === 0) return all.slice(0, 12);

  const filtered = all.filter((l) => titleMatchesAllKeywords(l, keywords));
  return filtered.slice(0, 12);
}
