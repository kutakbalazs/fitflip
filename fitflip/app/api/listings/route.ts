import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchAllMarketplaces, titleHasColor, titleMentionsAnyColor } from "@/lib/listings/aggregate";
import { verifyListingsAgainstImage } from "@/lib/listings/verify";
import { filterListingsByItemType, isStrictFilterType, isSimilarOnlyType } from "@/lib/listings/itemType";
import type { Listing } from "@/lib/listings/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Fetch a scan's stored image (base64) for visual verification — used when
// the caller passes a scanId instead of an inline image (e.g. the scan
// detail page re-running a search).
async function fetchScanImage(
  userId: string,
  scanId: string
): Promise<{ data: string; mediaType: "image/jpeg" } | null> {
  try {
    const admin = createAdminClient();
    const { data: scan } = await admin
      .from("scans")
      .select("image_path, user_id")
      .eq("id", scanId)
      .maybeSingle();
    if (!scan?.image_path || scan.user_id !== userId) return null;
    const { data: file, error } = await admin.storage
      .from("scan-images")
      .download(scan.image_path);
    if (error || !file) return null;
    const buf = Buffer.from(await file.arrayBuffer());
    return { data: buf.toString("base64"), mediaType: "image/jpeg" };
  } catch {
    return null;
  }
}

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
    let originalImage =
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

    // Scan detail page passes a scanId instead of an inline image — fetch the
    // stored image server-side for visual verification.
    const scanId = typeof body?.scanId === "string" ? body.scanId : "";
    if (!originalImage && scanId) {
      originalImage = await fetchScanImage(user.id, scanId);
    }

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
    const listings = filterListingsByItemType(rawListings, itemType, modelTokens);

    // Strict mode: when the AI couldn't identify the brand we have less to
    // anchor on, so we ask the verifier to be much pickier and cap the
    // result count. Better to show 2 high-confidence matches than 10 noisy
    // ones in this scenario. Also strict for non-apparel accessories
    // (sunglasses, watch, …) where a wrong-category match is egregious —
    // strict mode disables the "keep top 3 anyway" fallback.
    const strict = !brandHint || isStrictFilterType(itemType);

    // Title-based auto-exact: when a listing's title spells out the brand,
    // the model (majority of tokens) AND every scanned colour word ("Adidas
    // Handball Spezial Black White Gum"), it IS the same product — no need
    // to burn vision tokens on it, and the verifier can't false-negative it.
    const wordIn = (title: string, word: string) =>
      title.toLowerCase().includes(word.toLowerCase());
    const modelThreshold = Math.max(1, Math.ceil(modelTokens.length / 2));
    const isTitleExact = (l: Listing): boolean => {
      if (!brandHint || modelTokens.length === 0 || colorTokens.length === 0) return false;
      if (isSimilarOnlyType(itemType)) return false;
      const brandOk = brandTokens.some((b) => wordIn(l.title, b));
      const modelOk = modelTokens.filter((m) => wordIn(l.title, m)).length >= modelThreshold;
      const colorOk = colorTokens.every((c) => titleHasColor(l.title, [c]));
      return brandOk && modelOk && colorOk;
    };
    const autoExact = listings.filter(isTitleExact);
    const autoExactUrls = new Set(autoExact.map((l) => l.url));
    const toVerify = listings.filter((l) => !autoExactUrls.has(l.url));

    // If we have the user's image, ask the model to look at every remaining
    // listing thumbnail and split them: confirmed same-product matches vs
    // rejected ones. Rejections are still text-relevant (same model,
    // different colorway etc.), so they're returned separately as "similar"
    // — shown to the user clearly labelled, never mixed with exact matches.
    let finalListings = listings;
    let similar: Listing[] = [];
    let visuallyVerified = false;
    if (originalImage && toVerify.length > 0) {
      try {
        const { kept, dropped } = await verifyListingsAgainstImage(
          originalImage,
          toVerify,
          {
            brand: brandHint || undefined,
            model: modelHint || undefined,
            color: colorHint || undefined,
            itemType: itemType || undefined,
          },
          // Haiku: same verification prompt, ~75% cheaper — needed now that
          // up to ~27 candidates reach verification (was 18). Accuracy
          // matches Sonnet on this compare-thumbnails task (validated on
          // the watcher cron, which has used Haiku from the start).
          { strict, model: "claude-haiku-4-5" }
        );
        finalListings = [...autoExact, ...kept];
        similar = dropped;
        visuallyVerified = true;
      } catch (err) {
        console.warn("[/api/listings] verification failed, returning unfiltered:", err);
      }
    } else if (originalImage && toVerify.length === 0 && autoExact.length > 0) {
      // Everything matched on title alone — nothing left to verify.
      finalListings = autoExact;
      visuallyVerified = true;
    }

    // In strict mode we also cap the final result: 6 high-confidence is much
    // friendlier than 12 "maybe".
    if (strict && finalListings.length > 6) {
      finalListings = finalListings.slice(0, 6);
    }

    // Accessories/jewellery/headwear can't be pinned to a specific model via
    // text, so never claim an exact match — always present as "similar".
    let exactFinal = isSimilarOnlyType(itemType) ? false : exact;

    // Colorway guard: the exact flag is computed before visual verification,
    // and the verifier's safety-net can resurface wrong-colour items. If the
    // SHOWN listings name colours but NONE matches the scanned colour, these
    // are different colorways (e.g. a blue Gazelle scan returning red/green
    // Gazelles) → downgrade to "similar". (We only downgrade when listings
    // actually mention a colour, so terse colourless titles don't false-flag.)
    if (exactFinal && colorTokens.length > 0 && finalListings.length > 0) {
      const anyScannedColor = finalListings.some((l) => titleHasColor(l.title, colorTokens));
      const anyMentionsColor = finalListings.some((l) => titleMentionsAnyColor(l.title));
      if (!anyScannedColor && anyMentionsColor) {
        exactFinal = false;
      }
    }

    return NextResponse.json({
      listings: finalListings,
      similar,
      exact: exactFinal,
      visuallyVerified,
    });
  } catch (err) {
    console.error("[/api/listings] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
