import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  qualifierOptions,
  qualifierQuestions,
  qualifierRules,
} from "@/db/schema";

export type QualifierAnswer = {
  questionSlug: string;
  optionSlugs: string[]; // single-choice => length 1
};

export type ProductAdjustment = {
  hidden: boolean;
  scoreDelta: number; // boost positive, penalty negative
};

type CandidateProduct = {
  id: string;
  tags: string[] | null;
  productClassId: string | null;
};

type QuestionRow = {
  id: string;
  productClassId: string;
  slug: string;
};

type OptionRow = {
  id: string;
  questionId: string;
  slug: string;
};

type RuleRow = {
  optionId: string;
  effect: string;
  matchTag: string | null;
  matchProductId: string | null;
  weight: number;
};

function makeBaselineAdjustments(
  candidates: CandidateProduct[]
): Map<string, ProductAdjustment> {
  return new Map(
    candidates.map((p) => [p.id, { hidden: false, scoreDelta: 0 }])
  );
}

export function evaluateQualifiersWithData(params: {
  productClassIds: string[];
  answers: QualifierAnswer[];
  candidateProducts: CandidateProduct[];
  questions: QuestionRow[];
  options: OptionRow[];
  rules: RuleRow[];
}): Map<string, ProductAdjustment> {
  const { productClassIds, answers, candidateProducts, questions, options, rules } =
    params;

  const adjustments = makeBaselineAdjustments(candidateProducts);
  if (!answers.length || !candidateProducts.length || !productClassIds.length) {
    return adjustments;
  }

  const classSet = new Set(productClassIds);
  const questionsBySlug = new Map<string, QuestionRow>();
  for (const q of questions) {
    if (!classSet.has(q.productClassId)) continue;
    if (!questionsBySlug.has(q.slug)) questionsBySlug.set(q.slug, q);
  }

  const selectedOptionIds = new Set<string>();
  const optionsByQuestion = new Map<string, Map<string, OptionRow>>();
  for (const o of options) {
    const m = optionsByQuestion.get(o.questionId) ?? new Map<string, OptionRow>();
    m.set(o.slug, o);
    optionsByQuestion.set(o.questionId, m);
  }

  for (const answer of answers) {
    const q = questionsBySlug.get(answer.questionSlug);
    if (!q) continue;
    const optionMap = optionsByQuestion.get(q.id);
    if (!optionMap) continue;
    for (const optionSlug of answer.optionSlugs) {
      const option = optionMap.get(optionSlug);
      if (option) selectedOptionIds.add(option.id);
    }
  }

  if (!selectedOptionIds.size) return adjustments;

  const selectedRules = rules.filter((r) => selectedOptionIds.has(r.optionId));
  const productTags = new Map<string, Set<string>>();
  for (const p of candidateProducts) {
    productTags.set(p.id, new Set(p.tags ?? []));
  }

  const hiddenProductIds = new Set<string>();
  for (const rule of selectedRules) {
    if (rule.effect !== "hide") continue;
    for (const p of candidateProducts) {
      if (p.productClassId == null || !classSet.has(p.productClassId)) continue;
      const byProduct = rule.matchProductId != null && rule.matchProductId === p.id;
      const byTag =
        rule.matchTag != null && productTags.get(p.id)?.has(rule.matchTag) === true;
      if (byProduct || byTag) hiddenProductIds.add(p.id);
    }
  }

  for (const id of hiddenProductIds) {
    adjustments.set(id, { hidden: true, scoreDelta: 0 });
  }

  for (const rule of selectedRules) {
    if (rule.effect !== "boost" && rule.effect !== "penalty") continue;
    for (const p of candidateProducts) {
      if (p.productClassId == null || !classSet.has(p.productClassId)) continue;
      if (hiddenProductIds.has(p.id)) continue;
      const byProduct = rule.matchProductId != null && rule.matchProductId === p.id;
      const byTag =
        rule.matchTag != null && productTags.get(p.id)?.has(rule.matchTag) === true;
      if (!byProduct && !byTag) continue;
      const current = adjustments.get(p.id) ?? { hidden: false, scoreDelta: 0 };
      const delta = rule.effect === "boost" ? rule.weight : -rule.weight;
      adjustments.set(p.id, {
        hidden: false,
        scoreDelta: current.scoreDelta + delta,
      });
    }
  }

  return adjustments;
}

export async function evaluateQualifiers(params: {
  productClassIds: string[];
  answers: QualifierAnswer[];
  candidateProducts: CandidateProduct[];
}): Promise<Map<string, ProductAdjustment>> {
  const { productClassIds, answers, candidateProducts } = params;
  if (!candidateProducts.length) return new Map();
  if (!answers.length || !productClassIds.length) {
    return makeBaselineAdjustments(candidateProducts);
  }

  const questions = await db
    .select({
      id: qualifierQuestions.id,
      productClassId: qualifierQuestions.productClassId,
      slug: qualifierQuestions.slug,
    })
    .from(qualifierQuestions)
    .where(
      and(
        eq(qualifierQuestions.active, true),
        inArray(qualifierQuestions.productClassId, productClassIds)
      )
    );

  if (!questions.length) return makeBaselineAdjustments(candidateProducts);

  const questionIds = questions.map((q) => q.id);
  const options = await db
    .select({
      id: qualifierOptions.id,
      questionId: qualifierOptions.questionId,
      slug: qualifierOptions.slug,
    })
    .from(qualifierOptions)
    .where(inArray(qualifierOptions.questionId, questionIds));

  if (!options.length) return makeBaselineAdjustments(candidateProducts);

  const optionIds = options.map((o) => o.id);
  const rules = await db
    .select({
      optionId: qualifierRules.optionId,
      effect: qualifierRules.effect,
      matchTag: qualifierRules.matchTag,
      matchProductId: qualifierRules.matchProductId,
      weight: qualifierRules.weight,
    })
    .from(qualifierRules)
    .where(inArray(qualifierRules.optionId, optionIds));

  return evaluateQualifiersWithData({
    productClassIds,
    answers,
    candidateProducts,
    questions,
    options,
    rules,
  });
}
