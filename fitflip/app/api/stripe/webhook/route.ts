import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

// Service-role-less admin client using the anon key — but we never set cookies.
// RLS would block direct profile updates, so we bypass with a "no-op cookies" client
// and use a SECURITY DEFINER RPC OR — simpler — call from this trusted route using
// the anon client + service role. To keep things simple here, we use the anon
// client; webhook updates go through a stored procedure or RLS policies that
// allow service-side updates. For now, we rely on a service role key set in env.
function adminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}

async function setPremiumByCustomer(customerId: string, isPremium: boolean, status: string | null, subscriptionId: string | null) {
  const supabase = adminClient();
  await supabase
    .from("profiles")
    .update({
      is_premium: isPremium,
      subscription_status: status,
      ...(subscriptionId !== null ? { stripe_subscription_id: subscriptionId } : {}),
    })
    .eq("stripe_customer_id", customerId);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "signature verification failed";
    console.error("[stripe webhook] verify failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        if (!userId || !customerId) break;

        const supabase = adminClient();
        await supabase
          .from("profiles")
          .update({
            is_premium: true,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
          })
          .eq("id", userId);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const isActive = sub.status === "active" || sub.status === "trialing";
        await setPremiumByCustomer(customerId, isActive, sub.status, sub.id);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        await setPremiumByCustomer(customerId, false, "canceled", sub.id);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          await setPremiumByCustomer(customerId, false, "past_due", null);
        }
        break;
      }
      default:
        // Other events: ignore for now
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
