/**
 * What a user's scanned wardrobe is worth.
 *
 * Extracted so the dashboard figure and the monthly digest can never drift
 * apart: a notification saying one number while the app shows another is
 * worse than sending no notification at all.
 */

export type ValuedScan = {
  recognized: boolean | null;
  estimated_value_min_huf: number | null;
  estimated_value_max_huf: number | null;
};

/** Midpoint of the estimated range; falls back to whichever bound exists. */
export function scanValue(s: ValuedScan): number | null {
  const min = typeof s.estimated_value_min_huf === "number" ? s.estimated_value_min_huf : null;
  const max = typeof s.estimated_value_max_huf === "number" ? s.estimated_value_max_huf : null;
  if (min !== null && max !== null) return Math.round((min + max) / 2);
  return min ?? max ?? null;
}

/**
 * Total value and item count across recognized scans.
 *
 * Unrecognized scans are excluded — they carry no estimate, and counting
 * them would make the item count claim more than we actually identified.
 */
export function wardrobeTotal(scans: ValuedScan[]): {
  totalHuf: number;
  itemCount: number;
} {
  const recognized = scans.filter((s) => s.recognized !== false);
  return {
    totalHuf: recognized.reduce((sum, s) => sum + (scanValue(s) ?? 0), 0),
    itemCount: recognized.length,
  };
}

/** Hungarian thousands separation; the app shows values this way throughout. */
export function formatHuf(value: number): string {
  return `${Math.round(value).toLocaleString("hu-HU").replace(/ /g, " ")} Ft`;
}
