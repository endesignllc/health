/**
 * Update product imageUrl from a CSV or JSON file.
 *
 * CSV format: sku,imageUrl
 *   - Header row required
 *   - sku: product SKU (or GTIN from import)
 *   - imageUrl: full image URL
 *
 * Usage:
 *   npx tsx scripts/update-product-images.ts <path-to-csv>
 *   npx tsx scripts/update-product-images.ts images.csv
 *
 * Example CSV:
 *   sku,imageUrl
 *   649906451211,https://i5.walmartimages.com/.../image.jpeg
 *   walmart-123,https://example.com/product.jpg
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { db } from "../lib/db";
import { products } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error("Usage: npx tsx scripts/update-product-images.ts <path-to-csv>");
    console.error("CSV format: sku,imageUrl");
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  let updated = 0;
  let notFound = 0;

  for (const row of rows) {
    const sku = (row.sku || row.SKU || "").trim();
    const imageUrl = (row.imageUrl || row.image_url || "").trim();

    if (!sku || !imageUrl) continue;

    const result = await db
      .update(products)
      .set({ imageUrl })
      .where(eq(products.sku, sku))
      .returning({ id: products.id });

    if (result.length > 0) {
      updated++;
      if (updated % 100 === 0) console.log(`Updated ${updated}...`);
    } else {
      notFound++;
      if (notFound <= 5) console.warn(`SKU not found: ${sku}`);
    }
  }

  console.log(`Done. Updated: ${updated}, Not found: ${notFound}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
