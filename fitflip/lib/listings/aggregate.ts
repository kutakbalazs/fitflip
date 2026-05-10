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

function titleContains(titleNorm: string, keyword: string): boolean {
  const variants = aliasesFor(keyword);
  return variants.some((v) => v.length > 0 && titleNorm.includes(v));
}

function matchesFilters(
  listing: Listing,
  must: string[],
  should: string[]
): boolean {
  const titleNorm = normalize(listing.title);
  if (!must.every((kw) => titleContains(titleNorm, kw))) return false;
  if (should.length > 0 && !should.some((kw) => titleContains(titleNorm, kw))) return false;
  return true;
}

export type SearchResult = { listings: Listing[]; exact: boolean };

export async function searchAllMarketplaces(
  query: string,
  must: string[] = [],
  should: string[] = []
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

  if (must.length === 0 && should.length === 0) {
    return { listings: all.slice(0, 12), exact: true };
  }

  // Pass 1: must + should (strict — model match AND at least one color token)
  const strict = all.filter((l) => matchesFilters(l, must, should));
  if (strict.length > 0) {
    return { listings: strict.slice(0, 12), exact: true };
  }

  // Pass 2: drop the should constraint (color) → keep only must (brand + model)
  if (should.length > 0) {
    const noColor = all.filter((l) => matchesFilters(l, must, []));
    if (noColor.length > 0) {
      return { listings: noColor.slice(0, 12), exact: false };
    }
  }

  // Pass 3: drop brand from must (first must keyword) → keep only model tokens
  if (must.length > 1) {
    const justModel = must.slice(1);
    const looser = all.filter((l) => matchesFilters(l, justModel, []));
    if (looser.length > 0) {
      return { listings: looser.slice(0, 12), exact: false };
    }
  }

  return { listings: [], exact: true };
}
