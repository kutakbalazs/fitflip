/**
 * Pre-cached "AI scan" result for the onboarding demo. Shown instantly when
 * the user picks "Try with this image" — no API call, no tokens burned.
 *
 * The image is /public/Onboarding-pic1.avif (grey Supreme Box Logo Hoodie).
 * The verdict is hand-tuned to be plausible and exciting; real listings are
 * fetched live alongside via /api/onboarding/demo-listings.
 */

import type { Listing } from "@/lib/listings/types";

export type DemoScanResult = {
  brand: string;
  model: string;
  color: string;
  itemType: string;
  era: string;
  condition: string;
  retailHuf: number;
  estimateMinHuf: number;
  estimateMaxHuf: number;
  hypeScore: number;
  hypeLabel: string;
  description: string;
  sellingTip: string;
  story: string;
  confidence: "low" | "medium" | "high";
  // Tokens for the live listings search.
  queries: string[];
  brandTokens: string[];
  modelTokens: string[];
  colorTokens: string[];
};

export const demoScanHU: DemoScanResult = {
  brand: "Supreme",
  model: "Box Logo Hooded Sweatshirt",
  color: "szürke",
  itemType: "hoodie",
  era: "2010-es évek",
  condition: "Új",
  retailHuf: 165_000,
  estimateMinHuf: 80_000,
  estimateMaxHuf: 130_000,
  hypeScore: 9,
  hypeLabel: "Kult darab",
  description:
    "A Supreme egyik legikonikusabb darabja: a Box Logo Hoodie. A szürke variáns klasszikus, év közben is hordható, gyűjtői érték. Használt darabnál is jól tartja az árát.",
  sellingTip:
    "Mutasd meg a belső címkét és a Box Logo közeli fotóját — ezek autentikálják a darabot, és a vásárlók így rögtön megbíznak.",
  story:
    "A Supreme 1994-ben nyitotta meg első üzletét New York-i Lafayette Streeten, és kezdetben elsősorban a helyi gördeszkás közösséget szolgálta ki. A Box Logo design — fehér Futura Heavy Oblique betűkkel egy piros téglalapon — a magazin Barbara Kruger műveiből merített ihletet, és néhány éven belül a streetwear univerzális szimbóluma lett.\n\nA Box Logo Hoodie csak korlátozott példányszámban, évente egyszer-kétszer kerül kiadásra, és a kasszánál perceken belül elfogy. A szürke colorway különösen keresett: visszafogott, mindenhez passzol, mégis azonnal felismerhető a beavatottaknak. A használtpiacon — a Vinted és a StockX statisztikák alapján — következetesen az eredeti kiadási ár 80–150%-án forog.",
  confidence: "high",
  queries: ["Supreme Box Logo Hoodie szürke", "Supreme Box Logo Hooded Sweatshirt"],
  brandTokens: ["Supreme"],
  modelTokens: ["Box Logo", "BoxLogo", "BLH"],
  colorTokens: ["szürke", "grey", "gray"],
};

export const demoScanEN: DemoScanResult = {
  brand: "Supreme",
  model: "Box Logo Hooded Sweatshirt",
  color: "grey",
  itemType: "hoodie",
  era: "2010s",
  condition: "New",
  retailHuf: 165_000,
  estimateMinHuf: 80_000,
  estimateMaxHuf: 130_000,
  hypeScore: 9,
  hypeLabel: "Cult piece",
  description:
    "One of Supreme's most iconic pieces: the Box Logo Hoodie. The grey colorway is a year-round classic with strong collector value. Holds its value well even when used.",
  sellingTip:
    "Show the inner label and a close-up of the Box Logo — these authenticate the piece, and buyers will trust your listing immediately.",
  story:
    "Supreme opened its first store on Lafayette Street in New York in 1994, originally serving the local skateboarding scene. The Box Logo design — white Futura Heavy Oblique letters on a red rectangle — was inspired by Barbara Kruger's work, and within a few years became a universal streetwear symbol.\n\nThe Box Logo Hoodie is released only in limited drops, once or twice a year, and sells out within minutes. The grey colorway is particularly sought-after: understated, versatile, yet instantly recognizable to those in the know. On the resale market — according to Vinted and StockX data — it consistently trades at 80–150% of original retail.",
  confidence: "high",
  queries: ["Supreme Box Logo Hoodie grey", "Supreme Box Logo Hooded Sweatshirt"],
  brandTokens: ["Supreme"],
  modelTokens: ["Box Logo", "BoxLogo", "BLH"],
  colorTokens: ["grey", "gray", "szürke"],
};

export type DemoListingsResponse = {
  listings: Listing[];
};
