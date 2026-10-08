/**
 * Attaches imageUrl to Fieldtex products using the extracted image map.
 * Uses base file (ignores _1/_2 suffixes for duplicates).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { products, productClasses } from "../db/schema";

const IMAGE_MAP_PATH = path.join(
  process.cwd(),
  "product-catalog",
  "fieldtex-image-map.json"
);
const IMAGE_DIR = path.join(process.cwd(), "public", "images", "fieldtex");
const IMAGE_URL_PREFIX = "/images/fieldtex/";

interface ImageMapEntry {
  itemCode: string;
  file: string;
  page: number;
  w: number;
  h: number;
}

interface ImageMap {
  source: string;
  vendor: string;
  mapped: ImageMapEntry[];
}

function isBaseFile(filename: string): boolean {
  // Base files don't have _1, _2, etc. suffix before extension
  return !/_\d+\.\w+$/.test(filename);
}

function getItemCodeFromFilename(filename: string): string {
  // Remove _1, _2 suffixes and extension: "10670_1.jpeg" -> "10670"
  return filename.replace(/(_\d+)?\.\w+$/, "");
}

async function main() {
  if (!fs.existsSync(IMAGE_MAP_PATH)) {
    console.error(`Image map not found: ${IMAGE_MAP_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(IMAGE_MAP_PATH, "utf8");
  const imageMap: ImageMap = JSON.parse(raw);

  // Build a map of itemCode -> base image file
  // Prefer files without _1/_2 suffix
  const itemToImage = new Map<string, string>();
  
  for (const entry of imageMap.mapped) {
    const itemCode = entry.itemCode;
    const file = entry.file;
    
    if (!itemToImage.has(itemCode)) {
      // First entry for this item
      itemToImage.set(itemCode, file);
    } else if (isBaseFile(file)) {
      // Prefer base file over _1/_2 variants
      itemToImage.set(itemCode, file);
    }
  }

  console.log(`Image map loaded: ${itemToImage.size} unique item codes`);

  // Verify images exist
  let verifiedCount = 0;
  const verifiedImages = new Map<string, string>();
  
  for (const [itemCode, filename] of itemToImage) {
    const imagePath = path.join(IMAGE_DIR, filename);
    if (fs.existsSync(imagePath)) {
      verifiedImages.set(itemCode, filename);
      verifiedCount++;
    }
  }
  
  console.log(`Verified images on disk: ${verifiedCount}`);

  // Update Fieldtex products with image URLs
  let updated = 0;
  let notFound = 0;
  const missingItems: string[] = [];

  const fieldtexProducts = await db
    .select({ id: products.id, sku: products.sku, name: products.name })
    .from(products)
    .where(eq(products.vendor, "fieldtex2024"));

  console.log(`Found ${fieldtexProducts.length} Fieldtex products in DB`);

  for (const product of fieldtexProducts) {
    // SKU format: FTX-{itemCode}
    const itemCode = product.sku.replace(/^FTX-/, "");
    const imageFile = verifiedImages.get(itemCode);

    if (imageFile) {
      const imageUrl = `${IMAGE_URL_PREFIX}${imageFile}`;
      await db
        .update(products)
        .set({ imageUrl })
        .where(eq(products.id, product.id));
      updated++;
    } else {
      notFound++;
      missingItems.push(itemCode);
    }
  }

  console.log("\n=== Image Attachment Summary ===");
  console.log(`Products updated with images: ${updated}`);
  console.log(`Products without images: ${notFound}`);
  
  // Report on demo-critical products
  console.log("\n=== Demo Path Coverage ===");
  
  // Get home-safety class products
  const homeSafetyClasses = await db
    .select({ id: productClasses.id, slug: productClasses.slug })
    .from(productClasses)
    .where(
      sql`${productClasses.slug} IN ('compression-stockings', 'bath-safety-aids', 'body-scales', 'support-cushions', 'mobility-supports')`
    );

  const homeSafetyClassIds = homeSafetyClasses.map((c) => c.id);
  
  if (homeSafetyClassIds.length > 0) {
    const homeSafetyProducts = await db
      .select({
        sku: products.sku,
        name: products.name,
        imageUrl: products.imageUrl,
        classId: products.productClassId,
      })
      .from(products)
      .where(
        sql`${products.productClassId} IN (${sql.join(homeSafetyClassIds.map(id => sql`${id}`), sql`, `)})`
      );

    const withImages = homeSafetyProducts.filter((p) => p.imageUrl);
    const withoutImages = homeSafetyProducts.filter((p) => !p.imageUrl);

    console.log(`\nHome Safety products: ${homeSafetyProducts.length}`);
    console.log(`  With images: ${withImages.length}`);
    console.log(`  Without images: ${withoutImages.length}`);
    
    if (withoutImages.length > 0) {
      console.log("  Missing images:");
      withoutImages.forEach((p) => console.log(`    - ${p.sku}: ${p.name.substring(0, 50)}`));
    }
  }

  // Get bladder-support class products
  const bladderClasses = await db
    .select({ id: productClasses.id, slug: productClasses.slug })
    .from(productClasses)
    .where(
      sql`${productClasses.slug} IN ('bladder-pads', 'protective-underwear', 'underpads', 'skin-barrier-cream', 'cleansing-wipes')`
    );

  const bladderClassIds = bladderClasses.map((c) => c.id);

  if (bladderClassIds.length > 0) {
    const bladderProducts = await db
      .select({
        sku: products.sku,
        name: products.name,
        imageUrl: products.imageUrl,
      })
      .from(products)
      .where(
        sql`${products.productClassId} IN (${sql.join(bladderClassIds.map(id => sql`${id}`), sql`, `)})`
      );

    const withImages = bladderProducts.filter((p) => p.imageUrl);
    const withoutImages = bladderProducts.filter((p) => !p.imageUrl);

    console.log(`\nBladder Support products: ${bladderProducts.length}`);
    console.log(`  With images: ${withImages.length}`);
    console.log(`  Without images: ${withoutImages.length}`);

    if (withoutImages.length > 0) {
      console.log("  Missing images:");
      withoutImages.forEach((p) => console.log(`    - ${p.sku}: ${p.name.substring(0, 50)}`));
    }
  } else {
    // Bladder support might be using incontinence category instead
    console.log("\nChecking incontinence category products...");
    const incontinenceProducts = await db
      .select({
        sku: products.sku,
        name: products.name,
        imageUrl: products.imageUrl,
      })
      .from(products)
      .where(
        and(
          eq(products.vendor, "fieldtex2024"),
          sql`'eligibility:otc' = ANY(${products.tags}) OR ${products.name} ILIKE '%incontinence%' OR ${products.name} ILIKE '%underwear%' OR ${products.name} ILIKE '%pad%' OR ${products.name} ILIKE '%brief%'`
        )
      );

    const withImages = incontinenceProducts.filter((p) => p.imageUrl);
    const withoutImages = incontinenceProducts.filter((p) => !p.imageUrl);

    console.log(`\nIncontinence-related products (Fieldtex): ${incontinenceProducts.length}`);
    console.log(`  With images: ${withImages.length}`);
    console.log(`  Without images: ${withoutImages.length}`);
  }

  // Overall stats
  const allWithImages = await db.$count(
    products,
    and(eq(products.vendor, "fieldtex2024"), sql`${products.imageUrl} IS NOT NULL`)
  );
  const allWithoutImages = await db.$count(
    products,
    and(eq(products.vendor, "fieldtex2024"), sql`${products.imageUrl} IS NULL`)
  );

  console.log("\n=== Overall Fieldtex Coverage ===");
  console.log(`With images: ${allWithImages}`);
  console.log(`Without images: ${allWithoutImages}`);
  console.log(`Coverage: ${Math.round((allWithImages / (allWithImages + allWithoutImages)) * 100)}%`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
