/**
 * Deactivate non-human-health catalog noise (pet food, fishing, etc.) and
 * fix high-confidence category mismatches using product titles.
 *
 * Usage:
 *   npx tsx scripts/cleanup-health-catalog.ts           # apply changes
 *   npx tsx scripts/cleanup-health-catalog.ts --dry-run
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../lib/db";
import { products, productCategories } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  inferSiteCategoryFromName,
  shouldDeactivateFromHealthCatalog,
} from "../lib/health-catalog-gate";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const catRows = await db.select().from(productCategories);
  const slugToId = Object.fromEntries(catRows.map((c) => [c.slug, c.id]));

  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      active: products.active,
      categorySlug: productCategories.slug,
    })
    .from(products)
    .innerJoin(
      productCategories,
      eq(products.categoryId, productCategories.id)
    );

  const deactivatedIds = new Set<string>();
  const deactivateList: string[] = [];

  for (const r of rows) {
    if (shouldDeactivateFromHealthCatalog(r.sku, r.name, r.description)) {
      if (r.active) {
        deactivateList.push(r.id);
        deactivatedIds.add(r.id);
      }
    }
  }

  const recatByCategory = new Map<string, string[]>();
  const recatSamples: Array<{ sku: string; name: string; from: string; to: string }> =
    [];

  for (const r of rows) {
    if (deactivatedIds.has(r.id)) continue;
    const better = inferSiteCategoryFromName(r.name);
    if (!better || better === r.categorySlug) continue;
    const newCatId = slugToId[better];
    if (!newCatId) continue;
    if (!recatByCategory.has(newCatId)) recatByCategory.set(newCatId, []);
    recatByCategory.get(newCatId)!.push(r.id);
    if (recatSamples.length < 25) {
      recatSamples.push({
        sku: r.sku,
        name: r.name.slice(0, 80),
        from: r.categorySlug,
        to: better,
      });
    }
  }

  const recatTotal = [...recatByCategory.values()].reduce(
    (n, ids) => n + ids.length,
    0
  );

  console.log(
    JSON.stringify(
      {
        dryRun,
        deactivateCount: deactivateList.length,
        recategorizeCount: recatTotal,
        recategorizeSample: recatSamples,
      },
      null,
      2
    )
  );

  if (dryRun) {
    return;
  }

  if (deactivateList.length > 0) {
    await db
      .update(products)
      .set({ active: false, eligible: false })
      .where(inArray(products.id, deactivateList));
    console.log(`Deactivated ${deactivateList.length} products.`);
  }

  for (const [categoryId, ids] of recatByCategory) {
    if (ids.length === 0) continue;
    await db
      .update(products)
      .set({ categoryId })
      .where(inArray(products.id, ids));
    const slug = catRows.find((c) => c.id === categoryId)?.slug;
    console.log(`Recategorized ${ids.length} products → ${slug ?? categoryId}`);
  }

  console.log("Cleanup complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
