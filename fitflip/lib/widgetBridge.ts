import { isNativePlatform } from "@/lib/native";

/**
 * Hand the home-screen widget something to display.
 *
 * A widget can't call our API: it renders outside the app, on the system's
 * schedule, with no session and often no network. So the app writes what it
 * already knows into native key-value storage, and the widget reads that.
 *
 * The consequence to be honest about: the widget shows the figure from the
 * last time the app was opened, not a live one. That is the normal contract
 * for widgets, and it is why the value is stored with the time it was taken.
 */

/** Capacitor Preferences writes here on Android; the widget reads the same file. */
export const WIDGET_KEY = "ff-wardrobe";

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

  try {
    const { Preferences } = await import("@capacitor/preferences");
    const value: WidgetPayload = {
      totalHuf: Math.round(payload.totalHuf),
      itemCount: payload.itemCount,
      updatedAt: new Date().toISOString(),
    };
    await Preferences.set({ key: WIDGET_KEY, value: JSON.stringify(value) });
  } catch {
    // A widget that shows a stale number is a far smaller problem than an
    // app that fails because it couldn't update one.
  }
}
