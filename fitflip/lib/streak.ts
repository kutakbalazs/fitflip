/**
 * Daily scan streak.
 *
 * Tracked in the user's local (Hungarian) day rather than UTC: a scan at
 * 00:30 in Budapest belongs to that calendar day, not the previous one.
 *
 * Extracted from the analyze route so the widget shows the same number the
 * app does. A streak that reads 5 in one place and 4 in another is worse
 * than no streak at all — the whole point of it is that the user trusts the
 * count.
 */

export type StreakProfile = {
  streak_count?: number | null;
  last_scan_date?: string | null;
};

export function budapestDate(offsetDays = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(
    new Date(Date.now() + offsetDays * 86_400_000)
  );
}

/**
 * The streak to DISPLAY — alive only if the last scan was today or
 * yesterday. A stored count from three weeks ago is history, not a streak,
 * and showing it would be a small lie the user notices the moment they
 * scan again and it drops.
 */
export function displayStreak(profile: StreakProfile | null): number {
  if (!profile) return 0;
  const last = profile.last_scan_date ?? null;
  if (last === budapestDate() || last === budapestDate(-1)) {
    return profile.streak_count ?? 0;
  }
  return 0;
}
