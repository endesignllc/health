import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { needQualifierOptions, needQualifierRules } from "@/db/schema";

export type NeedQualifierEffect = {
  productId: string | null;
  productClassId: string | null;
  matchTag: string | null;
  effect: "include" | "skip" | "boost";
  weight: number;
};

/**
 * Evaluates need qualifier rules based on selected option IDs.
 * Returns a list of effects that should be applied to products.
 */
export async function evaluateNeedQualifiers(
  optionIds: string[]
): Promise<NeedQualifierEffect[]> {
  if (optionIds.length === 0) return [];

  // Verify the option IDs exist
  const validOptions = await db
    .select({ id: needQualifierOptions.id })
    .from(needQualifierOptions)
    .where(inArray(needQualifierOptions.id, optionIds));

  if (validOptions.length === 0) return [];

  const validOptionIds = validOptions.map((o) => o.id);

  // Get all rules for these options
  const rules = await db
    .select({
      optionId: needQualifierRules.optionId,
      effect: needQualifierRules.effect,
      matchTag: needQualifierRules.matchTag,
      matchProductId: needQualifierRules.matchProductId,
      matchProductClassId: needQualifierRules.matchProductClassId,
      weight: needQualifierRules.weight,
    })
    .from(needQualifierRules)
    .where(inArray(needQualifierRules.optionId, validOptionIds));

  return rules.map((r) => ({
    productId: r.matchProductId,
    productClassId: r.matchProductClassId,
    matchTag: r.matchTag,
    effect: r.effect as "include" | "skip" | "boost",
    weight: r.weight,
  }));
}

export type NeedQualifierAdjustment = {
  forceInclude: boolean;
  forceSkip: boolean;
  scoreDelta: number;
};

/**
 * Applies need qualifier effects to a set of candidate products.
 * Returns a map of product ID to adjustment.
 */
export function applyNeedQualifierEffects(
  effects: NeedQualifierEffect[],
  products: Array<{
    id: string;
    tags: string[] | null;
    productClassId: string | null;
  }>
): Map<string, NeedQualifierAdjustment> {
  const adjustments = new Map<string, NeedQualifierAdjustment>();

  // Initialize all products with baseline
  for (const p of products) {
    adjustments.set(p.id, { forceInclude: false, forceSkip: false, scoreDelta: 0 });
  }

  for (const effect of effects) {
    for (const p of products) {
      const current = adjustments.get(p.id)!;

      // Check if this effect applies to this product
      let matches = false;

      // Match by specific product ID
      if (effect.productId && effect.productId === p.id) {
        matches = true;
      }

      // Match by product class ID
      if (effect.productClassId && effect.productClassId === p.productClassId) {
        matches = true;
      }

      // Match by tag
      if (effect.matchTag) {
        const tags = (p.tags ?? []).map((t) => t.toLowerCase());
        if (tags.includes(effect.matchTag.toLowerCase())) {
          matches = true;
        }
      }

      if (!matches) continue;

      // Apply the effect
      if (effect.effect === "include") {
        current.forceInclude = true;
        current.scoreDelta += effect.weight;
      } else if (effect.effect === "skip") {
        current.forceSkip = true;
      } else if (effect.effect === "boost") {
        current.scoreDelta += effect.weight;
      }

      adjustments.set(p.id, current);
    }
  }

  return adjustments;
}
