import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchAllMarketplaces } from "@/lib/listings/aggregate";
import { verifyListingsAgainstImage } from "@/lib/listings/verify";
import { filterListingsByItemType } from "@/lib/listings/itemType";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Listings panel is now open to free users too — limited naturally by
    // the daily scan cap. Watchers stay premium-only (see /api/watchers).

    const body = await req.json().catch(() => ({}));
    const sanitizeArray = (raw: unknown): string[] =>
      Array.isArray(raw)
        ? (raw as unknown[]).filter((k): k is string => typeof k === "string" && k.trim().length > 0)
        : [];
    const queries = sanitizeArray(body?.queries);
    const brandTokens = sanitizeArray(body?.brandTokens);
    const modelTokens = sanitizeArray(body?.modelTokens);
    const colorTokens = sanitizeArray(body?.colorTokens);
    const brandHint = typeof body?.brand === "string" ? body.brand : "";
    const modelHint = typeof body?.model === "string" ? body.model : "";
    const colorHint = typeof body?.color === "string" ? body.color : "";
    const itemType = typeof body?.itemType === "string" ? body.itemType : "";
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

    const { listings: rawListings, exact } = await searchAllMarketplaces(
      queries,
      brandTokens,
      modelTokens,
      colorTokens
    );

    // Item-type filter: drop listings whose title clearly doesn't match the
    // scanned type (e.g. a phone listing under a T-shirt search). Falls back
    // to unfiltered if the filter would leave us with nothing.
    const listings = filterListingsByItemType(rawListings, itemType);

    // Strict mode: when the AI couldn't identify the brand we have less to
    // anchor on, so we ask the verifier to be much pickier and cap the
    // result count. Better to show 2 high-confidence matches than 10 noisy
    // ones in this scenario.
    const strict = !brandHint;

    // If we have the user's image, ask the model to look at every listing
    // thumbnail and drop ones that aren't actually the same product.
    let finalListings = listings;
    let visuallyVerified = false;
    if (originalImage && listings.length > 0) {
      try {
        finalListings = await verifyListingsAgainstImage(
          originalImage,
          listings,
          {
            brand: brandHint || undefined,
            model: modelHint || undefined,
            color: colorHint || undefined,
            itemType: itemType || undefined,
          },
          { strict }
        );
        visuallyVerified = true;
      } catch (err) {
        console.warn("[/api/listings] verification failed, returning unfiltered:", err);
      }
    }

    // In strict mode we also cap the final result: 6 high-confidence is much
    // friendlier than 12 "maybe".
    if (strict && finalListings.length > 6) {
      finalListings = finalListings.slice(0, 6);
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
