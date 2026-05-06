import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const FREE_DAILY_LIMIT = 3;
const COOKIE_NAME = "ff_scans";

type ScanCookie = {
  date: string;
  count: number;
};

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readScanCookie(req: NextRequest): ScanCookie {
  const raw = req.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return { date: getTodayKey(), count: 0 };
  try {
    const parsed = JSON.parse(raw) as ScanCookie;
    if (parsed.date !== getTodayKey()) {
      return { date: getTodayKey(), count: 0 };
    }
    return parsed;
  } catch {
    return { date: getTodayKey(), count: 0 };
  }
}

function buildPrompt(lang: "hu" | "en"): string {
  if (lang === "hu") {
    return `Te a FitFlip vagy – egy AI alapú ruha-, sneaker- és streetwear-azonosító. Vizsgáld meg a feltöltött fotót, és add vissza JSON formátumban a következőket:

{
  "recognized": boolean,
  "category": "sneaker" | "vintage_clothing" | "streetwear" | "designer" | "other",
  "brand": "string vagy null",
  "model": "termék neve / stílus megnevezése vagy null",
  "era": "évszám vagy időszak vagy null",
  "condition": "új | nagyon jó | jó | használt | rossz vagy null",
  "estimated_value_min_huf": number vagy null,
  "estimated_value_max_huf": number vagy null,
  "description": "rövid magyarázat magyarul (2-3 mondat) – mit látsz, mi különleges benne",
  "search_query": "egy tömör angol nyelvű keresési kifejezés ehhez a tételhez (pl. 'Air Jordan 4 Bred 2019')",
  "selling_tip": "rövid magyar nyelvű tipp az eladáshoz (1-2 mondat)",
  "confidence": "low" | "medium" | "high"
}

Fontos szabályok:
- Ha nem ismered fel a tételt, állítsd recognized:false-ra és töltsd ki a többi mezőt null-lal
- Az érték HUF-ban legyen, magyar piaci viszonyokhoz igazítva (Vinted HU, JOFOGAS, Hardverapró árak alapján)
- A "search_query" angolul legyen és tartalmazza a márkát + modellt + színkódot/évjáratot ha tudod
- CSAK a JSON-t add vissza, semmi mást, semmi magyarázatot, semmi markdown blokkot`;
  }
  return `You are FitFlip – an AI-powered clothing, sneaker, and streetwear identifier. Analyze the uploaded photo and return JSON:

{
  "recognized": boolean,
  "category": "sneaker" | "vintage_clothing" | "streetwear" | "designer" | "other",
  "brand": "string or null",
  "model": "product name / style or null",
  "era": "year or period or null",
  "condition": "new | excellent | good | used | poor or null",
  "estimated_value_min_huf": number or null,
  "estimated_value_max_huf": number or null,
  "description": "brief explanation in English (2-3 sentences) – what you see and what's special",
  "search_query": "concise English search query for this item (e.g., 'Air Jordan 4 Bred 2019')",
  "selling_tip": "brief selling advice in English (1-2 sentences)",
  "confidence": "low" | "medium" | "high"
}

Important:
- If you can't identify the item, set recognized:false and fill other fields with null
- Values in HUF, based on European secondhand market prices (Vinted, eBay)
- "search_query" must be in English and include brand + model + colorway/year if known
- Return ONLY the JSON, no explanations, no markdown blocks`;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured on server" },
        { status: 500 }
      );
    }

    const cookie = readScanCookie(req);
    if (cookie.count >= FREE_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "limit_reached", scansLeft: 0 },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { image, mediaType, lang } = body as {
      image: string;
      mediaType: string;
      lang: "hu" | "en";
    };

    if (!image || !mediaType) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/webp"
                  | "image/gif",
                data: image,
              },
            },
            { type: "text", text: buildPrompt(lang || "hu") },
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

    const newCookie: ScanCookie = {
      date: getTodayKey(),
      count: cookie.count + 1,
    };

    const res = NextResponse.json({
      ...parsed,
      scansLeft: FREE_DAILY_LIMIT - newCookie.count,
    });

    res.cookies.set({
      name: COOKIE_NAME,
      value: JSON.stringify(newCookie),
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 2,
    });

    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const cookie = readScanCookie(req);
  return NextResponse.json({
    scansLeft: Math.max(0, FREE_DAILY_LIMIT - cookie.count),
  });
}
