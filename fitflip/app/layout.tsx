import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitFlip – Snap. Identify. Sell.",
  description:
    "AI-alapú azonosító sneakerekhez, vintage ruhákhoz és streetwear darabokhoz. Fotózd le, és tudd meg mi az, mit ér, és hol add el.",
  icons: { icon: "/favicon.svg" },
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
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body className="min-h-screen bg-white text-ink-900">{children}</body>
    </html>
  );
}
