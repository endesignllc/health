/**
 * Retail phrases that map to one product class.
 * Import matches these against the cleaned product name.
 * A name that hits two classes is not classified; it goes to the review CSV.
 */

export interface ClassAlias {
  classSlug: string;
  alias: string;
}

export const BATHROOM_AND_FALL_ALIASES: ClassAlias[] = [
  { classSlug: "bathroom-safety", alias: "grab bar" },
  { classSlug: "bathroom-safety", alias: "bath bench" },
  { classSlug: "bathroom-safety", alias: "shower chair" },
  { classSlug: "bathroom-safety", alias: "shower stool" },
  { classSlug: "bathroom-safety", alias: "toilet rail" },
  { classSlug: "bathroom-safety", alias: "toilet riser" },
  { classSlug: "bathroom-safety", alias: "transfer bench" },
  { classSlug: "bathroom-safety", alias: "non-slip mat" },
  { classSlug: "bathroom-safety", alias: "anti-slip" },
  { classSlug: "bathroom-safety", alias: "tub rail" },
  { classSlug: "bathroom-safety", alias: "bedside commode" },
  { classSlug: "fall-prevention", alias: "night light" },
  { classSlug: "fall-prevention", alias: "bed rail" },
  { classSlug: "fall-prevention", alias: "bed assist" },
  { classSlug: "fall-prevention", alias: "hip protector" },
];

/** Shop category for an alias class when the source section does not name one. */
export const ALIAS_CLASS_CATEGORY: Record<string, string> = {
  "bathroom-safety": "home-safety",
  "fall-prevention": "home-safety",
  "digital-arm-bp-monitor": "monitoring-devices",
  "blood-glucose-meter": "monitoring-devices",
  "pulse-oximeter": "monitoring-devices",
  "digital-thermometer": "monitoring-devices",
  "digital-body-scale": "monitoring-devices",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Distinct class slugs whose aliases appear as whole phrases in the name. */
export function matchClassAliases(name: string, aliases: ClassAlias[]): string[] {
  const text = name.toLowerCase();
  const slugs = new Set<string>();
  const ordered = [...aliases].sort((a, b) => b.alias.length - a.alias.length);
  for (const row of ordered) {
    const phrase = row.alias.trim().toLowerCase();
    if (!phrase) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
    if (pattern.test(text)) slugs.add(row.classSlug);
  }
  return [...slugs];
}
