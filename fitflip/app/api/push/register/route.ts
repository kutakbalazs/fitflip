import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Device tokens are long but not unbounded — refuse anything absurd. */
const MAX_TOKEN_LENGTH = 512;

/**
 * Register this device for push, or drop it.
 *
 * The token is the primary key rather than (user, device): the same phone can
 * be signed into a different account tomorrow, and an upsert on the token
 * moves it rather than leaving the old user able to push to someone else's
 * phone.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const token = (body as { token?: unknown })?.token;
  const platform = (body as { platform?: unknown })?.platform;

  if (typeof token !== "string" || !token || token.length > MAX_TOKEN_LENGTH) {
    return NextResponse.json({ error: "bad_token" }, { status: 400 });
  }
  if (platform !== "ios" && platform !== "android") {
    return NextResponse.json({ error: "bad_platform" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_tokens").upsert(
    {
      token,
      user_id: user.id,
      platform,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );

  if (error) {
    console.error("[push/register] upsert failed:", error.message);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Turn push off for this device.
 *
 * Deleting the row rather than flagging it is deliberate: an off switch that
 * leaves the address behind is the kind of thing that eventually sends a
 * notification to someone who asked not to get one.
 */
export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const token = (body as { token?: unknown })?.token;

  const admin = createAdminClient();
  const query = admin.from("push_tokens").delete().eq("user_id", user.id);
  // With a token, drop just this device; without one, drop all of them — the
  // account-settings switch has no token to offer if permission was already
  // revoked at the OS level.
  const { error } =
    typeof token === "string" && token ? await query.eq("token", token) : await query;

  if (error) {
    console.error("[push/register] delete failed:", error.message);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Does this account have any device registered? Drives the settings switch. */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { count } = await admin
    .from("push_tokens")
    .select("token", { count: "exact", head: true })
    .eq("user_id", user.id);

  return NextResponse.json({ enabled: (count ?? 0) > 0 });
}
