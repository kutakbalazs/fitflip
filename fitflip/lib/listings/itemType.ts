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
  accessory: [], // no filter — too generic
  other: [],     // no filter
};

export function filterListingsByItemType<T extends { title: string }>(
  listings: T[],
  itemType: string | null | undefined
): T[] {
  if (!itemType) return listings;
  const keywords = ITEM_TYPE_KEYWORDS[itemType.toLowerCase()];
  if (!keywords || keywords.length === 0) return listings;
  const filtered = listings.filter((l) => {
    const t = ` ${l.title.toLowerCase()} `;
    return keywords.some((kw) => t.includes(kw.toLowerCase()));
  });
  // Safety net: if the filter eliminates *everything* we'd rather show a
  // possibly-noisy result than an empty grid (caller can then warn the user).
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
