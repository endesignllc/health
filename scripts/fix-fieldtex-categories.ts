/**
 * Fix Fieldtex Product Categories (Deterministic, Not Guessed)
 * 
 * PRINCIPLE: This is the pattern for every future catalog:
 * 1. Inherit the source document's own taxonomy deterministically
 * 2. Map source sections → our canonical classes via a reviewed dictionary
 * 3. Only what the source doesn't classify goes to keyword rules / LLM classification,
 *    below a confidence threshold → human review queue
 * 
 * That is the Assessment Engine's intake path — never ship a keyword-guessed category
 * to a member-facing surface again.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { db } from "../lib/db";
import { products, productCategories, productClasses } from "../db/schema";
import { eq, like, sql } from "drizzle-orm";

const SECTION_MAP_PATH = path.join(process.cwd(), "product-catalog", "fieldtex-section-map.json");
const REVIEW_CSV_PATH = path.join(process.cwd(), "product-catalog", "fieldtex-category-review.csv");

// Section → Category mapping dictionary (from the spec)
// Key: source section (or prefix for subcategories)
// Value: { category, class?, tags? }
interface CategoryMapping {
  category: string;
  categoryName: string;
  class?: string;
  tags?: string[];
}

const SECTION_TO_CATEGORY: Record<string, CategoryMapping> = {
  // Allergy · Cold & Flu · Cough Drops · Respiratory Relief → cold-flu-allergy
  "Allergy": { category: "cold-flu-allergy", categoryName: "Cold, Flu & Allergy" },
  "Cold & Flu": { category: "cold-flu-allergy", categoryName: "Cold, Flu & Allergy" },
  "Cough Drops": { category: "cold-flu-allergy", categoryName: "Cold, Flu & Allergy" },
  "Respiratory Relief": { category: "cold-flu-allergy", categoryName: "Cold, Flu & Allergy", tags: ["respiratory"] },

  // Dental Care → oral-care
  "Dental Care": { category: "oral-care", categoryName: "Oral Care" },
  "Dental Care - Denture": { category: "oral-care", categoryName: "Oral Care", class: "denture-care" },
  "Dental Care - Dry Mouth": { category: "oral-care", categoryName: "Oral Care" },
  "Dental Care - Toothbrush": { category: "oral-care", categoryName: "Oral Care" },
  "Dental Care - Toothbrush Electric": { category: "oral-care", categoryName: "Oral Care" },
  "Dental Care - Toothpaste": { category: "oral-care", categoryName: "Oral Care" },

  // Diabetic Supplies → diabetes-care
  "Diabetic Supplies": { category: "diabetes-care", categoryName: "Diabetes Care" },
  "Diabetic Supplies - Socks": { category: "diabetes-care", categoryName: "Diabetes Care", tags: ["diabetic-socks"] },

  // Diagnostic Equipment → monitoring-devices
  "Diagnostic Equipment": { category: "monitoring-devices", categoryName: "Monitoring & Testing" },
  "Diagnostic Equipment - Thermometers": { category: "monitoring-devices", categoryName: "Monitoring & Testing" },
  "Diagnostic Equipment - Scales": { category: "monitoring-devices", categoryName: "Monitoring & Testing", class: "body-scales" },
  "Home Testing": { category: "monitoring-devices", categoryName: "Monitoring & Testing" },
  "Weight Loss - Kitchen Scales": { category: "monitoring-devices", categoryName: "Monitoring & Testing", class: "kitchen-scales" },

  // Ear Care · Eye Care → eye-ear-care
  "Ear Care": { category: "eye-ear-care", categoryName: "Eye & Ear Care" },
  "Eye Care": { category: "eye-ear-care", categoryName: "Eye & Ear Care" },

  // Feminine & UTI → feminine-uti-care
  "Feminine & UTI": { category: "feminine-uti-care", categoryName: "Feminine & UTI Care" },

  // Digestive group → digestive-health
  "Fiber Supplements": { category: "digestive-health", categoryName: "Digestive Health" },
  "Colon Support": { category: "digestive-health", categoryName: "Digestive Health" },
  "Lactose": { category: "digestive-health", categoryName: "Digestive Health" },
  "Stomach & Laxatives": { category: "digestive-health", categoryName: "Digestive Health" },
  "Stomach - Antacids & Acid Reducers": { category: "digestive-health", categoryName: "Digestive Health" },
  "Hemorrhoid": { category: "digestive-health", categoryName: "Digestive Health" },

  // First Aid group → first-aid
  "First Aid - Bandages": { category: "first-aid", categoryName: "First Aid" },
  "First Aid - Dressings & Gauze": { category: "first-aid", categoryName: "First Aid" },
  "First Aid - Tape": { category: "first-aid", categoryName: "First Aid" },
  "First Aid Kits": { category: "first-aid", categoryName: "First Aid" },

  // Foot Care → foot-care
  "Foot Care": { category: "foot-care", categoryName: "Foot Care" },

  // Pain Relief group → pain-relief
  "Pain Relief": { category: "pain-relief", categoryName: "Pain Relief" },
  "Hot & Cold Therapy": { category: "pain-relief", categoryName: "Pain Relief" },
  "Ointments & Topicals - Analgesics": { category: "pain-relief", categoryName: "Pain Relief" },

  // Incontinence → incontinence
  "Incontinence": { category: "incontinence", categoryName: "Incontinence Care" },
  "Incontinence Protection": { category: "incontinence", categoryName: "Incontinence Care" },

  // Skin Care group → skin-care
  "Ointments & Topicals": { category: "skin-care", categoryName: "Skin Care" },
  "Ointments & Topicals - Cleaners": { category: "skin-care", categoryName: "Skin Care" },
  "Skin Care": { category: "skin-care", categoryName: "Skin Care" },
  "Skin Care - Sunscreen": { category: "skin-care", categoryName: "Skin Care" },

  // Personal wellness catchall → personal-wellness
  "Lip Care": { category: "personal-wellness", categoryName: "Personal Wellness" },
  "Sleep Aid": { category: "personal-wellness", categoryName: "Personal Wellness" },
  "Motion Sickness": { category: "personal-wellness", categoryName: "Personal Wellness" },
  "Menopause Relief": { category: "personal-wellness", categoryName: "Personal Wellness" },
  "Smoking Cessation": { category: "personal-wellness", categoryName: "Personal Wellness" },
  "Lice": { category: "personal-wellness", categoryName: "Personal Wellness" },

  // PPE → home-health-supplies
  "PPE - Gloves": { category: "home-health-supplies", categoryName: "Home Health Supplies" },
  "Personal Protective Equipment - PPE": { category: "home-health-supplies", categoryName: "Home Health Supplies" },

  // Supports → mobility-supports (per-joint as tags/variants)
  "Supports - Back": { category: "mobility-supports", categoryName: "Mobility Supports", tags: ["support:back"] },
  "Supports - Elbow": { category: "mobility-supports", categoryName: "Mobility Supports", tags: ["support:elbow"] },
  "Supports - Knee": { category: "mobility-supports", categoryName: "Mobility Supports", tags: ["support:knee"] },
  "Supports - Wrist": { category: "mobility-supports", categoryName: "Mobility Supports", tags: ["support:wrist"] },
  "Supports - Ankle": { category: "mobility-supports", categoryName: "Mobility Supports", tags: ["support:ankle"] },

  // Compression stockings → compression-stockings
  "Supports - Stockings": { category: "compression-stockings", categoryName: "Compression Stockings" },

  // Cushions → support-cushions
  "Supports - Cushions": { category: "support-cushions", categoryName: "Support Cushions" },

  // Wholecare For You → daily-living-aids
  "Wholecare For You": { category: "daily-living-aids", categoryName: "Daily Living Aids" },

  // Vitamins → vitamins-supplements
  "Vitamins, Minerals, & Supplements": { category: "vitamins-supplements", categoryName: "Vitamins & Supplements" },
};

async function ensureCategory(slug: string, name: string): Promise<string> {
  // Check if exists
  const existing = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.slug, slug))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new category
  const [created] = await db
    .insert(productCategories)
    .values({ slug, name })
    .returning({ id: productCategories.id });
  
  console.log(`  Created new category: ${slug} -> ${name}`);
  return created.id;
}

async function main() {
  console.log("=== Fieldtex Category Fix (Deterministic) ===\n");
  console.log("Loading section map...");
  
  const sectionMap: Record<string, string> = JSON.parse(
    fs.readFileSync(SECTION_MAP_PATH, "utf-8")
  );
  
  console.log(`  ${Object.keys(sectionMap).length} item codes with sections\n`);

  // Get all Fieldtex products
  const fieldtexProducts = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      categoryId: products.categoryId,
      tags: products.tags,
    })
    .from(products)
    .where(like(products.sku, "FTX-%"));

  console.log(`Found ${fieldtexProducts.length} Fieldtex products\n`);

  // Build category ID cache
  const categoryCache: Record<string, string> = {};
  const newCategories: string[] = [];

  // Pre-create all needed categories
  console.log("Ensuring categories exist...");
  const uniqueCategories = new Set(Object.values(SECTION_TO_CATEGORY).map(m => m.category));
  for (const mapping of Object.values(SECTION_TO_CATEGORY)) {
    if (!categoryCache[mapping.category]) {
      const existingCats = await db
        .select({ id: productCategories.id, slug: productCategories.slug })
        .from(productCategories)
        .where(eq(productCategories.slug, mapping.category))
        .limit(1);
      
      if (existingCats.length > 0) {
        categoryCache[mapping.category] = existingCats[0].id;
      } else {
        const [created] = await db
          .insert(productCategories)
          .values({ slug: mapping.category, name: mapping.categoryName })
          .returning({ id: productCategories.id });
        categoryCache[mapping.category] = created.id;
        newCategories.push(`${mapping.category} -> ${mapping.categoryName}`);
      }
    }
  }

  if (newCategories.length > 0) {
    console.log("\nNew categories created:");
    newCategories.forEach(c => console.log(`  + ${c}`));
  }
  console.log("");

  // Process products
  const stats: Record<string, number> = {};
  const unmatchedProducts: Array<{ code: string; name: string; currentCategory: string }> = [];
  let updated = 0;

  for (const product of fieldtexProducts) {
    const itemCode = product.sku.replace("FTX-", "");
    // Try exact match first, then with N suffix (new items in catalog)
    const sourceSection = sectionMap[itemCode] ?? sectionMap[itemCode + "N"];

    if (!sourceSection) {
      // Get current category name for review
      const catName = "unknown";
      unmatchedProducts.push({
        code: itemCode,
        name: product.name,
        currentCategory: catName,
      });
      continue;
    }

    const mapping = SECTION_TO_CATEGORY[sourceSection];
    if (!mapping) {
      console.warn(`  No mapping for section: ${sourceSection} (item ${itemCode})`);
      unmatchedProducts.push({
        code: itemCode,
        name: product.name,
        currentCategory: `unmapped:${sourceSection}`,
      });
      continue;
    }

    const newCategoryId = categoryCache[mapping.category];
    if (!newCategoryId) {
      console.error(`  Missing category ID for: ${mapping.category}`);
      continue;
    }

    // Build new tags array
    let newTags = product.tags ?? [];
    // Add source section tag for audit trail
    newTags = newTags.filter(t => !t.startsWith("source_section:"));
    newTags.push(`source_section:${sourceSection}`);
    // Add mapping tags if specified
    if (mapping.tags) {
      for (const tag of mapping.tags) {
        if (!newTags.includes(tag)) {
          newTags.push(tag);
        }
      }
    }

    // Update product
    await db
      .update(products)
      .set({
        categoryId: newCategoryId,
        tags: newTags,
      })
      .where(eq(products.id, product.id));

    stats[mapping.category] = (stats[mapping.category] ?? 0) + 1;
    updated++;
  }

  // Write review CSV for unmatched
  if (unmatchedProducts.length > 0) {
    const csvHeader = "itemCode,name,currentCategory";
    const csvRows = unmatchedProducts.map(p => 
      `"${p.code}","${p.name.replace(/"/g, '""')}","${p.currentCategory}"`
    );
    fs.writeFileSync(REVIEW_CSV_PATH, [csvHeader, ...csvRows].join("\n"));
    console.log(`\nWrote ${unmatchedProducts.length} unmatched products to review CSV`);
  }

  // Print stats
  console.log("\n=== Re-categorization Summary ===\n");
  console.log(`Total products updated: ${updated}`);
  console.log(`Unmatched (needs review): ${unmatchedProducts.length}`);
  console.log(`\nProducts per category:`);
  Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(25)} ${count}`);
    });

  console.log("\n✓ Done");
}

main().catch(console.error);
