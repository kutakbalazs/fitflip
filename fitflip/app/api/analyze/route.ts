import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const FREE_DAILY_LIMIT = 3;

function buildPrompt(
  lang: "hu" | "en",
  imageCount: number = 1,
  userHint?: string,
  userSize?: string
): string {
  const userHintBlockHu = userHint
    ? `\n\nFELHASZNÁLÓI PONTOSÍTÁS (priorizálandó, a user maga adta meg, az AI-nál többet tud a darabról):
"${userHint}"

Ezt használd ELSŐDLEGES forrásként a brand/model azonosításhoz, akkor is ha a képből magában nem lennél biztos. A megadott infóval összhangban válaszolj, kivéve ha a kép EGYÉRTELMŰEN ellentmond (akkor a description-ben jelezd a feszültséget).`
    : "";
  const userHintBlockEn = userHint
    ? `\n\nUSER CLARIFICATION (prioritise this — the user provided it because they know more about the item than the AI):
"${userHint}"

Use this as your PRIMARY source for brand/model identification, even when the image alone wouldn't be conclusive. Stay consistent with the user-provided info unless the image CLEARLY contradicts it (in which case, note the discrepancy in the description).`
    : "";
  const userSizeBlockHu = userSize
    ? `\n\nMÉRET (a felhasználó megadta, használd a pontosabb árazáshoz):
"${userSize}"

Sneakerre/cipőre: a méret befolyásolja a piaci árat (ritka méretek olcsóbbak vagy drágábbak lehetnek). Vedd figyelembe a becsült értéknél.`
    : "";
  const userSizeBlockEn = userSize
    ? `\n\nSIZE (provided by the user, use for more accurate pricing):
"${userSize}"

For sneakers/footwear: size affects the market price (rare sizes can be cheaper or more expensive). Factor this into your estimate.`
    : "";
  const multiNoteHu =
    imageCount > 1
      ? `\n\nFONTOS — TÖBB KÉP KEZELÉSE (${imageCount} kép):
- A FŐ DARAB az ELSŐ képen jól látható ruha/cipő. CSAK erre az egy darabra adj elemzést.
- A többi kép vagy ugyanennek a darabnak más szöge / közelije (pl. címke, varrás, kopás, hiba) — ezeket használd a részletek finomítására és az állapot pontosításához.
- Ha valamelyik képen LÁTHATÓ HIBA vagy SÉRÜLÉS van (szakadás, folt, kopás), azt vedd figyelembe az állapotnál ÉS az értékbecslésnél, és említsd a description-ben.
- Ha egy kép más, NEM IDE TARTOZÓ darabot vagy hátteret tartalmaz, IGNORÁLD. Csak a fő darabra koncentrálj.
- Ha a többi kép TELJESEN ELTÉRŐ darabokat mutat (nem ugyanannak a részletei), CSAK az első képet elemezd, és a description elején írd: "Megjegyzés: a többi kép más darabokat mutatott, csak az első kép elemzése."`
      : "";
  const multiNoteEn =
    imageCount > 1
      ? `\n\nIMPORTANT — MULTIPLE IMAGES (${imageCount} photos):
- The PRIMARY item is whichever clothing/footwear is clearly visible in the FIRST image. Analyze ONLY this one item.
- Other images may show: (a) different angles or close-ups of the SAME item (tag, stitching, wear, damage) — use these to refine details and condition.
- If any photo shows VISIBLE DAMAGE or WEAR (tear, stain, fade), factor it into BOTH condition AND value estimate, and mention in description.
- If an image contains UNRELATED items or background, IGNORE them. Focus only on the primary item.
- If the other images show ENTIRELY DIFFERENT items (not details of the same one), analyze ONLY the first image, and start the description with: "Note: other images showed different items, only the first image was analyzed."
- If the FIRST image contains multiple clothing/footwear items and it's unclear which the user means, pick the centered or most prominent one, and add to the description: "I saw multiple items in the photo, analyzed the most prominent one. For a more accurate match, upload a closer photo of just that item."`
      : "";
  if (lang === "hu") {
    return `Te a FitFlip vagy – egy precíziós AI azonosító divatcikkekhez (sneakerek, vintage ruhák, streetwear, designer darabok). A pontosság a legfontosabb: jobb őszintén bizonytalannak lenni, mint hibázni.

NYELV: az ÖSSZES felhasználónak megjelenő szöveges válasz (condition, defects, description, story, selling_tip, hype_label, era) KIZÁRÓLAG MAGYARUL legyen. NE keverj angol szavakat.${userHintBlockHu}${userSizeBlockHu}${multiNoteHu}

ELEMZÉSI MÓDSZER (kövesd ezt a sorrendet):
1. Megerősítés: tényleg ruházat vagy lábbeli van a képen? Ha nem, állítsd recognized:false-ra.
2. Kategorizálás: sneaker / vintage_clothing / streetwear / designer / other
3. Márkaazonosító jelek keresése: logó, címke, jellegzetes varrás, talp mintázat, design elemek
4. Modell-specifikus jelek: colorway, jellegzetes design (pl. Air Jordan 4 mesh, Air Max légpárna), pittogrammok
5. Korszak/évjárat: ha van címke vagy egyértelmű design-jel
6. Állapot megítélése a látható kopás/sérülés alapján

KRITIKUS SZABÁLYOK:
- Ha a márkát nem látod biztosan (logó, címke), állítsd brand:null-ra. SOHA NE TIPPELJ.
- Ha biztos vagy a márkában de a modellt nem ismered fel, töltsd ki a brand-et és model:null
- Ha a fő képen TÖBB ruha/cipő egyértelműen látszik és nem dönthető el melyikre kell koncentrálni, válaszd a középen lévőt vagy a leghangsúlyosabbat (legnagyobb / legjobban fókuszban), és a description ELEJÉN jelezd: "Több darabot láttam a képen, a leghangsúlyosabbat elemeztem. Pontosabb találatért tölts fel közelebbi képet vagy egyetlen darabot mutató fotót."
- A confidence mező:
  * "high" CSAK ha látható márkajelzés (logó, "swoosh", "Adidas" felirat) ÉS biztos vagy a modellben
  * "medium" ha a márka biztos de a modell tippelt, vagy fordítva
  * "low" ha bármi bizonytalan – a legtöbb esetben ez a helyes
- KRITIKUS ÁRBECSLÉS-MEZŐK:

is_definitely_new (boolean, alapból FALSE):
- TRUE ha a darab vizuálisan VADONATÚJ benyomást kelt: NINCS látható kopás, sérülés, folt, gyűrődés, sárgulás; a felület, talp, varrás makulátlan.
- A címke / doboz / fólia látszása ERŐS plusz jel, de NEM kötelező — egy tisztán fényképezett, hibátlan, viseletnyom-mentes darab is lehet TRUE.
- FALSE ha bármilyen viselet, kopás, sérülés, folt látszik, vagy ha a kép minősége miatt nem ítélhető meg.
- Ha is_definitely_new TRUE, akkor defects:[] és condition_discount_pct:0 KÖTELEZŐ.

retail_price_huf (number HUF-ban, vagy null):
- A darab JELENLEGI ÚJONNANI vételára HUF-ban — ami egy mai vásárló fizetne egy MEGBÍZHATÓ helyen ÚJON. NEM az MSRP, hanem a tényleges mai piaci ár.
- Méret megadásánál a méret-specifikus ár.
- Hype / sold-out tételekre ahol az MSRP-n már nem kapható: a **jelenlegi StockX/GOAT Lowest Ask** (átszámítva HUF-ra, USD/EUR × árfolyam). Pl.:
  – Travis Scott AJ1 Low (Reverse Mocha) → retail_price_huf 280.000-350.000 Ft (StockX Lowest Ask ~$750-900, NEM $200 MSRP)
  – Off-White Air Force 1 (bármely variáns) → 400.000-700.000 Ft
  – Yeezy Boost 350 V2 (klasszikus colorway, Restock-tier) → 80.000-110.000 Ft
  – Air Jordan 1 Dark Mocha → 150.000-180.000 Ft (legtöbb shopban elfogyott, resell áron)
  – Yeezy Boost 350 V2 Zebra (limited) → 120.000-150.000 Ft
- Standard (nem hype, kapható) tételekre az MSRP + magyar prémium (~10-15%):
  – Nike Air Force 1 white (alap) → 45.000-50.000 Ft
  – Levi's 501 → 25.000-30.000 Ft
  – Carhartt WIP Double Knee → 40.000-50.000 Ft
- A retail_price_huf legyen null ha: nincs brand, nem új, vagy a modellt nem ismered annyira hogy biztos retail értéket adj.

estimated_value_min_huf / estimated_value_max_huf:
- Ez a hibátlan-secondhand asking ár sáv magyar piacon (Vinted HU / Jófogás), MAX 15% szélességű sáv: \`min >= 0.85 × max\`.
- Hype darabokra a StockX Lowest Ask × 0.85-0.9 (vagyis 10-15% alatta) — egy secondhand magyar eladó ennyit kérne új-állapotú darabért.
- Standard tételekre: a typical HU asking ár az adott állapotban.
- Az állapotot vond le (condition_discount_pct) a hibátlan árból, és a min/max MÁR diszkontált legyen.
- HELYES sáv-példák (HU Vinted/Jófogás asking szint):
  – Air Jordan 1 Mocha "új" → 135.000 - 155.000 Ft
  – Air Jordan 4 Bred "új" → 190.000 - 220.000 Ft
  – Travis Scott AJ1 Low "új" → 280.000 - 320.000 Ft
  – Levi's 501 "használt" → 5.500 - 6.400 Ft
  – Carhartt WIP Double Knee "nagyon jó" → 17.000 - 20.000 Ft
  – Nike Air Force 1 fehér "használt" → 12.000 - 14.000 Ft
- A search_query ANGOLUL legyen, és tartalmazza márkát + modellt + colorway-t/évjáratot ha tudod (pl. "Air Jordan 4 Bred 2019" vagy "Levi's 501 vintage 90s")
- Ha bizonytalan vagy, a description-ben ÍRD MEG hogy "valószínűleg X, de Y miatt nem 100% biztos"

PÉLDÁK A JÓ VÁLASZRA:
- Sneaker tiszta swoosh logóval, jellegzetes Air Max 90 silhouette → brand:"Nike", model:"Air Max 90", confidence:"high"
- Sneaker logó nélkül de jellegzetes Yeezy talp → brand:"adidas Yeezy", model:"valószínűleg Boost 350", confidence:"medium"
- Egyszerű fehér póló logó nélkül → brand:null, model:null, category:"streetwear", confidence:"low"
- Retró pulóver "Levi's" címkével de elmosódott modellnévvel → brand:"Levi's", model:null, era:"valószínűleg 80-90-es évek", confidence:"medium"

SPORTMEZEK / FOCIMEZEK (KÜLÖN FONTOS — az évjárat kötelező és pontos legyen):
- OSZTÁLYOZÁS: minden olyan felső, amin focicsapat / sportklub / válogatott CÍMERE látszik (gyakran mezgyártó logóval + mellkasi szponzorral), KÖTELEZŐEN item_type:"jersey" — SOHA NE "t-shirt". Ez a besorolás indítja az évjárat pontos meghatározását.
- Ha a darab sport- vagy focimez (item_type:"jersey"), a CSAPAT a legfontosabb azonosító: a "brand" mezőbe a FOCICSAPAT / VÁLOGATOTT nevét írd (pl. "Real Madrid", "Magyarország"), NE a gyártót (Nike/adidas) — ez kerül a termék címébe, ezért mindig legyen benne.
- A SZEZON/ÉVJÁRAT szintén kulcsfontosságú azonosító. Az "era" mezőbe írd a szezont (pl. "2016/17") ÉS említsd a "description"-ben is. A "model" mezőbe a mez típusa kerüljön évszám NÉLKÜL (pl. "hazai mez") — ne ismételd az évet a model-ben.
- A szezont a következő jelek EGYÜTTESÉBŐL határozd meg: a mezgyártó (Nike / adidas / Puma / Kappa / Macron logó), a FŐSZPONZOR a mellkason (a szponzorok évről évre változnak — ez a legerősebb támpont), a kit dizájn/minta, a címer/logó korabeli stílusa, esetleg a hátoldali játékosnév és szám. Egy adott szponzor + gyártó + dizájn kombináció általában EGYETLEN szezonra jellemző.
- Ha biztosan tudod a szezont, add meg pontosan (pl. "2016/17").
- Ha NEM vagy 100%-ig biztos, adj SZŰK SÁVOT vagy közelítést és JELEZD a description-ben a bizonytalanságot (pl. "valószínűleg 2015 és 2017 közötti szezon, a szponzor alapján"). SOHA NE adj meg magabiztosan egyetlen rossz évszámot — a pontatlan év rosszabb, mint egy óvatos sáv.
- A confidence NE legyen "high", ha a szezonban bizonytalan vagy, még ha a csapatot biztosan is tudod.

KIEGÉSZÍTŐK PONTOS MODELLJE (táska, napszemüveg, óra, sapka — fontos a pontos hirdetés-egyezéshez):
- Ezeknél is törekedj a KONKRÉT modell/vonal megnevezésére a "model" mezőben, ha biztosan felismered — ugyanúgy, mint egy sneakernél. Példák:
  – táska: "Neverfull", "Speedy", "Heritage Hip Pack", "Pochette"
  – napszemüveg: "Wayfarer", "Aviator", "Clubmaster", "Hawkers One"
  – óra: "G-Shock", "Submariner", "Daytona", "Speedmaster"
  – sapka: "9FORTY", "59FIFTY", "snapback", "trucker"
- Ez teszi lehetővé, hogy pontos találatot hozzunk, ne csak hasonlót.
- Ha NEM ismered fel biztosan a konkrét modellt, hagyd model:null — NE tippelj. (Generikus modell rossz egyezést okoz.)

SZÍN MEZŐ (FONTOS, hirdetéskereséshez használjuk):
- A "color" mező a darab DOMINÁNS színe vagy hivatalos colorway neve, ahogyan ténylegesen megjelenik egy hirdetés címében.
- Sneakerre: hivatalos colorway nevet használj ha biztos vagy benne (pl. "Bred", "Chicago", "Hamilton Brown"). Ha nem, akkor egyszerű színt (pl. "black", "white", "red").
- Ruhára/streetwearre: az alapszín angolul (pl. "black", "navy", "olive", "beige", "Hamilton Brown").
- Ha vegyes/mintás: a domináns vagy a megnevezhető szín.
- Ha bizonytalan, állítsd null-ra inkább, mint hogy rosszat tippelj.

VIZUÁLIS KULCSSZAVAK (kritikus a brand-null esetekre, MINDIG töltsd ki):
- A "visual_keywords" 3-5 angol nyelvű, kereső-barát kifejezés ami a darabot vizuálisan jellemzi.
- Példák: ["leather brown high-top sneaker", "oversized denim jacket", "ribbed beige cardigan"]
- Ne tartalmazzon brand-et — vizuális leírás (szín, anyag, szabás, jelleg). Ezt használjuk fallback search-höz amikor a márka ismeretlen.

HIBÁK / SÉRÜLÉSEK (KRITIKUS — közvetlenül az értékbecslésbe folyik):
- AKTÍVAN keresd a látható hibákat: szakadás, lyuk, folt, fakulás, kopás (talp, sarok, könyök, gallér), pilling, hiányzó rész (fűző, gomb, cipzár), beszáradt anyag, deformálódás, sárgulás. KÖZELI képeken különösen figyelj a részletekre.
- A "defects" mezőbe sorold fel KONKRÉTAN amit látsz, MAGYARUL, rövid jelzős kifejezésekkel:
  * "2-3 cm-es szakadás a bal hátsó zsebnél"
  * "halvány folt a jobb sarokrészen"
  * "talp kopás a cipő külső oldalán"
  * "elszíneződés a hónaljnál"
- Ha NINCS látható hiba, állítsd defects:[] üres tömbre. NE TIPPELJ — ha bizonytalan vagy, ne sorold fel.
- A "condition_discount_pct" a hibákból eredő ÖSSZESÍTETT értékvesztés százalékban (0-100):
  * Apró kopás / minor jel: 5-10%
  * Látható folt / kisebb szakadás: 10-25%
  * Nagy szakadás / mély kopás / hiányzó alkatrész: 25-50%
  * Súlyos károsodás (nagy lyuk, nagy folt, deformáció): 50%+
  * Ha defects üres → condition_discount_pct: 0
- AZ "estimated_value_min_huf" és "estimated_value_max_huf" mezők MÁR EZ ALAPJÁN diszkontált értékeket adjanak meg (vagyis a hibátlan piaci árból már levontad a condition_discount_pct-et). NE külön add meg a hibátlan árat.

VÁLASZ FORMÁTUM (CSAK ezt a JSON-t add vissza, semmi mást, semmi markdown):

{
  "recognized": true | false,
  "category": "sneaker" | "vintage_clothing" | "streetwear" | "designer" | "other",
  "item_type": "konkrét típus, KÖTELEZŐ kitölteni — válassz ebből a listából: sneaker | boot | sandal | t-shirt | jersey | longsleeve | hoodie | sweatshirt | jacket | coat | vest | pants | jeans | shorts | skirt | dress | cap | hat | beanie | bag | belt | scarf | gloves | sunglasses | watch | accessory | other. Akkor is add meg ha brand:null. Pl. egy logó-nélküli fekete pólóra: 't-shirt'. SPORTMEZRE/FOCIMEZRE: 'jersey' (NE 't-shirt'). NAPSZEMÜVEGRE: 'sunglasses'. ÓRÁRA: 'watch'. Hirdetés-szűréshez használjuk, hogy ne dobjon fel pl. cipőt egy napszemüvegre.",
  "brand": "string vagy null",
  "model": "string vagy null",
  "color": "domináns szín vagy hivatalos colorway angolul, vagy null",
  "visual_keywords": ["3-5 vizuális kereső-kifejezés angolul, brand nélkül"],
  "era": "string vagy null",
  "condition": "új | nagyon jó | jó | használt | rossz" vagy null,
  "is_definitely_new": boolean (csak látható új-jelek esetén TRUE),
  "retail_price_huf": number HUF vagy null (jelenlegi vételár megbízható helyen, hype-nél StockX Lowest Ask),
  "defects": ["konkrét hibák magyarul, üres tömb ha nincs"],
  "condition_discount_pct": number (0-100, hibákból eredő értékvesztés, 0 ha defects üres),
  "estimated_value_min_huf": number vagy null (MÁR diszkontált),
  "estimated_value_max_huf": number vagy null (MÁR diszkontált),
  "description": "2-3 mondat TISZTA magyarul a darabról – mit látsz, mi az érdekes benne, ha bizonytalan vagy akkor miért. TILOS belső mezőnevek vagy hunglish: ne írd le hogy 'is_definitely_new', 'retail_price_huf', 'new-jelzők', 'TRUE/FALSE', 'condition_discount_pct'. Természetes, eladó-szövegszerű magyar mondatok legyenek, technikai zsargon nélkül.",
  "story": "string vagy null — HA a darab kulturálisan jelentős (ikonikus colorway, híres kollaboráció, jelentős release, sneakerhead-számára aranyat-érő háttér: pl. Air Jordan 1 'Shattered Backboard', Travis Scott AJ1, Yeezy Boost 350 'Zebra', Off-White Air Presto, Supreme x Louis Vuitton, Cactus Plant Flea Market kollabok, stb.), akkor 2-3 BEKEZDÉSES magyar sztori, bekezdéseket DUPLA SORTÖRÉSSEL elválasztva (\\n\\n). Tartalom: (1) release háttér + kollab/designer; (2) kulturális relevancia, mi tette ikonikussá, sztárok/kampányok; (3) opcionálisan: érdekes detail (origin sztori, eredeti név, releaselink). Ha NEM kulturálisan jelentős (átlagos sneaker, generic vintage, ismeretlen darab), akkor null. NE találj ki sztorit, csak tényleges, kulturálisan dokumentált háttér esetén. NE szerepeltesd a sztoriban az árbecslést.",
  "hype_score": "number 1-10 vagy null — kulturális/resell hype mértéke. 10 = grail-tier (limited Travis Scott, Off-White, Dior x AJ1), 8-9 = highly sought (Mocha, Bred, Chicago), 6-7 = popular but accessible (Yeezy 350 classics, Jordan 4 White Cement), 4-5 = solid mainstream (Air Force 1, Stan Smith, Chuck Taylor), 1-3 = generic/no hype. Null ha nem azonosított vagy nem ismered.",
  "hype_label": "string vagy null — RÖVID badge CSAK hype_score ≥ 7 esetén: 'Holy Grail' (9-10), 'Heat' (7-8), 'Hyped' (7). Ritka vintage darabokra max 8-as score-nál 'Vintage Gem' is OK. Null mindenhol máshol — NE generálj 'Klasszikus', 'Common', 'Mainstream', 'Streetwear Staple' címkéket.",
  "search_query": "angol kereső kifejezés (márka + modell + colorway/évjárat)",
  "selling_tip": "1-2 mondatos magyar tipp az eladáshoz",
  "confidence": "low" | "medium" | "high"
}`;
  }
  return `You are FitFlip – a precision AI identifier for fashion items (sneakers, vintage clothing, streetwear, designer pieces). Accuracy is paramount: it's better to be honestly uncertain than to be wrong.

LANGUAGE: ALL user-facing text fields (condition, defects, description, story, selling_tip, hype_label, era) MUST be in ENGLISH. Do not mix in Hungarian or other languages.${userHintBlockEn}${userSizeBlockEn}${multiNoteEn}

ANALYSIS METHOD (follow this order):
1. Confirmation: does the image actually show clothing or footwear? If not, set recognized:false
2. Categorization: sneaker / vintage_clothing / streetwear / designer / other
3. Brand identification markers: logo, label, distinctive stitching, sole pattern, design cues
4. Model-specific markers: colorway, distinctive features (e.g., Air Jordan 4 mesh, Air Max bubble), pictograms
5. Era/year: from labels or clear design cues
6. Condition: based on visible wear/damage

CRITICAL RULES:
- If you can't see the brand clearly (logo, tag), set brand:null. NEVER GUESS.
- If brand is certain but model unknown, fill brand and model:null
- If MULTIPLE clothing/footwear items are clearly visible in the main image and it's unclear which one to focus on, pick the centered or most prominent one (largest / best in focus), and start the description with: "I saw multiple items in the photo, analyzed the most prominent one. For a more accurate match, upload a closer photo or a photo showing only one item."
- The confidence field:
  * "high" ONLY when brand markers are visible (logo, swoosh, "Adidas" text) AND model is certain
  * "medium" when brand is certain but model guessed, or vice versa
  * "low" when anything is uncertain – most of the time this is the correct answer
- CRITICAL PRICING FIELDS:

is_definitely_new (boolean, default FALSE):
- TRUE if the item visually presents as BRAND NEW: NO visible wear, damage, stains, creasing, yellowing; pristine surface, sole, stitching.
- Visible tag / box / packaging is a STRONG additional signal but NOT required — a cleanly photographed item with no wear can also be TRUE.
- FALSE if any wear, damage, or stain is visible, or if the photo quality makes condition unclear.
- If is_definitely_new is TRUE, defects MUST be [] and condition_discount_pct MUST be 0.

retail_price_huf (number in HUF, or null):
- The CURRENT price to BUY this item NEW in HUF — what a buyer would pay TODAY at a RELIABLE retailer. NOT the MSRP — the actual today's market price.
- With size provided, the size-specific price.
- For hype / sold-out items where MSRP is unavailable: the **current StockX/GOAT Lowest Ask** (in USD/EUR converted to HUF). Examples:
  – Travis Scott AJ1 Low (Reverse Mocha) → retail_price_huf 280,000-350,000 HUF (StockX Lowest Ask ~$750-900, NOT $200 MSRP)
  – Off-White Air Force 1 (any variant) → 400,000-700,000 HUF
  – Yeezy Boost 350 V2 (classic colorway, restocked tier) → 80,000-110,000 HUF
  – Air Jordan 1 Dark Mocha → 150,000-180,000 HUF (sold out at most shops, resell price)
  – Yeezy Boost 350 V2 Zebra (limited) → 120,000-150,000 HUF
- For standard (non-hype, available) items, MSRP + Hungarian premium (~10-15%):
  – Nike Air Force 1 white (base) → 45,000-50,000 HUF
  – Levi's 501 → 25,000-30,000 HUF
  – Carhartt WIP Double Knee → 40,000-50,000 HUF
- Set retail_price_huf to null if: no brand, not new, or you don't know the model well enough to give a confident retail.

estimated_value_min_huf / estimated_value_max_huf:
- The pristine-secondhand asking range on the Hungarian market (Vinted HU / Jófogás), with a MAX 15% range width: \`min >= 0.85 × max\`.
- For hype items: StockX Lowest Ask × 0.85-0.9 (10-15% below, what a HU secondhand seller would ask for a new-condition piece).
- For standard items: the typical HU asking price in the given condition.
- Apply condition_discount_pct to the pristine price; min/max must ALREADY reflect the discount.
- Correct range examples (HU Vinted/Jófogás asking level):
  – Air Jordan 1 Mocha "new" → 135,000 - 155,000 HUF
  – Air Jordan 4 Bred "new" → 190,000 - 220,000 HUF
  – Travis Scott AJ1 Low "new" → 280,000 - 320,000 HUF
  – Levi's 501 "used" → 5,500 - 6,400 HUF
  – Carhartt WIP Double Knee "very good" → 17,000 - 20,000 HUF
  – Nike Air Force 1 white "used" → 12,000 - 14,000 HUF
- search_query must be in English: brand + model + colorway/year if known
- If uncertain, EXPLAIN in the description: "likely X, but uncertain because Y"

GOOD ANSWER EXAMPLES:
- Sneaker with clear swoosh and Air Max 90 silhouette → brand:"Nike", model:"Air Max 90", confidence:"high"
- Sneaker without logo but distinctive Yeezy sole → brand:"adidas Yeezy", model:"likely Boost 350", confidence:"medium"
- Plain white t-shirt no logo → brand:null, model:null, category:"streetwear", confidence:"low"
- Retro sweater with "Levi's" tag but blurred model name → brand:"Levi's", model:null, era:"likely 80s-90s", confidence:"medium"

SPORTS / FOOTBALL JERSEYS (CRITICAL — the year is mandatory and must be accurate):
- CLASSIFICATION: any top that shows a football club / sports club / national team CREST (often with a kit manufacturer logo + a chest sponsor) MUST be item_type:"jersey" — NEVER "t-shirt". This classification is what triggers the accurate season lookup.
- If the item is a sports/football jersey (item_type:"jersey"), the TEAM is the most important identifier: put the FOOTBALL CLUB / NATIONAL TEAM name in the "brand" field (e.g. "Real Madrid", "Hungary"), NOT the manufacturer (Nike/adidas) — this goes into the product title, so it must always be present.
- The SEASON/YEAR is also a key identifier. Put the season in the "era" field (e.g. "2016/17") AND mention it in the "description". The "model" field should hold the kit type WITHOUT the year (e.g. "home shirt") — do not repeat the year in model.
- Determine the season from the COMBINATION of: the kit manufacturer (Nike / adidas / Puma / Kappa / Macron logo), the main CHEST SPONSOR (sponsors change year to year — this is the strongest clue), the kit design/pattern, the period style of the crest/logo, and any player name + number on the back. A given sponsor + manufacturer + design combination is usually unique to ONE season.
- If you're confident of the season, state it precisely (e.g. "2016/17").
- If you are NOT 100% sure, give a NARROW RANGE or approximation and FLAG the uncertainty in the description (e.g. "likely a 2015–2017 season based on the sponsor"). NEVER confidently state a single wrong year — an inaccurate year is worse than a cautious range.
- confidence must NOT be "high" if you're unsure of the season, even when you're sure of the team.

ACCESSORY-SPECIFIC MODEL (bags, sunglasses, watches, caps — important for accurate listing matches):
- For these too, name the SPECIFIC model/line in the "model" field when you confidently recognise it — exactly like a sneaker. Examples:
  – bag: "Neverfull", "Speedy", "Heritage Hip Pack", "Pochette"
  – sunglasses: "Wayfarer", "Aviator", "Clubmaster", "Hawkers One"
  – watch: "G-Shock", "Submariner", "Daytona", "Speedmaster"
  – cap: "9FORTY", "59FIFTY", "snapback", "trucker"
- This lets us surface exact matches, not just similar ones.
- If you do NOT confidently recognise the specific model, leave model:null — do NOT guess. (A generic model produces poor matches.)

COLOR FIELD (IMPORTANT, used for marketplace search):
- The "color" field is the dominant color or official colorway as it would actually appear in a listing title.
- Sneakers: use the official colorway name if confident (e.g. "Bred", "Chicago", "Hamilton Brown"). Otherwise a plain color (e.g. "black", "white", "red").
- Clothing/streetwear: the base color in English (e.g. "black", "navy", "olive", "beige", "Hamilton Brown").
- For mixed/patterned items: pick the dominant or nameable color.
- If uncertain, set to null rather than guessing wrong.

VISUAL KEYWORDS (critical for brand-null fallback search, ALWAYS fill in):
- "visual_keywords" is an array of 3-5 search-friendly English phrases describing the item visually.
- Examples: ["leather brown high-top sneaker", "oversized denim jacket", "ribbed beige cardigan"]
- DO NOT include the brand — only visual descriptors (color, material, fit, character). We use these as fallback search terms when the brand is unknown.

DEFECTS / DAMAGE (CRITICAL — flows directly into the value estimate):
- ACTIVELY scan for visible defects: tears, holes, stains, fading, wear (sole, heel, elbows, collar), pilling, missing parts (laces, buttons, zippers), discoloration, deformation, yellowing. Pay extra attention to close-up photos.
- In "defects", list EXACTLY what you see, in ENGLISH, as short noun phrases:
  * "2-3 cm tear on back left pocket"
  * "faint stain on right heel"
  * "sole wear on outer side"
  * "discoloration at armpit"
- If NO visible defect, set defects:[] empty. DO NOT GUESS — if uncertain, don't list it.
- "condition_discount_pct" is the AGGREGATE percentage value loss from the defects (0-100):
  * Minor wear / signs: 5-10%
  * Visible stain / small tear: 10-25%
  * Large tear / deep wear / missing part: 25-50%
  * Severe damage (big hole, big stain, deformation): 50%+
  * If defects is empty → condition_discount_pct: 0
- "estimated_value_min_huf" and "estimated_value_max_huf" must ALREADY reflect this discount (i.e. you've subtracted the condition_discount_pct from a hypothetical pristine market price). DO NOT report the pristine price separately.

RESPONSE FORMAT (return ONLY this JSON, nothing else, no markdown):

{
  "recognized": true | false,
  "category": "sneaker" | "vintage_clothing" | "streetwear" | "designer" | "other",
  "item_type": "specific type, REQUIRED, pick from: sneaker | boot | sandal | t-shirt | jersey | longsleeve | hoodie | sweatshirt | jacket | coat | vest | pants | jeans | shorts | skirt | dress | cap | hat | beanie | bag | belt | scarf | gloves | sunglasses | watch | accessory | other. Always fill, even when brand:null. E.g. a logo-less black tee: 't-shirt'. For a SPORTS/FOOTBALL JERSEY use 'jersey' (NOT 't-shirt'). For SUNGLASSES use 'sunglasses'. For a WATCH use 'watch'. Used to filter listings so e.g. shoes don't appear under a sunglasses query.",
  "brand": "string or null",
  "model": "string or null",
  "color": "dominant color or official colorway in English, or null",
  "visual_keywords": ["3-5 visual search phrases in English, without brand"],
  "era": "string or null",
  "condition": "new | excellent | good | used | poor" or null,
  "is_definitely_new": boolean (TRUE only with visible brand-new indicators),
  "retail_price_huf": number HUF or null (today's retail buy price; hype items: StockX Lowest Ask),
  "defects": ["short English phrases for each visible defect, empty array if none"],
  "condition_discount_pct": number (0-100, aggregate value loss from defects, 0 if defects empty),
  "estimated_value_min_huf": number or null (ALREADY discounted),
  "estimated_value_max_huf": number or null (ALREADY discounted),
  "description": "2-3 sentences in clean English about the item – what you see, what's interesting, why uncertain if applicable. FORBIDDEN: internal field names like 'is_definitely_new', 'retail_price_huf', 'condition_discount_pct', 'TRUE/FALSE'. Use natural prose, no technical jargon.",
  "story": "string or null — IF the item is culturally significant (iconic colorway, famous collab, landmark release with real backstory: e.g. Air Jordan 1 'Shattered Backboard', Travis Scott AJ1, Yeezy 350 'Zebra', Off-White Air Presto, Supreme x Louis Vuitton, Cactus Plant Flea Market collabs, etc.) provide a 2-3 PARAGRAPH English story separated by DOUBLE LINE BREAKS (\\n\\n). Content: (1) release background + collab/designer; (2) cultural relevance, what made it iconic, stars/campaigns; (3) optional: interesting detail (origin story, original name, release lore). If NOT culturally significant (generic sneaker, anonymous vintage), return null. DO NOT invent stories, only real documented context. DO NOT include price estimate in the story.",
  "hype_score": "number 1-10 or null — cultural/resell hype level. 10 = grail-tier (limited Travis Scott, Off-White, Dior x AJ1), 8-9 = highly sought (Mocha, Bred, Chicago), 6-7 = popular but accessible (Yeezy 350 classics, Jordan 4 White Cement), 4-5 = solid mainstream (Air Force 1, Stan Smith, Chuck Taylor), 1-3 = generic/no hype. Null if unidentified or unknown.",
  "hype_label": "string or null — SHORT badge ONLY if hype_score ≥ 7: 'Holy Grail' (9-10), 'Heat' (7-8), 'Hyped' (7). For rare vintage at score ≥ 7 'Vintage Gem' is also OK. Null everywhere else — DO NOT produce 'Classic', 'Common', 'Mainstream', 'Streetwear Staple' labels.",
  "search_query": "English search query (brand + model + colorway/year)",
  "selling_tip": "1-2 sentence selling tip in English",
  "confidence": "low" | "medium" | "high"
}`;
}

/**
 * Jersey season refinement via web search.
 *
 * Vision models reliably read a jersey's clues (team crest, manufacturer,
 * chest sponsor, player name/number, patches) but DON'T have a reliable
 * internal "sponsor + kit + design → exact season" map, so they confidently
 * hallucinate the year. We fix this with a second, web-search-grounded call
 * that only runs for jerseys: it looks the season up from real data instead
 * of guessing from memory.
 *
 * Returns a partial patch to merge into the main analysis, or null on any
 * failure (caller keeps the original analysis — graceful degradation).
 */
type JerseyPatch = {
  brand?: string | null;
  model?: string | null;
  era?: string | null;
  description?: string | null;
  search_query?: string | null;
  confidence?: "low" | "medium" | "high" | null;
};

async function refineJerseyYear(
  client: Anthropic,
  image: { data: string; mediaType: string },
  parsed: Record<string, unknown>,
  lang: "hu" | "en"
): Promise<JerseyPatch | null> {
  const knownTeam =
    [parsed.brand, parsed.model].filter((x) => typeof x === "string" && x).join(" ") ||
    "(not yet identified)";
  const currentYear = new Date().getFullYear();

  const instruction =
    lang === "hu"
      ? `Ez egy SPORT-/FOCIMEZ. A feladatod: a PONTOS SZEZON (évjárat) meghatározása web kereséssel, valós adatból.

Eddigi azonosítás: ${knownTeam}
A mai év: ${currentYear}.

KRITIKUS SZABÁLYOK:
- A szezont KIZÁRÓLAG a web keresés találataiból állapítsd meg. SOHA NE a saját emlékezetedből/tudásodból — a tudásod elavult lehet, és a legfrissebb szezonokat (pl. ${currentYear - 1}/${String(currentYear).slice(2)}, ${currentYear}/${String(currentYear + 1).slice(2)}) NEM feltétlenül ismered fejből.
- KÖTELEZŐ legalább 2 web keresést végezned, MIELŐTT válaszolsz. Ha az első keresés nem egyértelmű, keress újra más kulcsszavakkal.
- A friss mezek miatt MINDIG keress rá az aktuális évekre is (${currentYear - 1}, ${currentYear}), pl. "[csapat] away kit ${currentYear}".
- RECENCY (NAGYON FONTOS): az eladásra kerülő mezek túlnyomó többsége az AKTUÁLIS vagy az előző 1-2 szezonból való. Ha a dizájn több szezonra is illhetne, MINDIG a legfrissebb illeszkedő szezont válaszd. NE ess vissza egy régebbi szezonra csak azért, mert azt ismered a memóriádból.
- KERESÉS-TEKINTÉLY: ha a keresési találat ellentmond annak, amit a képről elsőre gondoltál, A KERESÉST KÖVESD, ne a benyomásodat. A te vizuális emlékezeted egy híres klub mezéről gyakran egy régebbi szezont idéz fel — ne bízz benne.

LÉPÉSEK:
1. Olvasd le a képről a konkrét jeleket: csapat (címer), mezgyártó (Nike/adidas/Puma/Kappa/Macron…), FŐSZPONZOR a mellkason, kit dizájn/szín/minta (csíkok, motívumok), bármilyen felirat, és a hátoldali játékosnév + szám ha látszik.
2. KERESS RÁ a web search tool-lal: (a) a csapat + "home/away/third kit" + aktuális év; (b) a csapat + a megkülönböztető dizájnelem (pl. szín + mintázat). A dizájn pontos egyeztetése a találatokkal a legmegbízhatóbb.
3. Vesd össze a képen látott dizájnt a keresési találatok kit-jeivel, és határozd meg a szezont (pl. "2025/26").

Ha a találatok EGYÉRTELMŰ szezont adnak → confidence:"high".
Ha SZŰKÍTETTED de nem 100%, adj sávot (pl. "2015–2017") és confidence:"medium".
Ha a keresés nem ad megbízható szezont, confidence:"low" és era:null — NE tippelj a memóriádból.

FONTOS: SOHA ne tegyél fel visszakérdezést a felhasználónak — a kép a kezedben van, olvasd le a jeleket magad, és add vissza a legjobb meghatározásodat. MINDIG a kért JSON-nal válaszolj.

CSAK ezt a JSON-t add vissza, semmi mást, markdown nélkül:
{
  "brand": "a FOCICSAPAT / VÁLOGATOTT neve (pl. 'Real Madrid', 'Magyarország') — KÖTELEZŐ kitölteni, ez kerül a termék címébe. NE a gyártót (Nike/adidas) add meg itt.",
  "model": "a mez típusa, csapatnév ÉS évszám NÉLKÜL (pl. 'idegenbeli mez', 'hazai mez') vagy null — az évszám az era mezőbe megy, ne ismételd itt",
  "era": "a szezon, pl. '2016/17' vagy sáv vagy null",
  "description": "2-3 természetes magyar mondat a mezről, KÖTELEZŐEN tartalmazza a csapatot ÉS a szezont (vagy a bizonytalanság jelzését). Technikai zsargon nélkül.",
  "search_query": "angol kereső kifejezés: csapat + 'jersey' + szezon",
  "confidence": "low" | "medium" | "high"
}`
      : `This is a SPORTS/FOOTBALL JERSEY. Your task: determine the EXACT SEASON (year) using web search, from real data.

Identification so far: ${knownTeam}
Current year: ${currentYear}.

CRITICAL RULES:
- Determine the season ONLY from web search results. NEVER from your own memory/training — your knowledge may be outdated and you likely DON'T know the latest seasons (e.g. ${currentYear - 1}/${String(currentYear).slice(2)}, ${currentYear}/${String(currentYear + 1).slice(2)}) off the top of your head.
- You MUST run at least 2 web searches BEFORE answering. If the first search is inconclusive, search again with different keywords.
- Because recent kits exist, ALWAYS also search the current years (${currentYear - 1}, ${currentYear}), e.g. "[team] away kit ${currentYear}".
- RECENCY (VERY IMPORTANT): the vast majority of jerseys being sold are from the CURRENT or previous 1-2 seasons. If the design could fit multiple seasons, ALWAYS pick the most recent matching season. Do NOT fall back to an older season just because you remember it.
- SEARCH AUTHORITY: if the search results contradict your first impression from the photo, FOLLOW THE SEARCH, not your impression. Your visual memory of a famous club's kit often recalls an older season — don't trust it.

STEPS:
1. Read the concrete clues off the image: team (crest), kit manufacturer (Nike/adidas/Puma/Kappa/Macron…), the main CHEST SPONSOR, kit design/colour/pattern (stripes, motifs), any text, and the player name + number on the back if visible.
2. SEARCH with the web search tool: (a) team + "home/away/third kit" + current year; (b) team + the distinctive design element (e.g. colour + pattern). Matching the exact design against results is the most reliable.
3. Compare the design you see against the kits in the search results, and determine the season (e.g. "2025/26").

If results give an UNAMBIGUOUS season → confidence:"high".
If you NARROWED it but aren't 100% → give a range (e.g. "2015–2017") and confidence:"medium".
If search gives no reliable season → confidence:"low" and era:null — do NOT guess from memory.

IMPORTANT: NEVER ask the user a clarifying question — you have the image, read the clues yourself and return your best determination. ALWAYS answer with the requested JSON.

Return ONLY this JSON, nothing else, no markdown:
{
  "brand": "the FOOTBALL CLUB / NATIONAL TEAM name (e.g. 'Real Madrid', 'Hungary') — REQUIRED, this goes into the product title. Do NOT put the manufacturer (Nike/adidas) here.",
  "model": "the kit type, WITHOUT the team name OR the year (e.g. 'away shirt', 'home shirt') or null — the year goes in the era field, do not repeat it here",
  "era": "the season, e.g. '2016/17' or a range or null",
  "description": "2-3 natural English sentences about the jersey, MUST include the team AND the season (or flag the uncertainty). No technical jargon.",
  "search_query": "English search query: team + 'jersey' + season",
  "confidence": "low" | "medium" | "high"
}`;

  try {
    // The web search server tool isn't in the SDK 0.32.1 types; the runtime
    // API accepts it. Cast the params to bypass the stale typings.
    const response = await client.messages.create({
      // Haiku for the refinement: the heavy lifting is the web search (a
      // factual lookup, not creative work), so the faster/cheaper model gives
      // the same season with noticeably lower latency. Verified to match
      // Sonnet's accuracy on test jerseys.
      model: "claude-haiku-4-5",
      max_tokens: 1200,
      // Factual season lookup — keep it deterministic so the same jersey
      // doesn't yield different years on repeat scans.
      temperature: 0,
      tools: [
        { type: "web_search_20250305", name: "web_search", max_uses: 5 },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/webp"
                  | "image/gif",
                data: image.data,
              },
            },
            { type: "text", text: instruction },
          ],
        },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // With tool use there can be multiple text blocks (model "thinking"
    // between searches). The final answer is the LAST text block.
    const textBlocks = response.content.filter(
      (b): b is { type: "text"; text: string } => b.type === "text"
    );
    const last = textBlocks[textBlocks.length - 1];
    if (!last) return null;

    const cleaned = last.text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    // The model sometimes wraps JSON in prose despite instructions — grab the
    // outermost { … } block.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    const patch = JSON.parse(cleaned.slice(start, end + 1)) as JerseyPatch;
    return patch;
  } catch (err) {
    console.warn("[analyze] jersey year refinement failed:", err);
    return null;
  }
}

type Profile = {
  is_premium: boolean;
  scan_count_today: number;
  scan_count_reset_at: string;
};

function nextMidnightUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

async function getOrResetProfile(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<Profile | null> {
  const { data: profile } = await admin
    .from("profiles")
    .select("is_premium, scan_count_today, scan_count_reset_at")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const resetAt = new Date(profile.scan_count_reset_at);
  if (Date.now() >= resetAt.getTime()) {
    const { data: updated } = await admin
      .from("profiles")
      .update({
        scan_count_today: 0,
        scan_count_reset_at: nextMidnightUtc().toISOString(),
      })
      .eq("id", userId)
      .select("is_premium, scan_count_today, scan_count_reset_at")
      .single();
    return updated as Profile | null;
  }
  return profile as Profile;
}

function scansLeftFor(profile: Profile): number {
  if (profile.is_premium) return 9999;
  return Math.max(0, FREE_DAILY_LIMIT - profile.scan_count_today);
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.FITFLIP_ANTHROPIC_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured on server" },
        { status: 500 }
      );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const profile = await getOrResetProfile(admin, user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 500 });
    }

    if (scansLeftFor(profile) <= 0) {
      return NextResponse.json(
        { error: "limit_reached", scansLeft: 0 },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { images, image, mediaType, lang, hint, size } = body as {
      images?: Array<{ data: string; mediaType: string }>;
      image?: string;
      mediaType?: string;
      lang: "hu" | "en";
      hint?: string;
      size?: string;
    };
    const userHint =
      typeof hint === "string" && hint.trim().length > 0
        ? hint.trim().slice(0, 200) // soft cap, prevents prompt injection bloat
        : undefined;
    const userSize =
      typeof size === "string" && size.trim().length > 0
        ? size.trim().slice(0, 60)
        : undefined;

    const normalizedImages: Array<{ data: string; mediaType: string }> =
      Array.isArray(images) && images.length > 0
        ? images
        : image && mediaType
          ? [{ data: image, mediaType }]
          : [];

    if (normalizedImages.length === 0) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }
    if (normalizedImages.length > 6) {
      return NextResponse.json({ error: "Too many images (max 6)" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey, baseURL: "https://api.anthropic.com" });

    const imageBlocks = normalizedImages.map((img) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: img.mediaType as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "image/gif",
        data: img.data,
      },
    }));

    const firstImage = normalizedImages[0];
    const firstImageBuffer = Buffer.from(firstImage.data, "base64");
    const firstImageHash = createHash("sha256").update(firstImageBuffer).digest("hex");

    // Look up an existing scan with the same hash for this user. If the
    // image_hash column doesn't exist yet, this fails silently and we just
    // proceed without dedup.
    let existingScan: { image_path: string | null } | null = null;
    try {
      const { data } = await admin
        .from("scans")
        .select("image_path")
        .eq("user_id", user.id)
        .eq("image_hash", firstImageHash)
        .limit(1)
        .maybeSingle();
      existingScan = data ?? null;
    } catch (err) {
      console.warn("[analyze] hash lookup failed (column missing?):", err);
    }

    const imagePathToSave = `${user.id}/${randomUUID()}.jpg`;

    const uploadFirstImage = async (): Promise<string | null> => {
      if (existingScan) return existingScan.image_path;
      try {
        const { error: uploadError } = await admin.storage
          .from("scan-images")
          .upload(imagePathToSave, firstImageBuffer, {
            contentType: "image/jpeg",
            upsert: false,
          });
        if (uploadError) {
          console.error("[analyze] image upload failed:", uploadError.message);
          return null;
        }
        return imagePathToSave;
      } catch (err) {
        console.error("[analyze] image upload threw:", err);
        return null;
      }
    };

    const [response, savedImagePath] = await Promise.all([
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              ...imageBlocks,
              { type: "text", text: buildPrompt(lang || "hu", normalizedImages.length, userHint, userSize) },
            ],
          },
        ],
      }),
      uploadFirstImage(),
    ]);

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from model" },
        { status: 500 }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      const cleaned = textBlock.text
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse model response" },
        { status: 500 }
      );
    }

    // Enforce invariants the model occasionally violates: an empty defects
    // list (or is_definitely_new=true) must mean no damage discount.
    const defectsArr = Array.isArray(parsed.defects)
      ? (parsed.defects as unknown[]).filter((d) => typeof d === "string" && d.trim().length > 0)
      : [];
    parsed.defects = defectsArr;
    if (defectsArr.length === 0 || parsed.is_definitely_new === true) {
      parsed.condition_discount_pct = 0;
    }

    // Jersey-only: vision models hallucinate the season, so ground it in a
    // web search. Runs sequentially after the main analysis; only jerseys pay
    // the extra latency/cost. Failure leaves the original analysis untouched.
    if (parsed.recognized === true && parsed.item_type === "jersey") {
      const patch = await refineJerseyYear(client, firstImage, parsed, lang || "hu");
      if (patch) {
        // The team name is the key title identifier for a jersey — override
        // brand (which may hold the manufacturer or be null) with the team so
        // the result heading always shows it.
        if (typeof patch.brand === "string" && patch.brand.trim()) {
          parsed.brand = patch.brand.trim();
        }
        if (typeof patch.model === "string" && patch.model.trim()) {
          parsed.model = patch.model.trim();
        }
        if (typeof patch.era === "string" && patch.era.trim()) {
          parsed.era = patch.era.trim();
        }
        if (typeof patch.description === "string" && patch.description.trim()) {
          parsed.description = patch.description.trim();
        }
        if (typeof patch.search_query === "string" && patch.search_query.trim()) {
          parsed.search_query = patch.search_query.trim();
        }
        if (
          patch.confidence === "low" ||
          patch.confidence === "medium" ||
          patch.confidence === "high"
        ) {
          parsed.confidence = patch.confidence;
        }
      }
    }

    // Save scan to history (admin bypasses RLS but enforces user_id).
    // Skip the insert when this exact image was already scanned by this user
    // — we don't want history duplicates of the same upload.
    let scanId: string | null = null;
    const recognized = parsed.recognized === true;
    if (!recognized) {
      // Failed scan (not clothing/footwear): don't persist to history. Clean
      // up the image we just uploaded so it doesn't orphan in storage.
      if (!existingScan && savedImagePath) {
        await admin.storage
          .from("scan-images")
          .remove([savedImagePath])
          .catch(() => {});
      }
    } else if (existingScan) {
      // Look up the existing scan's id so the watcher widget can target it.
      const { data: existingRow } = await admin
        .from("scans")
        .select("id")
        .eq("user_id", user.id)
        .eq("image_hash", firstImageHash)
        .limit(1)
        .maybeSingle();
      scanId = existingRow?.id ?? null;
    }
    if (recognized && !existingScan) {
      const insertPayload: Record<string, unknown> = {
        user_id: user.id,
        recognized: !!parsed.recognized,
        category: (parsed.category as string) ?? null,
        item_type: typeof parsed.item_type === "string" && parsed.item_type.trim().length > 0 ? parsed.item_type : null,
        brand: (parsed.brand as string) ?? null,
        model: (parsed.model as string) ?? null,
        era: (parsed.era as string) ?? null,
        condition: (parsed.condition as string) ?? null,
        estimated_value_min_huf: (parsed.estimated_value_min_huf as number) ?? null,
        estimated_value_max_huf: (parsed.estimated_value_max_huf as number) ?? null,
        description: (parsed.description as string) ?? null,
        search_query: (parsed.search_query as string) ?? null,
        selling_tip: (parsed.selling_tip as string) ?? null,
        confidence: (parsed.confidence as string) ?? null,
        image_path: savedImagePath,
        image_hash: firstImageHash,
        defects: Array.isArray(parsed.defects) ? parsed.defects : [],
        condition_discount_pct:
          typeof parsed.condition_discount_pct === "number"
            ? parsed.condition_discount_pct
            : null,
        is_definitely_new:
          typeof parsed.is_definitely_new === "boolean"
            ? parsed.is_definitely_new
            : null,
        retail_price_huf:
          typeof parsed.retail_price_huf === "number"
            ? parsed.retail_price_huf
            : null,
        story: typeof parsed.story === "string" && parsed.story.trim().length > 0 ? parsed.story : null,
        hype_score:
          typeof parsed.hype_score === "number" ? parsed.hype_score : null,
        hype_label:
          typeof parsed.hype_label === "string" && parsed.hype_label.trim().length > 0
            ? parsed.hype_label
            : null,
      };
      const { data: insertedRow, error: insertError } = await admin
        .from("scans")
        .insert(insertPayload)
        .select("id")
        .single();
      if (insertError) {
        // Some columns may be missing in older DB schemas — retry without
        // the optional ones so the scan still saves.
        const fallback = { ...insertPayload };
        delete fallback.image_hash;
        delete fallback.defects;
        delete fallback.condition_discount_pct;
        delete fallback.is_definitely_new;
        delete fallback.retail_price_huf;
        delete fallback.story;
        delete fallback.hype_score;
        delete fallback.hype_label;
        delete fallback.item_type;
        const { data: fallbackRow } = await admin
          .from("scans")
          .insert(fallback)
          .select("id")
          .single();
        scanId = fallbackRow?.id ?? null;
      } else {
        scanId = insertedRow?.id ?? null;
      }
    }

    if (!profile.is_premium) {
      await admin
        .from("profiles")
        .update({ scan_count_today: profile.scan_count_today + 1 })
        .eq("id", user.id);
    }

    const newProfile: Profile = {
      ...profile,
      scan_count_today: profile.scan_count_today + 1,
    };

    return NextResponse.json({
      ...parsed,
      scan_id: scanId,
      scansLeft: scansLeftFor(newProfile),
    });
  } catch (err) {
    console.error("[/api/analyze] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ scansLeft: 0, authenticated: false });
  }
  const admin = createAdminClient();
  const profile = await getOrResetProfile(admin, user.id);
  if (!profile) {
    return NextResponse.json({ scansLeft: 0, authenticated: true });
  }
  return NextResponse.json({
    scansLeft: scansLeftFor(profile),
    authenticated: true,
    isPremium: profile.is_premium,
  });
}
