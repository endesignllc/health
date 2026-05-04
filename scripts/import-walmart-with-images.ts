/**
 * Import products from the new Walmart CSV (walmart.csv) which has main_image URLs.
 * Matches existing products by GTIN/SKU to update images, or inserts new products.
 *
 * Usage:
 *   npx tsx scripts/import-walmart-with-images.ts [path-to-walmart.csv]
 *   npm run db:import-walmart-images
 *
 * Default: ./walmart.csv
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { db } from "../lib/db";
import { products, productCategories } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  inferSiteCategoryFromName,
  isNonHealthRetailProduct,
} from "../lib/health-catalog-gate";

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

function mapNewWalmartCategory(
  primary: string,
  sub1: string,
  title: string
): (typeof SITE_CATEGORIES)[number] | null {
  const p = primary.toLowerCase();
  const s = sub1.toLowerCase();
  const combined = `${p} ${s} ${title.toLowerCase()}`;

  if (/\bpet\b/.test(p) || /\bpet\b/.test(s)) return null;
  if (/\bfishing\b/.test(combined)) return null;
  if (/\bbait\b/.test(combined) && /\b(fish|worm|cricket|lure)\b/.test(combined))
    return null;
  if (/\baquarium\b/.test(s) && !title.toLowerCase().includes("saline")) return null;
  if (/\bhunting\b/.test(combined) && /\b(deer|duck|blind|feed)\b/.test(combined))
    return null;

  const fromName = inferSiteCategoryFromName(title);
  if (fromName) return fromName;

  if (combined.includes("vitamin") || combined.includes("supplement")) return "vitamins";
  if (
    combined.includes("oral") ||
    combined.includes("bath") ||
    combined.includes("body") ||
    combined.includes("shaving")
  )
    return "supplements";
  if (combined.includes("baby") || combined.includes("diaper") || combined.includes("feeding"))
    return "mobility";
  if (combined.includes("beauty") || combined.includes("skin") || combined.includes("makeup"))
    return "supplements";
  if (combined.includes("food") || combined.includes("beverage") || combined.includes("coffee"))
    return "supplements";
  if (combined.includes("household") || combined.includes("pest") || combined.includes("cleaning"))
    return "supplements";
  if (combined.includes("kitchen")) return "supplements";
  return "supplements";
}

function parsePrice(val: string): number | null {
  if (!val || val.trim() === "") return null;
  const cleaned = val.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.round(n * 100);
}

async function main() {
  const csvPath = process.argv[2] || path.join(process.cwd(), "walmart.csv");

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
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

  const catRows = await db.select().from(productCategories);
  const catMap = Object.fromEntries(catRows.map((c) => [c.slug, c.id]));
  const existingBySku = new Map(
    (await db.select({ sku: products.sku, id: products.id }).from(products)).map((p) => [p.sku, p.id])
  );

  let updated = 0;
  let inserted = 0;
  let skipped = 0;

  for (const r of rows) {
    const title = (r.title || "").trim();
    const mainImage = (r.main_image || r.mainImage || "").trim();
    const gtin = (r.gtin13 || r.gtin || "").trim();
    const sku = (r.sku || r.SKU || "").trim();
    const priceCents = parsePrice(r.price || "");
    const primary = (r.primary_category || "").trim();
    const sub1 = (r.sub_category_1 || "").trim();
    const url = (r.url || "").trim();

    if (!title || !priceCents || priceCents <= 0) {
      skipped++;
      continue;
    }

    const description = (r.description || "").trim().slice(0, 2000).replace(/<[^>]+>/g, "") || null;

    if (isNonHealthRetailProduct(title, description)) {
      skipped++;
      continue;
    }

    const siteCat = mapNewWalmartCategory(primary, sub1, title);
    if (!siteCat) {
      skipped++;
      continue;
    }
    const categoryId = catMap[siteCat];
    if (!categoryId) {
      skipped++;
      continue;
    }

    const ourSku = gtin || sku || `wm-${sku}`;

    const existingId = existingBySku.get(ourSku);

    if (existingId) {
      if (mainImage) {
        await db.update(products).set({ imageUrl: mainImage }).where(eq(products.id, existingId));
        updated++;
        if (updated % 50 === 0) console.log(`Updated images: ${updated}...`);
      }
    } else {
      await db
        .insert(products)
        .values({
          sku: ourSku,
          name: title,
          description,
          categoryId,
          priceCents,
          imageUrl: mainImage || null,
          externalProductUrl: url || null,
          supplyDays: 30,
          tags: ["value"],
          eligible: true,
          active: true,
        })
        .onConflictDoNothing({ target: products.sku });

      inserted++;
      if (inserted % 50 === 0) console.log(`Inserted: ${inserted}...`);
    }
  }

  console.log(`Done. Updated images: ${updated}, Inserted: ${inserted}, Skipped: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
