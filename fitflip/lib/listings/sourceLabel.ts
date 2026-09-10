import type { ListingSource } from "./types";

/**
 * Display name for a marketplace.
 *
 * This used to be an inline ternary repeated in five render spots, which is
 * exactly how a new source ends up labelled "etsy" in lowercase in three of
 * them — adding one here now covers every list at once.
 */
export function sourceLabel(source: ListingSource | string): string {
  switch (source) {
    case "vinted":
      return "Vinted";
    case "jofogas":
      return "Jófogás";
    case "ebay":
      return "eBay";
    case "etsy":
      return "Etsy";
    default:
      return String(source);
  }
}
