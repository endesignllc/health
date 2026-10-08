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
// VERIFIED against actual extracted images
const CLASS_FALLBACK_IMAGES: Record<string, string> = {
  "compression-stockings": "10609.jpeg", // Sock-on-leg photo (hosiery section has no photos, this is closest)
  "bath-safety-aids": "10686.jpeg", // Sock aid with grips (daily living aid)
  "body-scales": "10832.jpeg", // Talking bath scale ✓ correct
  "support-cushions": "10830.jpeg", // Cushion (needs verification)
  "mobility-supports": "90209.jpeg", // Mueller back brace
};

// Specific product fallbacks based on similar items - VERIFIED
const PRODUCT_FALLBACKS: Record<string, string> = {
  // Compression stockings - use 10609 (sock-on-leg photo)
  // Note: compression family with "$0" badge should use Walmart sync for true shot
  "FTX-10809": "10609.jpeg", // Men's black light support
  "FTX-10810": "10609.jpeg", // Unisex beige medium support
  "FTX-10811": "10609.jpeg", // Unisex beige firm support
  "FTX-10812": "10609.jpeg", // CoolMax knee high sock
  "FTX-00365": "10609.jpeg", // Women's beige light support
  "FTX-10444": "10609.jpeg", // Anti embolism stocking
  // Bath/daily living aids
  "FTX-10682": "10686.jpeg", // Bath sponge -> Sock aid w/ grips
  // Scales - 10832 is correct
  "FTX-10833": "10832.jpeg", // Digital scale -> Talking scale
  "FTX-10792": "10832.jpeg", // Health-O-Meter scale
  // Mobility supports - use 90209 (Mueller back brace)
  "FTX-10007": "10921.jpeg", // Ankle support -> ankle support image
  "FTX-90626": "90209.jpeg", // Elbow support -> back brace (general support)
  "FTX-10888": "91095.jpeg", // Wrist support -> wrist support image
  "FTX-90625": "90209.jpeg", // Knee support -> back brace (general support)
  "FTX-10889": "90209.jpeg", // Hot/cold lumbar back brace -> Mueller back brace
  "FTX-10903": "10830.jpeg", // Memory foam coccyx cushion -> cushion
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
