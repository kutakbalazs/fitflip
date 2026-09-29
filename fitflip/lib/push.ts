import { Capacitor } from "@capacitor/core";
import { isNativePlatform, nativePlatform } from "@/lib/native";

/**
 * Push notifications, client side.
 *
 * The plugin is imported dynamically everywhere below. It has no web
 * implementation worth using here — the app runs inside a WKWebView pointed
 * at a remote URL, where the Web Push API is not available on iOS — and a
 * static import would pull native bridge code into the browser bundle for
 * the majority of sessions that can never use it.
 *
 * That remote URL is also why `isNativePlatform()` is not enough to decide
 * whether push works. The web app updates the moment we deploy; the native
 * shell only updates when someone installs a new build from the store. So
 * every copy of the app released before push existed is running this code
 * right now, inside a binary with no PushNotifications plugin in it — and
 * calling the plugin there throws "not implemented on ios". Hence
 * `isPluginAvailable`, which asks the bridge what the *installed binary*
 * actually has.
 */

type PushModule = typeof import("@capacitor/push-notifications");

function bridgeHasPlugin(): boolean {
  try {
    return Capacitor.isPluginAvailable("PushNotifications");
  } catch {
    return false;
  }
}

async function plugin(): Promise<PushModule["PushNotifications"] | null> {
  if (!isNativePlatform() || !bridgeHasPlugin()) return null;
  try {
    const mod = await import("@capacitor/push-notifications");
    return mod.PushNotifications;
  } catch {
    return null;
  }
}

/**
 * Bound a bridge call.
 *
 * On a real device `checkPermissions()` was observed never settling, which
 * left the settings switch stuck on "saving" with no way out. A native call
 * that hangs is indistinguishable from one that is slow, and neither should
 * be able to freeze a control the user is holding.
 */
function bounded<T>(p: Promise<T>, fallback: T, ms = 4000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** True only where push can actually work: a native shell that ships the plugin. */
export function pushSupported(): boolean {
  return isNativePlatform() && bridgeHasPlugin();
}

/** Has the OS already granted permission? Never prompts. */
export async function pushPermission(): Promise<"granted" | "denied" | "prompt"> {
  const push = await plugin();
  if (!push) return "denied";
  try {
    const { receive } = await bounded(push.checkPermissions(), { receive: "prompt" } as Awaited<
      ReturnType<typeof push.checkPermissions>
    >);
    if (receive === "granted") return "granted";
    if (receive === "denied") return "denied";
    return "prompt";
  } catch {
    return "denied";
  }
}

/**
 * Ask for permission, register with APNs/FCM, and hand the token to our
 * server.
 *
 * Resolves only once the token has actually reached us, so the caller can
 * show a switch that means "this device will receive notifications" rather
 * than "we asked politely". The token arrives on an event, not from the
 * `register()` promise, which is why this waits on a listener.
 */
export async function enablePush(onStep?: (step: string) => void): Promise<boolean> {
  // TEMPORARY. The switch stalls on a real device and three rounds of
  // reasoning about where have all been wrong, so it now reports its own
  // position instead. Remove once the stall is understood.
  const step = (s: string) => onStep?.(s);

  step("plugin");
  const push = await plugin();
  if (!push) {
    step("nincs plugin");
    return false;
  }

  try {
    type Perm = Awaited<ReturnType<typeof push.checkPermissions>>;
    step("ellenőrzés");
    let { receive } = await bounded(push.checkPermissions(), { receive: "prompt" } as Perm);
    step(`ellenőrzés: ${receive}`);
    if (receive === "prompt" || receive === "prompt-with-rationale") {
      // The OS dialog is the one wait that legitimately takes as long as the
      // user takes, so it gets a far longer leash than the silent checks.
      step("engedélykérés");
      ({ receive } = await bounded(push.requestPermissions(), { receive: "denied" } as Perm, 30_000));
      step(`engedély: ${receive}`);
    }
    if (receive !== "granted") return false;

    step("token várása");

    const token = await new Promise<string | null>((resolve) => {
      let settled = false;
      const done = (value: string | null) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      // If the device is offline, APNs/FCM simply never answers. Give up
      // rather than leaving the settings switch spinning forever.
      const timer = setTimeout(() => done(null), 15_000);

      // Every one of these is awaited via .catch rather than `void`: a
      // discarded promise that rejects becomes an unhandled rejection, which
      // escapes the surrounding try/catch entirely and lands in Sentry as an
      // uncaught error. That is exactly how "plugin is not implemented on
      // ios" got reported from a shell that simply predates the plugin.
      const fail = () => {
        clearTimeout(timer);
        done(null);
      };

      push
        .addListener("registration", (t) => {
          clearTimeout(timer);
          done(t.value);
        })
        .catch(fail);
      push.addListener("registrationError", fail).catch(fail);
      push.register().catch(fail);
    });

    if (!token) {
      step("nincs token");
      return false;
    }
    step("token mentése");
    const ok = await sendToken(token);
    step(ok ? "kész" : "szerver hiba");
    return ok;
  } catch (e) {
    step(`kivétel: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

/** Send the token up. Separate so the refresh path can reuse it. */
async function sendToken(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: nativePlatform() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Stop notifications for this account.
 *
 * Deletes every token, not just this device's: someone turning this off is
 * saying "stop sending me these", and honouring that only on the handset
 * they happen to be holding is the wrong reading.
 */
export async function disablePush(): Promise<boolean> {
  try {
    const res = await fetch("/api/push/register", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Wire up the listeners that must exist for the whole app lifetime, and
 * refresh a token that is already permitted.
 *
 * Called once from the root layout. Silent by design: it never prompts, so
 * mounting it globally can't produce a permission dialog the user didn't ask
 * for.
 */
export async function initPush(onOpen: (url: string) => void): Promise<void> {
  const push = await plugin();
  if (!push) return;

  // `.catch` rather than `void` on each: a discarded rejected promise
  // bypasses the try/catch below and surfaces as an uncaught error.
  const ignore = () => {};

  try {
    // A tapped notification should land on the thing it is about.
    push
      .addListener("pushNotificationActionPerformed", (action) => {
        const url = action.notification.data?.url;
        if (typeof url === "string" && url.startsWith("/")) onOpen(url);
      })
      .catch(ignore);

    // Tokens rotate — on reinstall, on restore from backup, occasionally on
    // their own. Without this the row goes stale and the user quietly stops
    // getting notifications they believe are on.
    push
      .addListener("registration", (t) => {
        void sendToken(t.value).catch(ignore);
      })
      .catch(ignore);

    const { receive } = await push.checkPermissions();
    if (receive === "granted") await push.register();
  } catch {
    // Never let notification plumbing break app start.
  }
}
