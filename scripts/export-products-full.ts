/**
 * Full product export: every field + joined category, class, needs, and Fieldtex source section.
 * Output: product-catalog/products-full-export.csv and .json
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "../lib/db";
import { products, productCategories, productClasses, needProductRules, needs } from "../db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";

async function main() {
  const rows = await db
    .select({
      sku: products.sku,
      name: products.name,
      description: products.description,
      category: productCategories.name,
      categorySlug: productCategories.slug,
      productClass: productClasses.name,
      productClassSlug: productClasses.slug,
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

  // need associations
  const needRows = await db
    .select({ productId: needProductRules.productId, classId: needProductRules.productClassId, needSlug: needs.slug })
    .from(needProductRules)
    .leftJoin(needs, eq(needProductRules.needId, needs.id))
    .catch(() => [] as any[]);

  // fieldtex source sections
  let sectionMap: Record<string, string> = {};
  try { sectionMap = JSON.parse(fs.readFileSync("product-catalog/fieldtex-section-map.json", "utf8")); } catch {}

  const byProduct: Record<string, Set<string>> = {};
  for (const r of needRows as any[]) {
    if (!r.needSlug) continue;
    const key = r.productId ?? `class:${r.classId}`;
    (byProduct[key] ??= new Set()).add(r.needSlug);
  }

  const out = rows.map((r) => {
    const code = r.sku?.replace(/^FTX-/, "");
    return {
      ...r,
      priceDollars: (r.priceCents / 100).toFixed(2),
      needs: [...(byProduct[r.id as any] ?? [])].join("|"),
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
