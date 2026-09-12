import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimApiCall } from "@/lib/rateLimit";
import { typeNoun } from "@/lib/itemTypeNames";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Writes a ready-to-post marketplace listing for a scanned item.
 *
 * The app already tells people what a piece is and what it's worth; this is
 * the last step of the promise ("Snap. Identify. Sell.") — until now they
 * still had to write the ad themselves.
 *
 * The suggested price is computed here, NOT generated: it comes straight from
 * the estimate we already showed, so the ad can't quote a number that
 * contradicts the app. The model only writes the words.
 */

type ScanRow = {
  brand: string | null;
  model: string | null;
  era: string | null;
  color: string | null;
  condition: string | null;
  category: string | null;
  item_type: string | null;
  description: string | null;
  defects: string[] | null;
  condition_discount_pct: number | null;
  estimated_value_min_huf: number | null;
  estimated_value_max_huf: number | null;
  is_definitely_new: boolean | null;
};

const huf = (n: number) => `${new Intl.NumberFormat("hu-HU").format(n)} Ft`;

/**
 * The closing line, appended rather than generated.
 *
 * It is the same in every listing, so asking a model to write it bought us
 * nothing and cost us plenty: graded across twenty drafts it was the single
 * biggest source of both broken sentences ("Any questions or need help
 * checking the size - just message me") and invented promises, because a
 * prompt asking for a line that "invites size checks" is asking the model to
 * offer measurements the seller never said they'd take.
 */
const CLOSING = {
  hu: "Ha kérdésed van, írj bátran!",
  en: "If you have any questions, just message me.",
} as const;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.FITFLIP_ANTHROPIC_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "no_api_key" }, { status: 500 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const rate = await claimApiCall(createAdminClient(), user.id, "listing-draft");
    if (!rate.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const scanId = typeof body?.scan_id === "string" ? body.scan_id : "";
    const lang: "hu" | "en" = body?.lang === "en" ? "en" : "hu";
    const size = typeof body?.size === "string" ? body.size.trim().slice(0, 40) : "";
    if (!scanId) return NextResponse.json({ error: "missing_scan_id" }, { status: 400 });

    // RLS scopes this to the requesting user's own scans.
    const { data: scan } = await supabase
      .from("scans")
      .select(
        "brand, model, era, color, condition, category, item_type, description, defects, condition_discount_pct, estimated_value_min_huf, estimated_value_max_huf, is_definitely_new"
      )
      .eq("id", scanId)
      .maybeSingle<ScanRow>();

    if (!scan) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Asking price from our own estimate. Sellers list a little above what
    // they expect to get, so the top of the range is the natural ask — and it
    // stays inside a band the user has already seen, rather than a new number
    // invented by the model.
    const min = scan.estimated_value_min_huf;
    const max = scan.estimated_value_max_huf;
    const askPrice = typeof max === "number" ? max : typeof min === "number" ? min : null;
    const rangeText =
      typeof min === "number" && typeof max === "number" && min !== max
        ? `${huf(min)} – ${huf(max)}`
        : askPrice !== null
          ? huf(askPrice)
          : null;

    const defects = Array.isArray(scan.defects) ? scan.defects.filter(Boolean) : [];
    // item_type was read from the scan but never reached the prompt, so the
    // model had no idea whether it was holding a dress or a pair of boots.
    // That single omission produced most of the wording complaints in the
    // audit — "Eladó egy Zara virágmintás darab" — and, worse, it is why the
    // model sometimes guessed the type and called a jumper a t-shirt.
    const kind = typeNoun(scan.item_type, lang);

    const facts = [
      scan.brand && `márka: ${scan.brand}`,
      scan.model && `modell: ${scan.model}`,
      kind && `a darab típusa: ${kind}`,
      scan.color && `szín: ${scan.color}`,
      scan.era && `korszak: ${scan.era}`,
      scan.condition && `állapot: ${scan.condition}`,
      size && `méret: ${size}`,
      defects.length > 0 && `látható hibák: ${defects.join("; ")}`,
      scan.is_definitely_new === true && "a darab újnak tűnik (nem hordott)",
    ]
      .filter(Boolean)
      .join("\n");

    const prompt =
      lang === "hu"
        ? `Te egy magyar használtruha-eladó vagy, aki a saját darabját hirdeti meg a Vinteden.

AMIT A DARABRÓL TUDSZ — ennél többet NEM tudsz:
${facts}

A LEÍRÁS FELÉPÍTÉSE — pontosan ennyi, se több:
1. Egy mondat, ami megnevezi a darabot a fenti adatokból (márka, modell, szín, méret, korszak — amelyik meg van adva).
2. Egy vagy két mondat az állapotról. Ha vannak megadott hibák, MINDET nevezd meg őszintén, szépítés nélkül.
Ennyi. NE írj lezáró mondatot, NE biztass kérdésre — azt a felületünk teszi hozzá.

TILOS — ezek mindegyike vitát szül eladó és vevő között:
- Bármit írni, ami nincs a fenti adatok között. Ha rövid lesz a hirdetés, az jó.
- Méret, darabtípus, szín, korszak vagy hiba, ami nincs megadva. Ha nem tudod, mi a darab, ne nevezd meg (ne írd, hogy "póló").
- Bármi a szállításról, postázásról, személyes átvételről, megtekintésről, bemérésről vagy méretegyeztetésről.
- Bármi a hirdetés fotóiról ("a képeken jól látszik").
- Bármi a mérethelyességről, kényelemről, viselési időről, a vásárlás helyéről, a tárolásról ("nemdohányzó háztartás"), a varrásról, az anyag tartásáról, vagy hogy a cipzárak és gombok működnek-e.
- Értékelő jelző, amire nincs adat: "klasszikus", "örökzöld", "ikonikus", "kultikus", "patinás", "karakteres".
- Azt állítani, hogy a darab HIBÁTLAN vagy "komolyabb hiba nélküli", ha nincs megadva hiba. A hiba hiánya nem adat — attól, hogy nem tudunk hibáról, nem lesz hibátlan.
- A megadott hibát KISEBBNEK mutatni, mint amilyen: ha az adat "sárgulás", ne írd, hogy "enyhe sárgulás"; ha "karc", ne írd, hogy "alig látható karc". Szépítés nélkül, ahogy meg van adva.
- Stílustanács vagy viselési javaslat ("jól passzol farmerhez", "streetwear stílushoz").
- Az "eredeti", "original", "autentikus" szó — SEM a leírásban, SEM a címben. Eredetiség-garanciát soha ne vállalj, befektetési értéket ne ígérj.
- Az "AI", "mesterséges intelligencia", "gépi" szó, vagy bármi utalás arra, hogy a szöveget program írta.

A MAGYAR NYELVRŐL — ez a legfontosabb, mert a hirdetés az eladó neve alatt jelenik meg:
- Írj úgy, ahogy egy magyar ember beszél. Rövid, egyszerű, kijelentő mondatok.
- TILOS a katalógus-nyelv: "márkájú", "színű", "kínálom", "eladásra kínálom", "megvásárolható", "gazdára vár".
- TILOS a töltelék-felvezetés: "Őszintén jelzem", "Összességében", "Elmondom őszintén", "Ezektől eltekintve", "Mindent összevetve".
- TILOS a magyar-angol kötőjeles keverék ("street-stílushoz"). Vagy magyar szó, vagy a bevett angol márkanév/modellnév.
- Figyelj a határozott ragra: "AZ 1990-es évekből", "AZ egyik", "AZ oldalán" — magánhangzóval kezdődő szó előtt "az". Számoknál a kimondott alak dönt: "az 1990-es", "a 2000-es".
- Ha egy hibaleírás sután van megfogalmazva a fenti adatokban, írd át természetes magyarra ("kaparódott" → "karcolódott", "szuede" → "velúr", "cippzár" → "cipzár", "összeesődött" → "összenyomódott").
- SOHA ne kezdd a leírást azzal, hogy "Ez egy..." — magyar hirdetés nem így kezdődik. Kezdd a márkával vagy a darabbal: "Eladó egy Diesel Zathan...", vagy jelzős szerkezettel: "Fekete Nike Air Force 1, 41-es méret."
- A méret helyesen: "S méretű", "43-as méret", "S méretben" — a "méretes" (pl. "S méretes") HIBÁS.
- Ha nem tudod, mi a darab (nincs megadva a típusa), ne ismételd a "darab" szót. Egyszer elég, vagy írd körül a márkával: "Eladó Nike termék, viseltes állapotban."
- Olvasd át magadban a szöveget, mielőtt visszaadod. Ha bármelyik mondat sután hangzik, írd újra.

A CÍM: kereshető legyen — márka + modell + méret + szín, csak a megadott adatokból. Max 80 karakter. Ne legyen benne felkiáltójel.

CSAK ezt a JSON-t add vissza, semmi mást:
{"title": "...", "description": "..."}`
        : `You are selling your own second-hand item on Vinted.

WHAT YOU KNOW ABOUT IT — you know nothing beyond this:
${facts}

STRUCTURE OF THE DESCRIPTION — exactly this, no more:
1. One sentence naming the item from the facts above (brand, model, colour, size, era — whichever are given).
2. One or two sentences on condition. If flaws are listed, name EVERY one of them honestly, without softening.
That's it. Do NOT write a closing line and do NOT invite questions — our interface adds that.

FORBIDDEN — every one of these is how a dispute starts:
- Writing anything that isn't in the facts above. A short listing is a good listing.
- A size, item type, colour, era or flaw that wasn't given. If you don't know what the item is, don't name it.
- Anything about shipping, postage, collection, viewing, measurements or size checks.
- Anything about the listing's photos ("clearly visible in the pictures").
- Anything about fit, comfort, how long it was worn, where it was bought, storage ("smoke-free home"), stitching, how the fabric holds up, or whether zips and buttons work.
- Evaluative adjectives with nothing behind them: "classic", "timeless", "iconic", "grail".
- Claiming the item is flawless or has "no major flaws" when no flaws were given. The absence of flaw data is not evidence of no flaws.
- Making a given flaw sound smaller than it is: if the fact says "yellowing", don't write "slight yellowing"; if it says "scratch", don't write "barely visible scratch".
- Styling or outfit advice ("goes great with jeans", "perfect for streetwear").
- The words "original" or "authentic" — not in the description, not in the title. Never guarantee authenticity, never promise investment value.
- The words "AI" or "artificial intelligence", or any hint that software wrote this.

ON THE ENGLISH — this matters, because the listing appears under the seller's own name:
- Write the way a person speaks. Short, plain, declarative sentences.
- No catalogue language: "on offer", "up for grabs", "brand new to you".
- No filler lead-ins: "Overall", "To be honest", "That said", "All things considered".
- Complete sentences only. "Any questions or need measurements, just message me" is not a sentence.
- Hyphenate compound adjectives before a noun: "like-new condition".
- If a flaw is awkwardly worded in the facts above, rewrite it naturally.
- Never open with "This is a..." — start with the brand or the item itself.
- If you don't know what the item is, don't repeat the word "item" or "piece" in every sentence.
- Read it back before you return it. If a sentence sounds off, write it again.

THE TITLE: searchable — brand + model + size + colour, only from the given facts. Max 80 characters. No exclamation marks.

CSAK ezt a JSON-t add vissza, semmi mást:
{"title": "...", "description": "..."}`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      // Sonnet, measured rather than assumed. Haiku was the obvious pick —
      // this only writes from facts we already have — but over six runs of
      // the same scan it botched the Hungarian definite article twice
      // ("a 1990-es évekből"), where Sonnet did so zero times. A third of
      // drafts reading as broken Hungarian is not acceptable in text that
      // goes out publicly under the user's own name, and this endpoint is
      // rate-limited to occasional use, so the cost is small.
      model: "claude-sonnet-5",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }

    let title = "";
    let description = "";
    try {
      const cleaned = textBlock.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(
        cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1)
      ) as { title?: string; description?: string };
      title = typeof parsed.title === "string" ? parsed.title.trim() : "";
      description = typeof parsed.description === "string" ? parsed.description.trim() : "";
    } catch {
      return NextResponse.json({ error: "parse_failed" }, { status: 502 });
    }

    if (!title && !description) {
      return NextResponse.json({ error: "empty_draft" }, { status: 502 });
    }

    // Trim any closing line the model wrote anyway, so the fixed one doesn't
    // end up as a second, redundant invitation.
    const invitation = lang === "hu" ? /\n*[^\n]*(k[ée]rd[ée]s|[ií]rj|keress)[^\n]*[!?.]\s*$/i : /\n*[^\n]*(question|message me|just ask)[^\n]*[!?.]\s*$/i;
    const descriptionBody = description.replace(invitation, "").trim();

    return NextResponse.json({
      title,
      description: `${descriptionBody}\n\n${CLOSING[lang]}`,
      priceHuf: askPrice,
      priceLabel: askPrice !== null ? huf(askPrice) : null,
      rangeLabel: rangeText,
    });
  } catch (err) {
    console.error("[listing-draft] failed:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
