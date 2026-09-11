import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Current consent state for the signed-in user. */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("profiles")
    .select("marketing_consent")
    .eq("id", user.id)
    .maybeSingle<{ marketing_consent: boolean | null }>();

  return NextResponse.json({ consent: data?.marketing_consent === true });
}

/**
 * Turn marketing email on or off for the signed-in user.
 *
 * The timestamp is written alongside, because consent has to be evidenced —
 * "they agreed" is a claim, and the date it happened is what backs it up. It
 * is cleared on withdrawal so a stale date can never look like live consent.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const consent = (body as { consent?: unknown })?.consent === true;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      marketing_consent: consent,
      marketing_consent_at: consent ? new Date().toISOString() : null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[marketing-consent] update failed:", error.message);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return NextResponse.json({ consent });
}
