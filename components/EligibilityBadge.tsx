import { cn } from "@/lib/utils";
import type { BenefitBadgeType } from "@/lib/benefit-badges";

// Re-export for convenience
export type { BenefitBadgeType };

// Legacy type alias for backward compatibility
export type EligibilityType = BenefitBadgeType;

interface EligibilityBadgeProps {
  type: BenefitBadgeType;
  className?: string;
  compact?: boolean;
}

const BADGE_CONFIG: Record<
  BenefitBadgeType,
  { label: string; shortLabel: string; bgClass: string; textClass: string }
> = {
  otc: {
    label: "OTC Benefit",
    shortLabel: "OTC",
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-700",
  },
  home_safety: {
    label: "Home Safety",
    shortLabel: "Safety",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
  },
  dme_zero: {
    label: "$0 with your plan",
    shortLabel: "$0",
    bgClass: "bg-green-500",
    textClass: "text-white",
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
  vision: {
    label: "Vision",
    shortLabel: "Vision",
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-700",
  },
  hearing: {
    label: "Hearing",
    shortLabel: "Hearing",
    bgClass: "bg-cyan-100",
    textClass: "text-cyan-700",
  },
  dental: {
    label: "Dental",
    shortLabel: "Dental",
    bgClass: "bg-pink-100",
    textClass: "text-pink-700",
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
  types: BenefitBadgeType[];
  className?: string;
  compact?: boolean;
  /** Max badges to show before "+N" overflow */
  maxBadges?: number;
}

/** Display a row of eligibility badges with optional overflow */
export function EligibilityBadges({
  types,
  className,
  compact = false,
  maxBadges = 2,
}: EligibilityBadgesProps) {
  if (types.length === 0) return null;

  const visibleBadges = types.slice(0, maxBadges);
  const overflowCount = types.length - maxBadges;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visibleBadges.map((type) => (
        <EligibilityBadge key={type} type={type} compact={compact} />
      ))}
      {overflowCount > 0 && (
        <span
          className={cn(
            "inline-flex items-center rounded-full font-medium bg-gray-100 text-gray-600",
            compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
          )}
        >
          +{overflowCount}
        </span>
      )}
    </div>
  );
}

// ============================================================
// Legacy functions for backward compatibility during migration
// These will be removed once all call sites use deriveBenefitBadges
// ============================================================

/** @deprecated Use deriveBenefitBadges from lib/benefit-badges instead */
export function categoryToEligibility(categorySlug: string): BenefitBadgeType[] {
  // Fallback for products without class - returns empty (no badges)
  // Per spec: "Products whose class has no rails → no badge (never a fallback badge)"
  return [];
}

/** @deprecated Use deriveBenefitBadges from lib/benefit-badges instead */
export function tagsToEligibility(tags: string[]): BenefitBadgeType[] {
  const badges: BenefitBadgeType[] = [];
  
  for (const tag of tags) {
    if (tag === "eligibility:otc") badges.push("otc");
    if (tag === "eligibility:home_safety") badges.push("home_safety");
    if (tag === "eligibility:zero_cost" || tag === "eligibility:dme_zero") badges.push("dme_zero");
    if (tag === "eligibility:food") badges.push("food");
    if (tag === "eligibility:utilities") badges.push("utilities");
  }
  
  return badges;
}

/** @deprecated Use deriveBenefitBadges from lib/benefit-badges instead */
export function getEligibilityBadges(
  tags: string[] | null | undefined,
  categorySlug: string
): BenefitBadgeType[] {
  // Check tags first for overrides
  if (tags && tags.length > 0) {
    const eligibilityTags = tags.filter((t) => t.startsWith("eligibility:"));
    if (eligibilityTags.length > 0) {
      return tagsToEligibility(eligibilityTags);
    }
  }
  
  // No fallback to category - return empty per spec
  return [];
}
