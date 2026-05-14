import type { Listing } from "./types";
import { searchVinted } from "./vinted";
import { searchJofogas } from "./jofogas";
import { searchEbay } from "./ebay";

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

export type SearchResult = { listings: Listing[]; exact: boolean };

type ScoredListing = {
  listing: Listing;
  score: number;
  brandMatched: boolean;
  modelMatchCount: number;
  colorMatched: boolean;
};

const PER_SOURCE_LIMIT = 6;

function balanceBySource(listings: Listing[]): Listing[] {
  const buckets = new Map<string, Listing[]>();
  for (const l of listings) {
    const arr = buckets.get(l.source) ?? [];
    if (arr.length < PER_SOURCE_LIMIT) {
      arr.push(l);
      buckets.set(l.source, arr);
    }
  }
  const interleaved: Listing[] = [];
  const sources = Array.from(buckets.keys());
  let i = 0;
  while (true) {
    let pushedAny = false;
    for (const src of sources) {
      const bucket = buckets.get(src);
      if (bucket && i < bucket.length) {
        interleaved.push(bucket[i]);
        pushedAny = true;
      }
    }
    if (!pushedAny) break;
    i += 1;
  }
  return interleaved;
}

function scoreListing(
  listing: Listing,
  brandTokens: string[],
  modelTokens: string[],
  colorTokens: string[]
): ScoredListing {
  const title = normalize(listing.title);
  const brandMatched =
    brandTokens.length === 0
      ? true
      : brandTokens.some((b) => titleContains(title, b));
  const modelMatchCount = modelTokens.filter((t) => titleContains(title, t)).length;
  const colorMatched =
    colorTokens.length === 0
      ? true
      : colorTokens.some((c) => titleContains(title, c));

  let score = 0;
  if (brandTokens.length > 0 && brandMatched) score += 3;
  score += modelMatchCount * 2;
  if (colorTokens.length > 0 && colorMatched) score += 1;

  return { listing, score, brandMatched, modelMatchCount, colorMatched };
}

export async function searchAllMarketplaces(
  queries: string[],
  brandTokens: string[] = [],
  modelTokens: string[] = [],
  colorTokens: string[] = []
): Promise<SearchResult> {
  const cleaned = Array.from(
    new Set(
      queries
        .map((q) => q?.trim() ?? "")
        .filter((q) => q.length > 0)
    )
  ).slice(0, 5);
  if (cleaned.length === 0) return { listings: [], exact: true };

  // Run every query against every adapter in parallel, then dedupe by URL.
  const tasks: Promise<Listing[]>[] = [];
  for (const q of cleaned) {
    tasks.push(searchVinted(q, 12));
    tasks.push(searchJofogas(q, 12));
    tasks.push(searchEbay(q, 12));
  }
  const results = await Promise.allSettled(tasks);

  const seen = new Set<string>();
  const all: Listing[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const l of r.value) {
      if (seen.has(l.url)) continue;
      seen.add(l.url);
      all.push(l);
    }
  }

  if (all.length === 0) return { listings: [], exact: true };

  // No filter criteria → return as-is, sorted by source balance.
  if (brandTokens.length === 0 && modelTokens.length === 0 && colorTokens.length === 0) {
    return { listings: balanceBySource(all), exact: true };
  }

  const scored = all.map((l) =>
    scoreListing(l, brandTokens, modelTokens, colorTokens)
  );

  // Tier 1: brand-match (any brand token) AND at least one model token match.
  const tier1 = scored.filter((s) => {
    if (brandTokens.length > 0 && !s.brandMatched) return false;
    if (modelTokens.length > 0 && s.modelMatchCount === 0) return false;
    return true;
  });

  // Tier 2: at least one model token match, brand may miss (compound brands
  // like "Air Jordan" where marketplace listing just says "Jordan").
  const tier2 =
    tier1.length > 0
      ? tier1
      : scored.filter(
          (s) => modelTokens.length === 0 || s.modelMatchCount > 0
        );

  // Tier 3: brand only — last resort so the user sees *something*.
  const candidates =
    tier2.length > 0
      ? tier2
      : scored.filter(
          (s) => brandTokens.length === 0 || s.brandMatched
        );

  if (candidates.length === 0) return { listings: [], exact: true };

  // Sort by score DESC (best match first). Stable sort keeps marketplace
  // ranking as the tiebreaker.
  candidates.sort((a, b) => b.score - a.score);

  // exact = the result set contains at least one listing that matched
  // every criterion the user cares about.
  const anyFullMatch = candidates.some(
    (m) =>
      (brandTokens.length === 0 || m.brandMatched) &&
      (modelTokens.length === 0 || m.modelMatchCount === modelTokens.length) &&
      (colorTokens.length === 0 || m.colorMatched)
  );

  const balanced = balanceBySource(candidates.map((m) => m.listing));
  return { listings: balanced, exact: anyFullMatch };
}
