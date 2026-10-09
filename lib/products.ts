import { db } from "./db";
import { products, productCategories, productClasses, needs } from "@/db/schema";
import { eq, and, ilike, or, asc, count, notInArray, isNotNull, sql, inArray } from "drizzle-orm";

/** Deprecated needs rows may remain for historical FKs — excluded from the build wizard */
const EXCLUDED_BUILD_WIZARD_SLUGS = [
  "medication-adherence",
  "daily-routines-organization",
] as const;

export async function getAllNeeds() {
  return db.select().from(needs);
}

export async function getBuildWizardNeeds() {
  return db
    .select()
    .from(needs)
    .where(notInArray(needs.slug, [...EXCLUDED_BUILD_WIZARD_SLUGS]))
    .orderBy(asc(needs.name));
}

export async function getNeedBySlug(slug: string) {
  return db.query.needs.findFirst({
    where: eq(needs.slug, slug),
  });
}

export async function getProductCategories() {
  return db.select().from(productCategories);
}

export async function getProductBySku(sku: string) {
  return db.query.products.findFirst({
    where: eq(products.sku, sku),
    with: { category: true },
  });
}

export async function getProductById(id: string) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: { category: true, productClass: true },
  });
}

export async function getProductsByCategory(categoryId: string) {
  return db.query.products.findMany({
    where: eq(products.categoryId, categoryId),
    with: { category: true },
  });
}

export interface ListProductsOptions {
  categorySlug?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listProducts(options: ListProductsOptions = {}) {
  const { categorySlug, search, limit = 48, offset = 0 } = options;

  const conditions = [
    eq(products.active, true),
    eq(products.eligible, true),
  ];

  if (categorySlug) {
    const cat = await db.query.productCategories.findFirst({
      where: eq(productCategories.slug, categorySlug),
    });
    if (cat) conditions.push(eq(products.categoryId, cat.id));
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.description ?? "", term)
      )!
    );
  }

  const whereClause = and(...conditions);

  const [list, totalResult] = await Promise.all([
    db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(asc(products.name))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(products).where(whereClause),
  ]);

  // Fetch categories
  const categoryIds = [...new Set(list.map((p) => p.categoryId).filter(Boolean))] as string[];
  const categories =
    categoryIds.length > 0
      ? await db
          .select()
          .from(productCategories)
          .where(inArray(productCategories.id, categoryIds))
      : [];
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Fetch product classes with benefit rails
  const classIds = [...new Set(list.map((p) => p.productClassId).filter(Boolean))] as string[];
  const classes =
    classIds.length > 0
      ? await db
          .select({
            id: productClasses.id,
            slug: productClasses.slug,
            canonicalName: productClasses.canonicalName,
            benefitRails: productClasses.benefitRails,
            dualPurpose: productClasses.dualPurpose,
            memberLabel: productClasses.memberLabel,
          })
          .from(productClasses)
          .where(inArray(productClasses.id, classIds))
      : [];
  const classMap = Object.fromEntries(classes.map((c) => [c.id, c]));

  return {
    products: list.map((p) => ({
      ...p,
      category: catMap[p.categoryId] ?? null,
      productClass: p.productClassId ? classMap[p.productClassId] ?? null : null,
    })),
    total: Number(totalResult[0]?.count ?? 0),
  };
}

export async function getEligibleProducts() {
  return db.query.products.findMany({
    where: eq(products.active, true),
    with: { category: true },
  });
}

/**
 * Get home safety products with verified images for member home goals section.
 * Prioritizes products with images from home-safety product classes.
 */
export async function getHomeSafetyProducts(limit: number = 3) {
  // Get products from classes with home_safety benefit rail
  const results = await db
    .select({
      id: products.id,
      name: products.name,
      imageUrl: products.imageUrl,
      priceCents: products.priceCents,
      tags: products.tags,
      productClassId: products.productClassId,
      productClass: {
        benefitRails: productClasses.benefitRails,
        dualPurpose: productClasses.dualPurpose,
      },
    })
    .from(products)
    .leftJoin(productClasses, eq(products.productClassId, productClasses.id))
    .where(
      and(
        eq(products.active, true),
        eq(products.eligible, true),
        isNotNull(products.imageUrl),
        // Products in classes with home_safety rail
        sql`${productClasses.benefitRails} && ARRAY['home_safety']::text[]`
      )
    )
    .orderBy(sql`random()`)
    .limit(limit * 3); // Get more and filter for best images

  // Filter to only those with fieldtex images (verified)
  const withImages = results.filter(
    (p) => p.imageUrl && !p.imageUrl.includes("placeholder")
  );

  return withImages.slice(0, limit);
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
