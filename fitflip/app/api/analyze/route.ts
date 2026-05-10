import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const FREE_DAILY_LIMIT = 3;

function buildPrompt(lang: "hu" | "en", imageCount: number = 1): string {
  const multiNoteHu =
    imageCount > 1
      ? `\n\nFONTOS: ${imageCount} kép érkezett UGYANARRÓL a darabról. Lehet több szögből vagy közeli részlet (pl. címke, hibák, kopás). Egyetlen összesített elemzést adj vissza, az összes kép alapján. A description-ben említsd ha valamelyik képen látható hiba/sérülés befolyásolja az állapotot vagy az értéket.`
      : "";
  const multiNoteEn =
    imageCount > 1
      ? `\n\nIMPORTANT: ${imageCount} images received of the SAME item. They may show different angles or close-up details (e.g., tag, defects, wear). Return a single combined analysis based on all images. In the description, mention if any visible defect/damage in the photos affects the condition or value.`
      : "";
  if (lang === "hu") {
    return `Te a FitFlip vagy – egy precíziós AI azonosító divatcikkekhez (sneakerek, vintage ruhák, streetwear, designer darabok). A pontosság a legfontosabb: jobb őszintén bizonytalannak lenni, mint hibázni.${multiNoteHu}

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
- A confidence mező:
  * "high" CSAK ha látható márkajelzés (logó, "swoosh", "Adidas" felirat) ÉS biztos vagy a modellben
  * "medium" ha a márka biztos de a modell tippelt, vagy fordítva
  * "low" ha bármi bizonytalan – a legtöbb esetben ez a helyes
- ÉRTÉKBECSLÉS magyar piaci viszonyok (Vinted HU, Hardverapró, Jófogás, sneakerszobotka.hu) szerint:
  * Sneaker: $1 ≈ 360 Ft, használt cipők 30-60%-a a retail árnak
  * Vintage Levi's, retró: 6.000-25.000 Ft
  * Streetwear (Supreme, Off-White, eredeti): 30.000-150.000 Ft
  * Designer (LV, Gucci eredeti): 80.000+ Ft
  * Fast fashion (Zara, H&M): 1.500-5.000 Ft
  * Ha nem vagy biztos, adj szélesebb sávot (pl. min 5000, max 25000)
- A search_query ANGOLUL legyen, és tartalmazza márkát + modellt + colorway-t/évjáratot ha tudod (pl. "Air Jordan 4 Bred 2019" vagy "Levi's 501 vintage 90s")
- Ha bizonytalan vagy, a description-ben ÍRD MEG hogy "valószínűleg X, de Y miatt nem 100% biztos"

PÉLDÁK A JÓ VÁLASZRA:
- Sneaker tiszta swoosh logóval, jellegzetes Air Max 90 silhouette → brand:"Nike", model:"Air Max 90", confidence:"high"
- Sneaker logó nélkül de jellegzetes Yeezy talp → brand:"adidas Yeezy", model:"valószínűleg Boost 350", confidence:"medium"
- Egyszerű fehér póló logó nélkül → brand:null, model:null, category:"streetwear", confidence:"low"
- Retró pulóver "Levi's" címkével de elmosódott modellnévvel → brand:"Levi's", model:null, era:"valószínűleg 80-90-es évek", confidence:"medium"

VÁLASZ FORMÁTUM (CSAK ezt a JSON-t add vissza, semmi mást, semmi markdown):

{
  "recognized": true | false,
  "category": "sneaker" | "vintage_clothing" | "streetwear" | "designer" | "other",
  "brand": "string vagy null",
  "model": "string vagy null",
  "era": "string vagy null",
  "condition": "új | nagyon jó | jó | használt | rossz" vagy null,
  "estimated_value_min_huf": number vagy null,
  "estimated_value_max_huf": number vagy null,
  "description": "2-3 mondat magyarul – mit látsz, mi az érdekes benne, ha bizonytalan vagy akkor miért",
  "search_query": "angol kereső kifejezés (márka + modell + colorway/évjárat)",
  "selling_tip": "1-2 mondatos magyar tipp az eladáshoz",
  "confidence": "low" | "medium" | "high"
}`;
  }
  return `You are FitFlip – a precision AI identifier for fashion items (sneakers, vintage clothing, streetwear, designer pieces). Accuracy is paramount: it's better to be honestly uncertain than to be wrong.${multiNoteEn}

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
- The confidence field:
  * "high" ONLY when brand markers are visible (logo, swoosh, "Adidas" text) AND model is certain
  * "medium" when brand is certain but model guessed, or vice versa
  * "low" when anything is uncertain – most of the time this is the correct answer
- VALUE ESTIMATES based on European secondhand market (Vinted, eBay):
  * Sneakers: 30-60% of retail when used
  * Vintage Levi's, retro: 6.000-25.000 HUF
  * Streetwear (Supreme, Off-White, authentic): 30.000-150.000 HUF
  * Designer (LV, Gucci authentic): 80.000+ HUF
  * Fast fashion (Zara, H&M): 1.500-5.000 HUF
  * If uncertain, give a wider range
- search_query must be in English: brand + model + colorway/year if known
- If uncertain, EXPLAIN in the description: "likely X, but uncertain because Y"

GOOD ANSWER EXAMPLES:
- Sneaker with clear swoosh and Air Max 90 silhouette → brand:"Nike", model:"Air Max 90", confidence:"high"
- Sneaker without logo but distinctive Yeezy sole → brand:"adidas Yeezy", model:"likely Boost 350", confidence:"medium"
- Plain white t-shirt no logo → brand:null, model:null, category:"streetwear", confidence:"low"
- Retro sweater with "Levi's" tag but blurred model name → brand:"Levi's", model:null, era:"likely 80s-90s", confidence:"medium"

RESPONSE FORMAT (return ONLY this JSON, nothing else, no markdown):

{
  "recognized": true | false,
  "category": "sneaker" | "vintage_clothing" | "streetwear" | "designer" | "other",
  "brand": "string or null",
  "model": "string or null",
  "era": "string or null",
  "condition": "new | excellent | good | used | poor" or null,
  "estimated_value_min_huf": number or null,
  "estimated_value_max_huf": number or null,
  "description": "2-3 sentences in English – what you see, what's interesting, why uncertain if applicable",
  "search_query": "English search query (brand + model + colorway/year)",
  "selling_tip": "1-2 sentence selling tip in English",
  "confidence": "low" | "medium" | "high"
}`;
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
    const { images, image, mediaType, lang } = body as {
      images?: Array<{ data: string; mediaType: string }>;
      image?: string;
      mediaType?: string;
      lang: "hu" | "en";
    };

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

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            { type: "text", text: buildPrompt(lang || "hu", normalizedImages.length) },
          ],
        },
      ],
    });

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

    // Save scan to history (admin bypasses RLS but enforces user_id)
    await admin.from("scans").insert({
      user_id: user.id,
      recognized: !!parsed.recognized,
      category: (parsed.category as string) ?? null,
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
    });

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
