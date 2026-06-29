import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Delete one of the signed-in user's scans (swipe-to-delete in history).
// Uses the service-role client but always scopes by user_id so a user can
// only ever delete their own row (no IDOR), then best-effort removes the
// stored image so nothing is orphaned in storage.
export async function DELETE(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Look up the image path (scoped to the user) so we can clean up storage.
  const { data: scan } = await admin
    .from("scans")
    .select("image_path, user_id")
    .eq("id", ctx.params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!scan) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await admin
    .from("scans")
    .delete()
    .eq("id", ctx.params.id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  if (scan.image_path) {
    try {
      await admin.storage.from("scan-images").remove([scan.image_path]);
    } catch {
      // Orphaned image is harmless — ignore.
    }
  }

  return NextResponse.json({ ok: true });
}
