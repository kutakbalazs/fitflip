import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const confirmEmail = typeof body?.confirmEmail === "string" ? body.confirmEmail.trim() : "";
    if (confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "email_mismatch" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Cancel active Stripe subscriptions (if any) so we stop billing.
    //    Accounting records on Stripe's side are retained by Stripe per
    //    its own retention; we just stop future charges.
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.stripe_customer_id) {
      try {
        const stripe = getStripe();
        const subs = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: "active",
          limit: 10,
        });
        for (const sub of subs.data) {
          await stripe.subscriptions.cancel(sub.id);
        }
      } catch (err) {
        console.warn("[/api/account/delete] Stripe cancel failed:", err);
        // Don't block deletion on Stripe failure — the user still wants out.
      }
    }

    // 2. Delete all scan images from storage. Paginate: list() returns at
    //    most 1000 files per call, so loop until the folder is empty.
    try {
      for (;;) {
        const { data: files } = await admin.storage
          .from("scan-images")
          .list(user.id, { limit: 1000 });
        if (!files || files.length === 0) break;
        const paths = files.map((f) => `${user.id}/${f.name}`);
        await admin.storage.from("scan-images").remove(paths);
        if (files.length < 1000) break;
      }
    } catch (err) {
      console.warn("[/api/account/delete] storage cleanup failed:", err);
    }

    // 3. Delete every user-owned row. Watchers, notifications and feedback
    //    must go too — /delete-account promises full deletion (GDPR).
    await admin.from("watcher_notifications").delete().eq("user_id", user.id);
    await admin.from("price_watchers").delete().eq("user_id", user.id);
    await admin.from("feedback").delete().eq("user_id", user.id);
    await admin.from("scans").delete().eq("user_id", user.id);

    // 4. Delete profile row.
    await admin.from("profiles").delete().eq("id", user.id);

    // 5. Delete the auth user. This invalidates the session.
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      console.error("[/api/account/delete] auth delete failed:", deleteUserError);
      return NextResponse.json({ error: "auth_delete_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/account/delete] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
