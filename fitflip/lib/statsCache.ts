/**
 * The home dashboard's last-seen numbers, kept on the device.
 *
 * Opening the app used to show nothing until three network legs had run in
 * series — page load, a round trip to Supabase to confirm the session, and
 * only then the stats request, which confirms the session again, queries,
 * and signs four image URLs. With this, the last figures appear on the first
 * frame and are refreshed underneath.
 *
 * It also keeps the image URLs stable. Every stats response signs fresh URLs,
 * and a fresh signature is a new URL, so the browser could never serve the
 * thumbnails from its cache — roughly 2 MB of photos came down again on every
 * single visit. Reusing a still-valid URL for the same scan lets the cache do
 * its job.
 */

export type HomeStats = {
  count: number;
  totalValueHuf: number;
  recent: Array<{
    id: string;
    brand: string | null;
    model: string | null;
    itemType: string | null;
    color: string | null;
    valueHuf: number | null;
    imageUrl: string | null;
  }>;
};

type Cached = { uid: string; savedAt: number; stats: HomeStats };

const KEY = "ff-home-stats";

/** The server signs for an hour; reuse well inside that. */
const URL_REUSE_MS = 45 * 60 * 1000;

function read(): Cached | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    return parsed && typeof parsed.uid === "string" && parsed.stats ? parsed : null;
  } catch {
    return null;
  }
}

/** Last stats for this user, or null. Keyed by user so a shared device never shows someone else's wardrobe. */
export function cachedStats(uid: string): HomeStats | null {
  const c = read();
  return c && c.uid === uid ? c.stats : null;
}

/**
 * Store fresh stats, carrying over image URLs that are still valid for the
 * same scan. Returns the stats to render — with those carried-over URLs.
 */
export function storeStats(uid: string, fresh: HomeStats): HomeStats {
  const prev = read();
  const reusable =
    prev && prev.uid === uid && Date.now() - prev.savedAt < URL_REUSE_MS
      ? new Map(prev.stats.recent.map((r) => [r.id, r.imageUrl]))
      : null;

  const stats: HomeStats = reusable
    ? {
        ...fresh,
        recent: fresh.recent.map((r) => ({ ...r, imageUrl: reusable.get(r.id) ?? r.imageUrl })),
      }
    : fresh;

  // Only restart the URL clock when the URLs actually changed — otherwise a
  // visit every few minutes would keep stretching an hour-long signature.
  const savedAt = reusable && prev ? prev.savedAt : Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify({ uid, savedAt, stats }));
  } catch {
    /* storage full or blocked — the page still renders from the network */
  }
  return stats;
}
