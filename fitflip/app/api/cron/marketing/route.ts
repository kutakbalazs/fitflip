import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMarketingEmail } from "@/lib/email";
import { welcomeEmail, reengagementEmail } from "@/lib/emailTemplates";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Days of inactivity before a subscriber gets a nudge. */
const REENGAGE_AFTER_DAYS = 14;
/** Ceiling per run, so a mistake can't turn into a mass mailing. */
const MAX_PER_RUN = 50;

type Row = {
  id: string;
  marketing_consent: boolean | null;
  marketing_consent_at: string | null;
  welcome_email_sent_at: string | null;
  reengagement_email_sent_at: string | null;
  last_scan_date: string | null;
};

/**
 * Newsletter dispatch.
 *
 * Two things it deliberately does NOT do:
 *
 *  - it never selects anyone without `marketing_consent = true`, so an
 *    unsubscribe takes effect on the very next run with no suppression list
 *    to keep in sync;
 *  - it records what it sent, so a re-run (or a retry after a timeout) can't
 *    mail the same person twice.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ?dry=1 reports who would be mailed without sending anything.
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  const admin = createAdminClient();

  // Consent is the filter, always.
  const { data: rows, error } = await admin
    .from("profiles")
    .select(
      "id, marketing_consent, marketing_consent_at, welcome_email_sent_at, reengagement_email_sent_at, last_scan_date"
    )
    .eq("marketing_consent", true)
    .limit(500)
    .returns<Row[]>();

  if (error) {
    console.error("[cron/marketing] query failed:", error.message);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const subscribers = rows ?? [];
  if (subscribers.length === 0) {
    return NextResponse.json({ subscribers: 0, welcome: 0, reengagement: 0 });
  }

  // Emails and language live on the auth user, not the profile.
  const { data: userList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const info = new Map<string, { email: string; hu: boolean }>();
  for (const u of userList?.users ?? []) {
    if (!u.email) continue;
    const lang = (u.user_metadata as { lang?: string } | null)?.lang;
    info.set(u.id, { email: u.email, hu: lang !== "en" });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - REENGAGE_AFTER_DAYS);

  const welcome: Row[] = [];
  const reengage: Row[] = [];
  for (const r of subscribers) {
    if (!info.has(r.id)) continue;
    if (!r.welcome_email_sent_at) {
      welcome.push(r);
      continue; // never both in the same run
    }
    if (r.reengagement_email_sent_at) continue; // nudge is a one-off
    const last = r.last_scan_date ? new Date(r.last_scan_date) : null;
    if (!last || last < cutoff) reengage.push(r);
  }

  if (dry) {
    return NextResponse.json({
      dry: true,
      subscribers: subscribers.length,
      welcome: welcome.length,
      reengagement: reengage.length,
    });
  }

  let sentWelcome = 0;
  let sentReengage = 0;

  const send = async (r: Row, kind: "welcome" | "reengagement") => {
    const who = info.get(r.id);
    if (!who) return;
    const built =
      kind === "welcome"
        ? welcomeEmail(r.id, who.hu)
        : reengagementEmail(r.id, who.hu);

    const res = await sendMarketingEmail({
      to: who.email,
      userId: r.id,
      subject: built.subject,
      html: built.html,
      text: built.text,
    });
    if (!res.ok) return;

    // Stamped only after a confirmed send, so a failure is retried next run
    // rather than silently skipped forever.
    await admin
      .from("profiles")
      .update(
        kind === "welcome"
          ? { welcome_email_sent_at: new Date().toISOString() }
          : { reengagement_email_sent_at: new Date().toISOString() }
      )
      .eq("id", r.id);

    if (kind === "welcome") sentWelcome += 1;
    else sentReengage += 1;
  };

  for (const r of welcome.slice(0, MAX_PER_RUN)) await send(r, "welcome");
  for (const r of reengage.slice(0, MAX_PER_RUN)) await send(r, "reengagement");

  return NextResponse.json({
    subscribers: subscribers.length,
    welcome: sentWelcome,
    reengagement: sentReengage,
  });
}
