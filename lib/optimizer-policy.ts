import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  optimizerPolicies,
  partnerPromotionRules,
} from "@/db/schema";

type OptimizerPolicyRow = typeof optimizerPolicies.$inferSelect;
type PartnerPromotionRuleRow = typeof partnerPromotionRules.$inferSelect;

export type PartnerRuleType =
  | "allowlist"
  | "push_list"
  | "contains_text"
  | "vendor_match";

export type PromotionRulePayload = {
  skus?: string[];
  itemNumbers?: string[];
  terms?: string[];
  fields?: Array<"name" | "description" | "vendor">;
  vendors?: string[];
  boostWeight?: number;
};

export type PolicyAwareProduct = {
  id: string;
  sku: string | null;
  itemNumber?: string | null;
  name: string;
  description?: string | null;
  vendor?: string | null;
  tags?: string[] | null;
};

export type PolicyScoreInput = {
  baseScore: number;
  memberOutcomeScore?: number;
  partnerAdoptionScore?: number;
  priceDeltaPct?: number | null;
};

export type PartnerPromotionEvaluation = {
  scoreDelta: number;
  matchedRuleIds: string[];
  reasonCodes: string[];
};

export type PolicyScoreResult = {
  score: number;
  reasonCodes: string[];
  partnerPromotion: PartnerPromotionEvaluation;
};

export type ActiveOptimizerPolicy = {
  policy: OptimizerPolicyRow;
  rules: PartnerPromotionRuleRow[];
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function asPayload(value: unknown): PromotionRulePayload {
  if (!value || typeof value !== "object") return {};
  return value as PromotionRulePayload;
}

function normalizeRuleType(value: string): PartnerRuleType | null {
  if (
    value === "allowlist" ||
    value === "push_list" ||
    value === "contains_text" ||
    value === "vendor_match"
  ) {
    return value;
  }
  return null;
}

function weightForRule(ruleType: PartnerRuleType, payload: PromotionRulePayload): number {
  const payloadWeight = Number(payload.boostWeight);
  if (Number.isFinite(payloadWeight)) return payloadWeight;
  if (ruleType === "push_list") return 18;
  if (ruleType === "allowlist") return 10;
  if (ruleType === "vendor_match") return 6;
  return 5;
}

function matchesContainsRule(product: PolicyAwareProduct, payload: PromotionRulePayload): boolean {
  const terms = (payload.terms ?? []).map(normalize).filter(Boolean);
  if (terms.length === 0) return false;
  const fields = payload.fields ?? ["name", "description", "vendor"];
  const haystacks = fields.map((field) => normalize(product[field]));
  return terms.some((term) => haystacks.some((haystack) => haystack.includes(term)));
}

function matchesAllowlistRule(product: PolicyAwareProduct, payload: PromotionRulePayload): boolean {
  const skuSet = new Set((payload.skus ?? []).map(normalize).filter(Boolean));
  const itemSet = new Set((payload.itemNumbers ?? []).map(normalize).filter(Boolean));
  const skuMatch = skuSet.has(normalize(product.sku));
  const itemMatch = itemSet.has(normalize(product.itemNumber));
  return skuMatch || itemMatch;
}

function matchesVendorRule(product: PolicyAwareProduct, payload: PromotionRulePayload): boolean {
  const vendors = new Set((payload.vendors ?? []).map(normalize).filter(Boolean));
  if (vendors.size === 0) return false;
  return vendors.has(normalize(product.vendor));
}

export function evaluatePartnerPromotion(params: {
  product: PolicyAwareProduct;
  rules: PartnerPromotionRuleRow[];
}): PartnerPromotionEvaluation {
  let scoreDelta = 0;
  const matchedRuleIds: string[] = [];
  const reasonCodes: string[] = [];

  const sorted = [...params.rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    const ruleType = normalizeRuleType(rule.ruleType);
    if (!ruleType) continue;
    const payload = asPayload(rule.payload);

    let matched = false;
    if (ruleType === "push_list" || ruleType === "allowlist") {
      matched = matchesAllowlistRule(params.product, payload);
    } else if (ruleType === "contains_text") {
      matched = matchesContainsRule(params.product, payload);
    } else if (ruleType === "vendor_match") {
      matched = matchesVendorRule(params.product, payload);
    }

    if (!matched) continue;
    matchedRuleIds.push(rule.id);
    scoreDelta += weightForRule(ruleType, payload);
    reasonCodes.push(`partner_policy_match:${ruleType}`);
  }

  return { scoreDelta, matchedRuleIds, reasonCodes };
}

export function scoreProductWithPolicy(params: {
  product: PolicyAwareProduct;
  scoring: PolicyScoreInput;
  policy: OptimizerPolicyRow;
  rules: PartnerPromotionRuleRow[];
}): PolicyScoreResult {
  const partnerPromotion = evaluatePartnerPromotion({
    product: params.product,
    rules: params.rules,
  });

  let effectivePartnerDelta = partnerPromotion.scoreDelta;
  const reasonCodes = [...partnerPromotion.reasonCodes];

  if (
    params.policy.requirePriceCompetitiveness &&
    params.policy.maxPriceDeltaPct !== null &&
    params.scoring.priceDeltaPct !== null &&
    params.scoring.priceDeltaPct !== undefined &&
    params.scoring.priceDeltaPct > params.policy.maxPriceDeltaPct
  ) {
    effectivePartnerDelta = 0;
    reasonCodes.push("guardrail_limited:price_competitiveness");
  }

  const outcomeWeight = Math.max(0, Math.min(100, params.policy.outcomeWeight));
  const partnerWeight = Math.max(0, Math.min(100, params.policy.partnerWeight));
  const weightTotal = Math.max(1, outcomeWeight + partnerWeight);

  const outcomeRatio = outcomeWeight / weightTotal;
  const partnerRatio = partnerWeight / weightTotal;

  const outcomeScore =
    params.scoring.memberOutcomeScore ?? params.scoring.baseScore;
  const partnerScore =
    params.scoring.partnerAdoptionScore ?? effectivePartnerDelta;

  const score =
    params.scoring.baseScore +
    outcomeScore * outcomeRatio +
    partnerScore * partnerRatio;

  return {
    score,
    reasonCodes,
    partnerPromotion: {
      ...partnerPromotion,
      scoreDelta: effectivePartnerDelta,
    },
  };
}

export async function getActivePolicy(): Promise<ActiveOptimizerPolicy | null> {
  const [policy] = await db
    .select()
    .from(optimizerPolicies)
    .where(eq(optimizerPolicies.active, true))
    .limit(1);

  if (!policy) return null;

  const rules = await db
    .select()
    .from(partnerPromotionRules)
    .where(
      and(
        eq(partnerPromotionRules.policyId, policy.id),
        eq(partnerPromotionRules.enabled, true)
      )
    )
    .orderBy(asc(partnerPromotionRules.priority));

  return { policy, rules };
}

export function isOptimizerPolicyEnabled(): boolean {
  return process.env.OPTIMIZER_POLICY_ENABLED === "true";
}

export function isPartnerPolicyEnabled(): boolean {
  return process.env.PARTNER_POLICY_ENABLED === "true";
}

