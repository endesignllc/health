/**
 * Full product export: every field + joined category, class, needs, and Fieldtex source section.
 * Output: product-catalog/products-full-export.csv and .json
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "../lib/db";
import { products, productCategories, productClasses, needProductRules, needs } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import * as fs from "fs";

async function main() {
  const rows = await db
    .select({
      sku: products.sku,
      name: products.name,
      description: products.description,
      category: productCategories.name,
      categorySlug: productCategories.slug,
      productClass: productClasses.canonicalName,
      productClassSlug: productClasses.slug,
      productClassId: productClasses.id,
      categoryId: productCategories.id,
      priceCents: products.priceCents,
      imageUrl: products.imageUrl,
      externalProductUrl: products.externalProductUrl,
      supplyDays: products.supplyDays,
      unitsPerPackage: products.unitsPerPackage,
      estimatedDailyUse: products.estimatedDailyUse,
      vendor: products.vendor,
      alternateSkus: products.alternateSkus,
      eligible: products.eligible,
      tags: products.tags,
      isEverydayEssential: products.isEverydayEssential,
      inStock: products.inStock,
      active: products.active,
      createdAt: products.createdAt,
      id: products.id,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .leftJoin(productClasses, eq(products.productClassId, productClasses.id));

  // need associations via productClass.needId
  const classNeedRows = await db
    .select({ classId: productClasses.id, needSlug: needs.slug })
    .from(productClasses)
    .leftJoin(needs, eq(productClasses.needId, needs.id))
    .where(sql`${productClasses.needId} IS NOT NULL`)
    .catch(() => [] as { classId: string; needSlug: string | null }[]);

  // need associations via category (need_product_rules.requiredCategoryId)
  const categoryNeedRows = await db
    .select({ categoryId: needProductRules.requiredCategoryId, needSlug: needs.slug })
    .from(needProductRules)
    .leftJoin(needs, eq(needProductRules.needId, needs.id))
    .catch(() => [] as { categoryId: string; needSlug: string | null }[]);

  // fieldtex source sections
  let sectionMap: Record<string, string> = {};
  try { sectionMap = JSON.parse(fs.readFileSync("product-catalog/fieldtex-section-map.json", "utf8")); } catch {}

  // Build lookup maps for needs by class and category
  const needsByClass: Record<string, Set<string>> = {};
  for (const r of classNeedRows) {
    if (!r.needSlug) continue;
    (needsByClass[r.classId] ??= new Set()).add(r.needSlug);
  }
  const needsByCategory: Record<string, Set<string>> = {};
  for (const r of categoryNeedRows) {
    if (!r.needSlug) continue;
    (needsByCategory[r.categoryId] ??= new Set()).add(r.needSlug);
  }

  const out = rows.map((r) => {
    const code = r.sku?.replace(/^FTX-/, "");
    // Merge needs from class and category associations
    const classNeeds = r.productClassId ? needsByClass[r.productClassId] : undefined;
    const catNeeds = r.categoryId ? needsByCategory[r.categoryId] : undefined;
    const allNeeds = new Set([...(classNeeds ?? []), ...(catNeeds ?? [])]);
    return {
      ...r,
      priceDollars: (r.priceCents / 100).toFixed(2),
      needs: [...allNeeds].join("|"),
      sourceSection: (code && sectionMap[code]) || "",
      tags: (r.tags ?? []).join("|"),
      alternateSkus: (r.alternateSkus ?? []).join("|"),
    };
  });

  fs.writeFileSync("product-catalog/products-full-export.json", JSON.stringify(out, null, 1));
  const cols = Object.keys(out[0] ?? {});
  const esc = (v: any) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  fs.writeFileSync(
    "product-catalog/products-full-export.csv",
    [cols.join(","), ...out.map((r: any) => cols.map((c) => esc(r[c])).join(","))].join("\n")
  );
  console.log(`exported ${out.length} products; ${out.filter((o) => o.sourceSection).length} with sourceSection`);
  const counts: Record<string, number> = {};
  for (const o of out) counts[o.category ?? "NULL"] = (counts[o.category ?? "NULL"] ?? 0) + 1;
  console.log("by category:", JSON.stringify(counts));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
