import assert from "node:assert/strict";
import {
  evaluateQualifiersWithData,
  type QualifierAnswer,
} from "@/lib/qualifiers";
import { rankClassCandidates } from "@/lib/bundle-builder";

type Candidate = {
  id: string;
  sku: string;
  productClassId: string | null;
  tags: string[] | null;
};

const HEARING_CLASS_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_CLASS_ID = "22222222-2222-2222-2222-222222222222";

const fixtureProducts: Candidate[] = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    sku: "HEAR-AMP-A",
    productClassId: HEARING_CLASS_ID,
    tags: ["form:ite", "power:rechargeable", "usability:easy_controls"],
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
    sku: "HEAR-AMP-B",
    productClassId: HEARING_CLASS_ID,
    tags: ["form:bte", "power:rechargeable"],
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
    sku: "HEAR-AMP-C",
    productClassId: HEARING_CLASS_ID,
    tags: ["form:ite", "power:disposable"],
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4",
    sku: "HEAR-AMP-D",
    productClassId: HEARING_CLASS_ID,
    tags: ["form:bte", "power:disposable", "usability:easy_controls"],
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
    sku: "UNTOUCHED-NO-CLASS",
    productClassId: null,
    tags: ["power:rechargeable"],
  },
];

const questions = [
  { id: "q-style", productClassId: HEARING_CLASS_ID, slug: "style-preference" },
  { id: "q-battery", productClassId: HEARING_CLASS_ID, slug: "battery-type" },
  { id: "q-controls", productClassId: HEARING_CLASS_ID, slug: "easy-controls" },
];

const options = [
  { id: "o-in-ear", questionId: "q-style", slug: "in_ear" },
  { id: "o-behind-ear", questionId: "q-style", slug: "behind_ear" },
  { id: "o-style-none", questionId: "q-style", slug: "no_pref" },
  { id: "o-recharge", questionId: "q-battery", slug: "rechargeable" },
  { id: "o-replaceable", questionId: "q-battery", slug: "replaceable" },
  { id: "o-battery-none", questionId: "q-battery", slug: "no_pref" },
  { id: "o-controls-yes", questionId: "q-controls", slug: "yes" },
  { id: "o-controls-none", questionId: "q-controls", slug: "no_pref" },
];

const rules = [
  { optionId: "o-in-ear", effect: "hide", matchTag: "form:bte", matchProductId: null, weight: 0 },
  {
    optionId: "o-behind-ear",
    effect: "hide",
    matchTag: "form:ite",
    matchProductId: null,
    weight: 0,
  },
  {
    optionId: "o-recharge",
    effect: "boost",
    matchTag: "power:rechargeable",
    matchProductId: null,
    weight: 10,
  },
  {
    optionId: "o-replaceable",
    effect: "boost",
    matchTag: "power:disposable",
    matchProductId: null,
    weight: 10,
  },
  {
    optionId: "o-controls-yes",
    effect: "boost",
    matchTag: "usability:easy_controls",
    matchProductId: null,
    weight: 15,
  },
];

function evaluate(answers: QualifierAnswer[]) {
  return evaluateQualifiersWithData({
    productClassIds: [HEARING_CLASS_ID],
    answers,
    candidateProducts: fixtureProducts,
    questions,
    options,
    rules,
  });
}

function rankedByAdjustments(adjustments: ReturnType<typeof evaluate>) {
  const base = fixtureProducts
    .filter((p) => p.productClassId === HEARING_CLASS_ID)
    .map((p, index) => ({ product: p, score: 100 - index }));
  return rankClassCandidates({ ranked: base, adjustments }).map((x) => x.product.sku);
}

function runUnitTests() {
  const empty = evaluate([]);
  for (const p of fixtureProducts) {
    const adj = empty.get(p.id);
    assert.equal(adj?.hidden, false);
    assert.equal(adj?.scoreDelta, 0);
  }

  const singleHide = evaluate([{ questionSlug: "style-preference", optionSlugs: ["in_ear"] }]);
  assert.equal(singleHide.get(fixtureProducts[1]!.id)?.hidden, true);
  assert.equal(singleHide.get(fixtureProducts[3]!.id)?.hidden, true);
  assert.equal(singleHide.get(fixtureProducts[0]!.id)?.hidden, false);

  const singleBoost = evaluate([{ questionSlug: "battery-type", optionSlugs: ["rechargeable"] }]);
  assert.equal(singleBoost.get(fixtureProducts[0]!.id)?.scoreDelta, 10);
  assert.equal(singleBoost.get(fixtureProducts[1]!.id)?.scoreDelta, 10);
  assert.equal(singleBoost.get(fixtureProducts[2]!.id)?.scoreDelta, 0);

  const penaltyRules = [
    ...rules,
    {
      optionId: "o-penalty",
      effect: "penalty",
      matchTag: "power:disposable",
      matchProductId: null,
      weight: 7,
    },
  ];
  const penaltyOptions = [...options, { id: "o-penalty", questionId: "q-battery", slug: "penalize_disposable" }];
  const penaltyAdj = evaluateQualifiersWithData({
    productClassIds: [HEARING_CLASS_ID],
    answers: [{ questionSlug: "battery-type", optionSlugs: ["penalize_disposable"] }],
    candidateProducts: fixtureProducts,
    questions,
    options: penaltyOptions,
    rules: penaltyRules,
  });
  assert.equal(penaltyAdj.get(fixtureProducts[2]!.id)?.scoreDelta, -7);
  assert.equal(penaltyAdj.get(fixtureProducts[3]!.id)?.scoreDelta, -7);

  const hideAndBoost = evaluate([
    { questionSlug: "style-preference", optionSlugs: ["in_ear"] },
    { questionSlug: "battery-type", optionSlugs: ["rechargeable"] },
  ]);
  assert.equal(hideAndBoost.get(fixtureProducts[1]!.id)?.hidden, true);
  assert.equal(hideAndBoost.get(fixtureProducts[1]!.id)?.scoreDelta, 0);

  const unknownSlugs = evaluate([
    { questionSlug: "does-not-exist", optionSlugs: ["unknown"] },
  ]);
  for (const p of fixtureProducts) {
    const adj = unknownSlugs.get(p.id);
    assert.equal(adj?.hidden, false);
    assert.equal(adj?.scoreDelta, 0);
  }

  const untouchedNoClass = evaluate([
    { questionSlug: "battery-type", optionSlugs: ["rechargeable"] },
  ]);
  assert.equal(
    untouchedNoClass.get("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1")?.scoreDelta,
    0
  );
}

function runIntegrationLikeTests() {
  const baselineAdjustments = evaluate([]);
  const baselineRanked = rankedByAdjustments(baselineAdjustments);
  const baselineSnapshot = JSON.stringify(baselineRanked);
  assert.equal(
    baselineSnapshot,
    JSON.stringify(["HEAR-AMP-A", "HEAR-AMP-B", "HEAR-AMP-C", "HEAR-AMP-D"])
  );

  const inEarOnly = evaluate([
    { questionSlug: "style-preference", optionSlugs: ["in_ear"] },
  ]);
  const inEarRanked = rankedByAdjustments(inEarOnly);
  assert.deepEqual(inEarRanked, ["HEAR-AMP-A", "HEAR-AMP-C"]);

  const rechargeablePref = evaluate([
    { questionSlug: "style-preference", optionSlugs: ["no_pref"] },
    { questionSlug: "battery-type", optionSlugs: ["rechargeable"] },
  ]);
  const rechargeableRanked = rankedByAdjustments(rechargeablePref);
  assert.ok(rechargeableRanked.indexOf("HEAR-AMP-A") < rechargeableRanked.indexOf("HEAR-AMP-C"));
  assert.ok(rechargeableRanked.indexOf("HEAR-AMP-B") < rechargeableRanked.indexOf("HEAR-AMP-D"));

  const easyControls = evaluate([
    { questionSlug: "style-preference", optionSlugs: ["no_pref"] },
    { questionSlug: "battery-type", optionSlugs: ["rechargeable"] },
    { questionSlug: "easy-controls", optionSlugs: ["yes"] },
  ]);
  const easyControlsRanked = rankedByAdjustments(easyControls);
  assert.ok(easyControlsRanked.indexOf("HEAR-AMP-A") < easyControlsRanked.indexOf("HEAR-AMP-C"));
  assert.ok(easyControlsRanked.indexOf("HEAR-AMP-D") < easyControlsRanked.indexOf("HEAR-AMP-C"));
}

runUnitTests();
runIntegrationLikeTests();
process.stdout.write("test:qualifiers passed\n");
