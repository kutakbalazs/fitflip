import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.withdrawalConsent !== true) {
      return NextResponse.json({ error: "consent_required" }, { status: 400 });
    }
    const consentAt = new Date().toISOString();

    // Plan: monthly (default) or yearly.
    const plan: "monthly" | "yearly" = body?.plan === "yearly" ? "yearly" : "monthly";
    const priceId =
      plan === "yearly"
        ? process.env.STRIPE_PRICE_ID_YEARLY
        : process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: "price id not set for plan " + plan }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const origin = req.headers.get("origin") || new URL(req.url).origin;
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?upgraded=1`,
      cancel_url: `${origin}/?upgrade=cancel`,
      client_reference_id: user.id,
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email }),
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      customer_update: profile?.stripe_customer_id
        ? { address: "auto", name: "auto" }
        : undefined,
      billing_address_collection: "required",
      metadata: {
        user_id: user.id,
        plan,
        withdrawal_consent_at: consentAt,
        withdrawal_consent_basis: "HU 45/2014 (II.26.) Korm. rendelet 29. § (1) m)",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
          withdrawal_consent_at: consentAt,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "No session URL" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[/api/stripe/checkout] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
