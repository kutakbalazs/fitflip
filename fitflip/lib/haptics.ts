// Lightweight haptic feedback helper. Uses the Vibration API which works
// reliably on Android. iOS Safari supports navigator.vibrate since iOS 18,
// but only inside a direct user-initiated handler — we call it from click
// handlers, so it should fire on supported devices and silently no-op on
// older iOS.

type HapticPattern = "tap" | "success" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [15, 40, 15],
  error: [30, 60, 30],
};

export function haptic(pattern: HapticPattern = "tap"): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(PATTERNS[pattern]);
    }
  } catch {
    /* ignore — vibration not supported */
  }
}
