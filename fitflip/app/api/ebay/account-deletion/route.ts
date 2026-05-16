import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

// eBay calls this endpoint two ways:
//
// 1. GET ?challenge_code=… — validation handshake. We must echo back
//    sha256(challenge_code + verification_token + endpoint_url) so eBay
//    knows we own the endpoint.
//
// 2. POST { notification: { … } } — actual account-deletion event.
//    FitFlip doesn't store any eBay-user-scoped data (we only query
//    public listings from the application token), so we have nothing
//    to remove. We just acknowledge with 200.

export async function GET(req: NextRequest) {
  const challengeCode = req.nextUrl.searchParams.get("challenge_code");
  // Trim defensively — copy-paste into Vercel env vars sometimes drags in a
  // trailing newline that silently breaks the hash comparison with eBay.
  const verificationToken = (process.env.EBAY_VERIFICATION_TOKEN ?? "").trim();
  const endpointUrl = (process.env.EBAY_ENDPOINT_URL ?? "").trim();

  if (!challengeCode) {
    return NextResponse.json({ error: "missing_challenge_code" }, { status: 400 });
  }
  if (!verificationToken || !endpointUrl) {
    console.error("[ebay-deletion] EBAY_VERIFICATION_TOKEN or EBAY_ENDPOINT_URL not set");
    return NextResponse.json({ error: "server_not_configured" }, { status: 500 });
  }

  const challengeResponse = createHash("sha256")
    .update(challengeCode)
    .update(verificationToken)
    .update(endpointUrl)
    .digest("hex");

  // Lightweight debug signal so eBay save failures can be diagnosed without
  // leaking the token: we expose the lengths and the first/last char of each
  // value, never the values themselves.
  console.log(
    `[ebay-deletion] challenge="${challengeCode.length}ch" token="${verificationToken.length}ch (${verificationToken[0]}…${verificationToken[verificationToken.length - 1]})" url="${endpointUrl}"`
  );

  return NextResponse.json({ challengeResponse });
}

export async function POST(req: NextRequest) {
  // Acknowledge the notification. We don't persist any eBay user data,
  // so there's nothing to delete — just log for traceability.
  try {
    const body = await req.json().catch(() => null);
    const userId =
      (body as { notification?: { data?: { userId?: string } } } | null)
        ?.notification?.data?.userId;
    if (userId) {
      console.log("[ebay-deletion] received notification for userId:", userId);
    }
  } catch {
    // Even if parsing fails, eBay expects a 200 to consider it acknowledged.
  }
  return NextResponse.json({ acknowledged: true });
}
