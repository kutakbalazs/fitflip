// Item-type → multilingual keyword dictionary. Used to filter marketplace
// listings so a search for a T-shirt doesn't return phones, or a sneaker
// search doesn't return generic shoe-care accessories.
//
// Keywords are matched as substrings against the lower-cased listing title.
// Hungarian, English, German, Polish, Czech, Slovak coverage targets the
// marketplaces we aggregate (Vinted HU/PL/DE/CZ/SK, Jófogás, eBay DE).

export type ItemType =
  | "sneaker"
  | "boot"
  | "sandal"
  | "t-shirt"
  | "jersey"
  | "longsleeve"
  | "hoodie"
  | "sweatshirt"
  | "jacket"
  | "coat"
  | "vest"
  | "pants"
  | "jeans"
  | "shorts"
  | "skirt"
  | "dress"
  | "cap"
  | "hat"
  | "beanie"
  | "bag"
  | "belt"
  | "scarf"
  | "gloves"
  | "sunglasses"
  | "watch"
  | "accessory"
  | "other";

export const ITEM_TYPE_KEYWORDS: Record<string, string[]> = {
  sneaker: [
    "sneaker", "sneakers", "trainer", "trainers", "kicks", "schuh", "schuhe",
    "cipő", "cipo", "edzőcipő", "edzocipo", "tornacipő", "tornacipo",
    "buty", "tenisówki", "tenisowki", "boty", "tenisky",
    // Common sneaker model words that imply sneakers:
    "jordan", "air max", "yeezy", "dunk", "force", "blazer", "samba",
    "stan smith", "gazelle", "superstar", "presto", "huarache",
  ],
  boot: [
    "boot", "boots", "bakancs", "csizma", "stiefel", "kozaki", "buty zimowe",
  ],
  sandal: [
    "sandal", "sandals", "szandál", "szandal", "sandale", "sandały", "sandaly",
    "papucs", "slipper", "flip-flop", "flip flop",
  ],
  "t-shirt": [
    "t-shirt", "tshirt", "t shirt", "tee", " tee ",
    "póló", "polo", "ing", "felső", "felso",
    "koszulka", "tričko", "tricko",
  ],
  jersey: [
    "jersey", "mez", "focimez", "futballmez", "meze",
    "trikot", "trikot", "maillot", "dres", "dress shirt",
    "koszulka piłkarska", "koszulka pilkarska", "shirt",
    "home shirt", "away shirt", "third shirt", "kit",
    "hazai mez", "vendég mez", "vendeg mez", "idegenbeli",
  ],
  longsleeve: [
    "longsleeve", "long sleeve", "long-sleeve", "hosszúujjú", "hosszuujju",
    "langarm", "longsleve",
  ],
  hoodie: [
    "hoodie", "hooded", "kapucnis", "kapucni", "hooded sweatshirt",
    "bluza z kapturem", "mikina s kapucí",
  ],
  sweatshirt: [
    "sweatshirt", "sweater", "pulover", "pulóver", "pulcsi",
    "bluza", "mikina", "pullover", "jumper",
  ],
  jacket: [
    "jacket", "jacke", "dzseki", "kabát", "kabat", "dzsekit",
    "kurtka", "bunda", "windbreaker", "bomber", "varsity",
  ],
  coat: [
    "coat", "mantel", "kabát", "kabat", "płaszcz", "kabát", "kabát",
    "overcoat", "trench",
  ],
  vest: [
    "vest", "weste", "mellény", "melleny", "kamizelka", "vesta",
    "gilet", "puffer vest",
  ],
  pants: [
    "pants", "trousers", "nadrág", "nadrag", "hose", "spodnie", "kalhoty",
    "chinos", "cargo", "joggers", "sweatpants", "melegítő", "melegito",
  ],
  jeans: [
    "jeans", "denim", "farmer", "farmernadrág", "farmernadrag",
    "dżinsy", "dzinsy", "džíny", "dziny",
  ],
  shorts: [
    "shorts", "rövidnadrág", "rovidnadrag", "rövid nadrág",
    "krátké kalhoty", "kratke kalhoty", "spodenki",
  ],
  skirt: [
    "skirt", "szoknya", "rock", "spódnica", "spódniczka", "sukně", "sukne",
  ],
  dress: [
    "dress", "ruha", "kleid", "sukienka", "šaty", "saty",
  ],
  cap: [
    "cap", "sapka", "baseball sapka", "snapback", "trucker",
    "czapka", "kšiltovka", "ksiltovka", "mütze", "mutze",
    "5-panel", "5 panel",
  ],
  hat: [
    "hat", "kalap", "hut", "kapelusz", "klobouk", "fedora", "bucket hat",
  ],
  beanie: [
    "beanie", "kötött sapka", "kotott sapka", "wollmütze", "wollmutze",
    "czapka zimowa", "pletená čepice",
  ],
  bag: [
    "bag", "táska", "taska", "tasche", "torba", "taška", "taska",
    "backpack", "hátizsák", "hatizsak", "messenger", "duffle",
  ],
  belt: [
    "belt", "öv", " ov ", "gürtel", "gurtel", "pasek", "pásek", "pasek",
  ],
  scarf: [
    "scarf", "sál", "sal", "schal", "szalik", "šála", "sala",
  ],
  gloves: [
    "gloves", "kesztyű", "kesztyu", "handschuh", "rękawiczki", "rekawiczki",
  ],
  sunglasses: [
    "sunglasses", "sunglass", "napszemüveg", "napszemuveg", "szemüveg", "szemuveg",
    "sonnenbrille", "brille", "okulary", "okulary przeciwsłoneczne",
    "sluneční brýle", "slnečné okuliare", "okuliare", "brýle",
    "shades", "eyewear", "ray-ban", "rayban", "wayfarer", "aviator",
  ],
  watch: [
    "watch", "óra", "ora", "karóra", "karora", "armbanduhr", "uhr",
    "zegarek", "hodinky", "hodinky", "smartwatch",
  ],
  accessory: [], // no filter — too generic
  other: [],     // no filter
};

// Non-apparel accessories where showing a wrong-category listing is
// egregious (a dress under a sunglasses search). For these we do NOT fall
// back to the unfiltered list when the keyword filter empties everything —
// an empty panel is far better than apparel under an accessory search.
export const STRICT_FILTER_TYPES = new Set<string>([
  "sunglasses",
  "watch",
  "bag",
  "belt",
  "cap",
  "hat",
  "beanie",
]);

// Item types that are genuinely model-less (a belt / scarf / pair of gloves
// rarely has an identifiable model), so the listings panel always presents
// results as "similar", never exact. Bags, sunglasses, watches and caps DO
// have identifiable models/lines (Neverfull, Wayfarer, G-Shock, 9FORTY), so
// they're treated like sneakers — a genuine match shows as exact.
export const SIMILAR_ONLY_TYPES = new Set<string>([
  "belt",
  "beanie",
  "scarf",
  "gloves",
  "accessory",
]);

export function isSimilarOnlyType(itemType: string | null | undefined): boolean {
  return !!itemType && SIMILAR_ONLY_TYPES.has(itemType.toLowerCase());
}

export function isStrictFilterType(itemType: string | null | undefined): boolean {
  return !!itemType && STRICT_FILTER_TYPES.has(itemType.toLowerCase());
}

export function filterListingsByItemType<T extends { title: string }>(
  listings: T[],
  itemType: string | null | undefined,
  modelTokens: string[] = []
): T[] {
  if (!itemType) return listings;
  const type = itemType.toLowerCase();
  const keywords = ITEM_TYPE_KEYWORDS[type];
  if (!keywords || keywords.length === 0) return listings;
  // A distinctive model word from the scan (e.g. "Spezial") identifies the
  // item type by itself — sellers often title sneakers "Adidas Handball
  // Spezial 42" with no generic type word ("cipő", "sneaker", "buty") at
  // all, and the keyword filter alone would wrongly drop those. Short
  // tokens (< 4 chars: "OG", "Low", numbers) are too noisy to count.
  const strongModelTokens = modelTokens
    .map((tok) => tok.trim().toLowerCase())
    .filter((tok) => tok.length >= 4);
  const filtered = listings.filter((l) => {
    const t = ` ${l.title.toLowerCase()} `;
    return (
      keywords.some((kw) => t.includes(kw.toLowerCase())) ||
      strongModelTokens.some((mt) => t.includes(mt))
    );
  });
  // For strict (non-apparel accessory) types, never fall back — return the
  // empty set so the caller shows "no matches" instead of random clothing.
  if (filtered.length === 0 && STRICT_FILTER_TYPES.has(type)) {
    return filtered;
  }
  // Apparel safety net: if the filter eliminates *everything* we'd rather
  // show a possibly-noisy result than an empty grid (keyword dicts are
  // incomplete; caller can still warn the user).
  return filtered.length === 0 ? listings : filtered;
}

export function isFilteredByItemType<T extends { title: string }>(
  listings: T[],
  itemType: string | null | undefined
): { wasFiltered: boolean; droppedCount: number } {
  if (!itemType) return { wasFiltered: false, droppedCount: 0 };
  const keywords = ITEM_TYPE_KEYWORDS[itemType.toLowerCase()];
  if (!keywords || keywords.length === 0) return { wasFiltered: false, droppedCount: 0 };
  const dropped = listings.filter((l) => {
    const t = ` ${l.title.toLowerCase()} `;
    return !keywords.some((kw) => t.includes(kw.toLowerCase()));
  });
  return { wasFiltered: dropped.length > 0, droppedCount: dropped.length };
}
