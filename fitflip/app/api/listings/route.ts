import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchAllMarketplaces } from "@/lib/listings/aggregate";
import { verifyListingsAgainstImage } from "@/lib/listings/verify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const sanitizeArray = (raw: unknown): string[] =>
      Array.isArray(raw)
        ? (raw as unknown[]).filter((k): k is string => typeof k === "string" && k.trim().length > 0)
        : [];
    const queries = sanitizeArray(body?.queries);
    const brandTokens = sanitizeArray(body?.brandTokens);
    const modelTokens = sanitizeArray(body?.modelTokens);
    const colorTokens = sanitizeArray(body?.colorTokens);
    const originalImage =
      body?.originalImage &&
      typeof body.originalImage === "object" &&
      typeof body.originalImage.data === "string" &&
      typeof body.originalImage.mediaType === "string"
        ? {
            data: body.originalImage.data as string,
            mediaType: body.originalImage.mediaType as
              | "image/jpeg"
              | "image/png"
              | "image/webp"
              | "image/gif",
          }
        : null;

    // Backwards-compat: accept singular `query` too.
    if (queries.length === 0 && typeof body?.query === "string" && body.query.trim()) {
      queries.push(body.query);
    }

    if (queries.length === 0) {
      return NextResponse.json({ error: "missing_query" }, { status: 400 });
    }

    const { listings, exact } = await searchAllMarketplaces(
      queries,
      brandTokens,
      modelTokens,
      colorTokens
    );

    // If we have the user's image, ask the model to look at every listing
    // thumbnail and drop ones that aren't actually the same product.
    let finalListings = listings;
    let visuallyVerified = false;
    if (originalImage && listings.length > 0) {
      try {
        finalListings = await verifyListingsAgainstImage(originalImage, listings);
        visuallyVerified = true;
      } catch (err) {
        console.warn("[/api/listings] verification failed, returning unfiltered:", err);
      }
    }

    return NextResponse.json({
      listings: finalListings,
      exact,
      visuallyVerified,
    });
  } catch (err) {
    console.error("[/api/listings] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
