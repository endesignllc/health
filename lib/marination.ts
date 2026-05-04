/**
 * BRD §4.6 — hold vs substitute when SKUs are out of stock (MVP heuristics).
 * No live vendor API; uses product.inStock + restockEtaHours.
 */

const HOLD_THRESHOLD_HOURS = 72;

export type MarinationLineStatus = "ok" | "hold" | "substitute_needed";

export interface MarinationProductInput {
  sku: string;
  name: string;
  inStock: boolean;
  restockEtaHours: number | null;
  alternateSkus: string[] | null;
}

export interface MarinationLineResult {
  sku: string;
  status: MarinationLineStatus;
  reason: string;
  suggestedAlternates?: string[];
}

export interface MarinationBundleResult {
  canShipComplete: boolean;
  lines: MarinationLineResult[];
  /** True if every OOS line can wait ≤72h for restock. */
  shouldHoldBundle: boolean;
  /** True if any line needs substitution (long restock or no ETA). */
  needsSubstitution: boolean;
}

export function evaluateMarinationForBundle(
  lines: MarinationProductInput[]
): MarinationBundleResult {
  const results: MarinationLineResult[] = [];
  let needsSubstitution = false;
  let holdCandidate = true;

  for (const p of lines) {
    if (p.inStock) {
      results.push({ sku: p.sku, status: "ok", reason: "In stock" });
      continue;
    }

    const eta = p.restockEtaHours;
    const alternates = (p.alternateSkus ?? []).filter(Boolean);

    if (eta != null && eta <= HOLD_THRESHOLD_HOURS) {
      results.push({
        sku: p.sku,
        status: "hold",
        reason: `Out of stock; restock within ~${eta}h (≤${HOLD_THRESHOLD_HOURS}h — hold bundle)`,
      });
      continue;
    }

    needsSubstitution = true;
    holdCandidate = false;
    results.push({
      sku: p.sku,
      status: "substitute_needed",
      reason:
        eta == null
          ? "Out of stock; no ETA — substitute or cancel line"
          : `Restock ETA ${eta}h > ${HOLD_THRESHOLD_HOURS}h — substitute`,
      suggestedAlternates: alternates.length ? alternates : undefined,
    });
  }

  const canShipComplete = results.every((r) => r.status === "ok");
  const shouldHoldBundle =
    !canShipComplete &&
    results.every(
      (r) => r.status === "ok" || r.status === "hold"
    ) &&
    results.some((r) => r.status === "hold");

  return {
    canShipComplete,
    lines: results,
    shouldHoldBundle,
    needsSubstitution,
  };
}
