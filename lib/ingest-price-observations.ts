import { db } from "@/lib/db";
import { productClasses, productPriceObservations } from "@/db/schema";
import { computeAndPersistProductClassStats } from "@/lib/product-class-stats";
import { inArray } from "drizzle-orm";
import { z } from "zod";

export const ingestRowSchema = z.object({
  productClassSlug: z.string().min(1),
  retailer: z.string().min(1),
  priceCents: z.number().int().positive(),
  normalizedTitle: z.string().optional().nullable(),
  observedAt: z.union([z.string(), z.number(), z.date()]).optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
  externalItemId: z.string().optional().nullable(),
});

export type IngestRowInput = z.infer<typeof ingestRowSchema>;

function parseObservedAt(v: IngestRowInput["observedAt"]): Date {
  if (v == null) return new Date();
  if (v instanceof Date) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

/**
 * Insert price observations resolved by `product_classes.slug`.
 * Rows with unknown slugs are skipped; returns counts and unknown slugs.
 */
export async function ingestPriceObservations(
  rows: IngestRowInput[],
  options?: { recomputeStats?: boolean }
): Promise<{ inserted: number; skipped: number; unknownSlugs: string[] }> {
  if (rows.length === 0) {
    return { inserted: 0, skipped: 0, unknownSlugs: [] };
  }

  const slugs = [...new Set(rows.map((r) => r.productClassSlug))];
  const classes = await db
    .select({ id: productClasses.id, slug: productClasses.slug })
    .from(productClasses)
    .where(inArray(productClasses.slug, slugs));

  const slugToId = new Map(classes.map((c) => [c.slug, c.id]));
  const unknownSlugs = slugs.filter((s) => !slugToId.has(s));

  const values = rows
    .filter((r) => slugToId.has(r.productClassSlug))
    .map((r) => ({
      productClassId: slugToId.get(r.productClassSlug)!,
      retailer: r.retailer,
      normalizedTitle: r.normalizedTitle ?? null,
      priceCents: r.priceCents,
      sourceUrl: r.sourceUrl ?? null,
      externalItemId: r.externalItemId ?? null,
      observedAt: parseObservedAt(r.observedAt),
    }));

  const skipped = rows.length - values.length;

  if (values.length > 0) {
    await db.insert(productPriceObservations).values(values);
  }

  if (values.length > 0 && options?.recomputeStats !== false) {
    await computeAndPersistProductClassStats();
  }

  return {
    inserted: values.length,
    skipped,
    unknownSlugs,
  };
}
