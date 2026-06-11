import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LegalFooter from "@/components/LegalFooter";
import HistoryList, { type HistoryScan } from "@/components/HistoryList";

export const dynamic = "force-dynamic";

type ScanRow = Omit<HistoryScan, "imageUrl">;

export default async function HistoryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullCols = "id, created_at, recognized, brand, model, era, condition, estimated_value_min_huf, estimated_value_max_huf, description, confidence, image_path, defects, condition_discount_pct";
  const legacyCols = "id, created_at, recognized, brand, model, era, condition, estimated_value_min_huf, estimated_value_max_huf, description, confidence, image_path";

  let scans: unknown[] | null = null;
  const primary = await supabase
    .from("scans")
    .select(fullCols)
    .order("created_at", { ascending: false })
    .limit(100);
  if (primary.data) {
    scans = primary.data;
  } else {
    const legacy = await supabase
      .from("scans")
      .select(legacyCols)
      .order("created_at", { ascending: false })
      .limit(100);
    scans = legacy.data;
  }

  const items = (scans ?? []) as ScanRow[];

  const admin = createAdminClient();
  const itemsWithUrls: HistoryScan[] = await Promise.all(
    items.map(async (scan) => {
      if (!scan.image_path) return { ...scan, imageUrl: null };
      const { data, error } = await admin.storage
        .from("scan-images")
        .createSignedUrl(scan.image_path, 3600);
      if (error || !data?.signedUrl) return { ...scan, imageUrl: null };
      return { ...scan, imageUrl: data.signedUrl };
    })
  );

  return (
    <>
      <HistoryList items={itemsWithUrls} />
      <footer className="px-6 py-6 border-t border-ink-100 dark:border-ink-700">
        <LegalFooter />
      </footer>
    </>
  );
}
