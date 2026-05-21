import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message || message.length < 3) {
      return NextResponse.json({ error: "message_too_short" }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: "message_too_long" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("feedback").insert({
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      message,
      url: typeof body?.url === "string" ? body.url.slice(0, 500) : null,
      user_agent: typeof body?.userAgent === "string" ? body.userAgent.slice(0, 500) : null,
      app_version: typeof body?.version === "string" ? body.version.slice(0, 60) : null,
    });

    if (error) {
      console.error("[/api/feedback] insert error:", error);
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/feedback] error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
