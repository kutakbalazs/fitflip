"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/native";

// When a Universal Link / App Link (e.g. an email confirmation link on
// fitflip.app/auth/confirm) opens the native app, iOS/Android launch us with
// the full URL but don't navigate the WebView there. This listener forwards
// the path into the remote-loaded web app so confirmation completes in-app.
export default function DeepLinkHandler() {
  useEffect(() => {
    if (!isNativePlatform()) return;
    let remove: (() => void) | undefined;
    (async () => {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("appUrlOpen", ({ url }) => {
        try {
          const u = new URL(url);
          // Only handle our own https links; ignore custom-scheme callbacks
          // (OAuth etc. are handled elsewhere).
          if (u.protocol !== "https:") return;
          if (!u.hostname.endsWith("fitflip.app")) return;
          window.location.href = `${u.pathname}${u.search}`;
        } catch {
          // Malformed URL — ignore.
        }
      });
      remove = () => handle.remove();
    })();
    return () => remove?.();
  }, []);

  return null;
}
