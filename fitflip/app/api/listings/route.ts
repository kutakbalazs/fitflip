import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchAllMarketplaces } from "@/lib/listings/aggregate";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single();

    if (!profile?.is_premium) {
      return NextResponse.json({ error: "premium_required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query : "";
    if (!query.trim()) {
      return NextResponse.json({ error: "missing_query" }, { status: 400 });
    }

    const listings = await searchAllMarketplaces(query);
    return NextResponse.json({ listings });
  } catch (err) {
    console.error("[/api/listings] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
