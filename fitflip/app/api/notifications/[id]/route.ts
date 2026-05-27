import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  await admin
    .from("watcher_notifications")
    .delete()
    .eq("id", ctx.params.id)
    .eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(_req: NextRequest, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  await admin
    .from("watcher_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", ctx.params.id)
    .eq("user_id", user.id)
    .is("read_at", null);
  return NextResponse.json({ ok: true });
}
