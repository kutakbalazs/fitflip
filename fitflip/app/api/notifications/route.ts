import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("watcher_notifications")
    .select("id, watcher_id, listings, scan_brand, scan_model, target_price_huf, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const items = data ?? [];
  const unreadCount = items.filter((n) => !n.read_at).length;
  return NextResponse.json({ notifications: items, unreadCount });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";

  const admin = createAdminClient();
  if (action === "delete_all") {
    await admin.from("watcher_notifications").delete().eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }
  if (action === "mark_all_read") {
    await admin
      .from("watcher_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
