import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush, pushEnabled } from "@/lib/push/fcm";
import { sendApns, apnsEnabled } from "@/lib/push/apns";

type TokenRow = { token: string; platform: "ios" | "android" };

/**
 * Send one notification to every device a user has registered.
 *
 * Having a token IS the opt-in: the app only registers one after the user
 * turns notifications on, and turning them off deletes the row. So there is
 * no separate preference flag to keep in sync with the OS-level permission —
 * one source of truth, and a user who revokes permission in Settings stops
 * receiving mail the moment the platform reports the token dead.
 *
 * iOS goes to APNs and Android to FCM; `platform` on the row decides. A
 * platform whose credentials aren't configured is skipped rather than
 * retried, so the two can be switched on independently.
 */
export async function notifyUser(opts: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ sent: number; removed: number }> {
  if (!pushEnabled() && !apnsEnabled()) return { sent: 0, removed: 0 };

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("push_tokens")
    .select("token, platform")
    .eq("user_id", opts.userId)
    .returns<TokenRow[]>();

  const tokens = rows ?? [];
  if (tokens.length === 0) return { sent: 0, removed: 0 };

  let sent = 0;
  const stale: string[] = [];

  for (const row of tokens) {
    const usable = row.platform === "ios" ? apnsEnabled() : pushEnabled();
    if (!usable) continue;

    const res =
      row.platform === "ios"
        ? await sendApns({ ...opts, token: row.token })
        : await sendPush({ ...opts, token: row.token });

    if (res.ok) sent += 1;
    else if (res.stale) stale.push(row.token);
  }

  if (stale.length > 0) {
    await admin.from("push_tokens").delete().in("token", stale);
  }

  // Best effort by design: a failed push must never fail the thing that
  // triggered it. The in-app notification row is already written, so the
  // user still sees the hit when they open the app.
  return { sent, removed: stale.length };
}
