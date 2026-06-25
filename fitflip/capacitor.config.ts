import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.fitflip",
  appName: "FitFlip",
  // The native shell loads the live web app. The bundled `capacitor-www`
  // folder only holds the branded offline fallback (served via errorPath
  // when the remote site can't be reached), not the app itself.
  webDir: "capacitor-www",
  server: {
    // Canonical host — the apex (fitflip.app) 307-redirects here, so point
    // straight at www to avoid a redirect hop on every cold start.
    url: "https://www.fitflip.app",
    // HTTPS only — never allow cleartext.
    cleartext: false,
    // Keep navigation inside our own domain; external links (Stripe, etc.)
    // are opened in the system browser by the app code.
    allowNavigation: ["fitflip.app", "*.fitflip.app"],
    // When the live site fails to load (no connection), show our branded
    // offline page from the bundled webDir instead of the raw WebView error.
    errorPath: "offline.html",
  },
  ios: {
    // Let the web content extend edge-to-edge under the status bar / home
    // indicator and manage safe areas itself via CSS env(safe-area-inset-*).
    // "never" avoids a double inset (native + CSS) that pushed headers too low.
    contentInset: "never",
  },
  plugins: {
    SplashScreen: {
      // Dark backdrop under the native animated SwiftUI splash (AppDelegate)
      // while the remote app loads. Matches the splash background (#0A0C11).
      launchShowDuration: 2000,
      backgroundColor: "#0A0C11",
      showSpinner: false,
      launchAutoHide: true,
    },
  },
};

export default config;
