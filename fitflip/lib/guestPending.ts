/**
 * Holds a scan made while signed out, until the visitor creates an account.
 *
 * sessionStorage is the whole trick: it survives the trip to the sign-up page
 * and back, but dies when the tab or app closes. So "save it if they sign in,
 * drop it if they don't" needs no database row, no orphan cleanup and no
 * scheduled job — the browser does it for us.
 */

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
    sessionStorage.setItem(KEY, JSON.stringify(payload));
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
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingGuestScan;
    if (!parsed || typeof parsed !== "object" || !parsed.result) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingGuestScan(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasPendingGuestScan(): boolean {
  return readPendingGuestScan() !== null;
}
