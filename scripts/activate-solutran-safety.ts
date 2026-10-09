/**
 * Activate the verified Solutran bathroom and fall-prevention items,
 * and seed the class aliases those names match.
 *
 * Usage: npx tsx scripts/activate-solutran-safety.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { productCategories, productClassAliases, productClasses, products } from "../db/schema";
import { BATHROOM_AND_FALL_ALIASES } from "../lib/class-aliases";
import { buildBundles } from "../lib/bundle-builder";

const ACTIVATE: { asin: string; classSlug: string }[] = [
  { asin: "B008KMF6J0", classSlug: "bathroom-safety" },
  { asin: "B002VWK0WI", classSlug: "bathroom-safety" },
  { asin: "B08KSKPX7N", classSlug: "bathroom-safety" },
  { asin: "B082319CWJ", classSlug: "fall-prevention" },
  { asin: "B004YIFA0Y", classSlug: "fall-prevention" },
];

const TOILET_RAIL_ASIN = "B000BJBH48";
const WALMART_IMAGE_TAG = "image:walmart-sync";

async function bundleSignature(): Promise<Record<string, string>> {
  const plans = [
    ["bladder-support"],
    ["joint-comfort-mobility"],
    ["bladder-support", "joint-comfort-mobility"],
  ];
  const out: Record<string, string> = {};
  for (const needSlugs of plans) {
    const built = await buildBundles({
      needSlugs,
      includeEveryday: true,
      budgetCents: 14400,
      cadence: "monthly",
    });
    out[needSlugs.join("+")] = built
      .map((bundle) => bundle.items.map((item) => item.productId).sort().join(","))
      .join(" | ");
  }
  return out;
}

async function main() {
  const classRows = await db.select().from(productClasses);
  const classBySlug = new Map(classRows.map((row) => [row.slug, row]));
  for (const slug of ["bathroom-safety", "fall-prevention"]) {
    if (!classBySlug.has(slug)) throw new Error(`Missing product class ${slug}`);
  }

  const categories = await db.select().from(productCategories);
  const category =
    categories.find((row) => row.slug === "home-safety") ??
    categories.find((row) => row.slug === "mobility") ??
    null;

  const skus = [...ACTIVATE.map((row) => `SOL-${row.asin}`), `SOL-${TOILET_RAIL_ASIN}`];
  const rows = await db.select().from(products).where(inArray(products.sku, skus));
  const bySku = new Map(rows.map((row) => [row.sku, row]));
  for (const sku of skus) {
    if (!bySku.has(sku)) throw new Error(`Missing product ${sku}`);
  }

  const beforeBundles = await bundleSignature();

  for (const item of ACTIVATE) {
    const sku = `SOL-${item.asin}`;
    const row = bySku.get(sku)!;
    const classRow = classBySlug.get(item.classSlug)!;
    const tags = [...new Set([...(row.tags ?? [])])];
    await db
      .update(products)
      .set({
        active: true,
        eligible: true,
        productClassId: classRow.id,
        imageUrl: `/images/solutran/${item.asin}.jpg`,
        ...(category ? { categoryId: category.id } : {}),
        tags,
      })
      .where(eq(products.id, row.id));
  }

  const toilet = bySku.get(`SOL-${TOILET_RAIL_ASIN}`)!;
  const toiletClass = classBySlug.get("bathroom-safety")!;
  const toiletTags = [...new Set([...(toilet.tags ?? []), WALMART_IMAGE_TAG])];
  await db
    .update(products)
    .set({
      active: false,
      productClassId: toiletClass.id,
      tags: toiletTags,
    })
    .where(eq(products.id, toilet.id));

  const aliasValues = BATHROOM_AND_FALL_ALIASES.map((row) => ({
    productClassId: classBySlug.get(row.classSlug)!.id,
    alias: row.alias.toLowerCase(),
  }));
  await db.insert(productClassAliases).values(aliasValues).onConflictDoNothing();

  const afterBundles = await bundleSignature();
  const bundleChanged = JSON.stringify(beforeBundles) !== JSON.stringify(afterBundles);
  if (bundleChanged) {
    for (const item of ACTIVATE) {
      const sku = `SOL-${item.asin}`;
      const row = bySku.get(sku)!;
      const tags = [...new Set([...(row.tags ?? []), "exclude-from-bundles"])];
      await db.update(products).set({ tags }).where(eq(products.id, row.id));
    }
  }

  const restored = bundleChanged ? await bundleSignature() : afterBundles;
  const aliasCount = await db.execute(sql`
    select count(*)::int as n
    from product_class_aliases a
    join product_classes c on c.id = a.product_class_id
    where c.slug in ('bathroom-safety', 'fall-prevention')
  `);
  const updated = await db
    .select({
      sku: products.sku,
      name: products.name,
      active: products.active,
      imageUrl: products.imageUrl,
      tags: products.tags,
      classSlug: productClasses.slug,
      rails: productClasses.benefitRails,
    })
    .from(products)
    .leftJoin(productClasses, eq(products.productClassId, productClasses.id))
    .where(inArray(products.sku, skus));

  console.log(JSON.stringify({
    category: category?.slug ?? null,
    bundleChanged,
    bundlesRestored: JSON.stringify(beforeBundles) === JSON.stringify(restored),
    aliasCount: Number((aliasCount.rows[0] as { n?: unknown } | undefined)?.n ?? 0),
    products: updated,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
