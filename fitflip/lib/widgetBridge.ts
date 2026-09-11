import { registerPlugin } from "@capacitor/core";
import { isNativePlatform, nativePlatform } from "@/lib/native";

/**
 * Hand the home-screen widget something to display.
 *
 * A widget can't call our API: it renders outside the app, on the system's
 * schedule, with no session and often no network. So the app writes what it
 * already knows into native storage, and the widget reads that.
 *
 * The consequence to be honest about: the widget shows the figure from the
 * last time the app was opened, not a live one. That is the normal contract
 * for widgets, and it is why the value is stored with the time it was taken.
 *
 * The two platforms need different storage, and not by choice:
 *
 *  - Android's widget runs in the app's own process, so it reads the
 *    SharedPreferences file that @capacitor/preferences already writes;
 *  - iOS widgets are a separate process with their own container, and
 *    @capacitor/preferences always writes to UserDefaults.standard (its
 *    `group` option is a key prefix, not an App Group). Nothing there is
 *    visible to the widget, so iOS goes through FFWidgetBridge, a small
 *    native plugin in the app target that writes to the shared App Group.
 */

/** Capacitor Preferences writes here on Android; the widget reads the same file. */
export const WIDGET_KEY = "ff-wardrobe";

type WidgetBridgePlugin = {
  setWardrobe(options: { totalHuf: number; itemCount: number }): Promise<void>;
};

const FFWidgetBridge = registerPlugin<WidgetBridgePlugin>("FFWidgetBridge");

export type WidgetPayload = {
  totalHuf: number;
  itemCount: number;
  updatedAt: string;
};

export async function publishWardrobeToWidget(payload: {
  totalHuf: number;
  itemCount: number;
}): Promise<void> {
  if (!isNativePlatform()) return;

  const totalHuf = Math.round(payload.totalHuf);
  const itemCount = payload.itemCount;

  try {
    if (nativePlatform() === "ios") {
      await FFWidgetBridge.setWardrobe({ totalHuf, itemCount });
      return;
    }

    const { Preferences } = await import("@capacitor/preferences");
    const value: WidgetPayload = {
      totalHuf,
      itemCount,
      updatedAt: new Date().toISOString(),
    };
    await Preferences.set({ key: WIDGET_KEY, value: JSON.stringify(value) });
  } catch {
    // A widget that shows a stale number is a far smaller problem than an
    // app that fails because it couldn't update one. This also swallows the
    // "plugin is not implemented" thrown by shells built before the widget
    // existed — the same remote-URL trap push fell into.
  }
}
