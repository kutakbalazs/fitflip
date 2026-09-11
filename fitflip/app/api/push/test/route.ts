import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/push/notify";
import { fcmCheck } from "@/lib/push/fcm";
import { apnsCheck } from "@/lib/push/apns";

export const dynamic = "force-dynamic";

/**
 * Is push actually wired up, from the signed-in user's point of view?
 *
 * Returns no secrets — only whether each credential can be used and how many
 * devices this account has registered. Signed in only, and scoped to the
 * caller, so it tells you nothing you couldn't learn by tapping the switch.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: devices } = await admin
    .from("push_tokens")
    .select("platform, created_at")
    .eq("user_id", user.id)
    .returns<{ platform: string; created_at: string }[]>();

  return NextResponse.json({
    fcm: await fcmCheck(),
    apns: apnsCheck(),
    myDevices: devices ?? [],
  });
}

/**
 * Send a test notification to your own devices.
 *
 * Only ever to the caller — there is no user id in the request, so this
 * cannot be pointed at anyone else. It exists because the alternative way to
 * check the whole chain (key, token, certificate environment) is to wait for
 * a watcher to find something, and a misconfigured APNs environment is
 * otherwise silent.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const lang = (user.user_metadata as { lang?: string } | null)?.lang;
  const hu = lang !== "en";

  const result = await notifyUser({
    userId: user.id,
    title: "FitFlip",
    body: hu
      ? "Teszt értesítés — az értesítések működnek. 👟"
      : "Test notification — notifications are working. 👟",
    data: { type: "test", url: "/notifications" },
  });

  return NextResponse.json(result);
}
