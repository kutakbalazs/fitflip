import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchProEntitlement, revenueCatConfigured } from "@/lib/revenuecat";

export const dynamic = "force-dynamic";

// Called by the native client right after a successful in-app purchase. We do
// NOT trust the client's claim — we re-check the entitlement against the
// RevenueCat REST API (keyed by the Supabase user id, which the client set as
// the RevenueCat app user id) and set profiles.is_premium accordingly. This
// gives the user immediate Pro access; the RevenueCat webhook then keeps it in
// sync for renewals and cancellations.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!revenueCatConfigured()) {
    return NextResponse.json({ error: "iap_not_configured" }, { status: 503 });
  }

  const ent = await fetchProEntitlement(user.id);
  if (!ent) {
    return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
  }

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      is_premium: ent.active,
      subscription_status: ent.active ? "active" : "expired",
    })
    .eq("id", user.id);

  return NextResponse.json({ isPremium: ent.active });
}
