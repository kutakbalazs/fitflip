import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/push/notify";

export const dynamic = "force-dynamic";

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
