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
};
