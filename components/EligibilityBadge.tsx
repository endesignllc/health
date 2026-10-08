"use client";

import { cn } from "@/lib/utils";

export type EligibilityType = "otc" | "home_safety" | "food" | "utilities" | "dual_purpose";

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
