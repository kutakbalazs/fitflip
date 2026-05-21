import type { Metadata, Viewport } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import FeedbackBalloon from "@/components/FeedbackBalloon";

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
    <html lang="hu">
      <body className="min-h-dvh bg-white text-ink-900">
        {children}
        <FeedbackBalloon />
        <CookieBanner />
      </body>
    </html>
  );
}
