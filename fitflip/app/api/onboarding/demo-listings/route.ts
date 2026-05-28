import { NextResponse } from "next/server";
import { searchAllMarketplaces } from "@/lib/listings/aggregate";
import { filterListingsByItemType } from "@/lib/listings/itemType";
import { demoScanHU } from "@/lib/onboarding/demoScan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Public endpoint for the onboarding demo. No auth, no rate limit — runs a
 * fixed Supreme Box Logo Hoodie search and returns live marketplace
 * listings. Used to showcase how fast we find real listings without
 * burning the visitor's daily scan quota.
 *
 * Cached server-side for 10 minutes via Cache-Control so a viral onboarding
 * burst doesn't hammer the upstream marketplaces.
 */
export async function GET() {
  try {
    const { queries, brandTokens, modelTokens, colorTokens, itemType } = demoScanHU;
    const { listings: raw } = await searchAllMarketplaces(
      queries,
      brandTokens,
      modelTokens,
      colorTokens
    );
    const typed = filterListingsByItemType(raw, itemType);

    // Strict color filter for the demo: only keep listings whose title
    // mentions grey/gray/szürke (or "ash" which is a recognized grey
    // colorway for the Box Logo Hoodie), AND doesn't mention a clearly
    // different color. This stops red/navy/black BLHs from leaking into a
    // demo that's supposed to showcase a *grey* hoodie.
    const GREY_TOKENS = ["grey", "gray", "szürke", "szurke", "ash"];
    const OTHER_COLORS = [
      "red", "piros", "vörös", "voros",
      "black", "fekete",
      "white", "fehér", "feher",
      "navy", "blue", "kék", "kek",
      "green", "zöld", "zold",
      "pink", "rózsa", "rozsa",
      "yellow", "sárga", "sarga",
      "purple", "lila",
      "orange", "narancs",
      "brown", "barna",
      "beige", "bézs", "bezs",
      "cream", "krém", "krem",
      "olive", "oliva",
      "burgundy", "bordó", "bordo",
      "camo", "terep",
    ];
    const colorFiltered = typed.filter((l) => {
      const title = l.title.toLowerCase();
      const hasGrey = GREY_TOKENS.some((t) => title.includes(t));
      if (!hasGrey) return false;
      // If the title also explicitly names another solid color, skip it
      // (handles weird "grey + red Box Logo" listings).
      const hasOther = OTHER_COLORS.some((t) => {
        // Word-boundary match to avoid e.g. "fekete" inside another word.
        return new RegExp(`\\b${t}\\b`, "i").test(title);
      });
      return !hasOther;
    });

    // If the strict filter wiped everything (e.g. all sellers omit color
    // in the title), fall back to typed so we still show *something*.
    const finalList = colorFiltered.length > 0 ? colorFiltered : typed;

    // Hard cap — onboarding doesn't need a wall of results.
    const trimmed = finalList.slice(0, 6);

    return NextResponse.json(
      { listings: trimmed },
      {
        headers: {
          // Edge cache for 10 min, stale-while-revalidate for 1h. Fresh
          // enough to feel live, cheap enough to survive traffic spikes.
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (err) {
    console.error("[/api/onboarding/demo-listings] error:", err);
    return NextResponse.json({ listings: [] }, { status: 200 });
  }
}
