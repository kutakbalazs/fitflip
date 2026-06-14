import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.fitflip",
  appName: "FitFlip",
  // The native shell loads the live web app. The bundled `capacitor-www`
  // folder only holds the branded offline fallback (served via errorPath
  // when the remote site can't be reached), not the app itself.
  webDir: "capacitor-www",
  server: {
    url: "https://fitflip.app",
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
    // Let the web content extend under the status bar / home indicator and
    // manage safe areas itself.
    contentInset: "always",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#000000",
      showSpinner: false,
      // Splash hides as soon as the web view reports it's ready, so the
      // ~1s cold-load is covered by the logo, not a blank screen.
      launchAutoHide: true,
    },
  },
};

export default config;
