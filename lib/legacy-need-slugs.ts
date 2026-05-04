/**
 * Legacy bookmark URLs only — consumed by `/bundles` (Server Component) and the build wizard redirect.
 * Do not import from `lib/bundle-builder.ts` or DB helpers; runtime reads canonical slugs from the DB.
 */

export const LEGACY_NEED_SLUG_ALIASES: Record<string, string> = {
  "blood-sugar": "blood-sugar-support",
  "mobility-fall": "joint-comfort-mobility",
  respiratory: "respiratory-support",
  "sleep-mood": "sleep-mood-support",
  cognitive: "cognitive-support",
  "vision-hearing": "vision-hearing-support",
};

/** Slugs removed from the wizard taxonomy — filtered silently after alias resolution */
export const DROPPED_WIZARD_NEED_SLUGS = new Set([
  "medication-adherence",
  "daily-routines-organization",
]);

/** Apply legacy aliases and drop deprecated needs; preserve first-seen order */
export function normalizeNeedSlugsFromUrl(slugs: string[]): string[] {
  const out: string[] = [];
  for (const raw of slugs) {
    const s = raw.trim();
    if (!s) continue;
    if (DROPPED_WIZARD_NEED_SLUGS.has(s)) continue;
    const mapped = LEGACY_NEED_SLUG_ALIASES[s] ?? s;
    if (DROPPED_WIZARD_NEED_SLUGS.has(mapped)) continue;
    if (!out.includes(mapped)) out.push(mapped);
  }
  return out;
}
