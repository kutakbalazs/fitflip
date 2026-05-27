import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const FREE_LIMIT = 0;
const PREMIUM_LIMIT = 5;

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("price_watchers")
    .select("id, scan_id, target_price_huf, search_brand, search_model, search_color, active, created_at, last_checked_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[/api/watchers GET] error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ watchers: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single();
    if (!profile?.is_premium) {
      return NextResponse.json({ error: "premium_required" }, { status: 403 });
    }

    // Enforce watcher limit per tier.
    const { count } = await admin
      .from("price_watchers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("active", true);
    const limit = profile.is_premium ? PREMIUM_LIMIT : FREE_LIMIT;
    if ((count ?? 0) >= limit) {
      return NextResponse.json({ error: "watcher_limit_reached", limit }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const scanId = typeof body?.scan_id === "string" ? body.scan_id : "";
    const targetPrice = typeof body?.target_price_huf === "number" ? Math.round(body.target_price_huf) : 0;
    if (!scanId || targetPrice <= 0) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const sanitizeArr = (x: unknown): string[] =>
      Array.isArray(x) ? x.filter((s): s is string => typeof s === "string" && s.length > 0) : [];

    const payload = {
      user_id: user.id,
      scan_id: scanId,
      target_price_huf: targetPrice,
      baseline_urls: sanitizeArr(body?.baseline_urls),
      search_brand: typeof body?.search_brand === "string" ? body.search_brand : null,
      search_model: typeof body?.search_model === "string" ? body.search_model : null,
      search_color: typeof body?.search_color === "string" ? body.search_color : null,
      search_item_type: typeof body?.search_item_type === "string" ? body.search_item_type : null,
      search_queries: sanitizeArr(body?.search_queries),
      search_brand_tokens: sanitizeArr(body?.search_brand_tokens),
      search_model_tokens: sanitizeArr(body?.search_model_tokens),
      search_color_tokens: sanitizeArr(body?.search_color_tokens),
      active: true,
    };

    const { data, error } = await admin
      .from("price_watchers")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      console.error("[/api/watchers POST] insert error:", error);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("[/api/watchers POST] error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
