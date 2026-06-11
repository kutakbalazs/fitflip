import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Lazy story generation. The main scan no longer produces the 2-3 paragraph
 * cultural story (it was the single largest chunk of the scan's response
 * time); instead the story is generated here the first time the user taps
 * "A darab története", then persisted to the scan row and served from the
 * DB on any later visit.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const scanId = typeof body?.scan_id === "string" ? body.scan_id : "";
    const lang: "hu" | "en" = body?.lang === "en" ? "en" : "hu";
    if (!scanId) return NextResponse.json({ error: "missing_scan_id" }, { status: 400 });

    // RLS scopes the row to the requesting user.
    const { data: scan } = await supabase
      .from("scans")
      .select("id, brand, model, era, color, category, story, hype_score")
      .eq("id", scanId)
      .maybeSingle();
    if (!scan) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Already generated (or came from a pre-lazy-story scan) — serve it.
    if (typeof scan.story === "string" && scan.story.trim().length > 0) {
      return NextResponse.json({ story: scan.story });
    }
    if (!scan.brand) return NextResponse.json({ story: null });

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.FITFLIP_ANTHROPIC_KEY;
    if (!apiKey) return NextResponse.json({ error: "no_api_key" }, { status: 500 });

    const item = [scan.brand, scan.model, scan.color, scan.era]
      .filter(Boolean)
      .join(" — ");
    const hypeNote =
      typeof scan.hype_score === "number" && scan.hype_score >= 7
        ? lang === "hu"
          ? `\n\nKONTEXTUS: az elemzésünk ${scan.hype_score}/10-es hype-pontszámot adott erre a darabra — tehát a sneaker/streetwear-kultúrában jegyzett MODELL. Ilyenkor szinte mindig van dokumentált története (release-év, szubkultúra, design-eredet, kollabok) — azt írd meg. Null-t csak akkor adj, ha tényleg semmi konkrétat nem tudsz róla.`
          : `\n\nCONTEXT: our analysis gave this piece a hype score of ${scan.hype_score}/10 — it is a NOTED model in sneaker/streetwear culture. Such pieces almost always have a documented story (release year, subculture, design origin, collabs) — write that. Return null only if you genuinely know nothing concrete about it.`
        : "";

    const prompt =
      lang === "hu"
        ? `A következő divatcikkről kérek kulturális hátteret: ${item}${hypeNote}

HA a MODELLNEK dokumentált története van (release-háttér, designer/kollab, szubkultúra amihez kötődik, ikonikus pillanatok — pl. Air Jordan 1 'Shattered Backboard', Travis Scott AJ1, Yeezy 'Zebra', adidas Spezial és a terrace culture, Supreme Box Logo stb.), írj 2-3 BEKEZDÉSES magyar sztorit, a bekezdéseket DUPLA SORTÖRÉSSEL (\\n\\n) elválasztva. Tartalom: (1) release/eredet háttér + designer/kollab; (2) kulturális relevancia, mi tette ikonikussá, szubkultúra/sztárok; (3) opcionálisan érdekes részlet (origin sztori, eredeti funkció, release-legenda). A sztori a MODELLRŐL szóljon — nem kell a konkrét colorway-re szűkíteni.

Ha tényleg jellegtelen, történet nélküli darab (generic noname, átlagos basic), a story legyen null. NE találj ki tényeket — csak valós, dokumentált háttér. NE írj árbecslést.

CSAK ezt a JSON-t add vissza, semmi mást: {"story": "..." | null}`
        : `I need the cultural backstory of this fashion item: ${item}${hypeNote}

IF the MODEL has a documented history (release background, designer/collab, an attached subculture, iconic moments — e.g. Air Jordan 1 'Shattered Backboard', Travis Scott AJ1, Yeezy 'Zebra', adidas Spezial and terrace culture, Supreme Box Logo etc.), write a 2-3 PARAGRAPH English story, paragraphs separated by DOUBLE LINE BREAKS (\\n\\n). Content: (1) release/origin background + designer/collab; (2) cultural relevance, what made it iconic, subculture/stars; (3) optionally an interesting detail (origin story, original function, release lore). The story is about the MODEL — no need to narrow to the exact colorway.

If it is genuinely an unremarkable piece with no story (generic no-name, ordinary basic), story must be null. DO NOT invent facts — only real, documented context. No price estimates.

Return ONLY this JSON, nothing else: {"story": "..." | null}`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      // Haiku: ~3x faster than Sonnet (story ready before most users tap the
      // button) and plenty good for 2-3 paragraphs of documented lore.
      model: "claude-haiku-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ story: null });
    }
    let story: string | null = null;
    try {
      const cleaned = textBlock.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { story?: string | null };
      story = typeof parsed.story === "string" && parsed.story.trim().length > 0 ? parsed.story.trim() : null;
    } catch {
      return NextResponse.json({ story: null });
    }

    if (story) {
      // Persist so the next open is instant. Admin client (RLS-bypassing)
      // but the ownership was already proven by the RLS select above.
      const admin = createAdminClient();
      await admin.from("scans").update({ story }).eq("id", scanId);
    }

    return NextResponse.json({ story });
  } catch (err) {
    console.error("[/api/story] error:", err);
    return NextResponse.json({ story: null });
  }
}
