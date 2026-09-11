import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMarketingEmail } from "@/lib/email";
import { campaignEmail } from "@/lib/emailTemplates";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Ceiling per send, so a mistake here can't become a mass mailing. */
const MAX_RECIPIENTS = 500;

type Row = { id: string };

/**
 * One-off newsletter to everyone who opted in.
 *
 * The automated lifecycle emails are fixed templates that fire on their own;
 * this is the other half — the occasional piece you actually write (market
 * news, a tip, a new feature).
 *
 * It sends from the same consent source and with the same unsubscribe link as
 * everything else, so someone who opted out can never be reached by a
 * campaign. That is the whole reason this lives here rather than in a
 * separate campaign tool with its own copy of the list: two lists drift, and
 * the drift shows up as mail to someone who unsubscribed.
 *
 * Guards:
 *  - protected by CRON_SECRET (the same server secret the cron uses)
 *  - dry run unless `confirm: true` is passed explicitly
 *  - a campaign id is required and recorded, so re-running the same campaign
 *    is refused rather than mailing everyone twice
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const {
    id,
    confirm,
    subjectHu,
    subjectEn,
    headingHu,
    headingEn,
    bodyHu,
    bodyEn,
    ctaLabelHu,
    ctaLabelEn,
    ctaHref,
  } = (body ?? {}) as Record<string, unknown>;

  const campaignId = typeof id === "string" ? id.trim().slice(0, 80) : "";
  if (!campaignId) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }
  if (typeof subjectHu !== "string" || !subjectHu.trim()) {
    return NextResponse.json({ error: "missing_subject" }, { status: 400 });
  }
  const paragraphsHu = Array.isArray(bodyHu) ? (bodyHu as string[]) : [];
  const paragraphsEn = Array.isArray(bodyEn) ? (bodyEn as string[]) : paragraphsHu;
  if (paragraphsHu.length === 0) {
    return NextResponse.json({ error: "missing_body" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Already sent? Refuse rather than double-mail the list.
  const { data: existing } = await admin
    .from("email_campaigns")
    .select("id, sent_at, recipient_count")
    .eq("id", campaignId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "already_sent", sentAt: existing.sent_at, recipients: existing.recipient_count },
      { status: 409 }
    );
  }

  const { data: rows, error } = await admin
    .from("profiles")
    .select("id")
    .eq("marketing_consent", true)
    .limit(MAX_RECIPIENTS)
    .returns<Row[]>();
  if (error) {
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const info = new Map<string, { email: string; hu: boolean }>();
  for (const u of userList?.users ?? []) {
    if (!u.email) continue;
    const lang = (u.user_metadata as { lang?: string } | null)?.lang;
    info.set(u.id, { email: u.email, hu: lang !== "en" });
  }

  const recipients = (rows ?? []).filter((r) => info.has(r.id));

  // Nothing goes out without an explicit confirm — the default is a preview.
  if (confirm !== true) {
    return NextResponse.json({
      dryRun: true,
      campaignId,
      wouldSend: recipients.length,
      note: "Pass confirm: true to actually send.",
    });
  }

  let sent = 0;
  for (const r of recipients) {
    const who = info.get(r.id);
    if (!who) continue;
    const built = campaignEmail(r.id, who.hu, {
      subject: who.hu
        ? (subjectHu as string)
        : typeof subjectEn === "string" && subjectEn.trim()
          ? subjectEn
          : (subjectHu as string),
      heading: who.hu
        ? typeof headingHu === "string"
          ? headingHu
          : (subjectHu as string)
        : typeof headingEn === "string"
          ? headingEn
          : (subjectHu as string),
      paragraphs: who.hu ? paragraphsHu : paragraphsEn,
      ctaLabel: who.hu
        ? typeof ctaLabelHu === "string"
          ? ctaLabelHu
          : "Irány a FitFlip"
        : typeof ctaLabelEn === "string"
          ? ctaLabelEn
          : "Open FitFlip",
      ctaHref: typeof ctaHref === "string" && ctaHref ? ctaHref : "https://www.fitflip.app",
    });

    const res = await sendMarketingEmail({
      to: who.email,
      userId: r.id,
      subject: built.subject,
      html: built.html,
      text: built.text,
    });
    if (res.ok) sent += 1;
  }

  // Recorded after the run, so the id is burned and can't be reused.
  await admin.from("email_campaigns").insert({
    id: campaignId,
    subject: subjectHu as string,
    recipient_count: sent,
  });

  return NextResponse.json({ campaignId, recipients: recipients.length, sent });
}
