/**
 * Sync product images from the new Walmart CSV (with main_image URLs).
 * Matches products by: GTIN, SKU, or item ID from external product URL.
 *
 * Usage:
 *   npx tsx scripts/sync-walmart-images.ts [path-to-walmart.csv]
 *   npm run db:sync-walmart-images
 *
 * Default path: ./walmart.csv (or pass path like /Users/.../walmart.csv)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { db } from "../lib/db";
import { products } from "../db/schema";
import { eq } from "drizzle-orm";

function extractItemIdFromUrl(url: string | null): string | null {
  if (!url || !url.includes("walmart.com/ip/")) return null;
  const match = url.match(/\/ip\/[^/]+\/(\d+)/);
  return match ? match[1] : null;
}

async function main() {
  const csvPath =
    process.argv[2] ||
    path.join(process.cwd(), "walmart.csv");

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    console.error("Usage: npx tsx scripts/sync-walmart-images.ts [path-to-walmart.csv]");
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

  const imageByGtin = new Map<string, string>();
  const imageBySku = new Map<string, string>();

  for (const r of rows) {
    const mainImage = (r.main_image || r.mainImage || "").trim();
    if (!mainImage) continue;

    const gtin = (r.gtin13 || r.gtin || "").trim();
    const sku = (r.sku || r.SKU || "").trim();

    if (gtin) imageByGtin.set(gtin, mainImage);
    if (sku) imageBySku.set(sku, mainImage);
  }

  console.log(`Loaded ${imageByGtin.size} images by GTIN, ${imageBySku.size} by SKU`);

  const allProducts = await db.select({
    id: products.id,
    sku: products.sku,
    externalProductUrl: products.externalProductUrl,
  }).from(products);

  let updated = 0;
  let skipped = 0;

  for (const p of allProducts) {
    let imageUrl: string | null = null;

    if (p.sku && imageByGtin.has(p.sku)) {
      imageUrl = imageByGtin.get(p.sku)!;
    }
    if (!imageUrl && p.sku && imageBySku.has(p.sku)) {
      imageUrl = imageBySku.get(p.sku)!;
    }
    if (!imageUrl && p.externalProductUrl) {
      const itemId = extractItemIdFromUrl(p.externalProductUrl);
      if (itemId && imageBySku.has(itemId)) {
        imageUrl = imageBySku.get(itemId)!;
      }
    }

    if (!imageUrl) {
      skipped++;
      continue;
    }

    await db
      .update(products)
      .set({ imageUrl })
      .where(eq(products.id, p.id));

    updated++;
    if (updated % 100 === 0) console.log(`Updated ${updated}...`);
  }

  console.log(`Done. Updated: ${updated}, No match: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
