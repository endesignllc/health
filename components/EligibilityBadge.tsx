"use client";

import { cn } from "@/lib/utils";

export type EligibilityType = 
  | "otc" 
  | "home_safety" 
  | "food" 
  | "utilities" 
  | "dual_purpose"
  | "zero_cost";

interface EligibilityBadgeProps {
  type: EligibilityType;
  className?: string;
  compact?: boolean;
}

const BADGE_CONFIG: Record<
  EligibilityType,
  { label: string; shortLabel: string; bgClass: string; textClass: string }
> = {
  otc: {
    label: "OTC Eligible",
    shortLabel: "OTC",
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-700",
  },
  home_safety: {
    label: "Home Safety",
    shortLabel: "Home",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
  },
  food: {
    label: "Food & Groceries",
    shortLabel: "Food",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
  },
  utilities: {
    label: "Utilities",
    shortLabel: "Util",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
  },
  dual_purpose: {
    label: "Dual Purpose*",
    shortLabel: "Dual*",
    bgClass: "bg-slate-100",
    textClass: "text-slate-600",
  },
  zero_cost: {
    label: "$0 with your plan",
    shortLabel: "$0",
    bgClass: "bg-green-500",
    textClass: "text-white",
  },
};

export function EligibilityBadge({
  type,
  className,
  compact = false,
}: EligibilityBadgeProps) {
  const config = BADGE_CONFIG[type];
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        config.bgClass,
        config.textClass,
        className
      )}
    >
      {compact ? config.shortLabel : config.label}
    </span>
  );
}

interface EligibilityBadgesProps {
  types: EligibilityType[];
  className?: string;
  compact?: boolean;
}

/** Display a row of eligibility badges */
export function EligibilityBadges({
  types,
  className,
  compact = false,
}: EligibilityBadgesProps) {
  if (types.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {types.map((type) => (
        <EligibilityBadge key={type} type={type} compact={compact} />
      ))}
    </div>
  );
}

/** Map category slugs to eligibility types (for demo v1) */
export function categoryToEligibility(categorySlug: string): EligibilityType[] {
  // Most OTC health categories map to OTC
  const otcCategories = [
    "cold-flu",
    "allergy-sinus",
    "pain-relief",
    "digestive-health",
    "first-aid",
    "vitamins",
    "eye-ear-care",
    "incontinence",
    "skin-care",
    "foot-care",
    "dental-oral-care",
  ];

  const homeSafetyCategories = [
    "mobility-aids",
    "bathroom-safety",
    "daily-living",
    "compression",
    "supports-braces",
  ];

  const badges: EligibilityType[] = [];

  if (otcCategories.some((c) => categorySlug.includes(c))) {
    badges.push("otc");
  }

  if (homeSafetyCategories.some((c) => categorySlug.includes(c))) {
    badges.push("home_safety");
  }

  // Default to OTC for uncategorized
  if (badges.length === 0) {
    badges.push("otc");
  }

  return badges;
}

/** Map product tags to eligibility types */
export function tagsToEligibility(tags: string[]): EligibilityType[] {
  const badges: EligibilityType[] = [];
  
  for (const tag of tags) {
    if (tag === "eligibility:otc") badges.push("otc");
    if (tag === "eligibility:home_safety") badges.push("home_safety");
    if (tag === "eligibility:food") badges.push("food");
    if (tag === "eligibility:utilities") badges.push("utilities");
    if (tag === "eligibility:dual_purpose") badges.push("dual_purpose");
    if (tag === "eligibility:zero_cost") badges.push("zero_cost");
  }
  
  // Default to OTC if no eligibility tags found
  if (badges.length === 0) {
    badges.push("otc");
  }
  
  return badges;
}

/** Get eligibility from tags first, fall back to category */
export function getEligibilityBadges(
  tags: string[] | null | undefined,
  categorySlug: string
): EligibilityType[] {
  // Check tags first
  if (tags && tags.length > 0) {
    const eligibilityTags = tags.filter((t) => t.startsWith("eligibility:"));
    if (eligibilityTags.length > 0) {
      return tagsToEligibility(eligibilityTags);
    }
  }
  
  // Fall back to category-based
  return categoryToEligibility(categorySlug);
}
