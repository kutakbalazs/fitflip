import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ScanDetail, { type ScanDetailData } from "@/components/ScanDetail";

export const dynamic = "force-dynamic";

export default async function ScanDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS ensures the user only sees their own scans. select("*") is robust to
  // older schemas missing optional columns.
  const { data: scan } = await supabase
    .from("scans")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!scan) notFound();

  // Needed so the price-watcher widget can show the create option (vs the
  // premium upsell) when a scan is reopened from history.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .maybeSingle();
  const isPremium = profile?.is_premium === true;

  let imageUrl: string | null = null;
  if (scan.image_path) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage
      .from("scan-images")
      .createSignedUrl(scan.image_path, 3600);
    imageUrl = signed?.signedUrl ?? null;
  }

  const data: ScanDetailData = {
    id: scan.id,
    recognized: scan.recognized ?? true,
    itemType: scan.item_type ?? null,
    brand: scan.brand ?? null,
    model: scan.model ?? null,
    color: scan.color ?? null,
    era: scan.era ?? null,
    condition: scan.condition ?? null,
    estimatedValueMinHuf: scan.estimated_value_min_huf ?? null,
    estimatedValueMaxHuf: scan.estimated_value_max_huf ?? null,
    description: scan.description ?? null,
    searchQuery: scan.search_query ?? null,
    sellingTip: scan.selling_tip ?? null,
    confidence: scan.confidence ?? null,
    defects: Array.isArray(scan.defects) ? scan.defects : [],
    conditionDiscountPct: scan.condition_discount_pct ?? null,
    isDefinitelyNew: scan.is_definitely_new ?? null,
    story: scan.story ?? null,
    hypeScore: scan.hype_score ?? null,
    hypeLabel: scan.hype_label ?? null,
    imageUrl,
  };

  return <ScanDetail data={data} isPremium={isPremium} />;
}
