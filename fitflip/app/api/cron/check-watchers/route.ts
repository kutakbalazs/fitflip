import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchAllMarketplaces } from "@/lib/listings/aggregate";
import { verifyListingsAgainstImage } from "@/lib/listings/verify";
import { filterListingsByItemType } from "@/lib/listings/itemType";
import type { Listing } from "@/lib/listings/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel hobby = 60s; Pro/Cron = 300s

type WatcherRow = {
  id: string;
  user_id: string;
  scan_id: string;
  target_price_huf: number;
  baseline_urls: string[];
  search_brand: string | null;
  search_model: string | null;
  search_color: string | null;
  search_item_type: string | null;
  search_queries: string[] | null;
  search_brand_tokens: string[] | null;
  search_model_tokens: string[] | null;
  search_color_tokens: string[] | null;
};

export async function GET(req: NextRequest) {
  // Auth via shared secret. Vercel Cron sets this header automatically when
  // CRON_SECRET is configured in the project.
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: watchers, error } = await admin
    .from("price_watchers")
    .select("id, user_id, scan_id, target_price_huf, baseline_urls, search_brand, search_model, search_color, search_item_type, search_queries, search_brand_tokens, search_model_tokens, search_color_tokens")
    .eq("active", true);
  if (error) {
    console.error("[cron] fetch watchers error:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const rows = (watchers ?? []) as WatcherRow[];
  let totalChecked = 0;
  let totalNotifications = 0;

  // Cache fetched scan images so multiple watchers on the same scan don't
  // hit storage twice.
  const imageCache = new Map<string, { data: string; mediaType: "image/jpeg" } | null>();

  for (const watcher of rows) {
    totalChecked++;
    try {
      const newCount = await processWatcher(admin, watcher, imageCache);
      if (newCount > 0) totalNotifications++;
    } catch (err) {
      console.warn(`[cron] watcher ${watcher.id} failed:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    watchersChecked: totalChecked,
    notificationsCreated: totalNotifications,
  });
}

async function processWatcher(
  admin: ReturnType<typeof createAdminClient>,
  w: WatcherRow,
  imageCache: Map<string, { data: string; mediaType: "image/jpeg" } | null>
): Promise<number> {
  if (!w.search_queries || w.search_queries.length === 0) {
    // Cannot run a search without queries.
    await admin.from("price_watchers").update({ last_checked_at: new Date().toISOString() }).eq("id", w.id);
    return 0;
  }

  const { listings: raw } = await searchAllMarketplaces(
    w.search_queries,
    w.search_brand_tokens ?? [],
    w.search_model_tokens ?? [],
    w.search_color_tokens ?? []
  );
  const typeFiltered = filterListingsByItemType(raw, w.search_item_type ?? "");

  // Only listings (a) under target price, (b) not in baseline.
  const baseline = new Set(w.baseline_urls ?? []);
  const candidates: Listing[] = typeFiltered.filter(
    (l) =>
      typeof l.priceHuf === "number" &&
      l.priceHuf > 0 &&
      l.priceHuf <= w.target_price_huf &&
      !baseline.has(l.url)
  );

  if (candidates.length === 0) {
    await admin.from("price_watchers").update({ last_checked_at: new Date().toISOString() }).eq("id", w.id);
    return 0;
  }

  // Visually verify the candidates against the original scan image.
  let originalImage = imageCache.get(w.scan_id);
  if (originalImage === undefined) {
    originalImage = await fetchScanImage(admin, w.scan_id);
    imageCache.set(w.scan_id, originalImage);
  }

  let verified = candidates;
  if (originalImage) {
    try {
      verified = await verifyListingsAgainstImage(
        originalImage,
        candidates,
        {
          brand: w.search_brand ?? undefined,
          model: w.search_model ?? undefined,
          color: w.search_color ?? undefined,
        },
        { strict: !w.search_brand, model: "claude-haiku-4-5" }
      );
    } catch (err) {
      console.warn(`[cron] verify failed for ${w.id}, using unverified:`, err);
    }
  }

  if (verified.length === 0) {
    await admin.from("price_watchers").update({ last_checked_at: new Date().toISOString() }).eq("id", w.id);
    return 0;
  }

  // Insert notification.
  const newUrls = verified.map((v) => v.url);
  const updatedBaseline = Array.from(new Set([...(w.baseline_urls ?? []), ...newUrls]));

  await admin.from("watcher_notifications").insert({
    user_id: w.user_id,
    watcher_id: w.id,
    listings: verified,
    scan_brand: w.search_brand,
    scan_model: w.search_model,
    target_price_huf: w.target_price_huf,
  });

  await admin
    .from("price_watchers")
    .update({
      last_checked_at: new Date().toISOString(),
      baseline_urls: updatedBaseline,
    })
    .eq("id", w.id);

  return verified.length;
}

async function fetchScanImage(
  admin: ReturnType<typeof createAdminClient>,
  scanId: string
): Promise<{ data: string; mediaType: "image/jpeg" } | null> {
  try {
    const { data: scan } = await admin
      .from("scans")
      .select("image_path")
      .eq("id", scanId)
      .maybeSingle();
    if (!scan?.image_path) return null;
    const { data: file, error } = await admin.storage
      .from("scan-images")
      .download(scan.image_path);
    if (error || !file) return null;
    const buf = Buffer.from(await file.arrayBuffer());
    return { data: buf.toString("base64"), mediaType: "image/jpeg" };
  } catch (err) {
    console.warn("[cron] image fetch failed:", err);
    return null;
  }
}
