import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimApiCall } from "@/lib/rateLimit";

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
    const facts = [
      scan.brand && `márka: ${scan.brand}`,
      scan.model && `modell: ${scan.model}`,
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
        ? `Írj egy eladási hirdetést erre a használt/másodkézből származó divatcikkre, magyar piactérre (Vinted, Jófogás).

ADATOK:
${facts}

SZABÁLYOK — ezek kötelezőek:
- A hirdetést ELSŐ SZEMÉLYBEN írd, mintha az eladó írná. Természetes, közvetlen hangnem, tegeződés nélkül is működjön.
- A LÁTHATÓ HIBÁKAT ŐSZINTÉN írd le, ne szépítsd. Ez bizalmat épít és megelőzi a vitákat.
- SOHA ne állítsd, hogy eredetiség-garanciát vállalsz, és ne ígérj konkrét befektetési értéket.
- NE használd az "AI", "mesterséges intelligencia", "gépi" szavakat, és ne utalj arra, hogy a szöveget program írta.
- NE találj ki tényt (mérethelyesség, viselési idő, vásárlás helye), ami nincs az adatok között.
- A cím legyen KERESÉSRE optimalizált: márka + modell + méret + kulcstulajdonság. Max 80 karakter.
- A leírás 3-6 rövid mondat vagy felsorolás. Ne legyen túlírt.
- A leírás VÉGÉN legyen egy mondat, ami kérdésre/méretegyeztetésre biztat.
- A MAGYAR LEGYEN HIBÁTLAN és természetes. Ne fordíts szó szerint, ne használj erőltetett vagy régies kifejezést. Ha egy hibaleírás sután van megfogalmazva a fenti adatokban, írd át természetes magyarra (pl. "kaparódott" helyett "karcolódott" vagy "megkopott", "szuede" helyett "velúr").
- NE írj üres töltelékmondatot ("ettől függetlenül még jó", "akár még viselhető"). Minden mondat mondjon valamit.
- NE állíts semmit a HIRDETÉS FOTÓIRÓL (pl. hogy a képeken jól látszanak a hibák) — nem tudjuk, milyen képeket tölt majd fel.

CSAK ezt a JSON-t add vissza, semmi mást:
{"title": "...", "description": "..."}`
        : `Write a marketplace listing for this second-hand fashion item (Vinted, eBay).

FACTS:
${facts}

RULES — these are mandatory:
- Write in FIRST PERSON, as the seller would. Natural, direct tone.
- Describe the VISIBLE FLAWS honestly, don't gloss over them. It builds trust and prevents disputes.
- NEVER claim you guarantee authenticity, and never promise investment value.
- Do NOT use the words "AI", "artificial intelligence", or imply software wrote the text.
- Do NOT invent facts (fit, how often worn, where bought) that aren't in the data above.
- The title must be SEARCH-optimised: brand + model + size + key attribute. Max 80 characters.
- The description is 3-6 short sentences or bullets. Don't overwrite it.
- END the description with a line inviting questions or size checks.
- Write clean, natural English. No stilted or translated-sounding phrasing. If a flaw is awkwardly worded in the data above, rewrite it naturally.
- Do NOT write empty filler sentences ("still good though", "very wearable"). Every sentence must say something.
- Do NOT claim anything about the LISTING'S PHOTOS (e.g. that the flaws are clearly visible in them) — we don't know what the seller will upload.

Return ONLY this JSON, nothing else:
{"title": "...", "description": "..."}`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      // Haiku: this is writing from structured facts we already have, not
      // reasoning about an image — plenty capable, and fast enough that the
      // draft appears almost immediately.
      model: "claude-haiku-4-5",
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

    return NextResponse.json({
      title,
      description,
      priceHuf: askPrice,
      priceLabel: askPrice !== null ? huf(askPrice) : null,
      rangeLabel: rangeText,
    });
  } catch (err) {
    console.error("[listing-draft] failed:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
