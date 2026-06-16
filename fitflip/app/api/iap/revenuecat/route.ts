import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchProEntitlement } from "@/lib/revenuecat";

export const dynamic = "force-dynamic";

// RevenueCat webhook. Configured in the RevenueCat dashboard with an
// Authorization header value matching RC_WEBHOOK_AUTH. On any subscriber event
// (purchase, renewal, cancellation, expiration, billing issue) we re-read the
// authoritative entitlement for that user and sync profiles.is_premium. Doing a
// fresh lookup instead of trusting the event payload keeps the logic uniform
// across all event types.
export async function POST(req: NextRequest) {
  const expected = process.env.RC_WEBHOOK_AUTH;
  const auth = req.headers.get("authorization") ?? "";
  if (!expected || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { event?: { app_user_id?: string; aliases?: string[]; type?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const event = body.event;
  if (!event) return NextResponse.json({ received: true });

  // Our app user id is the Supabase user UUID. Anonymous RevenueCat ids
  // ($RCAnonymousID:...) can't be mapped to a profile, so prefer a UUID-shaped
  // id from app_user_id or its aliases.
  const candidates = [event.app_user_id, ...(event.aliases ?? [])].filter(
    (x): x is string => typeof x === "string"
  );
  const uuid = candidates.find((x) => /^[0-9a-f-]{36}$/i.test(x));
  if (!uuid) return NextResponse.json({ received: true, skipped: "no_uuid" });

  const ent = await fetchProEntitlement(uuid);
  if (!ent) {
    // Lookup failed — let RevenueCat retry by returning a non-2xx.
    return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
  }

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      is_premium: ent.active,
      subscription_status: ent.active ? "active" : "expired",
    })
    .eq("id", uuid);

  return NextResponse.json({ received: true, isPremium: ent.active });
}
