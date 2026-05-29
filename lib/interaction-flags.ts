/** Controlled vocabulary for product-class interaction flags. */
export const INTERACTION_FLAGS = [
  "affects_blood_glucose",
  "affects_blood_pressure",
  "affects_inr",
  "serotonergic",
  "nephrotoxic_at_high_dose",
] as const;

export type InteractionFlag = (typeof INTERACTION_FLAGS)[number];

/** Plain-language warnings shown when a member manually adds a flagged item. */
export const INTERACTION_FLAG_MESSAGES: Record<InteractionFlag, string> = {
  affects_blood_glucose:
    "This supplement may affect blood sugar. Confirm with your doctor before use, especially if you take diabetes medication or insulin.",
  affects_blood_pressure:
    "This supplement may affect blood pressure. Confirm with your doctor before use, especially if you take blood pressure medication.",
  affects_inr:
    "This supplement may affect blood clotting. Confirm with your doctor before use, especially if you take warfarin or similar medications.",
  serotonergic:
    "This supplement may interact with antidepressants and other serotonergic medications. Confirm with your doctor before use.",
  nephrotoxic_at_high_dose:
    "High doses of this supplement may affect kidney function. Confirm with your doctor before use, especially if you have kidney disease.",
};

export function normalizeInteractionFlags(
  flags: string[] | null | undefined
): InteractionFlag[] {
  if (!flags?.length) return [];
  const allowed = new Set<string>(INTERACTION_FLAGS);
  return flags.filter((f): f is InteractionFlag => allowed.has(f));
}

/** Flagged classes are not auto-recommended in bundles — members may still add manually. */
export function isExcludedFromRecommendations(
  flags: string[] | null | undefined
): boolean {
  return normalizeInteractionFlags(flags).length > 0;
}

export function interactionWarningsForFlags(
  flags: string[] | null | undefined
): string[] {
  return normalizeInteractionFlags(flags).map((f) => INTERACTION_FLAG_MESSAGES[f]);
}
