import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ScanRow = {
  id: string;
  recognized: boolean | null;
  brand: string | null;
  model: string | null;
  item_type: string | null;
  color?: string | null;
  estimated_value_min_huf: number | null;
  estimated_value_max_huf: number | null;
  image_path: string | null;
  created_at: string;
};

type RecentItem = {
  id: string;
  brand: string | null;
  model: string | null;
  itemType: string | null;
  color: string | null;
  valueHuf: number | null;
  imageUrl: string | null;
};

// Midpoint of the estimated range; falls back to whichever bound exists.
function scanValue(s: ScanRow): number | null {
  const min = typeof s.estimated_value_min_huf === "number" ? s.estimated_value_min_huf : null;
  const max = typeof s.estimated_value_max_huf === "number" ? s.estimated_value_max_huf : null;
  if (min !== null && max !== null) return Math.round((min + max) / 2);
  return min ?? max ?? null;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // The color column is a recent addition — fall back to a column list
  // without it when the migration hasn't run yet.
  const fullCols =
    "id, recognized, brand, model, item_type, color, estimated_value_min_huf, estimated_value_max_huf, image_path, created_at";
  const legacyCols =
    "id, recognized, brand, model, item_type, estimated_value_min_huf, estimated_value_max_huf, image_path, created_at";

  // Page through ALL scans (1000 per batch) so the total isn't capped at an
  // arbitrary row limit for heavy users.
  const PAGE = 1000;
  const rows: ScanRow[] = [];
  let cols = fullCols;
  for (let from = 0; ; from += PAGE) {
    let { data, error } = await supabase
      .from("scans")
      .select(cols)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error && cols === fullCols) {
      // Retry this batch without the color column (older schema).
      cols = legacyCols;
      ({ data, error } = await supabase
        .from("scans")
        .select(cols)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1));
    }
    if (error) {
      console.error("[/api/scan-stats] error:", error);
      return NextResponse.json({ count: 0, totalValueHuf: 0, recent: [] });
    }
    const batch = (data ?? []) as unknown as ScanRow[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }

  const recognized = rows.filter((r) => r.recognized !== false);

  const count = recognized.length;
  const totalValueHuf = recognized.reduce((sum, r) => sum + (scanValue(r) ?? 0), 0);

  // Recent 4 recognized items with a signed image URL for the dashboard.
  const admin = createAdminClient();
  const recentRows = recognized.slice(0, 4);
  const recent: RecentItem[] = await Promise.all(
    recentRows.map(async (r) => {
      let imageUrl: string | null = null;
      if (r.image_path) {
        const { data: signed } = await admin.storage
          .from("scan-images")
          .createSignedUrl(r.image_path, 3600);
        imageUrl = signed?.signedUrl ?? null;
      }
      return {
        id: r.id,
        brand: r.brand,
        model: r.model,
        itemType: r.item_type,
        color: r.color ?? null,
        valueHuf: scanValue(r),
        imageUrl,
      };
    })
  );

  return NextResponse.json({ count, totalValueHuf, recent });
}
