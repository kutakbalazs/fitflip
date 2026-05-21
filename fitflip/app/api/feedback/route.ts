import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const SUPPORT_INBOX = "support.fitflip@gmail.com";
const FROM_ADDRESS = "FitFlip Feedback <noreply@fitflip.app>";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message || message.length < 3) {
      return NextResponse.json({ error: "message_too_short" }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: "message_too_long" }, { status: 400 });
    }

    const meta = {
      url: typeof body?.url === "string" ? body.url.slice(0, 300) : "",
      userAgent: typeof body?.userAgent === "string" ? body.userAgent.slice(0, 300) : "",
      version: typeof body?.version === "string" ? body.version.slice(0, 60) : "",
    };

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[/api/feedback] RESEND_API_KEY not set");
      return NextResponse.json({ error: "email_not_configured" }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const subject = `[FitFlip feedback] ${user.email}`;
    const html = `
      <p><strong>From:</strong> ${escapeHtml(user.email)}</p>
      <p><strong>User ID:</strong> ${escapeHtml(user.id)}</p>
      <p><strong>URL:</strong> ${escapeHtml(meta.url)}</p>
      <p><strong>Version:</strong> ${escapeHtml(meta.version)}</p>
      <p><strong>User agent:</strong> ${escapeHtml(meta.userAgent)}</p>
      <hr />
      <pre style="white-space: pre-wrap; font-family: -apple-system, sans-serif;">${escapeHtml(message)}</pre>
    `;

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: SUPPORT_INBOX,
      replyTo: user.email,
      subject,
      html,
    });

    if (error) {
      console.error("[/api/feedback] resend error:", error);
      return NextResponse.json({ error: "send_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/feedback] error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
