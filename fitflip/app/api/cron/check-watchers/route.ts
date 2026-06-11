import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchAllMarketplaces } from "@/lib/listings/aggregate";
import { verifyListingsAgainstImage } from "@/lib/listings/verify";
import { filterListingsByItemType } from "@/lib/listings/itemType";
import { extractSizeTokens, listingMatchesSize } from "@/lib/listings/sizeMatch";
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
  size_filter: string | null;
  last_checked_at: string | null;
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
    .select("id, user_id, scan_id, target_price_huf, baseline_urls, search_brand, search_model, search_color, search_item_type, search_queries, search_brand_tokens, search_model_tokens, search_color_tokens, size_filter, last_checked_at")
    .eq("active", true);
  if (error) {
    console.error("[cron] fetch watchers error:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const rows = (watchers ?? []) as WatcherRow[];
  const diagnostics: unknown[] = [];
  let totalChecked = 0;
  let totalNotifications = 0;
  let totalSkipped = 0;

  // Bypass the 20h rate limit for manual testing: ?force=1.
  const params = new URL(req.url).searchParams;
  // Dry-run diagnostics: runs the full pipeline but writes NOTHING (no
  // notifications, no baseline/last_checked updates) and returns per-watcher
  // stage counts — for debugging why a watcher isn't producing matches.
  const dry = params.get("dry") === "1";
  const force = dry || params.get("force") === "1";

  // Cache fetched scan images so multiple watchers on the same scan don't
  // hit storage twice.
  const imageCache = new Map<string, { data: string; mediaType: "image/jpeg" } | null>();

  for (const watcher of rows) {
    // Per-watcher rate limit: even if the cron is somehow triggered more
    // than once a day (manual call, accidental re-deploy, etc.), each
    // watcher only gets processed once per 20 hours. Prevents duplicate
    // notifications and runaway token costs.
    if (!force && watcher.last_checked_at) {
      const ageHours =
        (Date.now() - new Date(watcher.last_checked_at).getTime()) / 3_600_000;
      if (ageHours < 20) {
        totalSkipped++;
        continue;
      }
    }

    totalChecked++;
    try {
      const { newCount, diag } = await processWatcher(admin, watcher, imageCache, dry);
      if (newCount > 0) totalNotifications++;
      if (dry) diagnostics.push(diag);
    } catch (err) {
      console.warn(`[cron] watcher ${watcher.id} failed:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    watchersChecked: totalChecked,
    watchersSkipped: totalSkipped,
    notificationsCreated: totalNotifications,
    ...(dry ? { dry: true, diagnostics } : {}),
  });
}

type WatcherDiag = {
  watcher: string;
  stages: Record<string, number>;
  samples: string[];
  sizesSeen?: string[];
};

async function processWatcher(
  admin: ReturnType<typeof createAdminClient>,
  w: WatcherRow,
  imageCache: Map<string, { data: string; mediaType: "image/jpeg" } | null>,
  dry = false
): Promise<{ newCount: number; diag: WatcherDiag }> {
  const diag: WatcherDiag = {
    watcher: `${w.search_brand ?? "?"} ${w.search_model ?? ""} (cél: ${w.target_price_huf} Ft, méret: ${w.size_filter ?? "-"})`,
    stages: {},
    samples: [],
  };
  const markChecked = async () => {
    if (!dry) {
      await admin.from("price_watchers").update({ last_checked_at: new Date().toISOString() }).eq("id", w.id);
    }
  };
  if (!w.search_queries || w.search_queries.length === 0) {
    // Cannot run a search without queries.
    await markChecked();
    return { newCount: 0, diag };
  }

  const { listings: raw } = await searchAllMarketplaces(
    w.search_queries,
    w.search_brand_tokens ?? [],
    w.search_model_tokens ?? [],
    w.search_color_tokens ?? []
  );
  const typeFiltered = filterListingsByItemType(
    raw,
    w.search_item_type ?? "",
    w.search_model_tokens ?? []
  );
  diag.stages.raw = raw.length;
  diag.stages.typeFiltered = typeFiltered.length;

  // Only listings (a) under target price, (b) not in baseline.
  const baseline = new Set(w.baseline_urls ?? []);
  const priced = typeFiltered.filter(
    (l) => typeof l.priceHuf === "number" && l.priceHuf > 0 && l.priceHuf <= w.target_price_huf
  );
  diag.stages.underTargetPrice = priced.length;
  let candidates: Listing[] = priced.filter((l) => !baseline.has(l.url));
  diag.stages.notInBaseline = candidates.length;

  // Tightening for watcher cron: require at least one brand or model token
  // to appear as a whole word in the listing title. Cheap, deterministic
  // filter that eliminates most off-target results before we spend tokens
  // on visual verification. (We skip this gate only when we have neither
  // brand nor model tokens, in which case the AI verifier must carry the
  // weight on its own.)
  const idTokens = [
    ...(w.search_brand_tokens ?? []),
    ...(w.search_model_tokens ?? []),
  ].filter((tok) => typeof tok === "string" && tok.trim().length >= 2);
  if (idTokens.length > 0) {
    const titleHasAnyToken = (title: string) => {
      const lower = title.toLowerCase();
      return idTokens.some((tok) => {
        const escaped = tok.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`\\b${escaped}\\b`, "i").test(lower);
      });
    };
    candidates = candidates.filter((l) => titleHasAnyToken(l.title));
  }
  diag.stages.afterTokenGate = candidates.length;

  // Optional size filter: only listings whose title contains the user's
  // size tokens. If the filter strips everything, drop out — better an
  // empty notification than spamming the user with mismatched sizes.
  if (w.size_filter && w.size_filter.trim().length > 0) {
    const tokens = extractSizeTokens(w.size_filter);
    if (tokens.length > 0) {
      // Diagnostics: what sizes were on offer before the filter?
      diag.sizesSeen = candidates.map((l) => l.sizeLabel ?? "?").slice(0, 20);
      candidates = candidates.filter((l) => listingMatchesSize(l, tokens));
    }
  }
  diag.stages.afterSizeFilter = candidates.length;
  diag.samples = candidates.slice(0, 8).map(
    (l) => `[${l.source}] ${l.title.slice(0, 60)} | méret: ${l.sizeLabel ?? "?"} | ${l.priceLabel}`
  );

  if (candidates.length === 0) {
    await markChecked();
    return { newCount: 0, diag };
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
      // Notifications must stay precise: only the confirmed matches count,
      // the rejected "similar" ones are discarded here.
      ({ kept: verified } = await verifyListingsAgainstImage(
        originalImage,
        candidates,
        {
          brand: w.search_brand ?? undefined,
          model: w.search_model ?? undefined,
          color: w.search_color ?? undefined,
          itemType: w.search_item_type ?? undefined,
        },
        // Watcher cron always runs strict mode — false positives are much
        // worse here than in the on-scan flow because the user can't see
        // the photo side-by-side, they just trust the notification.
        { strict: true, model: "claude-haiku-4-5" }
      ));
    } catch (err) {
      console.warn(`[cron] verify failed for ${w.id}, using unverified:`, err);
    }
  }

  diag.stages.visuallyVerified = verified.length;
  // Keep the pre-verify samples too so it's visible WHAT the verifier saw.
  diag.samples = [
    ...diag.samples.map((x) => `JELÖLT: ${x}`),
    ...verified.slice(0, 5).map((l) => `ELFOGADVA: [${l.source}] ${l.title.slice(0, 60)}`),
  ];

  if (verified.length === 0) {
    await markChecked();
    return { newCount: 0, diag };
  }

  if (dry) {
    // Diagnostics only — no notification, no baseline mutation.
    return { newCount: verified.length, diag };
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

  return { newCount: verified.length, diag };
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
