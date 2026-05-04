import { db } from "./db";
import { needs, products, needProductRules, qualifierQuestions } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  evaluateQualifiers,
  type ProductAdjustment,
  type QualifierAnswer,
} from "@/lib/qualifiers";
import {
  summarizeBundleSufficiency,
  type BundleSufficiencySummary,
  type Cadence,
  type LineSufficiency,
  type UsageIntensity,
} from "@/lib/sufficiency";
export type { Cadence } from "@/lib/sufficiency";
import { expandWellnessGoalsToTagHints } from "@/lib/wellness-goals";

const DEFAULT_BUFFER_CENTS = 500; // $5

/** Max quantity of a product a person would use before benefit renews */
export function maxQtyForCadence(cadence: Cadence, supplyDays: number): number {
  if (supplyDays >= 365) return 1; // durable: 1 per period
  const periodDays = cadence === "monthly" ? 30 : 90;
  return Math.min(Math.ceil(periodDays / supplyDays), 3);
}

/** Single recommendation profile (replaces essential / balanced / comprehensive cards). */
export type BundleTier = "optimized";

/** Core = rule-driven picks; support = extra need-category fill; maintenance = everyday balance. */
export type BundleItemSection = "core" | "support" | "maintenance";

export interface BundleItem {
  productId: string;
  productSku: string;
  productName: string;
  productImageUrl: string | null;
  productClassId: string | null;
  categoryId: string;
  categorySlug: string;
  priceCents: number;
  quantity: number;
  lineTotalCents: number;
  section: BundleItemSection;
  sufficiency?: LineSufficiency;
}

export interface BuiltBundle {
  id?: string;
  bundleSku: string;
  needSlug: string;
  needName: string;
  cadence: Cadence;
  budgetCents: number;
  tier: BundleTier;
  subtotalCents: number;
  remainingCents: number;
  /** Core + support (based on your needs), excludes maintenance. */
  needSubtotalCents: number;
  coreSubtotalCents: number;
  supportSubtotalCents: number;
  maintenanceSubtotalCents: number;
  items: BundleItem[];
  budgetUtilizationPercent: number;
  sufficiency: BundleSufficiencySummary;
}

export interface BundleBuilderInput {
  needSlug: string;
  budgetCents: number;
  cadence: Cadence;
  goals?: string[];
  bufferCents?: number;
  usageIntensity?: UsageIntensity;
  qualifierAnswers?: QualifierAnswer[];
}

function scoringGoalTags(goals?: string[]): string[] {
  if (!goals?.length) return [];
  const out = new Set<string>();
  for (const g of goals) {
    const expanded = expandWellnessGoalsToTagHints([g]);
    if (expanded.length > 0) expanded.forEach((x) => out.add(x));
    else out.add(g.toLowerCase());
  }
  return [...out];
}

function maintenanceScore(
  p: { tags: string[] | null; priceCents: number },
  goalTags: string[]
): number {
  let score = 0;
  const tags = p.tags ?? [];
  if (tags.includes("maintenance")) score += 5;
  if (tags.includes("staple")) score += 4;
  if (goalTags.length) {
    const goalMatches = goalTags.filter((g) =>
      tags.some((t) => t.toLowerCase().includes(g.toLowerCase()))
    );
    score += goalMatches.length;
  }
  if (tags.includes("value")) score += 2;
  if (tags.includes("core")) score += 1;
  return score * 100_000 - p.priceCents;
}

const MAINTENANCE_CATEGORY_SLUGS = new Set([
  "vitamins",
  "pain-relief",
  "supplements",
  "mobility",
  "respiratory",
]);

/** Everyday / balance SKUs (may overlap need categories—different products fill remaining benefit). */
function isMaintenanceCandidate(
  p: {
    id: string;
    tags: string[] | null;
    category: { slug: string } | null;
  },
  inBundle: Set<string>
): boolean {
  if (inBundle.has(p.id)) return false;
  const tags = p.tags ?? [];
  const slug = p.category?.slug ?? "";

  if (tags.includes("maintenance") || tags.includes("staple")) return true;

  return (
    MAINTENANCE_CATEGORY_SLUGS.has(slug) &&
    (tags.includes("value") || tags.includes("core"))
  );
}

function sectionRank(s: BundleItemSection): number {
  if (s === "core") return 3;
  if (s === "support") return 2;
  return 1;
}

function strongerSection(a: BundleItemSection, b: BundleItemSection): BundleItemSection {
  return sectionRank(a) >= sectionRank(b) ? a : b;
}

function addOrMergeLine(
  items: BundleItem[],
  qtyByProduct: Map<string, number>,
  product: {
    id: string;
    sku: string;
    name: string;
    imageUrl: string | null;
    productClassId: string | null;
    categoryId: string;
    category: { slug: string } | null;
    priceCents: number;
  },
  qty: number,
  section: BundleItemSection
) {
  const lineTotal = product.priceCents * qty;
  const existing = items.find((it) => it.productId === product.id);
  if (existing) {
    existing.quantity += qty;
    existing.lineTotalCents += lineTotal;
    existing.section = strongerSection(existing.section, section);
  } else {
    items.push({
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      productImageUrl: product.imageUrl,
      productClassId: product.productClassId,
      categoryId: product.categoryId,
      categorySlug: product.category?.slug ?? "",
      priceCents: product.priceCents,
      quantity: qty,
      lineTotalCents: lineTotal,
      section,
    });
  }
  qtyByProduct.set(product.id, (qtyByProduct.get(product.id) ?? 0) + qty);
}

type RankedCandidate<TProduct extends { id: string }> = {
  product: TProduct;
  score: number;
};

function applyQualifierAdjustmentsToRanked<TProduct extends { id: string }>(
  ranked: RankedCandidate<TProduct>[],
  adjustments: Map<string, ProductAdjustment>
): RankedCandidate<TProduct>[] {
  return ranked
    .filter((entry) => !(adjustments.get(entry.product.id)?.hidden ?? false))
    .map((entry) => ({
      ...entry,
      score: entry.score + (adjustments.get(entry.product.id)?.scoreDelta ?? 0),
    }))
    .sort((a, b) => b.score - a.score);
}

export function rankClassCandidates<TProduct extends { id: string }>(params: {
  ranked: RankedCandidate<TProduct>[];
  adjustments: Map<string, ProductAdjustment>;
}): RankedCandidate<TProduct>[] {
  return applyQualifierAdjustmentsToRanked(params.ranked, params.adjustments);
}

function sumSectionCents(items: BundleItem[], section: BundleItemSection): number {
  return items
    .filter((i) => i.section === section)
    .reduce((s, i) => s + i.lineTotalCents, 0);
}

/**
 * One budget-tuned bundle: need-aligned items first (rules + category fill),
 * then everyday / maintenance fill up to the benefit cap (without going over).
 */
export async function buildBundles(
  input: BundleBuilderInput
): Promise<BuiltBundle[]> {
  const bufferCents = input.bufferCents ?? DEFAULT_BUFFER_CENTS;
  const capCents = Math.max(0, input.budgetCents - bufferCents);
  const goalTags = scoringGoalTags(input.goals);
  const usageIntensity: UsageIntensity = input.usageIntensity ?? "daily";

  const need = await db.query.needs.findFirst({
    where: eq(needs.slug, input.needSlug),
  });
  if (!need) throw new Error("Need not found");

  const rules = await db.query.needProductRules.findMany({
    where: eq(needProductRules.needId, need.id),
    with: { requiredCategory: true },
  });

  const eligibleProducts = await db.query.products.findMany({
    where: and(eq(products.active, true), eq(products.eligible, true)),
    with: { category: true },
  });
  const qualifierAnswers = input.qualifierAnswers ?? [];
  const classIds = [
    ...new Set(
      eligibleProducts
        .map((p) => p.productClassId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const qualifierAdjustments = await evaluateQualifiers({
    productClassIds: classIds,
    answers: qualifierAnswers,
    candidateProducts: eligibleProducts.map((p) => ({
      id: p.id,
      tags: p.tags,
      productClassId: p.productClassId,
    })),
  });
  const qualifierClassRows =
    classIds.length > 0
      ? await db
          .select({ productClassId: qualifierQuestions.productClassId })
          .from(qualifierQuestions)
          .where(
            and(
              eq(qualifierQuestions.active, true),
              inArray(qualifierQuestions.productClassId, classIds)
            )
          )
      : [];
  const classIdsWithQualifiers = new Set(
    qualifierClassRows.map((r) => r.productClassId)
  );
  const classQualifierBonus = (productClassId: string | null): number =>
    productClassId && classIdsWithQualifiers.has(productClassId) ? 10 : 0;

  const categoryIdsFromRules = [
    ...new Set(rules.map((r) => r.requiredCategoryId)),
  ];
  const productsByCategory = new Map<string, typeof eligibleProducts>();
  for (const p of eligibleProducts) {
    if (categoryIdsFromRules.includes(p.categoryId)) {
      const list = productsByCategory.get(p.categoryId) ?? [];
      list.push(p);
      productsByCategory.set(p.categoryId, list);
    }
  }

  const items: BundleItem[] = [];
  const qtyByProduct = new Map<string, number>();
  let subtotalCents = 0;

  const sortedRules = [...rules].sort(
    (a, b) => (b.priorityWeight ?? 0) - (a.priorityWeight ?? 0)
  );

  for (const rule of sortedRules) {
    const catProducts = productsByCategory.get(rule.requiredCategoryId) ?? [];
    const remaining = capCents - subtotalCents;
    if (remaining <= 0 || catProducts.length === 0) continue;

    const scored = rankClassCandidates({
      ranked: catProducts
      .map((p) => {
        let score = rule.priorityWeight ?? 1;
        const tags = p.tags ?? [];
        if (goalTags.length) {
          const goalMatches = goalTags.filter((g) =>
            tags.some((t) => t.toLowerCase().includes(g.toLowerCase()))
          );
          score += goalMatches.length * 2;
        }
        if (tags.includes("core") || tags.includes("preferred")) score += 3;
        if (tags.includes("value")) score += 2;
        score += classQualifierBonus(p.productClassId);
        return { product: p, score };
      })
      .sort((a, b) => b.score - a.score),
      adjustments: qualifierAdjustments,
    });

    const maxItems = Math.min(
      rule.maxItems,
      Math.floor(remaining / (scored[0]?.product.priceCents ?? 1)) || 1
    );
    const toAdd = Math.min(rule.maxItems, Math.max(rule.minItems, maxItems));

    for (let i = 0; i < toAdd && i < scored.length; i++) {
      const { product } = scored[i];
      const price = product.priceCents;
      const supplyDays = product.supplyDays ?? 30;
      const maxQty = maxQtyForCadence(input.cadence, supplyDays);
      const room = capCents - subtotalCents;
      const qty = Math.min(maxQty, Math.floor(room / price) || 1);
      if (qty < 1) continue;
      const lineTotal = price * qty;
      if (subtotalCents + lineTotal <= capCents) {
        subtotalCents += lineTotal;
        addOrMergeLine(items, qtyByProduct, product, qty, "core");
      }
    }
  }

  const allPoolProducts = eligibleProducts.filter((p) =>
    categoryIdsFromRules.includes(p.categoryId)
  );
  const scoredPool = rankClassCandidates({
    ranked: allPoolProducts
    .map((p) => {
      let score = 1;
      const tags = p.tags ?? [];
      if (goalTags.length) {
        const goalMatches = goalTags.filter((g) =>
          tags.some((t) => t.toLowerCase().includes(g.toLowerCase()))
        );
        score += goalMatches.length * 2;
      }
      if (tags.includes("core") || tags.includes("preferred")) score += 3;
      if (tags.includes("value")) score += 2;
      score += classQualifierBonus(p.productClassId);
      return { product: p, score };
    })
    .sort((a, b) => b.score - a.score),
    adjustments: qualifierAdjustments,
  });

  for (const { product } of scoredPool) {
    const remaining = capCents - subtotalCents;
    if (remaining <= 0) break;
    const supplyDays = product.supplyDays ?? 30;
    const maxQty = maxQtyForCadence(input.cadence, supplyDays);
    const currentQty = qtyByProduct.get(product.id) ?? 0;
    if (currentQty >= maxQty) continue;
    const canAdd = Math.min(
      maxQty - currentQty,
      Math.floor(remaining / product.priceCents)
    );
    if (canAdd < 1) continue;
    const qty = canAdd;
    const lineTotal = product.priceCents * qty;
    if (subtotalCents + lineTotal <= capCents) {
      subtotalCents += lineTotal;
      addOrMergeLine(items, qtyByProduct, product, qty, "support");
    }
  }

  const inBundle = new Set(items.map((i) => i.productId));
  const maintPool = rankClassCandidates({
    ranked: eligibleProducts
    .filter((p) => isMaintenanceCandidate(p, inBundle))
    .map((p) => ({
      product: p,
      score: maintenanceScore(p, goalTags) + classQualifierBonus(p.productClassId),
    }))
    .sort((a, b) => b.score - a.score),
    adjustments: qualifierAdjustments,
  });

  for (const { product } of maintPool) {
    const remaining = capCents - subtotalCents;
    if (remaining <= 0) break;
    const supplyDays = product.supplyDays ?? 30;
    const maxQty = maxQtyForCadence(input.cadence, supplyDays);
    const currentQty = qtyByProduct.get(product.id) ?? 0;
    if (currentQty >= maxQty) continue;
    const canAdd = Math.min(
      maxQty - currentQty,
      Math.floor(remaining / product.priceCents)
    );
    if (canAdd < 1) continue;
    const qty = canAdd;
    const lineTotal = product.priceCents * qty;
    if (subtotalCents + lineTotal <= capCents) {
      subtotalCents += lineTotal;
      addOrMergeLine(items, qtyByProduct, product, qty, "maintenance");
    }
  }

  const bundleSku = `BNDL-${need.slug.toUpperCase().slice(0, 3)}-${input.budgetCents / 100}-${input.cadence === "quarterly" ? "Q" : "M"}-OPT`;

  const draft: BuiltBundle = {
    bundleSku,
    needSlug: need.slug,
    needName: need.name,
    cadence: input.cadence,
    budgetCents: input.budgetCents,
    tier: "optimized",
    subtotalCents,
    remainingCents: input.budgetCents - subtotalCents,
    coreSubtotalCents: sumSectionCents(items, "core"),
    supportSubtotalCents: sumSectionCents(items, "support"),
    needSubtotalCents:
      sumSectionCents(items, "core") + sumSectionCents(items, "support"),
    maintenanceSubtotalCents: sumSectionCents(items, "maintenance"),
    items,
    budgetUtilizationPercent: 0,
    sufficiency: {
      targetDays: input.cadence === "monthly" ? 30 : 90,
      lines: [],
      minCoverageDays: null,
      worstLabel: "unknown",
      usageIntensity,
    },
  };

  const allIds = [...new Set(draft.items.map((i) => i.productId))];
  const pmap = new Map<
    string,
    { supplyDays: number; unitsPerPackage: number; estimatedDailyUse: number | null }
  >();
  if (allIds.length > 0) {
    const rows = await db
      .select({
        id: products.id,
        supplyDays: products.supplyDays,
        unitsPerPackage: products.unitsPerPackage,
        estimatedDailyUse: products.estimatedDailyUse,
      })
      .from(products)
      .where(inArray(products.id, allIds));
    for (const r of rows) {
      pmap.set(r.id, {
        supplyDays: r.supplyDays,
        unitsPerPackage: r.unitsPerPackage ?? 1,
        estimatedDailyUse: r.estimatedDailyUse,
      });
    }
  }

  const summary = summarizeBundleSufficiency(
    draft.items,
    pmap,
    input.cadence,
    usageIntensity
  );
  const util =
    draft.budgetCents > 0
      ? Math.min(100, Math.round((draft.subtotalCents / draft.budgetCents) * 100))
      : 0;

  return [
    {
      ...draft,
      budgetUtilizationPercent: util,
      sufficiency: summary,
      items: draft.items.map((it, idx) => ({
        ...it,
        sufficiency: summary.lines[idx],
      })),
    },
  ];
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
