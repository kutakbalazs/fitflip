import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Password-reset trigger. Supabase renders the recovery email from the user's
// stored metadata (.Data.lang), NOT from any request data — so a user who set
// the app to English but whose account was created in Hungarian would still
// get a Hungarian email. To make the email match the language the app is
// currently in, we refresh the stored `lang` (service role) *before* the email
// is sent. Always returns 200 so we never leak whether an email is registered.
export async function POST(request: Request) {
  let email: unknown;
  let lang: unknown;
  try {
    ({ email, lang } = await request.json());
  } catch {
    return NextResponse.json({ ok: true });
  }
  if (typeof email !== "string" || !email) {
    return NextResponse.json({ ok: true });
  }
  const normalizedLang = lang === "en" ? "en" : "hu";

  const admin = createAdminClient();

  // Refresh the stored language via a side-effect-free SQL function. NOTE: we
  // must NOT use admin.generateLink here — it stamps recovery_sent_at, which
  // would make the resetPasswordForEmail call below hit the per-email rate
  // limit and silently send nothing. The RPC only touches user metadata.
  try {
    await admin.rpc("set_user_lang", { p_email: email, p_lang: normalizedLang });
  } catch {
    // Function may not exist yet / email unknown — still send the reset below
    // (in the previously stored language).
  }

  // Send the actual recovery email (Supabase renders our edited template with
  // the now-current language and the in-app /auth/confirm link).
  await admin.auth.resetPasswordForEmail(email);

  return NextResponse.json({ ok: true });
}
