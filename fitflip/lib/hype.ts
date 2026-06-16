import type { Lang } from "@/lib/lang";

// The hype badge text is derived deterministically from the score so it always
// renders in the currently selected language — no AI translation needed and it
// stays correct even for scans that were saved in the other language. The
// wording matches the onboarding demo ("Kult darab" / "Cult piece").
//
// Tiers follow the scoring vocabulary used in the analyze prompt:
//   9-10 → cult piece, 8 → heat, 7 → hyped.
export function hypeBadgeLabel(score: number | null | undefined, lang: Lang): string | null {
  if (typeof score !== "number" || score < 7) return null;
  if (score >= 9) return lang === "hu" ? "Kult darab" : "Cult piece";
  if (score >= 8) return lang === "hu" ? "Tűzforró" : "Heat";
  return lang === "hu" ? "Felkapott" : "Hyped";
}
