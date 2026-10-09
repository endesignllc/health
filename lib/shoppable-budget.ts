import type { PlanConfig } from "@/lib/plan-config/types";
import { currentBenefitPeriod } from "@/lib/benefit-period";

/** Smallest member spend, and the stepper increment. */
export const MEMBER_SPEND_MIN_CENTS = 2000;
export const MEMBER_SPEND_STEP_CENTS = 2000;

export interface ShoppablePurse {
  id: string;
  label: string;
  remainingCents: number;
}

export interface ShoppableBudget {
  /** Purse remainders the bundle wizard can spend. */
  shoppableCents: number;
  /** Info-only purse remainders — participating stores, not this catalog. */
  infoOnlyCents: number;
  /** Catalog purses the wizard does not spend (Shop Products instead). */
  wizardExcludedCents: number;
  /** All purse remainders. */
  totalAvailableCents: number;
  infoOnlyLabels: string[];
  wizardExcludedLabels: string[];
  shoppablePurses: ShoppablePurse[];
  renewsOn: string | null;
}

export function joinPurseLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/** Shoppable dollars from plan purse definitions (the demo wallet source of truth). */
export function shoppableBudgetFromPlan(plan: PlanConfig): ShoppableBudget {
  const rows = plan.wallet.purses.map((p) => ({
    id: p.id,
    label: p.label,
    remainingCents: Math.max(0, p.allowanceCents - (p.usedCents ?? 0)),
    infoOnly: Boolean(p.infoOnly),
    excludeFromWizard: Boolean(p.excludeFromWizard),
  }));

  const shoppable = rows.filter((p) => !p.infoOnly && !p.excludeFromWizard && p.remainingCents > 0);
  const infoOnly = rows.filter((p) => p.infoOnly);
  const wizardExcluded = rows.filter((p) => p.excludeFromWizard);
  const shoppableCents = shoppable.reduce((sum, p) => sum + p.remainingCents, 0);
  const infoOnlyCents = infoOnly.reduce((sum, p) => sum + p.remainingCents, 0);
  const wizardExcludedCents = wizardExcluded.reduce((sum, p) => sum + p.remainingCents, 0);

  return {
    shoppableCents,
    infoOnlyCents,
    wizardExcludedCents,
    totalAvailableCents: shoppableCents + infoOnlyCents + wizardExcludedCents,
    infoOnlyLabels: infoOnly.map((p) => p.label),
    wizardExcludedLabels: wizardExcluded.map((p) => p.label),
    shoppablePurses: shoppable.map(({ id, label, remainingCents }) => ({
      id,
      label,
      remainingCents,
    })),
    renewsOn:
      plan.defaultCadence === "monthly"
        ? currentBenefitPeriod().renewsOnLabel
        : plan.wallet.renewsOn ?? null,
  };
}

/**
 * Scale purse remainders down to a chosen budget without exceeding any purse.
 * When budget >= shoppable, caps equal the remainders.
 */
export function scalePurseCaps(
  purses: ShoppablePurse[],
  budgetCents: number
): { id: string; label: string; capCents: number }[] {
  const positive = purses.filter((p) => p.remainingCents > 0);
  const total = positive.reduce((sum, p) => sum + p.remainingCents, 0);
  if (total <= 0 || budgetCents <= 0) {
    return positive.map((p) => ({ id: p.id, label: p.label, capCents: 0 }));
  }

  const spend = Math.min(budgetCents, total);
  const raw = positive.map((p) => {
    const exact = (p.remainingCents * spend) / total;
    const floor = Math.floor(exact);
    return {
      id: p.id,
      label: p.label,
      floor,
      frac: exact - floor,
      capMax: p.remainingCents,
    };
  });

  let assigned = raw.reduce((sum, row) => sum + row.floor, 0);
  const byFrac = [...raw].sort((a, b) => b.frac - a.frac);
  let guard = 0;
  while (assigned < spend && guard < spend + positive.length) {
    let placed = false;
    for (const row of byFrac) {
      if (assigned >= spend) break;
      if (row.floor < row.capMax) {
        row.floor += 1;
        assigned += 1;
        placed = true;
      }
    }
    if (!placed) break;
    guard += 1;
  }

  return raw.map((row) => ({ id: row.id, label: row.label, capCents: row.floor }));
}

export function clampMemberSpendCents(cents: number, shoppableCents: number): number {
  const max = Math.max(MEMBER_SPEND_MIN_CENTS, shoppableCents);
  const min = Math.min(MEMBER_SPEND_MIN_CENTS, max);
  return Math.min(max, Math.max(min, Math.round(cents)));
}

export interface PurseSpendCap {
  id: string;
  label: string;
  capCents: number;
  spentCents: number;
}

/** Prefer the home-safety purse for safety items; otherwise OTC. */
export function candidatePurseIds(rails: string[] | null | undefined): string[] {
  const set = new Set(rails ?? []);
  const ids: string[] = [];
  if (set.has("home_safety")) ids.push("home_safety");
  if (set.has("otc") || ids.length === 0) ids.push("otc");
  return ids;
}

export function choosePurse(
  purses: PurseSpendCap[],
  rails: string[] | null | undefined,
  lineTotal: number
): PurseSpendCap | null {
  if (lineTotal <= 0) return null;
  for (const id of candidatePurseIds(rails)) {
    const purse = purses.find((p) => p.id === id);
    if (purse && purse.spentCents + lineTotal <= purse.capCents) return purse;
  }
  return null;
}
