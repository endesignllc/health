/**
 * Creates home-safety product classes from imported Fieldtex items and maps them 
 * to the "Staying Steady at Home" need (joint-comfort-mobility).
 * 
 * Classes created:
 * - compression-stockings: Support stockings (8-40 mmhg)
 * - bath-safety-aids: Bath sponges, reachers
 * - body-scales: Bath scales, talking scales
 * - support-cushions: Seat cushions, pillows
 * - mobility-supports: Ankle, knee, back, wrist supports
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, or, and, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  productClasses,
  needs,
  products,
} from "../db/schema";

interface ClassDef {
  slug: string;
  canonicalName: string;
  description: string;
  matchPatterns: string[]; // SQL ILIKE patterns for product name matching
}

const HOME_SAFETY_CLASSES: ClassDef[] = [
  {
    slug: "compression-stockings",
    canonicalName: "Compression Stockings",
    description: "Support stockings and anti-embolism hosiery for circulation and mobility",
    matchPatterns: [
      "%mmhg%",
      "%compression%",
      "%support%stocking%",
      "%anti embolism%",
      "%support - %", // matches "light support - extra large"
    ],
  },
  {
    slug: "bath-safety-aids",
    canonicalName: "Bath & Hygiene Aids",
    description: "Adaptive bathing and hygiene aids for safety and independence",
    matchPatterns: [
      "%bath sponge%",
      "%bath brush%",
      "%shower%",
    ],
  },
  {
    slug: "body-scales",
    canonicalName: "Body Scales",
    description: "Digital and talking scales for health monitoring",
    matchPatterns: [
      "%bath scale%",
      "%body scale%",
      "%floor scale%",
      "%talking%scale%",
      "%digital scale%capacity%",
    ],
  },
  {
    slug: "support-cushions",
    canonicalName: "Support Cushions",
    description: "Seat cushions and comfort aids for posture and pressure relief",
    matchPatterns: [
      "%seat cushion%",
      "%coccyx%",
      "%donut cushion%",
      "%wheelchair cushion%",
      "%foam cushion%",
      "%memory foam%",
      "%gel cushion%",
      "%lumbar%",
    ],
  },
  {
    slug: "mobility-supports",
    canonicalName: "Mobility Supports",
    description: "Braces and supports for joints and mobility",
    matchPatterns: [
      "%ankle support%",
      "%knee support%",
      "%back support%",
      "%wrist support%",
      "%elbow support%",
      "%adjustable%support%",
      "%strap%support%",
    ],
  },
];

async function main() {
  console.log("Setting up home safety product classes...\n");

  // Get or create the "joint-comfort-mobility" need (will be displayed as "Staying Steady at Home" in Laurel)
  let stayingSteadyNeed = await db.query.needs.findFirst({
    where: eq(needs.slug, "joint-comfort-mobility"),
  });

  if (!stayingSteadyNeed) {
    console.log("Creating joint-comfort-mobility need...");
    const [inserted] = await db
      .insert(needs)
      .values({
        slug: "joint-comfort-mobility",
        name: "Joint Comfort & Mobility",
        description: "Support for joints, balance, and staying safe at home",
        priorityTier: 2,
      })
      .returning();
    stayingSteadyNeed = inserted;
    console.log(`Created need: ${stayingSteadyNeed?.slug}`);
  }

  if (!stayingSteadyNeed) {
    console.error("Failed to get/create need");
    process.exit(1);
  }

  const stats = {
    classesCreated: 0,
    classesUpdated: 0,
    productsLinked: 0,
  };

  for (const classDef of HOME_SAFETY_CLASSES) {
    console.log(`\nProcessing class: ${classDef.canonicalName}`);

    // Upsert the product class
    let productClass = await db.query.productClasses.findFirst({
      where: eq(productClasses.slug, classDef.slug),
    });

    if (!productClass) {
      const [inserted] = await db
        .insert(productClasses)
        .values({
          slug: classDef.slug,
          canonicalName: classDef.canonicalName,
          description: classDef.description,
          needId: stayingSteadyNeed.id, // Link to need via needId
        })
        .returning();
      productClass = inserted;
      stats.classesCreated++;
      console.log(`  Created class: ${classDef.slug} (linked to ${stayingSteadyNeed.slug})`);
    } else {
      await db
        .update(productClasses)
        .set({
          canonicalName: classDef.canonicalName,
          description: classDef.description,
          needId: stayingSteadyNeed.id,
        })
        .where(eq(productClasses.id, productClass.id));
      stats.classesUpdated++;
      console.log(`  Updated class: ${classDef.slug}`);
    }

    if (!productClass) continue;

    // Find matching Fieldtex products
    const likeConditions = classDef.matchPatterns.map((pattern) =>
      sql`LOWER(${products.name}) LIKE LOWER(${pattern})`
    );

    const matchingProducts = await db
      .select({ id: products.id, name: products.name, sku: products.sku })
      .from(products)
      .where(
        and(
          eq(products.vendor, "fieldtex2024"),
          eq(products.active, true),
          or(...likeConditions)
        )
      );

    console.log(`  Found ${matchingProducts.length} matching products`);

    // Link products to class via products.productClassId
    for (const product of matchingProducts) {
      await db
        .update(products)
        .set({ 
          productClassId: productClass.id,
          // Also update tags for home_safety badge
          tags: sql`array_remove(array_append(
            array_remove(${products.tags}, 'eligibility:otc'),
            'eligibility:home_safety'
          ), NULL)`,
        })
        .where(eq(products.id, product.id));
      stats.productsLinked++;
    }
  }

  // Count products with home_safety eligibility
  const homeSafetyCount = await db
    .select({ id: products.id })
    .from(products)
    .where(
      sql`'eligibility:home_safety' = ANY(${products.tags})`
    );

  console.log("\n=== Summary ===");
  console.log(`Classes created: ${stats.classesCreated}`);
  console.log(`Classes updated: ${stats.classesUpdated}`);
  console.log(`Products linked to classes: ${stats.productsLinked}`);
  console.log(`Total products with home_safety eligibility: ${homeSafetyCount.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
