// User-supplied size strings ("42 EU", "M", "32W 34L", "9.5 US") get split
// into tokens. A listing is a match when any token appears as a whole word
// in the title. Word boundaries keep "M" from matching "MUFC" or "S" from
// matching "Supreme".

export function extractSizeTokens(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function listingMatchesSize(title: string, tokens: string[]): boolean {
  if (!title || tokens.length === 0) return false;
  return tokens.some((tok) => {
    const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(title);
  });
}
