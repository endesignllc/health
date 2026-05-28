/**
 * Need → product affinity tags (non-diagnostic).
 *
 * Products carrying any of a need's affinity tags are boosted within that need's
 * allocation so need-relevant items surface above generic in-category items
 * (e.g. cinnamon/berberine over a generic multivitamin for Blood Sugar Support).
 *
 * Tags are matched against `products.tags` (controlled vocabulary set in the seed
 * and import scripts). Mirrors the `tagHints` in `lib/wellness-goals.ts`.
 */
export const NEED_AFFINITY_TAGS: Record<string, string[]> = {
  "blood-sugar-support": ["blood-sugar", "diabetes", "glucose"],
  "heart-health": ["heart", "cardio", "blood-pressure"],
  "joint-comfort-mobility": ["joint", "mobility", "inflammation"],
  "pain-inflammation": ["pain", "inflammation"],
  "respiratory-support": ["respiratory", "breathing", "sinus"],
  "sleep-mood-support": ["sleep", "mood", "relaxation"],
  "cognitive-support": ["cognitive"],
  "vision-hearing-support": ["vision", "hearing"],
  "bladder-support": ["bladder", "incontinence", "urinary"],
};

/**
 * Affinity weight. Set above core(+3)+value(+2) so a need-relevant product
 * outranks a generic-but-off-need in-category item, but below the
 * class-qualifier bonus (+10) so qualifier fit still dominates.
 */
export const NEED_AFFINITY_BONUS = 6;

export function affinityTagsForNeedSlug(slug: string): string[] {
  return NEED_AFFINITY_TAGS[slug] ?? [];
}

/** Flat boost when a product carries at least one of the need's affinity tags. */
export function needAffinityBonus(
  productTags: string[] | null | undefined,
  affinityTags: string[]
): number {
  if (!affinityTags.length) return 0;
  const wanted = new Set(affinityTags.map((t) => t.toLowerCase()));
  const tags = productTags ?? [];
  return tags.some((t) => wanted.has(t.toLowerCase())) ? NEED_AFFINITY_BONUS : 0;
}
