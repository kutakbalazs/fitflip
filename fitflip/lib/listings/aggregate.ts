import type { Listing } from "./types";
import { searchVinted } from "./vinted";
import { searchJofogas } from "./jofogas";

export async function searchAllMarketplaces(query: string): Promise<Listing[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results = await Promise.allSettled([
    searchVinted(trimmed, 6),
    searchJofogas(trimmed, 6),
  ]);

  const all: Listing[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  return all;
}
