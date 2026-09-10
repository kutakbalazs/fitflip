import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const ALLOWED = new Set<string>(ANALYTICS_EVENTS);

// Caps that keep a hostile client from bloating the table. Anything larger is
// truncated rather than rejected — a malformed event should still tell us the
// funnel step happened.
const MAX_PROP_KEYS = 12;
const MAX_STRING = 200;

function clean(value: unknown): string | number | boolean | null {
  if (value === null) return null;
  if (typeof value === "boolean" || typeof value === "number") {
    return Number.isFinite(value as number) || typeof value === "boolean"
      ? (value as boolean | number)
      : null;
  }
  if (typeof value === "string") return value.slice(0, MAX_STRING);
  return null;
}

/**
 * Ingest endpoint for first-party product analytics.
 *
 * Privacy: the row holds only what the client sent plus the signed-in user id
 * (resolved server-side from the session cookie). We deliberately do NOT store
 * the IP address or the user agent, so a row cannot be tied back to a device.
 */
export async function POST(request: Request) {
  // Analytics must never break the caller: every failure path still 204s.
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new NextResponse(null, { status: 204 });
    }

    const { event, props, sessionId, platform, appVersion, lang } = body as {
      event?: unknown;
      props?: unknown;
      sessionId?: unknown;
      platform?: unknown;
      appVersion?: unknown;
      lang?: unknown;
    };

    // Unknown event names are dropped: the vocabulary is fixed in
    // lib/analytics.ts, so this is the only way junk can enter the table.
    if (typeof event !== "string" || !ALLOWED.has(event)) {
      return new NextResponse(null, { status: 204 });
    }

    const safeProps: Record<string, string | number | boolean | null> = {};
    if (props && typeof props === "object" && !Array.isArray(props)) {
      for (const [k, v] of Object.entries(props as Record<string, unknown>).slice(
        0,
        MAX_PROP_KEYS
      )) {
        safeProps[k.slice(0, 40)] = clean(v);
      }
    }

    // Attribute to the signed-in user when there is one; anonymous otherwise.
    let userId: string | null = null;
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      /* anonymous event */
    }

    const admin = createAdminClient();
    await admin.from("analytics_events").insert({
      event,
      user_id: userId,
      session_id: typeof sessionId === "string" ? sessionId.slice(0, 64) : null,
      platform: typeof platform === "string" ? platform.slice(0, 16) : null,
      app_version: typeof appVersion === "string" ? appVersion.slice(0, 32) : null,
      lang: lang === "en" || lang === "hu" ? lang : null,
      props: safeProps,
    });
  } catch {
    /* swallow — analytics is never worth an error to the user */
  }

  return new NextResponse(null, { status: 204 });
}
