import { isNativePlatform, nativePlatform } from "@/lib/native";

/**
 * Push notifications, client side.
 *
 * The plugin is imported dynamically everywhere below. It has no web
 * implementation worth using here — the app runs inside a WKWebView pointed
 * at a remote URL, where the Web Push API is not available on iOS — and a
 * static import would pull native bridge code into the browser bundle for
 * the majority of sessions that can never use it.
 */

type PushModule = typeof import("@capacitor/push-notifications");

async function plugin(): Promise<PushModule["PushNotifications"] | null> {
  if (!isNativePlatform()) return null;
  try {
    const mod = await import("@capacitor/push-notifications");
    return mod.PushNotifications;
  } catch {
    return null;
  }
}

/** True where push can work at all: the native shell, iOS or Android. */
export function pushSupported(): boolean {
  return isNativePlatform();
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

      void push.addListener("registration", (t) => {
        clearTimeout(timer);
        done(t.value);
      });
      void push.addListener("registrationError", () => {
        clearTimeout(timer);
        done(null);
      });
      void push.register();
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

  try {
    // A tapped notification should land on the thing it is about.
    void push.addListener("pushNotificationActionPerformed", (action) => {
      const url = action.notification.data?.url;
      if (typeof url === "string" && url.startsWith("/")) onOpen(url);
    });

    // Tokens rotate — on reinstall, on restore from backup, occasionally on
    // their own. Without this the row goes stale and the user quietly stops
    // getting notifications they believe are on.
    void push.addListener("registration", (t) => {
      void sendToken(t.value);
    });

    const { receive } = await push.checkPermissions();
    if (receive === "granted") await push.register();
  } catch {
    // Never let notification plumbing break app start.
  }
}
