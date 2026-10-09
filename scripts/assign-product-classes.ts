/**
 * Assign product classes to products based on their category
 * This enables benefit badge derivation from class benefit_rails
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../lib/db";
import { products, productCategories, productClasses } from "../db/schema";
import { eq, isNull, and, like, inArray, count, sql } from "drizzle-orm";

// Category → Default Class mapping
// Products in a category get assigned to the primary class for that category
const CATEGORY_TO_CLASS: Record<string, string> = {
  // Group 1: Pain & Recovery
  "pain-relief": "pain-relief-oral",
  
  // Group 2: Cold, Flu & Allergy
  "cold-flu-allergy": "cold-flu",
  
  // Group 3: Digestive Health
  "digestive-health": "antacids",
  
  // Group 4: Vitamins & Supplements
  "vitamins-supplements": "multivitamins",
  "supplements": "targeted-supplements",
  
  // Group 5: Oral Care
  "oral-care": "toothpaste-rinse",
  
  // Group 6: Eye & Ear
  "eye-ear-care": "eye-care",
  
  // Group 7: First Aid
  "first-aid": "bandages-dressings",
  
  // Group 8: Skin Care
  "skin-care": "lotions-moisturizers",
  "foot-care": "lotions-moisturizers",
  
  // Group 9: Bladder & Bowel Care
  "incontinence": "protective-underwear",
  
  // Group 10: Home Safety & Daily Living
  "daily-living-aids": "daily-living-aids",
  "home-health-supplies": "home-health-supplies",
  "mobility": "bathroom-safety",
  
  // Group 11: Supports, Braces & Hosiery
  "mobility-supports": "body-supports",
  "support-cushions": "support-cushions",
  "compression-stockings": "compression-stockings",
  
  // Group 12: Monitoring & Diabetes
  "monitoring-devices": "bp-monitors",
  "monitoring": "bp-monitors",
  "diabetes-care": "diabetes-care",
  
  // Personal wellness → supplements
  "personal-wellness": "targeted-supplements",
  "feminine-uti-care": "targeted-supplements",
};

// Legacy class → v1 class migration
const LEGACY_TO_V1: Record<string, string> = {
  "alpha-lipoic-acid-supplement": "targeted-supplements",
  "berberine-supplement": "targeted-supplements",
  "cinnamon-extract-supplement": "targeted-supplements",
  "bath-safety-aids": "bathroom-safety",
  "blood-glucose-meter": "diabetes-care",
  "body-scales": "scales",
  "digital-arm-bp-monitor": "bp-monitors",
  "digital-body-scale": "scales",
  "digital-thermometer": "thermometers",
  "hearing-amplifier": "ear-care",
  "mobility-supports": "body-supports",
  "pulse-oximeter": "pulse-oximeters",
};

async function main() {
  console.log("=== Assigning Product Classes ===\n");

  // 1. Migrate legacy classes to v1
  console.log("Step 1: Migrate legacy classes to v1 classes...");
  let legacyMigrated = 0;
  
  for (const [legacySlug, v1Slug] of Object.entries(LEGACY_TO_V1)) {
    const legacyClass = await db.query.productClasses.findFirst({
      where: eq(productClasses.slug, legacySlug),
    });
    const v1Class = await db.query.productClasses.findFirst({
      where: eq(productClasses.slug, v1Slug),
    });
    
    if (legacyClass && v1Class) {
      const result = await db
        .update(products)
        .set({ productClassId: v1Class.id })
        .where(eq(products.productClassId, legacyClass.id));
      
      console.log(`  ${legacySlug} → ${v1Slug}`);
      legacyMigrated++;
    }
  }
  console.log(`  Migrated ${legacyMigrated} legacy class mappings\n`);

  // 2. Get all v1 classes
  const classes = await db.select().from(productClasses);
  const classMap = new Map(classes.map(c => [c.slug, c]));

  // 3. Assign classes to products without classes based on category
  console.log("Step 2: Assign classes to unclassified products by category...");
  
  const categories = await db.select().from(productCategories);
  let assigned = 0;
  
  for (const cat of categories) {
    const targetClassSlug = CATEGORY_TO_CLASS[cat.slug];
    if (!targetClassSlug) continue;
    
    const targetClass = classMap.get(targetClassSlug);
    if (!targetClass) {
      console.log(`  ⚠ Class not found: ${targetClassSlug} for category ${cat.slug}`);
      continue;
    }
    
    const result = await db
      .update(products)
      .set({ productClassId: targetClass.id })
      .where(
        and(
          eq(products.categoryId, cat.id),
          isNull(products.productClassId)
        )
      );
    
    // Count affected
    const [countResult] = await db.select({ count: db.$count(products) })
      .from(products)
      .where(
        and(
          eq(products.categoryId, cat.id),
          eq(products.productClassId, targetClass.id)
        )
      );
  }

  // Final count
  const [totalActive] = await db.select({ cnt: count() })
    .from(products)
    .where(
      and(
        eq(products.active, true),
        eq(products.eligible, true)
      )
    );
  
  const v1ClassIds = classes.filter(c => c.benefitRails?.length).map(c => c.id);
  const [withV1Class] = v1ClassIds.length > 0
    ? await db.select({ cnt: count() })
        .from(products)
        .where(
          and(
            eq(products.active, true),
            eq(products.eligible, true),
            inArray(products.productClassId, v1ClassIds)
          )
        )
    : [{ cnt: 0 }];

  console.log(`\n=== Summary ===`);
  console.log(`Products with v1 class (has benefit_rails): ${withV1Class.cnt}`);
  console.log(`Total active eligible products: ${totalActive.cnt}`);
  console.log(`\n✓ Class assignment complete`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
