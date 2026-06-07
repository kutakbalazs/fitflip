// User-supplied size strings ("42 EU", "M", "32W 34L", "9.5 US") get split
// into tokens. A listing is a match when any token appears as a whole word
// in the title. Word boundaries keep "M" from matching "MUFC" or "S" from
// matching "Supreme".

// Only genuine size-like tokens are kept. If the user types something that
// isn't a size (e.g. a brand name like "Ray-Ban" in the size field), it is
// dropped so it can't produce a bogus "size matches" badge on listings.
const SIZE_TOKEN_PATTERNS: RegExp[] = [
  // Pure numeric sizes: 9, 9.5, 38, 42, 44 (1-3 digits, optional .5/,5)
  /^\d{1,3}([.,]\d)?$/,
  // Letter sizes: XXS … 4XL, plus 2XL/3XL shorthand
  /^(xxs|xs|s|m|l|xl|xxl|xxxl|xxxxl|[2-5]xl)$/i,
  // Number + unit: 42eu, 9us, 10uk, 32w, 34l, 27cm
  /^\d{1,3}([.,]\d)?(eu|us|uk|cm|w|l|t|fr|it)$/i,
  // Unit + number: eu42, us9.5, uk10
  /^(eu|us|uk|fr|it)\d{1,3}([.,]\d)?$/i,
  // Numeric ranges: 42-43, 42/43
  /^\d{1,3}[-]\d{1,3}$/,
  // One-size markers
  /^(os|onesize|one-size|uni|unisize)$/i,
];

function isSizeToken(tok: string): boolean {
  return SIZE_TOKEN_PATTERNS.some((re) => re.test(tok));
}

export function extractSizeTokens(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && isSizeToken(s));
}

export function listingMatchesSize(title: string, tokens: string[]): boolean {
  if (!title || tokens.length === 0) return false;
  return tokens.some((tok) => {
    const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(title);
  });
}
