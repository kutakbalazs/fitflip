// Human-readable fallback name when brand+model are unknown.
// Shared by the watchers page and the home "recent items" grid.

const TYPE_HU: Record<string, string> = {
  sneaker: "Sneaker", boot: "Bakancs", sandal: "Szandál",
  "t-shirt": "Póló", jersey: "Mez", longsleeve: "Hosszúujjú", hoodie: "Hoodie",
  sweatshirt: "Pulóver", jacket: "Kabát", coat: "Kabát", vest: "Mellény",
  pants: "Nadrág", jeans: "Farmer", shorts: "Rövidnadrág",
  skirt: "Szoknya", dress: "Ruha", cap: "Sapka", hat: "Kalap",
  beanie: "Kötött sapka", bag: "Táska", belt: "Öv", scarf: "Sál",
  gloves: "Kesztyű", sunglasses: "Napszemüveg", watch: "Óra",
  accessory: "Kiegészítő", other: "Darab",
};

const TYPE_EN: Record<string, string> = {
  sneaker: "Sneaker", boot: "Boot", sandal: "Sandal",
  "t-shirt": "T-shirt", jersey: "Jersey", longsleeve: "Longsleeve", hoodie: "Hoodie",
  sweatshirt: "Sweatshirt", jacket: "Jacket", coat: "Coat", vest: "Vest",
  pants: "Pants", jeans: "Jeans", shorts: "Shorts",
  skirt: "Skirt", dress: "Dress", cap: "Cap", hat: "Hat",
  beanie: "Beanie", bag: "Bag", belt: "Belt", scarf: "Scarf",
  gloves: "Gloves", sunglasses: "Sunglasses", watch: "Watch",
  accessory: "Accessory", other: "Item",
};

export function fallbackName(
  itemType: string | null,
  color: string | null,
  lang: "hu" | "en",
): string {
  const map = lang === "hu" ? TYPE_HU : TYPE_EN;
  const noun = itemType && map[itemType] ? map[itemType] : map.other;
  if (color && color.trim().length > 0) {
    // HU: "Fekete sneaker" / EN: "Black sneaker"
    const cap = color.charAt(0).toUpperCase() + color.slice(1);
    return `${cap} ${noun.toLowerCase()}`;
  }
  return noun;
}
