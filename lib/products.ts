import { db } from "./db";
import { products, productCategories, needs } from "@/db/schema";
import { eq, and, ilike, or, asc, count } from "drizzle-orm";

export async function getAllNeeds() {
  return db.select().from(needs);
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
    with: { category: true },
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

  const categoryIds = [...new Set(list.map((p) => p.categoryId))];
  const categories =
    categoryIds.length > 0
      ? await db
          .select()
          .from(productCategories)
          .where(
            (categoryIds.length === 1
              ? eq(productCategories.id, categoryIds[0]!)
              : or(...categoryIds.map((id) => eq(productCategories.id, id))))!
          )
      : [];

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return {
    products: list.map((p) => ({
      ...p,
      category: catMap[p.categoryId] ?? null,
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

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
