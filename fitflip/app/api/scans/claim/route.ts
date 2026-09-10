import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Guard against a hostile client posting a huge payload. A client-compressed
 *  photo is ~200-500 KB, so base64 at ~4 MB is generous. */
const MAX_IMAGE_BASE64 = 4 * 1024 * 1024;

const str = (v: unknown, max = 2000): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.slice(0, max) : null;
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

/**
 * Saves a scan that was produced while signed out.
 *
 * A guest's result is never written to the database — it is held in their
 * browser. When they then create an account (the whole point of the prompt
 * they saw), the client posts it here and it lands in their history, so the
 * thing that convinced them to sign up isn't lost. If they never sign in, the
 * browser drops it and nothing was stored in the first place.
 *
 * The analysis itself is NOT re-run: this only persists a result we already
 * paid for.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { result, image } = body as {
    result?: Record<string, unknown>;
    image?: { data?: unknown; mediaType?: unknown };
  };

  // Only a recognised item belongs in history — the same rule the live scan
  // path applies.
  if (!result || typeof result !== "object" || result.recognized !== true) {
    return NextResponse.json({ error: "nothing_to_claim" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upload the image now, under this user's own folder.
  let imagePath: string | null = null;
  let imageHash: string | null = null;
  const raw = typeof image?.data === "string" ? image.data : null;
  if (raw && raw.length <= MAX_IMAGE_BASE64) {
    try {
      const buf = Buffer.from(raw, "base64");
      imageHash = createHash("sha256").update(buf).digest("hex");

      // Already claimed (double-submit, or the user scanned this before) —
      // return the existing row instead of duplicating history.
      const { data: dupe } = await admin
        .from("scans")
        .select("id")
        .eq("user_id", user.id)
        .eq("image_hash", imageHash)
        .limit(1)
        .maybeSingle();
      if (dupe?.id) {
        return NextResponse.json({ scanId: dupe.id, alreadyClaimed: true });
      }

      const path = `${user.id}/${randomUUID()}.jpg`;
      const { error: uploadError } = await admin.storage
        .from("scan-images")
        .upload(path, buf, { contentType: "image/jpeg", upsert: false });
      if (uploadError) {
        console.warn("[claim] image upload failed:", uploadError.message);
      } else {
        imagePath = path;
      }
    } catch (err) {
      console.warn("[claim] image handling failed:", err);
    }
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    recognized: true,
    category: str(result.category, 60),
    item_type: str(result.item_type, 60),
    brand: str(result.brand, 120),
    model: str(result.model, 200),
    color: str(result.color, 60),
    era: str(result.era, 60),
    condition: str(result.condition, 60),
    estimated_value_min_huf: num(result.estimated_value_min_huf),
    estimated_value_max_huf: num(result.estimated_value_max_huf),
    description: str(result.description, 4000),
    search_query: str(result.search_query, 300),
    selling_tip: str(result.selling_tip, 4000),
    confidence: str(result.confidence, 40),
    image_path: imagePath,
    image_hash: imageHash,
    defects: Array.isArray(result.defects) ? result.defects.slice(0, 20) : [],
    condition_discount_pct: num(result.condition_discount_pct),
    is_definitely_new: bool(result.is_definitely_new),
    retail_price_huf: num(result.retail_price_huf),
    hype_score: num(result.hype_score),
    hype_label: str(result.hype_label, 60),
  };

  const { data: row, error } = await admin
    .from("scans")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    // Older schemas may lack some columns; retry with the core set rather
    // than losing the user's first result.
    console.warn("[claim] insert failed, retrying minimal:", error.message);
    const minimal = {
      user_id: user.id,
      recognized: true,
      brand: payload.brand,
      model: payload.model,
      category: payload.category,
      estimated_value_min_huf: payload.estimated_value_min_huf,
      estimated_value_max_huf: payload.estimated_value_max_huf,
      description: payload.description,
      image_path: imagePath,
    };
    const { data: fallback, error: fallbackError } = await admin
      .from("scans")
      .insert(minimal)
      .select("id")
      .single();
    if (fallbackError) {
      console.error("[claim] insert failed:", fallbackError.message);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }
    return NextResponse.json({ scanId: fallback?.id ?? null });
  }

  return NextResponse.json({ scanId: row?.id ?? null });
}
