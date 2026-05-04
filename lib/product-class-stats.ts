import { db } from "@/lib/db";
import {
  productClasses,
  productClassPriceStats,
  productPriceObservations,
} from "@/db/schema";
import { summarizePriceSamplesCents } from "@/lib/price-stats";

/** Recompute and upsert `product_class_price_stats` for every product class from observations. */
export async function computeAndPersistProductClassStats(): Promise<void> {
  const observations = await db.select().from(productPriceObservations);
  const byClass = new Map<string, number[]>();
  for (const o of observations) {
    const list = byClass.get(o.productClassId) ?? [];
    list.push(o.priceCents);
    byClass.set(o.productClassId, list);
  }

  const classes = await db.select({ id: productClasses.id }).from(productClasses);
  const now = new Date();

  for (const { id } of classes) {
    const prices = byClass.get(id) ?? [];
    const s = summarizePriceSamplesCents(prices);
    await db
      .insert(productClassPriceStats)
      .values({
        productClassId: id,
        sampleCount: s.sampleCount,
        minCents: s.minCents,
        maxCents: s.maxCents,
        trimmedMedianCents: s.trimmedMedianCents,
        p25Cents: s.p25Cents,
        p75Cents: s.p75Cents,
        computedAt: now,
      })
      .onConflictDoUpdate({
        target: productClassPriceStats.productClassId,
        set: {
          sampleCount: s.sampleCount,
          minCents: s.minCents,
          maxCents: s.maxCents,
          trimmedMedianCents: s.trimmedMedianCents,
          p25Cents: s.p25Cents,
          p75Cents: s.p75Cents,
          computedAt: now,
        },
      });
  }
}
