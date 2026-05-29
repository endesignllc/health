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
import { affinityTagsForNeedSlug, needAffinityBonus } from "@/lib/need-affinity";
import {
  evaluateNeedQualifiers,
  applyNeedQualifierEffects,
  type NeedQualifierAdjustment,
} from "@/lib/need-qualifiers";
export type { Cadence } from "@/lib/sufficiency";

const DEFAULT_BUFFER_CENTS = 500; // $5

/** Unknown slug / resolver mismatch — maps to HTTP 400 + sanitized body */
export class BundleValidationError extends Error {
  readonly code = "BUNDLE_VALIDATION";
  constructor() {
    super("Bundle validation failed");
    this.name = "BundleValidationError";
  }
}

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

export type BundleNeedTier = 1 | 2 | 3;

export interface BundleItem {
  productId: string;
  productSku: string;
  productName: string;
  /** Raw listing copy — used for variant display until Phase 1.5 structured variants */
  productDescription: string | null;
  productImageUrl: string | null;
  productClassId: string | null;
  categoryId: string;
  categorySlug: string;
  priceCents: number;
  quantity: number;
  lineTotalCents: number;
  section: BundleItemSection;
  /** Display grouping — canonical need slug or `"everyday"` */
  bundleSection: string;
  /** Need tier when `bundleSection` is a need slug; null for everyday */
  priorityTier: BundleNeedTier | null;
  sufficiency?: LineSufficiency;
}

export interface BuiltBundle {
  id?: string;
  bundleSku: string;
  /** Primary need for cart routing — lowest priority_tier, ties broken by URL order; `"everyday"` when essentials-only */
  needSlug: string;
  needName: string;
  needSlugs: string[];
  needNames: string[];
  includeEveryday: boolean;
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
  /** Preferred — canonical DB slugs */
  needSlugs?: string[];
  /** Deprecated shim — wraps to `[needSlug]` when `needSlugs` absent */
  needSlug?: string;
  includeEveryday: boolean;
  budgetCents: number;
  cadence: Cadence;
  /** Accepted for backward compat; ignored for ranking / selection */
  goals?: string[];
  bufferCents?: number;
  usageIntensity?: UsageIntensity;
  qualifierAnswers?: QualifierAnswer[];
  /** Need-level qualifier option IDs selected by the user */
  needQualifierAnswers?: string[];
}

type EligibleProduct = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  productClassId: string | null;
  categoryId: string;
  category: { slug: string } | null;
  priceCents: number;
  supplyDays: number | null;
  tags: string[] | null;
  isEverydayEssential: boolean;
};

type NeedRow = {
  id: string;
  slug: string;
  name: string;
  priorityTier: number;
};

function maintenanceScore(p: { tags: string[] | null; priceCents: number }): number {
  let score = 0;
  const tags = p.tags ?? [];
  if (tags.includes("maintenance")) score += 5;
  if (tags.includes("staple")) score += 4;
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

/** Lower rank wins when merging duplicate SKUs across sections */
function bundleMetaRank(
  bundleSection: string,
  priorityTier: BundleNeedTier | null,
  urlOrder: string[]
): number {
  const tier = priorityTier ?? 999;
  const idx =
    bundleSection === "everyday"
      ? 99_999
      : Math.max(0, urlOrder.indexOf(bundleSection));
  return tier * 1_000_000 + idx;
}

function mergeBundleMeta(
  existing: { bundleSection: string; priorityTier: BundleNeedTier | null },
  incoming: { bundleSection: string; priorityTier: BundleNeedTier | null },
  urlOrder: string[]
): { bundleSection: string; priorityTier: BundleNeedTier | null } {
  const ra = bundleMetaRank(existing.bundleSection, existing.priorityTier, urlOrder);
  const rb = bundleMetaRank(incoming.bundleSection, incoming.priorityTier, urlOrder);
  return ra <= rb ? existing : incoming;
}

function addOrMergeLine(
  items: BundleItem[],
  qtyByProduct: Map<string, number>,
  product: EligibleProduct,
  qty: number,
  section: BundleItemSection,
  bundleSection: string,
  priorityTier: BundleNeedTier | null,
  urlOrder: string[]
) {
  const lineTotal = product.priceCents * qty;
  const existing = items.find((it) => it.productId === product.id);
  if (existing) {
    existing.quantity += qty;
    existing.lineTotalCents += lineTotal;
    existing.section = strongerSection(existing.section, section);
    const m = mergeBundleMeta(
      { bundleSection: existing.bundleSection, priorityTier: existing.priorityTier },
      { bundleSection, priorityTier },
      urlOrder
    );
    existing.bundleSection = m.bundleSection;
    existing.priorityTier = m.priorityTier;
  } else {
    items.push({
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      productDescription: product.description,
      productImageUrl: product.imageUrl,
      productClassId: product.productClassId,
      categoryId: product.categoryId,
      categorySlug: product.category?.slug ?? "",
      priceCents: product.priceCents,
      quantity: qty,
      lineTotalCents: lineTotal,
      section,
      bundleSection,
      priorityTier,
    });
  }
  qtyByProduct.set(product.id, (qtyByProduct.get(product.id) ?? 0) + qty);
}

type RankedCandidate<TProduct extends { id: string; priceCents: number; sku: string }> = {
  product: TProduct;
  score: number;
};

function sortCandidatesDeterministic<
  TProduct extends { id: string; priceCents: number; sku: string },
>(ranked: RankedCandidate<TProduct>[]): RankedCandidate<TProduct>[] {
  return [...ranked].sort((a, b) => {
    const ds = b.score - a.score;
    if (ds !== 0) return ds;
    const dp = a.product.priceCents - b.product.priceCents;
    if (dp !== 0) return dp;
    return a.product.sku.localeCompare(b.product.sku);
  });
}

function applyQualifierAdjustmentsOnly<
  TProduct extends { id: string; priceCents: number; sku: string },
>(
  ranked: RankedCandidate<TProduct>[],
  adjustments: Map<string, ProductAdjustment>
): RankedCandidate<TProduct>[] {
  return ranked
    .filter((entry) => !(adjustments.get(entry.product.id)?.hidden ?? false))
    .map((entry) => ({
      ...entry,
      score: entry.score + (adjustments.get(entry.product.id)?.scoreDelta ?? 0),
    }));
}

export function rankClassCandidates<
  TProduct extends { id: string; priceCents: number; sku: string },
>(params: {
  ranked: RankedCandidate<TProduct>[];
  adjustments: Map<string, ProductAdjustment>;
}): RankedCandidate<TProduct>[] {
  return sortCandidatesDeterministic(
    applyQualifierAdjustmentsOnly(params.ranked, params.adjustments)
  );
}

function sumSectionCents(items: BundleItem[], section: BundleItemSection): number {
  return items
    .filter((i) => i.section === section)
    .reduce((s, i) => s + i.lineTotalCents, 0);
}

function normalizeNeedSlugInput(input: BundleBuilderInput): string[] {
  const raw =
    input.needSlugs ??
    (input.needSlug !== undefined && input.needSlug !== "" ? [input.needSlug] : []);
  const ordered: string[] = [];
  for (const s of raw) {
    const t = s.trim();
    if (!t) continue;
    if (!ordered.includes(t)) ordered.push(t);
  }
  return ordered;
}

function computePrimaryNeed(
  resolvedNeeds: NeedRow[],
  urlOrder: string[]
): { slug: string; name: string } {
  if (resolvedNeeds.length === 0) {
    return { slug: "everyday", name: "Everyday Essentials" };
  }
  const sorted = [...resolvedNeeds].sort((a, b) => {
    if (a.priorityTier !== b.priorityTier) return a.priorityTier - b.priorityTier;
    return urlOrder.indexOf(a.slug) - urlOrder.indexOf(b.slug);
  });
  const first = sorted[0];
  return { slug: first.slug, name: first.name };
}

function excludeEverydayFromNeedPools(p: EligibleProduct, includeEverydaySlot: boolean): boolean {
  return !(includeEverydaySlot && p.isEverydayEssential);
}

const TIER_WEIGHT: Record<number, number> = {
  1: 0.6,
  2: 0.35,
  3: 0.05,
};

async function allocateEverydayEssentials(params: {
  everydayBudgetMax: number;
  cadence: Cadence;
  eligibleProducts: EligibleProduct[];
  qualifierAdjustments: Map<string, ProductAdjustment>;
  classQualifierBonus: (productClassId: string | null) => number;
  items: BundleItem[];
  qtyByProduct: Map<string, number>;
  globalSpent: { cents: number };
  capCents: number;
  urlOrder: string[];
}): Promise<void> {
  const {
    everydayBudgetMax,
    cadence,
    eligibleProducts,
    qualifierAdjustments,
    classQualifierBonus,
    items,
    qtyByProduct,
    globalSpent,
    capCents,
    urlOrder,
  } = params;

  let everydaySpent = 0;
  const pool = eligibleProducts.filter((p) => p.isEverydayEssential);

  const ranked = rankClassCandidates({
    ranked: pool.map((p) => ({
      product: p,
      score:
        (p.supplyDays ?? 30) * 1_000_000 -
        p.priceCents +
        classQualifierBonus(p.productClassId),
    })),
    adjustments: qualifierAdjustments,
  });

  for (const { product } of ranked) {
    if (everydaySpent >= everydayBudgetMax) break;
    const remainingSlot = everydayBudgetMax - everydaySpent;
    const remainingCap = capCents - globalSpent.cents;
    const remaining = Math.min(remainingSlot, remainingCap);
    if (remaining <= 0) break;

    const supplyDays = product.supplyDays ?? 30;
    const maxQty = maxQtyForCadence(cadence, supplyDays);
    const currentQty = qtyByProduct.get(product.id) ?? 0;
    if (currentQty >= maxQty) continue;

    const canAdd = Math.min(
      maxQty - currentQty,
      Math.floor(remaining / product.priceCents)
    );
    if (canAdd < 1) continue;

    const qty = canAdd;
    const lineTotal = product.priceCents * qty;
    if (globalSpent.cents + lineTotal <= capCents && everydaySpent + lineTotal <= everydayBudgetMax) {
      globalSpent.cents += lineTotal;
      everydaySpent += lineTotal;
      addOrMergeLine(
        items,
        qtyByProduct,
        product,
        qty,
        "maintenance",
        "everyday",
        null,
        urlOrder
      );
    }
  }
}

/**
 * Fill remaining budget pass — maximizes benefit utilization.
 * Called after all need-based and everyday allocations to add more products
 * until the budget is nearly exhausted.
 */
function fillRemainingBudget(params: {
  eligibleProducts: EligibleProduct[];
  qualifierAdjustments: Map<string, ProductAdjustment>;
  classQualifierBonus: (productClassId: string | null) => number;
  needQualifierBonus: (productId: string) => number;
  forceIncludeProductIds: Set<string>;
  items: BundleItem[];
  qtyByProduct: Map<string, number>;
  globalSpent: { cents: number };
  capCents: number;
  cadence: Cadence;
  urlOrder: string[];
  resolvedNeeds: NeedRow[];
}): void {
  const {
    eligibleProducts,
    qualifierAdjustments,
    classQualifierBonus,
    needQualifierBonus,
    forceIncludeProductIds,
    items,
    qtyByProduct,
    globalSpent,
    capCents,
    cadence,
    urlOrder,
    resolvedNeeds,
  } = params;

  const MIN_REMAINING_CENTS = 100; // stop when $1 or less remains

  const room = () => capCents - globalSpent.cents;
  if (room() <= MIN_REMAINING_CENTS) return;

  // Gather affinity tags from all selected needs
  const allAffinityTags = new Set<string>();
  for (const need of resolvedNeeds) {
    for (const tag of affinityTagsForNeedSlug(need.slug)) {
      allAffinityTags.add(tag.toLowerCase());
    }
  }

  // Score products: affinity boost + value considerations
  const scored = eligibleProducts.map((p) => {
    let score = 100;
    const tags = (p.tags ?? []).map((t) => t.toLowerCase());

    // Affinity boost for need-relevant products
    if (tags.some((t) => allAffinityTags.has(t))) score += 50;

    // Prefer products already in bundle (fill up quantities)
    if (qtyByProduct.has(p.id)) score += 20;

    // Prefer value tags
    if (tags.includes("core") || tags.includes("preferred")) score += 10;
    if (tags.includes("value")) score += 5;

    // Qualifier bonuses
    score += classQualifierBonus(p.productClassId);
    score += needQualifierBonus(p.id);

    // Force-include products get priority
    if (forceIncludeProductIds.has(p.id)) score += 1000;

    return { product: p, score };
  });

  // Apply qualifier adjustments and sort
  const ranked = rankClassCandidates({
    ranked: scored,
    adjustments: qualifierAdjustments,
  });

  // First pass: add more quantity to existing items
  for (const { product } of ranked) {
    if (room() <= MIN_REMAINING_CENTS) break;
    const currentQty = qtyByProduct.get(product.id) ?? 0;
    if (currentQty === 0) continue; // only existing items in this pass

    const supplyDays = product.supplyDays ?? 30;
    const maxQty = maxQtyForCadence(cadence, supplyDays);
    if (currentQty >= maxQty) continue;

    const canAdd = Math.min(
      maxQty - currentQty,
      Math.floor(room() / product.priceCents)
    );
    if (canAdd < 1) continue;

    const lineTotal = product.priceCents * canAdd;
    globalSpent.cents += lineTotal;

    // Find the need this product belongs to (for bundleSection)
    const existingItem = items.find((i) => i.productId === product.id);
    const bundleSection = existingItem?.bundleSection ?? "everyday";
    const tierNum = existingItem?.priorityTier ?? null;

    addOrMergeLine(
      items,
      qtyByProduct,
      product,
      canAdd,
      "support",
      bundleSection,
      tierNum,
      urlOrder
    );
  }

  // Second pass: add new products
  for (const { product } of ranked) {
    if (room() <= MIN_REMAINING_CENTS) break;
    const currentQty = qtyByProduct.get(product.id) ?? 0;
    if (currentQty > 0) continue; // already in bundle

    const supplyDays = product.supplyDays ?? 30;
    const maxQty = maxQtyForCadence(cadence, supplyDays);
    const canAdd = Math.min(maxQty, Math.floor(room() / product.priceCents));
    if (canAdd < 1) continue;

    const lineTotal = product.priceCents * canAdd;
    globalSpent.cents += lineTotal;

    // Tag products with affinity as belonging to the primary need
    const tags = (product.tags ?? []).map((t) => t.toLowerCase());
    const hasAffinity = tags.some((t) => allAffinityTags.has(t));
    const primaryNeed = resolvedNeeds[0];
    const bundleSection = hasAffinity && primaryNeed ? primaryNeed.slug : "everyday";
    const tierNum = hasAffinity && primaryNeed ? (primaryNeed.priorityTier as BundleNeedTier) : null;

    addOrMergeLine(
      items,
      qtyByProduct,
      product,
      canAdd,
      "support",
      bundleSection,
      tierNum,
      urlOrder
    );
  }
}

async function allocateSingleNeed(params: {
  need: NeedRow;
  subNeedCap: number;
  cadence: Cadence;
  eligibleProducts: EligibleProduct[];
  qualifierAdjustments: Map<string, ProductAdjustment>;
  classQualifierBonus: (productClassId: string | null) => number;
  needQualifierBonus: (productId: string) => number;
  forceIncludeProductIds: Set<string>;
  items: BundleItem[];
  qtyByProduct: Map<string, number>;
  globalSpent: { cents: number };
  capCents: number;
  urlOrder: string[];
  includeEverydaySlot: boolean;
}): Promise<void> {
  const {
    need,
    subNeedCap,
    cadence,
    eligibleProducts,
    qualifierAdjustments,
    classQualifierBonus,
    needQualifierBonus,
    forceIncludeProductIds,
    items,
    qtyByProduct,
    globalSpent,
    capCents,
    urlOrder,
    includeEverydaySlot,
  } = params;

  const tierNum = need.priorityTier as BundleNeedTier;
  const bundleSection = need.slug;
  const affinityTags = affinityTagsForNeedSlug(need.slug);

  const rules = await db.query.needProductRules.findMany({
    where: eq(needProductRules.needId, need.id),
    with: { requiredCategory: true },
  });

  const categoryIdsFromRules = [...new Set(rules.map((r) => r.requiredCategoryId))];
  const productsByCategory = new Map<string, EligibleProduct[]>();
  for (const p of eligibleProducts) {
    if (!excludeEverydayFromNeedPools(p, includeEverydaySlot)) continue;
    if (categoryIdsFromRules.includes(p.categoryId)) {
      const list = productsByCategory.get(p.categoryId) ?? [];
      list.push(p);
      productsByCategory.set(p.categoryId, list);
    }
  }

  let needSpent = 0;
  const roomGlobal = () => capCents - globalSpent.cents;
  const roomNeed = () => Math.min(subNeedCap - needSpent, roomGlobal());

  const sortedRules = [...rules].sort(
    (a, b) => (b.priorityWeight ?? 0) - (a.priorityWeight ?? 0)
  );

  for (const rule of sortedRules) {
    const remaining = roomNeed();
    if (remaining <= 0) break;

    const catProducts = productsByCategory.get(rule.requiredCategoryId) ?? [];
    if (catProducts.length === 0) continue;

    const scored = rankClassCandidates({
      ranked: catProducts.map((p) => {
        let score = rule.priorityWeight ?? 1;
        const tags = p.tags ?? [];
        if (tags.includes("core") || tags.includes("preferred")) score += 3;
        if (tags.includes("value")) score += 2;
        score += needAffinityBonus(tags, affinityTags);
        score += classQualifierBonus(p.productClassId);
        score += needQualifierBonus(p.id);
        // Force-include products get a massive boost
        if (forceIncludeProductIds.has(p.id)) score += 1000;
        return { product: p, score };
      }),
      adjustments: qualifierAdjustments,
    });

    const maxItems = Math.min(
      rule.maxItems,
      Math.floor(remaining / (scored[0]?.product.priceCents ?? 1)) || 1
    );
    const toAdd = Math.min(rule.maxItems, Math.max(rule.minItems, maxItems));

    for (let i = 0; i < toAdd && i < scored.length; i++) {
      const { product } = scored[i];
      const supplyDays = product.supplyDays ?? 30;
      const maxQty = maxQtyForCadence(cadence, supplyDays);
      const rm = roomNeed();
      if (rm <= 0) break;
      const qty = Math.min(maxQty, Math.floor(rm / product.priceCents) || 1);
      if (qty < 1) continue;
      const lineTotal = product.priceCents * qty;
      if (globalSpent.cents + lineTotal <= capCents && needSpent + lineTotal <= subNeedCap) {
        globalSpent.cents += lineTotal;
        needSpent += lineTotal;
        addOrMergeLine(items, qtyByProduct, product, qty, "core", bundleSection, tierNum, urlOrder);
      }
    }
  }

  const allPoolProducts = eligibleProducts.filter(
    (p) =>
      categoryIdsFromRules.includes(p.categoryId) &&
      excludeEverydayFromNeedPools(p, includeEverydaySlot)
  );

  const scoredPool = rankClassCandidates({
    ranked: allPoolProducts.map((p) => {
      let score = 1;
      const tags = p.tags ?? [];
      if (tags.includes("core") || tags.includes("preferred")) score += 3;
      if (tags.includes("value")) score += 2;
      score += needAffinityBonus(tags, affinityTags);
      score += classQualifierBonus(p.productClassId);
      score += needQualifierBonus(p.id);
      if (forceIncludeProductIds.has(p.id)) score += 1000;
      return { product: p, score };
    }),
    adjustments: qualifierAdjustments,
  });

  for (const { product } of scoredPool) {
    const rm = roomNeed();
    if (rm <= 0) break;
    const supplyDays = product.supplyDays ?? 30;
    const maxQty = maxQtyForCadence(cadence, supplyDays);
    const currentQty = qtyByProduct.get(product.id) ?? 0;
    if (currentQty >= maxQty) continue;
    const canAdd = Math.min(maxQty - currentQty, Math.floor(rm / product.priceCents));
    if (canAdd < 1) continue;
    const qty = canAdd;
    const lineTotal = product.priceCents * qty;
    if (globalSpent.cents + lineTotal <= capCents && needSpent + lineTotal <= subNeedCap) {
      globalSpent.cents += lineTotal;
      needSpent += lineTotal;
      addOrMergeLine(items, qtyByProduct, product, qty, "support", bundleSection, tierNum, urlOrder);
    }
  }

  const inBundle = new Set(items.map((i) => i.productId));
  const maintPool = rankClassCandidates({
    ranked: eligibleProducts
      .filter(
        (p) =>
          categoryIdsFromRules.includes(p.categoryId) &&
          excludeEverydayFromNeedPools(p, includeEverydaySlot) &&
          isMaintenanceCandidate(p, inBundle)
      )
      .map((p) => ({
        product: p,
        score: maintenanceScore(p) + classQualifierBonus(p.productClassId),
      })),
    adjustments: qualifierAdjustments,
  });

  for (const { product } of maintPool) {
    const rm = roomNeed();
    if (rm <= 0) break;
    const supplyDays = product.supplyDays ?? 30;
    const maxQty = maxQtyForCadence(cadence, supplyDays);
    const currentQty = qtyByProduct.get(product.id) ?? 0;
    if (currentQty >= maxQty) continue;
    const canAdd = Math.min(maxQty - currentQty, Math.floor(rm / product.priceCents));
    if (canAdd < 1) continue;
    const qty = canAdd;
    const lineTotal = product.priceCents * qty;
    if (globalSpent.cents + lineTotal <= capCents && needSpent + lineTotal <= subNeedCap) {
      globalSpent.cents += lineTotal;
      needSpent += lineTotal;
      addOrMergeLine(items, qtyByProduct, product, qty, "maintenance", bundleSection, tierNum, urlOrder);
    }
  }
}

async function buildQualifierContext(eligibleProducts: EligibleProduct[], qualifierAnswers: QualifierAnswer[]) {
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

  return { qualifierAdjustments, classQualifierBonus };
}

/**
 * One budget-tuned bundle: multi-need tier budgets + optional everyday essentials slot.
 */
export async function buildBundles(input: BundleBuilderInput): Promise<BuiltBundle[]> {
  const bufferCents = input.bufferCents ?? DEFAULT_BUFFER_CENTS;
  const capCents = Math.max(0, input.budgetCents - bufferCents);
  const usageIntensity: UsageIntensity = input.usageIntensity ?? "daily";

  const urlOrder = normalizeNeedSlugInput(input);

  const resolvedRows =
    urlOrder.length > 0
      ? await db.query.needs.findMany({
          where: inArray(needs.slug, urlOrder),
        })
      : [];

  if (urlOrder.length > 0 && resolvedRows.length !== urlOrder.length) {
    throw new BundleValidationError();
  }

  const resolvedNeeds: NeedRow[] = resolvedRows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    priorityTier: r.priorityTier,
  }));

  const primary = computePrimaryNeed(resolvedNeeds, urlOrder);
  const nameBySlug = Object.fromEntries(resolvedNeeds.map((r) => [r.slug, r.name]));
  const needNamesResolved = urlOrder.map((s) => nameBySlug[s]).filter(Boolean);

  const eligibleProductsRaw = await db.query.products.findMany({
    where: and(eq(products.active, true), eq(products.eligible, true)),
    with: { category: true },
  });

  const eligibleProductsRawMapped: EligibleProduct[] = eligibleProductsRaw.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description ?? null,
    imageUrl: p.imageUrl,
    productClassId: p.productClassId,
    categoryId: p.categoryId,
    category: p.category,
    priceCents: p.priceCents,
    supplyDays: p.supplyDays,
    tags: p.tags,
    isEverydayEssential: p.isEverydayEssential,
  }));

  // Process need qualifier answers
  const needQualifierOptionIds = input.needQualifierAnswers ?? [];
  const needQualifierEffects = await evaluateNeedQualifiers(needQualifierOptionIds);
  const needQualifierAdjustments = applyNeedQualifierEffects(
    needQualifierEffects,
    eligibleProductsRawMapped.map((p) => ({
      id: p.id,
      tags: p.tags,
      productClassId: p.productClassId,
    }))
  );

  // Filter out products that should be skipped based on need qualifiers
  const eligibleProducts = eligibleProductsRawMapped.filter((p) => {
    const adj = needQualifierAdjustments.get(p.id);
    return !adj?.forceSkip;
  });

  // Collect products that should be force-included
  const forceIncludeProductIds = new Set<string>();
  for (const [productId, adj] of needQualifierAdjustments) {
    if (adj.forceInclude) {
      forceIncludeProductIds.add(productId);
    }
  }

  const qualifierAnswers = input.qualifierAnswers ?? [];
  const { qualifierAdjustments, classQualifierBonus } = await buildQualifierContext(
    eligibleProducts,
    qualifierAnswers
  );

  // Create a combined score bonus function that includes need qualifier boosts
  const needQualifierBonus = (productId: string): number => {
    const adj = needQualifierAdjustments.get(productId);
    return adj?.scoreDelta ?? 0;
  };

  const items: BundleItem[] = [];
  const qtyByProduct = new Map<string, number>();
  const globalSpent = { cents: 0 };

  // Pre-pass: Add force-include products FIRST (from need qualifier answers)
  console.log("[bundle-builder] forceIncludeProductIds:", [...forceIncludeProductIds]);
  console.log("[bundle-builder] needQualifierAnswers input:", input.needQualifierAnswers);
  if (forceIncludeProductIds.size > 0 && resolvedNeeds.length > 0) {
    const primaryNeed = resolvedNeeds[0];
    for (const productId of forceIncludeProductIds) {
      const product = eligibleProducts.find((p) => p.id === productId);
      console.log("[bundle-builder] Looking for product:", productId, "found:", !!product);
      if (!product) continue;
      
      const supplyDays = product.supplyDays ?? 30;
      const maxQty = maxQtyForCadence(input.cadence, supplyDays);
      const qty = Math.min(maxQty, 1); // Start with 1 for durables
      const lineTotal = product.priceCents * qty;
      
      if (globalSpent.cents + lineTotal <= capCents) {
        globalSpent.cents += lineTotal;
        addOrMergeLine(
          items,
          qtyByProduct,
          product,
          qty,
          "core",
          primaryNeed.slug,
          primaryNeed.priorityTier as BundleNeedTier,
          urlOrder
        );
      }
    }
  }

  const includeSlot = input.includeEveryday;

  if (resolvedNeeds.length === 0 && includeSlot) {
    await allocateEverydayEssentials({
      everydayBudgetMax: capCents,
      cadence: input.cadence,
      eligibleProducts,
      qualifierAdjustments,
      classQualifierBonus,
      items,
      qtyByProduct,
      globalSpent,
      capCents,
      urlOrder,
    });
  } else if (resolvedNeeds.length > 0) {
    const everydayReserve =
      includeSlot ? Math.min(Math.floor(input.budgetCents * 0.1), 1500, capCents) : 0;
    const needPool = Math.max(0, capCents - everydayReserve);

    const tiers = [1, 2, 3] as const;
    const needsByTier = (t: number) =>
      resolvedNeeds.filter((n) => n.priorityTier === t).sort((a, b) => urlOrder.indexOf(a.slug) - urlOrder.indexOf(b.slug));

    for (const tier of tiers) {
      const tierNeeds = needsByTier(tier);
      if (tierNeeds.length === 0) continue;
      const weight = TIER_WEIGHT[tier] ?? 0;
      const tierBudget = Math.floor(needPool * weight);
      const perNeed = Math.floor(tierBudget / tierNeeds.length);

      for (const need of tierNeeds) {
        await allocateSingleNeed({
          need,
          subNeedCap: perNeed,
          cadence: input.cadence,
          eligibleProducts,
          qualifierAdjustments,
          classQualifierBonus,
          needQualifierBonus,
          forceIncludeProductIds,
          items,
          qtyByProduct,
          globalSpent,
          capCents,
          urlOrder,
          includeEverydaySlot: includeSlot,
        });
      }
    }

    if (includeSlot) {
      const everydayBudgetMax = Math.min(Math.floor(input.budgetCents * 0.1), 1500, capCents);
      await allocateEverydayEssentials({
        everydayBudgetMax,
        cadence: input.cadence,
        eligibleProducts,
        qualifierAdjustments,
        classQualifierBonus,
        items,
        qtyByProduct,
        globalSpent,
        capCents,
        urlOrder,
      });
    }

    // Fill remaining budget pass — maximize utilization
    fillRemainingBudget({
      eligibleProducts,
      qualifierAdjustments,
      classQualifierBonus,
      needQualifierBonus,
      forceIncludeProductIds,
      items,
      qtyByProduct,
      globalSpent,
      capCents,
      cadence: input.cadence,
      urlOrder,
      resolvedNeeds,
    });
  }

  const subtotalCents = globalSpent.cents;

  const bundleSku = `BNDL-${primary.slug.replace(/-/g, "").slice(0, 6).toUpperCase()}-${input.budgetCents / 100}-${input.cadence === "quarterly" ? "Q" : "M"}-OPT`;

  const draft: BuiltBundle = {
    bundleSku,
    needSlug: primary.slug,
    needName: primary.name,
    needSlugs: urlOrder,
    needNames: needNamesResolved,
    includeEveryday: input.includeEveryday,
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
