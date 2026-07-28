"use client";

// The home route renders the web marketing landing (desktop + mobile) OR the
// app itself, decided by LandingGate. The native (Capacitor) apps always get
// the app — the landing is web-only. The app lives in components/home/HomeApp.
import LandingGate from "@/components/landing/LandingGate";

export default function Page() {
  return <LandingGate />;
}
