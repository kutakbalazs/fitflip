import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/push/notify";
import { wardrobeTotal, formatHuf, type ValuedScan } from "@/lib/wardrobe";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Below this, "your wardrobe is worth X" isn't a statement worth a push. */
const MIN_ITEMS = 3;
/** Ignore drift smaller than this; a 1% wobble is noise, not news. */
const MIN_CHANGE_PCT = 5;

type Snapshot = { total_huf: number; item_count: number; taken_on: string };

/**
 * Monthly wardrobe digest.
 *
 * Only users who turned push on are considered — the push_tokens table is
 * the opt-in, so this can't reach anyone who didn't ask for it.
 *
 * It takes a snapshot every run regardless of whether it notifies, because
 * the history is what makes next month's comparison possible (and what the
 * wardrobe widget will read later). Notifying and recording are separate
 * decisions.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const admin = createAdminClient();

  // Distinct users with at least one registered device.
  const { data: tokenRows, error: tokenErr } = await admin
    .from("push_tokens")
    .select("user_id")
    .returns<{ user_id: string }[]>();
  if (tokenErr) {
    console.error("[cron/wardrobe] token query failed:", tokenErr.message);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const userIds = Array.from(new Set((tokenRows ?? []).map((r) => r.user_id)));
  if (userIds.length === 0) {
    return NextResponse.json({ users: 0, notified: 0 });
  }

  const today = new Date().toISOString().slice(0, 10);
  let notified = 0;
  const report: { userId: string; totalHuf: number; changePct: number | null; sent: boolean }[] =
    [];

  for (const userId of userIds) {
    const { data: scans } = await admin
      .from("scans")
      .select("recognized, estimated_value_min_huf, estimated_value_max_huf")
      .eq("user_id", userId)
      .returns<ValuedScan[]>();

    const { totalHuf, itemCount } = wardrobeTotal(scans ?? []);

    // Previous snapshot, if any — the most recent one that isn't today's.
    const { data: prevRows } = await admin
      .from("wardrobe_snapshots")
      .select("total_huf, item_count, taken_on")
      .eq("user_id", userId)
      .lt("taken_on", today)
      .order("taken_on", { ascending: false })
      .limit(1)
      .returns<Snapshot[]>();
    const prev = prevRows?.[0] ?? null;

    if (!dry) {
      await admin.from("wardrobe_snapshots").upsert(
        { user_id: userId, taken_on: today, total_huf: totalHuf, item_count: itemCount },
        { onConflict: "user_id,taken_on" }
      );
    }

    const changePct =
      prev && prev.total_huf > 0
        ? Math.round(((totalHuf - prev.total_huf) / prev.total_huf) * 100)
        : null;

    const message = buildMessage({ totalHuf, itemCount, changePct, isFirst: !prev });
    report.push({ userId, totalHuf, changePct, sent: message !== null && !dry });

    if (!message || dry) continue;

    const { data } = await admin.auth.admin.getUserById(userId);
    const hu = (data?.user?.user_metadata as { lang?: string } | null)?.lang !== "en";

    await notifyUser({
      userId,
      title: hu ? "A szekrényed" : "Your wardrobe",
      body: hu ? message.hu : message.en,
      data: { type: "wardrobe", url: "/" },
    });
    notified += 1;
  }

  return NextResponse.json({ dry, users: userIds.length, notified, report });
}

/**
 * What, if anything, is worth saying this month.
 *
 * Returns null to stay silent — the common case, and the right one. A
 * monthly notification that says "nothing changed" is the kind of thing
 * people turn notifications off over.
 *
 * A decline is recorded in the snapshot but not pushed. This isn't hiding
 * it: the wardrobe figure in the app always shows the truth, and the user
 * can look any time. It's a decision about when it's worth interrupting
 * someone, and "your things are worth less than last month" isn't news
 * anyone asked to be woken up for.
 */
function buildMessage(opts: {
  totalHuf: number;
  itemCount: number;
  changePct: number | null;
  isFirst: boolean;
}): { hu: string; en: string } | null {
  const { totalHuf, itemCount, changePct, isFirst } = opts;
  if (itemCount < MIN_ITEMS || totalHuf <= 0) return null;

  const value = formatHuf(totalHuf);

  if (isFirst) {
    return {
      hu: `A ${itemCount} feltérképezett darabod jelenleg ${value} értékű.`,
      en: `The ${itemCount} pieces you've scanned are currently worth ${value}.`,
    };
  }

  if (changePct === null || changePct < MIN_CHANGE_PCT) return null;

  return {
    hu: `A szekrényed értéke ${changePct}%-kal nőtt az elmúlt hónapban — most ${value}.`,
    en: `Your wardrobe is up ${changePct}% over the past month — now ${value}.`,
  };
}
