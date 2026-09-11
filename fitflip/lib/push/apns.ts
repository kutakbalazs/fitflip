import crypto from "crypto";
import http2 from "http2";

/**
 * Apple Push Notification service, token-based (.p8) auth.
 *
 * We talk to Apple directly rather than routing iOS through Firebase. The
 * reason is the plugin: `@capacitor/push-notifications` registers with APNs
 * on iOS and hands back an *APNs* device token, which FCM will not accept.
 * Routing through Firebase would mean swapping in the Firebase iOS SDK and
 * its pods just to translate one token format — more in the binary, another
 * vendor in the privacy manifest, for no behaviour the user can see.
 *
 * So: Android goes through FCM (its tokens are FCM tokens), iOS comes here.
 * `push_tokens.platform` is what routes them.
 */

const KEY = () => process.env.APNS_KEY_P8 ?? "";
const KEY_ID = () => process.env.APNS_KEY_ID ?? "";
const TEAM_ID = () => process.env.APNS_TEAM_ID ?? "";
const BUNDLE_ID = () => process.env.APNS_BUNDLE_ID || "app.fitflip";

/**
 * Sandbox vs production is a property of how the app was *built*, not of our
 * server: a build signed with a development profile can only be reached on
 * api.sandbox. Set APNS_ENV=sandbox while testing from Xcode; TestFlight and
 * the App Store both use production.
 */
function host(): string {
  return process.env.APNS_ENV === "sandbox"
    ? "api.sandbox.push.apple.com"
    : "api.push.apple.com";
}

export function apnsEnabled(): boolean {
  return Boolean(KEY() && KEY_ID() && TEAM_ID());
}

/**
 * Prove the key is usable, without sending anything.
 *
 * A `.p8` that lost its newlines on the way into an env var still *looks*
 * present; it fails at the moment we sign. So this signs.
 */
export function apnsCheck(): {
  configured: boolean;
  environment: string;
  bundleId: string;
  canSign: boolean;
} {
  const configured = apnsEnabled();
  return {
    configured,
    environment: process.env.APNS_ENV === "sandbox" ? "sandbox" : "production",
    bundleId: BUNDLE_ID(),
    canSign: configured ? authToken() !== null : false,
  };
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Apple rejects tokens older than an hour and throttles clients that mint a
// fresh one per request, so this is cached and refreshed well inside both
// limits.
let cached: { jwt: string; madeAt: number } | null = null;

function authToken(): string | null {
  if (cached && Date.now() - cached.madeAt < 45 * 60_000) return cached.jwt;

  const pem = KEY().replace(/\\n/g, "\n");
  const header = b64url(JSON.stringify({ alg: "ES256", kid: KEY_ID() }));
  const claims = b64url(
    JSON.stringify({ iss: TEAM_ID(), iat: Math.floor(Date.now() / 1000) })
  );

  try {
    // JWS wants the raw r‖s pair; Node's default DER encoding is rejected by
    // Apple with a opaque InvalidProviderToken.
    const signature = b64url(
      crypto.sign("sha256", Buffer.from(`${header}.${claims}`), {
        key: pem,
        dsaEncoding: "ieee-p1363",
      })
    );
    cached = { jwt: `${header}.${claims}.${signature}`, madeAt: Date.now() };
    return cached.jwt;
  } catch (err) {
    console.error("[push] APNs key could not be used:", err);
    return null;
  }
}

export type ApnsResult =
  | { ok: true }
  | { ok: false; stale: true }
  | { ok: false; stale: false };

/** Send one alert to one iOS device token. */
export function sendApns(opts: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<ApnsResult> {
  const jwt = apnsEnabled() ? authToken() : null;
  if (!jwt) return Promise.resolve({ ok: false, stale: false });

  return new Promise((resolve) => {
    const client = http2.connect(`https://${host()}`);
    let settled = false;
    const done = (r: ApnsResult) => {
      if (settled) return;
      settled = true;
      client.close();
      resolve(r);
    };

    client.on("error", (err) => {
      console.error("[push] APNs connection failed:", err.message);
      done({ ok: false, stale: false });
    });

    const payload = JSON.stringify({
      aps: {
        alert: { title: opts.title, body: opts.body },
        sound: "default",
      },
      ...(opts.data ?? {}),
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${opts.token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": BUNDLE_ID(),
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
      "content-length": Buffer.byteLength(payload),
    });

    let status = 0;
    let raw = "";
    req.on("response", (headers) => {
      status = Number(headers[":status"]) || 0;
    });
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      raw += chunk;
    });
    req.on("error", () => done({ ok: false, stale: false }));
    req.on("end", () => {
      if (status === 200) return done({ ok: true });

      // 410 is Apple telling us the app is gone from that device; the 400
      // reasons below mean the token was never valid for us. Everything else
      // (429, 5xx) is transient and the token stays.
      const permanent =
        status === 410 || /BadDeviceToken|DeviceTokenNotForTopic|Unregistered/.test(raw);
      if (!permanent) {
        console.error("[push] APNs rejected:", status, raw.slice(0, 200));
      }
      done({ ok: false, stale: permanent });
    });

    req.end(payload);
  });
}
