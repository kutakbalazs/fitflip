import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/marketing";

export const dynamic = "force-dynamic";

/**
 * One-click unsubscribe. Deliberately requires NO sign-in: someone who no
 * longer wants our email must not have to remember a password to stop it.
 *
 * The signed token is the authorisation, and it only ever turns marketing
 * email off — it cannot read anything, change anything else, or re-subscribe
 * a person.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof (body as { token?: unknown })?.token === "string"
    ? (body as { token: string }).token
    : "";

  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ marketing_consent: false, marketing_consent_at: null })
      .eq("id", userId);
    if (error) {
      console.error("[unsubscribe] update failed:", error.message);
      return NextResponse.json({ error: "failed" }, { status: 500 });
    }
  } catch (err) {
    console.error("[unsubscribe] threw:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
