/** Median of a non-empty sorted array (ascending). */
export function medianSorted(sorted: number[]): number {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Median after removing exactly one lowest and one highest value.
 * Returns null when there are fewer than 3 samples.
 */
export function trimmedMedianCents(prices: number[]): number | null {
  if (prices.length < 3) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);
  return Math.round(medianSorted(trimmed));
}

/** Summary stats for a list of observed prices in cents. */
export function summarizePriceSamplesCents(prices: number[]): {
  sampleCount: number;
  minCents: number | null;
  maxCents: number | null;
  trimmedMedianCents: number | null;
  p25Cents: number | null;
  p75Cents: number | null;
} {
  if (prices.length === 0) {
    return {
      sampleCount: 0,
      minCents: null,
      maxCents: null,
      trimmedMedianCents: null,
      p25Cents: null,
      p75Cents: null,
    };
  }
  const sorted = [...prices].sort((a, b) => a - b);
  const n = sorted.length;
  const minCents = sorted[0]!;
  const maxCents = sorted[n - 1]!;
  const trimmedMedianValue = trimmedMedianCents(prices);
  const p25Cents = sorted[Math.max(0, Math.floor(0.25 * (n - 1)))]!;
  const p75Cents = sorted[Math.min(n - 1, Math.ceil(0.75 * (n - 1)))]!;
  return {
    sampleCount: n,
    minCents,
    maxCents,
    trimmedMedianCents: trimmedMedianValue,
    p25Cents,
    p75Cents,
  };
}
