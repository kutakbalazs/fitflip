import type { Metadata, Viewport } from "next";
import { Playfair_Display, Archivo } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

// Marketing-landing fonts only. Exposed as CSS variables and used via the
// `font-l-display` / `font-l-sans` Tailwind families on landing components —
// the app's own typography (var(--font-display)/(--font-sans)) is untouched.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});
import OnboardingGate from "@/components/OnboardingGate";
import ScanFab from "@/components/ScanFab";
import PullToRefresh from "@/components/PullToRefresh";
import IapInit from "@/components/IapInit";
import DeepLinkHandler from "@/components/DeepLinkHandler";
import { ThemeProvider } from "@/components/ThemeProvider";
import { themeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: "FitFlip – Snap. Identify. Sell.",
  description:
    "AI-alapú azonosító sneakerekhez, vintage ruhákhoz és streetwear darabokhoz. Fotózd le, és tudd meg mi az, mit ér, és hol add el.",
  applicationName: "FitFlip",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "FitFlip",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "FitFlip",
    description: "Snap. Identify. Sell.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu" className={`${playfair.variable} ${archivo.variable}`} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-50 transition-colors">
        <ThemeProvider>
          <PullToRefresh>
            {children}
          </PullToRefresh>
          <OnboardingGate />
          <ScanFab />
          <CookieBanner />
          <IapInit />
          <DeepLinkHandler />
        </ThemeProvider>
      </body>
    </html>
  );
}
