import crypto from "crypto";

/**
 * Firebase Cloud Messaging, HTTP v1. **Android only** — iOS device tokens are
 * APNs tokens and go to `apns.ts`, which explains why.
 *
 * The OAuth token is minted here rather than pulled from google-auth-library:
 * it's a signed JWT swapped for an access token, about thirty lines, and it
 * keeps a transitive dependency tree out of a route that runs on every cron
 * tick.
 */

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    if (!sa.project_id || !sa.client_email || !sa.private_key) return null;
    // Env vars mangle real newlines; accept the escaped form too.
    sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    return sa;
  } catch {
    console.error("[push] FCM_SERVICE_ACCOUNT is not valid JSON");
    return null;
  }
}

export function pushEnabled(): boolean {
  return serviceAccount() !== null;
}

/**
 * Prove the credentials actually work, without sending anything.
 *
 * "The env var is set" and "the key can mint a token" are different claims,
 * and the gap between them is where a truncated paste hides. This closes it
 * by doing the one thing that fails loudly when the key is wrong.
 */
export async function fcmCheck(): Promise<{
  configured: boolean;
  projectId: string | null;
  tokenExchange: boolean;
}> {
  const sa = serviceAccount();
  if (!sa) return { configured: false, projectId: null, tokenExchange: false };
  const token = await accessToken(sa).catch(() => null);
  return {
    configured: true,
    projectId: sa.project_id,
    tokenExchange: token !== null,
  };
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Access tokens live an hour; a cron run that sends fifty notifications
// should mint one, not fifty.
let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(sa: ServiceAccount): Promise<string | null> {
  // 60s of slack, so a token can't expire mid-batch.
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signature = b64url(
    crypto.createSign("RSA-SHA256").update(`${header}.${claims}`).sign(sa.private_key)
  );

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });

  if (!res.ok) {
    console.error("[push] token exchange failed:", res.status, await res.text());
    return null;
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;

  cached = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

export type PushResult =
  /** Delivered to FCM. */
  | { ok: true }
  /** The device token is dead — the caller should delete it. */
  | { ok: false; stale: true }
  /** Anything else: a transient failure, keep the token and try again later. */
  | { ok: false; stale: false };

/**
 * Send one notification to one device token.
 *
 * `data` values must be strings — FCM rejects anything else — and are what the
 * app reads on tap to decide where to navigate.
 */
export async function sendPush(opts: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<PushResult> {
  const sa = serviceAccount();
  if (!sa) return { ok: false, stale: false };

  const bearer = await accessToken(sa);
  if (!bearer) return { ok: false, stale: false };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: opts.token,
          notification: { title: opts.title, body: opts.body },
          data: opts.data ?? {},
          android: {
            priority: "high",
            // No channel_id on purpose: naming a channel the app has not
            // created means Android drops the notification silently. Letting
            // it fall back to the app's default channel is the safe default
            // until we actually create one.
            notification: { sound: "default" },
          },
        },
      }),
    }
  );

  if (res.ok) return { ok: true };

  const text = await res.text();
  // 404 UNREGISTERED is the app being deleted or the token rotated; 400
  // INVALID_ARGUMENT on the token field is a malformed one. Both are
  // permanent, and a token that never gets cleaned up is a row we retry
  // forever.
  const stale =
    res.status === 404 ||
    (res.status === 400 && /registration token|INVALID_ARGUMENT/i.test(text));
  if (!stale) console.error("[push] send failed:", res.status, text.slice(0, 300));
  return { ok: false, stale };
}
