import type { PlanConfig } from "./types";
import { defaultPlanConfig } from "./configs/default";
import { laurelCompleteCare } from "./configs/laurel-complete-care";

const PLAN_CONFIGS: Record<string, PlanConfig> = {
  "healthbenefits-shop": defaultPlanConfig,
  "laurel-complete-care": laurelCompleteCare,
};

/**
 * Resolve the active plan configuration.
 * Set PLAN_CONFIG env var to switch plans (e.g., "laurel-complete-care").
 */
export function getPlanConfig(): PlanConfig {
  const slug = process.env.PLAN_CONFIG?.trim().toLowerCase();
  if (slug && PLAN_CONFIGS[slug]) {
    return PLAN_CONFIGS[slug];
  }
  return defaultPlanConfig;
}

/** Get a specific plan config by slug */
export function getPlanConfigBySlug(slug: string): PlanConfig | null {
  return PLAN_CONFIGS[slug] ?? null;
}

/** Check if a specific plan is active */
export function isPlanActive(slug: string): boolean {
  return getPlanConfig().slug === slug;
}

/** Get display name for a need, with plan-specific overrides */
export function getNeedDisplayName(
  needSlug: string,
  defaultName: string,
  config?: PlanConfig
): string {
  const planConfig = config ?? getPlanConfig();
  return planConfig.needDisplayNames?.[needSlug] ?? defaultName;
}

/** Check if a need should be visible in the wizard */
export function isNeedVisibleInWizard(needSlug: string, config?: PlanConfig): boolean {
  const planConfig = config ?? getPlanConfig();
  if (!planConfig.visibleNeeds || planConfig.visibleNeeds.length === 0) {
    return true; // No filter = show all
  }
  return planConfig.visibleNeeds.includes(needSlug);
}

/** Total allowance across all purses */
export function getTotalAllowanceCents(config?: PlanConfig): number {
  const planConfig = config ?? getPlanConfig();
  return planConfig.wallet.purses.reduce((sum, p) => sum + p.allowanceCents, 0);
}
