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

  // generateLink returns the user (id + metadata) by email without sending an
  // email — we use it purely to look the user up and refresh their language.
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    if (!error && data.user) {
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      if (meta.lang !== normalizedLang) {
        await admin.auth.admin.updateUserById(data.user.id, {
          user_metadata: { ...meta, lang: normalizedLang },
        });
      }
    }
  } catch {
    // Ignore lookup/update failures — still send the reset below.
  }

  // Send the actual recovery email (Supabase renders our edited template with
  // the now-current language and the in-app /auth/confirm link).
  await admin.auth.resetPasswordForEmail(email);

  return NextResponse.json({ ok: true });
}
