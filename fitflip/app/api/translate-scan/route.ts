import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * Translates the AI-generated fields of a displayed scan result when the
 * user switches UI language after the scan ran. View-only: nothing is
 * persisted — the stored scan keeps its original language.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.FITFLIP_ANTHROPIC_KEY;
    if (!apiKey) return NextResponse.json({ error: "no_api_key" }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const target: "hu" | "en" = body?.target_lang === "en" ? "en" : "hu";
    const fields = body?.fields;
    if (!fields || typeof fields !== "object") {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const safe = {
      condition: typeof fields.condition === "string" ? fields.condition.slice(0, 200) : null,
      era: typeof fields.era === "string" ? fields.era.slice(0, 200) : null,
      description: typeof fields.description === "string" ? fields.description.slice(0, 2000) : null,
      selling_tip: typeof fields.selling_tip === "string" ? fields.selling_tip.slice(0, 1000) : null,
      hype_label: typeof fields.hype_label === "string" ? fields.hype_label.slice(0, 100) : null,
      defects: Array.isArray(fields.defects)
        ? fields.defects.filter((d: unknown): d is string => typeof d === "string").slice(0, 12)
        : [],
    };

    const targetName = target === "hu" ? "Hungarian" : "English";
    const prompt = `Translate the string values of this JSON to natural ${targetName}. Keep the EXACT same JSON structure and keys. Keep null values null and the defects array length unchanged. Brand/model names, sizes and numbers stay as-is. Return ONLY the JSON, nothing else.

${JSON.stringify(safe)}`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1000,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "no_response" }, { status: 500 });
    }
    const cleaned = textBlock.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const translated = JSON.parse(cleaned.slice(start, end + 1));
    return NextResponse.json({ fields: translated });
  } catch (err) {
    console.error("[/api/translate-scan] error:", err);
    return NextResponse.json({ error: "translate_failed" }, { status: 500 });
  }
}
