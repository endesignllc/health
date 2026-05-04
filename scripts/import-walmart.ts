/**
 * Import Walmart Health product catalog into Health Benefits Shop.
 * Usage: npx tsx scripts/import-walmart.ts [path-to-csv]
 * Default CSV path: ./walmart_com-ecommerce_product_details.csv
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { db } from "../lib/db";
import { products, productCategories } from "../db/schema";
import { eq } from "drizzle-orm";
import { isNonHealthRetailProduct } from "../lib/health-catalog-gate";

const SITE_CATEGORIES = [
  "vitamins",
  "supplements",
  "monitoring",
  "pain-relief",
  "respiratory",
  "sleep-mood",
  "cognitive",
  "mobility",
] as const;

function mapWalmartCategoryToSite(walmartCat: string): (typeof SITE_CATEGORIES)[number] {
  const c = walmartCat.toLowerCase();
  // Health
  if (c.includes("vitamins") || c.includes("letter vitamins")) return "vitamins";
  if (
    c.includes("supplements") ||
    c.includes("herbal") ||
    c.includes("homeopathic") ||
    c.includes("superfoods")
  )
    return "supplements";
  if (
    c.includes("pain") ||
    c.includes("braces") ||
    c.includes("first aid") ||
    c.includes("heating pad")
  )
    return "pain-relief";
  if (
    c.includes("vision") ||
    c.includes("reading glasses") ||
    c.includes("frames") ||
    c.includes("eyewear")
  )
    return "mobility";
  if (c.includes("diabetes")) return "supplements";
  if (
    c.includes("foot care") ||
    c.includes("insoles") ||
    c.includes("daily living") ||
    c.includes("bathroom") ||
    c.includes("bedroom")
  )
    return "mobility";
  if (
    c.includes("blood pressure") ||
    c.includes("health monitors") ||
    c.includes("thermometer")
  )
    return "monitoring";
  if (c.includes("aromatherapy") || c.includes("essential oils")) return "sleep-mood";
  if (c.includes("ear care")) return "mobility";
  if (c.includes("sexual wellness") || c.includes("family planning") || c.includes("weight management"))
    return "supplements";
  if (c.includes("allergy") || c.includes("sinus") || c.includes("cold") || c.includes("cough") || c.includes("flu"))
    return "respiratory";
  if (c.includes("acid reflux") || c.includes("probiotics") || c.includes("protein") || c.includes("fitness"))
    return "supplements";
  if (c.includes("massage")) return "pain-relief";
  // Personal Care
  if (c.includes("incontinence")) return "mobility";
  if (c.includes("oral care") || c.includes("feminine care") || c.includes("sun care") || c.includes("bath & body") || c.includes("deodorant") || c.includes("shaving"))
    return "supplements";
  // Beauty (health-adjacent)
  if (c.includes("skin care") || c.includes("face mask") || c.includes("hair care") || c.includes("shampoo") || c.includes("conditioner"))
    return "supplements";
  // Sports & Outdoors
  if (c.includes("braces") || c.includes("supports") || c.includes("knee") || c.includes("elbow") || c.includes("ankle") || c.includes("wrist"))
    return "pain-relief";
  if (c.includes("fitness") || c.includes("sports"))
    return "supplements";
  // Baby
  if (c.includes("health & safety") || c.includes("baby gate") || c.includes("baby proof") || c.includes("baby bath"))
    return "mobility";
  if (c.includes("diapering") || c.includes("diaper") || c.includes("feeding") || c.includes("pacifier") || c.includes("teether"))
    return "mobility";
  // Food (health-adjacent)
  if (c.includes("gluten-free") || c.includes("organic") || c.includes("tea") || c.includes("protein") || c.includes("beverage"))
    return "supplements";
  return "supplements";
}

function inferTags(walmartCat: string, siteCat: string): string[] {
  const tags: string[] = [];
  const c = walmartCat.toLowerCase();
  if (c.includes("vitamin") || c.includes("supplement")) tags.push("core");
  if (c.includes("pain") || c.includes("braces")) tags.push("pain");
  if (c.includes("vision") || c.includes("reading")) tags.push("vision");
  if (c.includes("diabetes")) tags.push("blood-sugar");
  if (c.includes("foot") || c.includes("daily living") || c.includes("incontinence") || c.includes("baby")) tags.push("mobility");
  if (c.includes("blood pressure")) tags.push("heart");
  if (c.includes("aromatherapy")) tags.push("sleep");
  if (c.includes("oral care")) tags.push("adherence");
  if (c.includes("skin care") || c.includes("sun care")) tags.push("value");
  if (tags.length === 0) tags.push("value");
  return tags;
}

function inferSupplyDays(walmartCat: string, siteCat: string): number {
  const c = walmartCat.toLowerCase();
  if (
    c.includes("blood pressure") ||
    c.includes("monitors") ||
    c.includes("scale") ||
    c.includes("thermometer") ||
    c.includes("braces") ||
    c.includes("daily living") ||
    c.includes("bathroom") ||
    c.includes("bedroom") ||
    c.includes("baby gate") ||
    c.includes("baby proof")
  )
    return 365;
  if (c.includes("incontinence") || c.includes("diaper")) return 30;
  return 30;
}

function parsePrice(val: string): number | null {
  if (!val || val.trim() === "") return null;
  const cleaned = val.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.round(n * 100);
}

function makeSku(gtin: string, itemNumber: string, productUrl: string, index: number): string {
  const base = gtin?.trim() || itemNumber?.trim() || `walmart-${index}`;
  const safe = base.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 32);
  return safe || `walmart-${index}`;
}

async function main() {
  const csvPath =
    process.argv[2] ||
    path.join(process.cwd(), "walmart_com-ecommerce_product_details.csv");

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    console.error("Usage: npx tsx scripts/import-walmart.ts [path-to-csv]");
    process.exit(1);
  }

  console.log(`Reading ${csvPath}...`);
  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Array<Record<string, string>>;

  const FRINGE_PREFIXES = [
    "Health|",
    "Personal Care|",
    "Beauty|",
    "Sports & Outdoors|",
    "Baby|",
    "Food|",
  ];

  const healthRows = rows.filter((r) => {
    const cat = r.Category || r.category || "";
    return FRINGE_PREFIXES.some((p) => cat.startsWith(p));
  });

  console.log(`Found ${healthRows.length} health & fringe rows (of ${rows.length} total)`);

  // Dedupe by GTIN or Item Number (each size/variant = separate product)
  const seen = new Set<string>();
  const unique: typeof healthRows = [];
  for (const r of healthRows) {
    const gtin = (r.Gtin || r.gtin || "").trim();
    const itemNum = (r["Item Number"] || r["item_number"] || "").trim();
    const key = gtin || itemNum || `row-${unique.length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(r);
  }

  console.log(`After deduplication: ${unique.length} products`);

  const catRows = await db.select().from(productCategories);
  const catMap = Object.fromEntries(catRows.map((c) => [c.slug, c.id]));
  const existingSkus = new Set(
    (await db.select({ sku: products.sku }).from(products)).map((p) => p.sku)
  );

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < unique.length; i++) {
    const r = unique[i];
    const name = (r["Product Name"] || r["product_name"] || "").trim();
    const description = (r.Description || r.description || "").trim().slice(0, 2000);
    const priceCents = parsePrice(r["Sale Price"] || r["sale_price"] || "") ??
      parsePrice(r["List Price"] || r["list_price"] || "");
    const category = (r.Category || r.category || "").trim();
    const siteCat = mapWalmartCategoryToSite(category);
    const categoryId = catMap[siteCat];

    if (!name || !priceCents || priceCents <= 0 || !categoryId) {
      skipped++;
      continue;
    }

    if (isNonHealthRetailProduct(name, description)) {
      skipped++;
      continue;
    }

    const sku = makeSku(
      r.Gtin || r.gtin || "",
      r["Item Number"] || r["item_number"] || "",
      r["Product Url"] || r["product_url"] || "",
      i
    );

    // Ensure unique SKU
    let finalSku = sku;
    let suffix = 0;
    while (existingSkus.has(finalSku)) {
      suffix++;
      finalSku = `${sku.slice(0, 28)}-${suffix}`;
    }
    existingSkus.add(finalSku);

    const tags = inferTags(category, siteCat);
    const supplyDays = inferSupplyDays(category, siteCat);

    const productUrl = (r["Product Url"] || r["product_url"] || "").trim() || null;

    await db
      .insert(products)
      .values({
        sku: finalSku,
        name,
        description: description || null,
        categoryId,
        priceCents,
        imageUrl: null, // Walmart CSV has no image URLs; use scripts/update-product-images.ts
        externalProductUrl: productUrl,
        supplyDays,
        tags,
        eligible: true,
        active: true,
      })
      .onConflictDoNothing({ target: products.sku });

    inserted++;
    if (inserted % 500 === 0) console.log(`Inserted ${inserted}...`);
  }

  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
