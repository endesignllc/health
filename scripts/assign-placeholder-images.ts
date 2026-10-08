/**
 * Assigns placeholder/family images for products without images.
 * For demo path, uses related product images or category placeholders.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { eq, and, sql, isNull } from "drizzle-orm";
import { db } from "../lib/db";
import { products, productClasses } from "../db/schema";

const IMAGE_DIR = path.join(process.cwd(), "public", "images", "fieldtex");

// Map product class slugs to fallback image item codes
// These are related products that have images
const CLASS_FALLBACK_IMAGES: Record<string, string> = {
  "compression-stockings": "10800.jpeg", // Support stockings image
  "bath-safety-aids": "10857.jpeg", // Bath-related item
  "body-scales": "10832.jpeg", // Talking bath scale
  "support-cushions": "10830.jpeg", // Cushion-related
  "mobility-supports": "10804.jpeg", // Support item
};

// Specific product fallbacks based on similar items
const PRODUCT_FALLBACKS: Record<string, string> = {
  // Compression stockings - use 10800 (support stockings)
  "FTX-10809": "10800.jpeg",
  "FTX-10810": "10800.jpeg", 
  "FTX-10811": "10800.jpeg",
  "FTX-10812": "10800.jpeg",
  "FTX-00365": "10800.jpeg",
  "FTX-10444": "10800.jpeg",
  // Bath/hygiene
  "FTX-10682": "10857.jpeg",
  // Scales
  "FTX-10833": "10832.jpeg", // Digital scale -> Talking scale
  "FTX-10792": "10832.jpeg",
  // Supports
  "FTX-10007": "10804.jpeg",
  "FTX-90626": "10804.jpeg",
  "FTX-10888": "10804.jpeg",
  "FTX-90625": "10804.jpeg",
  "FTX-10889": "10804.jpeg",
  "FTX-10903": "10830.jpeg",
};

async function main() {
  console.log("Assigning placeholder/family images for demo path products...\n");

  let assigned = 0;
  let skipped = 0;

  // Get products without images that are in home-safety classes
  const homeSafetyClasses = await db
    .select({ id: productClasses.id, slug: productClasses.slug })
    .from(productClasses)
    .where(
      sql`${productClasses.slug} IN ('compression-stockings', 'bath-safety-aids', 'body-scales', 'support-cushions', 'mobility-supports')`
    );

  const homeSafetyClassIds = homeSafetyClasses.map((c) => c.id);
  const classSlugById = Object.fromEntries(homeSafetyClasses.map((c) => [c.id, c.slug]));

  if (homeSafetyClassIds.length > 0) {
    const homeSafetyProducts = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        imageUrl: products.imageUrl,
        classId: products.productClassId,
      })
      .from(products)
      .where(
        sql`${products.productClassId} IN (${sql.join(homeSafetyClassIds.map(id => sql`${id}`), sql`, `)})`
      );

    console.log(`Found ${homeSafetyProducts.length} home-safety products`);

    for (const product of homeSafetyProducts) {
      if (product.imageUrl) {
        continue; // Already has image
      }

      // Try product-specific fallback first
      let fallbackImage = PRODUCT_FALLBACKS[product.sku];
      
      // Then try class fallback
      if (!fallbackImage && product.classId) {
        const classSlug = classSlugById[product.classId];
        if (classSlug) {
          fallbackImage = CLASS_FALLBACK_IMAGES[classSlug];
        }
      }

      if (fallbackImage) {
        const imagePath = path.join(IMAGE_DIR, fallbackImage);
        if (fs.existsSync(imagePath)) {
          const imageUrl = `/images/fieldtex/${fallbackImage}`;
          await db
            .update(products)
            .set({ imageUrl })
            .where(eq(products.id, product.id));
          console.log(`  Assigned ${fallbackImage} to ${product.sku}`);
          assigned++;
        } else {
          console.log(`  Warning: Fallback ${fallbackImage} not found for ${product.sku}`);
          skipped++;
        }
      } else {
        console.log(`  No fallback for ${product.sku}: ${product.name.substring(0, 40)}`);
        skipped++;
      }
    }
  }

  console.log("\n=== Placeholder Assignment Summary ===");
  console.log(`Assigned: ${assigned}`);
  console.log(`Skipped: ${skipped}`);

  // Final check
  const homeSafetyWithImages = await db
    .select({ sku: products.sku, name: products.name, imageUrl: products.imageUrl })
    .from(products)
    .where(
      and(
        sql`${products.productClassId} IN (${sql.join(homeSafetyClassIds.map(id => sql`${id}`), sql`, `)})`,
        sql`${products.imageUrl} IS NOT NULL`
      )
    );

  const homeSafetyWithoutImages = await db
    .select({ sku: products.sku, name: products.name })
    .from(products)
    .where(
      and(
        sql`${products.productClassId} IN (${sql.join(homeSafetyClassIds.map(id => sql`${id}`), sql`, `)})`,
        sql`${products.imageUrl} IS NULL`
      )
    );

  console.log(`\nHome Safety - Final Coverage:`);
  console.log(`  With images: ${homeSafetyWithImages.length}`);
  console.log(`  Without images: ${homeSafetyWithoutImages.length}`);

  if (homeSafetyWithoutImages.length > 0) {
    console.log("  Still missing:");
    homeSafetyWithoutImages.forEach((p) => console.log(`    - ${p.sku}: ${p.name.substring(0, 50)}`));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
