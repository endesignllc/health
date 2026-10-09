/**
 * Benefit Badge Derivation
 * 
 * Badge = "this product is payable from this benefit, on your plan"
 * 
 * Derivation logic:
 * 1. Get product's class benefit_rails (the universal eligibility layer)
 * 2. Intersect with active plan config's purse ids + dme_zero (the plan layer)
 * 3. Apply per-product tag overrides (e.g., eligibility:zero_cost on specific SKUs)
 * 4. Products without class rails → no badges (never a fallback)
 */

import type { PlanConfig } from "@/lib/plan-config/types";

// Badge types that can render
export type BenefitBadgeType =
  | "otc"
  | "home_safety"
  | "dme_zero"      // renders as "$0 with your plan"
  | "food"
  | "utilities"
  | "vision"
  | "hearing"
  | "dental"
  | "dual_purpose"; // renders as "Dual Purpose*"

// Map from class benefit_rails values to badge types
const RAIL_TO_BADGE: Record<string, BenefitBadgeType> = {
  otc: "otc",
  home_safety: "home_safety",
  dme_zero: "dme_zero",
  food: "food",
  utilities: "utilities",
  vision: "vision",
  hearing: "hearing",
  dental: "dental",
};

// Map from product tags to badge type overrides
const TAG_TO_BADGE: Record<string, BenefitBadgeType> = {
  "eligibility:otc": "otc",
  "eligibility:home_safety": "home_safety",
  "eligibility:zero_cost": "dme_zero",
  "eligibility:dme_zero": "dme_zero",
  "eligibility:food": "food",
  "eligibility:utilities": "utilities",
  "eligibility:vision": "vision",
  "eligibility:hearing": "hearing",
  "eligibility:dental": "dental",
};

export interface ProductForBadging {
  /** Product class with benefit rails */
  productClass?: {
    benefitRails?: string[] | null;
    dualPurpose?: boolean | null;
  } | null;
  /** Per-product override tags */
  tags?: string[] | null;
}

export interface BadgeDerivationResult {
  /** Badges to display (already filtered by plan) */
  badges: BenefitBadgeType[];
  /** Whether to show dual-purpose microcopy */
  isDualPurpose: boolean;
}

/**
 * Get plan-active rails from config
 * Includes purse IDs + always includes dme_zero (it's a special $0-with-plan state)
 */
function getActivePlanRails(planConfig: PlanConfig): Set<string> {
  const activeRails = new Set<string>();
  
  // Add purse IDs as active rails
  for (const purse of planConfig.wallet.purses) {
    // Normalize purse ID to rail ID
    // e.g., "otc-allowance" → "otc", "home-safety" → "home_safety"
    const railId = purse.id
      .replace("-allowance", "")
      .replace(/-/g, "_");
    activeRails.add(railId);
  }
  
  // dme_zero is always active if any purse covers DME items
  // (it represents $0-copay items that the plan pays in full)
  activeRails.add("dme_zero");
  
  return activeRails;
}

/**
 * Derive benefit badges for a product
 * 
 * @param product - Product with class and tags
 * @param planConfig - Active plan configuration
 * @returns Badges to display and dual-purpose flag
 */
export function deriveBenefitBadges(
  product: ProductForBadging,
  planConfig: PlanConfig
): BadgeDerivationResult {
  const badges: BenefitBadgeType[] = [];
  let isDualPurpose = false;
  
  const activeRails = getActivePlanRails(planConfig);
  
  // 1. Get class benefit rails (primary source)
  const classRails = product.productClass?.benefitRails ?? [];
  isDualPurpose = product.productClass?.dualPurpose ?? false;
  
  // 2. Intersect class rails with plan's active rails
  for (const rail of classRails) {
    if (activeRails.has(rail)) {
      const badge = RAIL_TO_BADGE[rail];
      if (badge && !badges.includes(badge)) {
        badges.push(badge);
      }
    }
  }
  
  // 3. Apply per-product tag overrides (additions)
  const productTags = product.tags ?? [];
  for (const tag of productTags) {
    const badge = TAG_TO_BADGE[tag];
    if (badge && !badges.includes(badge)) {
      // Tag overrides always add (for special cases like $0 stockings)
      badges.push(badge);
    }
  }
  
  // 4. Add dual_purpose as a badge if the class is marked dual
  if (isDualPurpose && !badges.includes("dual_purpose")) {
    badges.push("dual_purpose");
  }
  
  // 5. Sort badges by priority: dme_zero first (strongest message), then otc, then others
  badges.sort((a, b) => {
    const priority: Record<BenefitBadgeType, number> = {
      dme_zero: 0,      // "$0 with your plan" is strongest
      otc: 1,           // Most common
      home_safety: 2,
      food: 3,
      utilities: 4,
      vision: 5,
      hearing: 6,
      dental: 7,
      dual_purpose: 8,  // Always last
    };
    return (priority[a] ?? 99) - (priority[b] ?? 99);
  });
  
  return { badges, isDualPurpose };
}

/**
 * Get badges for a product without plan filtering
 * (for admin/debugging - shows all class rails)
 */
export function getAllProductBadges(product: ProductForBadging): BenefitBadgeType[] {
  const badges: BenefitBadgeType[] = [];
  
  // Get class rails
  const classRails = product.productClass?.benefitRails ?? [];
  for (const rail of classRails) {
    const badge = RAIL_TO_BADGE[rail];
    if (badge && !badges.includes(badge)) {
      badges.push(badge);
    }
  }
  
  // Add tag overrides
  const productTags = product.tags ?? [];
  for (const tag of productTags) {
    const badge = TAG_TO_BADGE[tag];
    if (badge && !badges.includes(badge)) {
      badges.push(badge);
    }
  }
  
  // Add dual_purpose
  if (product.productClass?.dualPurpose) {
    badges.push("dual_purpose");
  }
  
  return badges;
}
