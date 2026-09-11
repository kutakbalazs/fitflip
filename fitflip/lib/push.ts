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

/** True only where push can actually work: a native shell that ships the plugin. */
export function pushSupported(): boolean {
  return isNativePlatform() && bridgeHasPlugin();
}

/** Has the OS already granted permission? Never prompts. */
export async function pushPermission(): Promise<"granted" | "denied" | "prompt"> {
  const push = await plugin();
  if (!push) return "denied";
  try {
    const { receive } = await push.checkPermissions();
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
export async function enablePush(): Promise<boolean> {
  const push = await plugin();
  if (!push) return false;

  try {
    let { receive } = await push.checkPermissions();
    if (receive === "prompt" || receive === "prompt-with-rationale") {
      ({ receive } = await push.requestPermissions());
    }
    if (receive !== "granted") return false;

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

    if (!token) return false;
    return await sendToken(token);
  } catch {
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
