import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Fast pre-identification (Haiku, ~2-3s): returns just brand/model/type so
 * the UI can show "✓ adidas — Handball Spezial" while the full Sonnet
 * analysis is still running. Purely cosmetic — does not count against the
 * scan limit, saves nothing, and any failure is ignored by the client.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.FITFLIP_ANTHROPIC_KEY;
    if (!apiKey) return NextResponse.json({ error: "no_api_key" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const image = typeof body?.image === "string" ? body.image : "";
    const mediaType = typeof body?.mediaType === "string" ? body.mediaType : "image/jpeg";
    const lang: "hu" | "en" = body?.lang === "en" ? "en" : "hu";
    if (!image) return NextResponse.json({ error: "missing_image" }, { status: 400 });

    const prompt =
      lang === "hu"
        ? `Divatcikk-azonosítás, VILLÁMGYORS első kör. Nézd meg a képet és add vissza CSAK ezt a JSON-t (semmi mást):
{"brand": "márka vagy null — ha nem látsz egyértelmű márkajelzést, null, NE tippelj", "model": "modell vagy null", "item_type": "sneaker|t-shirt|hoodie|jacket|jeans|bag|sunglasses|watch|cap|jersey|other"}`
        : `Fashion item identification, LIGHTNING-FAST first pass. Look at the image and return ONLY this JSON (nothing else):
{"brand": "brand or null — if no clear brand marking, null, do NOT guess", "model": "model or null", "item_type": "sneaker|t-shirt|hoodie|jacket|jeans|bag|sunglasses|watch|cap|jersey|other"}`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 150,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: image,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return NextResponse.json({});
    try {
      const cleaned = textBlock.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      return NextResponse.json({
        brand: typeof parsed.brand === "string" ? parsed.brand : null,
        model: typeof parsed.model === "string" ? parsed.model : null,
        item_type: typeof parsed.item_type === "string" ? parsed.item_type : null,
      });
    } catch {
      return NextResponse.json({});
    }
  } catch (err) {
    console.error("[/api/quick-id] error:", err);
    return NextResponse.json({});
  }
}
