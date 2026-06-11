export type ListingSource = "vinted" | "jofogas" | "ebay";

export type Listing = {
  source: ListingSource;
  title: string;
  priceHuf: number | null;
  priceLabel: string;
  url: string;
  imageUrl: string | null;
  location: string | null;
  condition: string | null;
  /** Seller-tagged size (e.g. Vinted's structured size field), if known. */
  sizeLabel?: string | null;
};
