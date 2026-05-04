import assert from "node:assert/strict";
import {
  evaluatePartnerPromotion,
  scoreProductWithPolicy,
  type PolicyAwareProduct,
} from "@/lib/optimizer-policy";

const product: PolicyAwareProduct = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  sku: "HEAR-AMP-A",
  itemNumber: "12345",
  name: "Medline ClearTone In-Ear Hearing Amplifier",
  description: "Rechargeable amplifier with easy controls",
  vendor: "medline",
};

const rules = [
  {
    id: "rule-1",
    policyId: "policy-1",
    ruleType: "push_list",
    priority: 1,
    enabled: true,
    payload: { skus: ["HEAR-AMP-A"] },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "rule-2",
    policyId: "policy-1",
    ruleType: "contains_text",
    priority: 50,
    enabled: true,
    payload: { terms: ["medline"], fields: ["name"] },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "rule-3",
    policyId: "policy-1",
    ruleType: "vendor_match",
    priority: 75,
    enabled: true,
    payload: { vendors: ["medline"], boostWeight: 4 },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
] as const;

function run() {
  const promotion = evaluatePartnerPromotion({
    product,
    rules: [...rules],
  });
  assert.equal(promotion.matchedRuleIds.length, 3);
  assert.ok(promotion.scoreDelta > 0);

  const policy = {
    id: "policy-1",
    name: "default",
    active: true,
    outcomeWeight: 70,
    partnerWeight: 30,
    requirePriceCompetitiveness: true,
    maxPriceDeltaPct: 20,
    enforceLockedQualifierFit: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const scoredWithinGuardrail = scoreProductWithPolicy({
    product,
    scoring: {
      baseScore: 10,
      memberOutcomeScore: 12,
      priceDeltaPct: 10,
    },
    policy,
    rules: [...rules],
  });
  assert.ok(scoredWithinGuardrail.score > 10);
  assert.ok(
    !scoredWithinGuardrail.reasonCodes.includes(
      "guardrail_limited:price_competitiveness"
    )
  );

  const scoredOutsideGuardrail = scoreProductWithPolicy({
    product,
    scoring: {
      baseScore: 10,
      memberOutcomeScore: 12,
      priceDeltaPct: 35,
    },
    policy,
    rules: [...rules],
  });
  assert.ok(
    scoredOutsideGuardrail.reasonCodes.includes(
      "guardrail_limited:price_competitiveness"
    )
  );
  assert.equal(scoredOutsideGuardrail.partnerPromotion.scoreDelta, 0);
}

run();
process.stdout.write("test:optimizer-policy passed\n");

