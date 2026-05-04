export type Cadence = "monthly" | "quarterly";

export type UsageIntensity = "daily" | "occasional";

export type SufficiencyLabel =
  | "undersupplied"
  | "rightsized"
  | "oversupplied"
  | "unknown";

export function periodDaysForCadence(cadence: Cadence): number {
  return cadence === "monthly" ? 30 : 90;
}

export interface SufficiencyProductInput {
  supplyDays: number;
  unitsPerPackage: number;
  estimatedDailyUse: number | null;
}

/** Effective daily consumption in “units per day” (after intensity). */
export function effectiveDailyUnitsPerDay(
  p: SufficiencyProductInput,
  usageIntensity: UsageIntensity
): number | null {
  const up = Math.max(1, p.unitsPerPackage);
  let base: number | null;
  if (p.estimatedDailyUse != null && p.estimatedDailyUse > 0) {
    base = p.estimatedDailyUse;
  } else if (p.supplyDays >= 365) {
    return null;
  } else if (p.supplyDays > 0) {
    base = up / p.supplyDays;
  } else {
    return null;
  }
  const factor = usageIntensity === "occasional" ? 0.5 : 1;
  return Math.max(base * factor, 1e-6);
}

export function coverageDaysForLine(
  p: SufficiencyProductInput,
  quantity: number,
  usageIntensity: UsageIntensity
): number | null {
  if (p.supplyDays >= 365) {
    return null; // durable goods: caller marks rightsized for the period
  }
  const daily = effectiveDailyUnitsPerDay(p, usageIntensity);
  if (daily == null) return null;
  const up = Math.max(1, p.unitsPerPackage);
  const totalUnits = Math.max(1, quantity) * up;
  return totalUnits / daily;
}

export function sufficiencyLabel(
  coverageDays: number | null,
  targetDays: number,
  tolerance = 0.15
): SufficiencyLabel {
  if (coverageDays == null || !Number.isFinite(coverageDays)) return "unknown";
  const low = targetDays * (1 - tolerance);
  const high = targetDays * (1 + tolerance);
  if (coverageDays < low) return "undersupplied";
  if (coverageDays > high) return "oversupplied";
  return "rightsized";
}

export interface LineSufficiency {
  productId: string;
  productSku: string;
  coverageDays: number | null;
  label: SufficiencyLabel;
  targetDays: number;
}

export interface BundleSufficiencySummary {
  targetDays: number;
  lines: LineSufficiency[];
  /** Smallest finite coverage among consumables (excluding unknown). */
  minCoverageDays: number | null;
  worstLabel: SufficiencyLabel;
  usageIntensity: UsageIntensity;
}

export function summarizeBundleSufficiency(
  items: Array<{ productId: string; productSku: string; quantity: number }>,
  productsById: Map<string, SufficiencyProductInput>,
  cadence: Cadence,
  usageIntensity: UsageIntensity
): BundleSufficiencySummary {
  const targetDays = periodDaysForCadence(cadence);
  const lines: LineSufficiency[] = [];
  const coverages: number[] = [];
  const severity: SufficiencyLabel[] = [
    "undersupplied",
    "unknown",
    "oversupplied",
    "rightsized",
  ];
  let worst: SufficiencyLabel = "rightsized";

  for (const item of items) {
    const p = productsById.get(item.productId);
    let coverage: number | null = null;
    let label: SufficiencyLabel = "unknown";
    if (p) {
      if (p.supplyDays >= 365) {
        coverage = targetDays;
        label = "rightsized";
      } else {
        coverage = coverageDaysForLine(p, item.quantity, usageIntensity);
        label = sufficiencyLabel(coverage, targetDays);
        if (coverage != null && Number.isFinite(coverage)) coverages.push(coverage);
      }
    }
    lines.push({
      productId: item.productId,
      productSku: item.productSku,
      coverageDays: coverage,
      label,
      targetDays,
    });
    if (severity.indexOf(label) < severity.indexOf(worst)) worst = label;
  }

  const minCoverageDays =
    coverages.length > 0 ? Math.min(...coverages) : null;

  return {
    targetDays,
    lines,
    minCoverageDays,
    worstLabel: worst,
    usageIntensity,
  };
}
