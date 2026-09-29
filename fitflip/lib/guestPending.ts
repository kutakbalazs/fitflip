/**
 * Holds a scan made while signed out, until the visitor creates an account.
 *
 * localStorage with an explicit expiry, not sessionStorage.
 *
 * sessionStorage looked like the whole trick — it survives the trip to the
 * sign-up page and back, and dies on its own afterwards, so "save it if they
 * sign in, drop it if they don't" needed no database row and no cleanup job.
 * But it is scoped to one tab, and signing in with Google or Apple can land
 * the visitor in a different one; in the app, the web view can be rebuilt
 * around the same trip. Either way the scan was sitting in a tab nobody came
 * back to, and the visitor signed up and found nothing saved.
 *
 * So it persists properly, and the expiry does by hand what closing the tab
 * used to do: a scan nobody claimed within a day is dropped on the next read.
 */

/** Unclaimed after this long, it is not worth keeping. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PendingGuestScan = {
  result: Record<string, unknown>;
  /** First image, so the claimed scan gets a history thumbnail. Dropped
   *  silently if it doesn't fit the storage quota. */
  image?: { data: string; mediaType: string };
  savedAt: number;
};

const KEY = "ff-guest-pending";

export function savePendingGuestScan(
  result: Record<string, unknown>,
  image?: { data: string; mediaType: string }
): void {
  if (typeof window === "undefined") return;
  const write = (payload: PendingGuestScan) =>
    localStorage.setItem(KEY, JSON.stringify(payload));
  try {
    write({ result, image, savedAt: Date.now() });
  } catch {
    // Almost certainly the quota: a large photo. The result matters more than
    // the thumbnail, so retry without the image rather than losing everything.
    try {
      write({ result, savedAt: Date.now() });
    } catch {
      /* give up quietly — the user still sees the result on screen */
    }
  }
}

export function readPendingGuestScan(): PendingGuestScan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingGuestScan;
    if (!parsed || typeof parsed !== "object" || !parsed.result) return null;
    if (typeof parsed.savedAt === "number" && Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearPendingGuestScan();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingGuestScan(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasPendingGuestScan(): boolean {
  return readPendingGuestScan() !== null;
}
