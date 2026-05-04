/**
 * BRD-aligned wellness goals (non-diagnostic). `tagHints` align to product.tags / naming for bundle scoring.
 */
export const BRD_WELLNESS_GOALS = [
  {
    id: "joint-comfort",
    label: "Joint comfort",
    tagHints: ["mobility", "joint", "pain", "inflammation"],
  },
  {
    id: "heart-health",
    label: "Heart health",
    tagHints: ["heart", "cardio", "blood pressure"],
  },
  {
    id: "bladder-support",
    label: "Bladder support",
    tagHints: ["bladder", "incontinence", "urinary"],
  },
  {
    id: "diabetes-friendly",
    label: "Diabetes-friendly lifestyle",
    tagHints: ["blood-sugar", "diabetes", "glucose"],
  },
  {
    id: "respiratory",
    label: "Respiratory support",
    tagHints: ["respiratory", "breathing", "sinus"],
  },
  {
    id: "daily-living",
    label: "Daily living essentials",
    tagHints: ["mobility", "safety", "adherence", "daily"],
  },
] as const;

export type WellnessGoalId = (typeof BRD_WELLNESS_GOALS)[number]["id"];

/** Goals param uses ids; expand to tag strings for bundle builder `goals` array. */
export function expandWellnessGoalsToTagHints(goalIds: string[]): string[] {
  const hints = new Set<string>();
  for (const id of goalIds) {
    const g = BRD_WELLNESS_GOALS.find((x) => x.id === id);
    if (g) for (const t of g.tagHints) hints.add(t);
  }
  return [...hints];
}
