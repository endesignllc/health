/**
 * Seed HBS Canonical Taxonomy v1
 * 
 * IDEMPOTENT: Safe to run multiple times. Creates categories/classes if they don't exist,
 * updates member labels if they've changed.
 * 
 * Source of truth: docs/TAXONOMY_V1.md
 * 
 * Run: npx tsx scripts/seed-taxonomy-v1.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../lib/db";
import { productCategories, productClasses, needs } from "../db/schema";
import { eq, sql } from "drizzle-orm";

// ============================================================================
// TAXONOMY V1 DEFINITION
// 12 groups, 44 classes
// ============================================================================

interface TaxonomyClass {
  slug: string;
  memberLabel: string;
  rails: string[];  // OTC, HS, DME, DUAL
  notes?: string;
}

interface TaxonomyGroup {
  groupNumber: number;
  slug: string;           // Category slug
  memberLabel: string;    // Category display name
  filterLabel: string;    // Shop filter label (may differ)
  classes: TaxonomyClass[];
}

const TAXONOMY_V1: TaxonomyGroup[] = [
  // Group 1: Pain & Recovery
  {
    groupNumber: 1,
    slug: "pain-relief",
    memberLabel: "Pain Relief",
    filterLabel: "Pain relief",
    classes: [
      { slug: "pain-relief-oral", memberLabel: "Pain relievers", rails: ["OTC"] },
      { slug: "topical-analgesics", memberLabel: "Pain relief creams & patches", rails: ["OTC"] },
      { slug: "hot-cold-therapy", memberLabel: "Heating pads & ice packs", rails: ["OTC"] },
      { slug: "tens-devices", memberLabel: "Electrotherapy (TENS)", rails: ["OTC", "DME"] },
    ],
  },

  // Group 2: Cold, Flu & Allergy
  {
    groupNumber: 2,
    slug: "cold-flu-allergy",
    memberLabel: "Cold, Flu & Allergy",
    filterLabel: "Cold, flu & allergy",
    classes: [
      { slug: "cold-flu", memberLabel: "Cold & flu remedies", rails: ["OTC"] },
      { slug: "allergy", memberLabel: "Allergy relief", rails: ["OTC"] },
      { slug: "cough-sore-throat", memberLabel: "Cough drops & throat care", rails: ["OTC"] },
      { slug: "respiratory-care", memberLabel: "Humidifiers & breathing care", rails: ["OTC"] },
    ],
  },

  // Group 3: Digestive Health
  {
    groupNumber: 3,
    slug: "digestive-health",
    memberLabel: "Digestive Health",
    filterLabel: "Stomach & digestion",
    classes: [
      { slug: "antacids", memberLabel: "Heartburn & antacids", rails: ["OTC"] },
      { slug: "laxatives-fiber", memberLabel: "Constipation & fiber", rails: ["OTC"] },
      { slug: "digestive-other", memberLabel: "Nausea, anti-diarrheal, lactose, probiotics", rails: ["OTC"] },
      { slug: "hemorrhoid-care", memberLabel: "Hemorrhoid care", rails: ["OTC"] },
    ],
  },

  // Group 4: Vitamins & Supplements (DUAL by default)
  {
    groupNumber: 4,
    slug: "vitamins-supplements",
    memberLabel: "Vitamins & Supplements",
    filterLabel: "Vitamins",
    classes: [
      { slug: "multivitamins", memberLabel: "Daily multivitamins", rails: ["OTC", "DUAL"] },
      { slug: "targeted-supplements", memberLabel: "Targeted supplements (eye, bone, heart)", rails: ["OTC", "DUAL"], notes: "DUAL classes carry 'talk with your provider' microcopy" },
    ],
  },

  // Group 5: Oral Care
  {
    groupNumber: 5,
    slug: "oral-care",
    memberLabel: "Oral Care",
    filterLabel: "Mouth & denture care",
    classes: [
      { slug: "toothbrushes", memberLabel: "Toothbrushes (manual & powered)", rails: ["OTC"] },
      { slug: "toothpaste-rinse", memberLabel: "Toothpaste & mouth rinse", rails: ["OTC"] },
      { slug: "denture-care", memberLabel: "Denture care", rails: ["OTC"] },
      { slug: "dry-mouth-care", memberLabel: "Dry mouth relief", rails: ["OTC"] },
    ],
  },

  // Group 6: Eye & Ear
  {
    groupNumber: 6,
    slug: "eye-ear-care",
    memberLabel: "Eye & Ear Care",
    filterLabel: "Eye & ear care",
    classes: [
      { slug: "eye-care", memberLabel: "Eye drops & eye care", rails: ["OTC"] },
      { slug: "reading-glasses", memberLabel: "Reading glasses", rails: ["OTC"], notes: "Vision-rail crosslink" },
      { slug: "ear-care", memberLabel: "Ear care", rails: ["OTC"], notes: "Hearing-rail crosslink" },
    ],
  },

  // Group 7: First Aid & Wound Care
  {
    groupNumber: 7,
    slug: "first-aid",
    memberLabel: "First Aid",
    filterLabel: "First aid",
    classes: [
      { slug: "bandages-dressings", memberLabel: "Bandages, gauze & tape", rails: ["OTC"] },
      { slug: "antiseptics-ointments", memberLabel: "Antiseptics & first aid ointments", rails: ["OTC"] },
      { slug: "first-aid-kits", memberLabel: "First aid kits", rails: ["OTC"] },
    ],
  },

  // Group 8: Skin Care
  {
    groupNumber: 8,
    slug: "skin-care",
    memberLabel: "Skin Care",
    filterLabel: "Skin care",
    classes: [
      { slug: "skin-barrier-protectants", memberLabel: "Protective skin creams (zinc, A&D)", rails: ["OTC"], notes: "Crosslinked to Bladder & Bowel need" },
      { slug: "lotions-moisturizers", memberLabel: "Lotions & moisturizers", rails: ["OTC"] },
      { slug: "sun-lip-care", memberLabel: "Sunscreen & lip care", rails: ["OTC"] },
    ],
  },

  // Group 9: Bladder & Bowel Care
  {
    groupNumber: 9,
    slug: "incontinence",
    memberLabel: "Bladder & Bowel Care",
    filterLabel: "Bladder & bowel care",  // Never "adult diapers"
    classes: [
      { slug: "briefs-tabs", memberLabel: "Briefs (tab-style)", rails: ["OTC"] },
      { slug: "protective-underwear", memberLabel: "Protective underwear (pull-on)", rails: ["OTC"] },
      { slug: "pads-liners", memberLabel: "Pads & liners", rails: ["OTC"] },
      { slug: "underpads-chair", memberLabel: "Bed & chair protection", rails: ["OTC"] },
      { slug: "cleansing-wipes", memberLabel: "Wipes & washcloths", rails: ["OTC"] },
      { slug: "urinals-bedpans", memberLabel: "Urinals & bedpans", rails: ["OTC", "DME"] },
    ],
  },

  // Group 10: Home Safety & Daily Living
  {
    groupNumber: 10,
    slug: "home-safety",
    memberLabel: "Home Safety & Daily Living",
    filterLabel: "Staying safe at home",
    classes: [
      { slug: "bathroom-safety", memberLabel: "Bathroom safety (grab bars, mats, benches)", rails: ["HS", "DME"], notes: "HEDIS falls story" },
      { slug: "fall-prevention", memberLabel: "Night lights & fall prevention", rails: ["HS"] },
      { slug: "daily-living-aids", memberLabel: "Daily living aids (reachers, sock aids, openers, pill organizers)", rails: ["HS", "OTC"] },
      { slug: "home-health-supplies", memberLabel: "Gloves, masks, sharps & home health supplies", rails: ["OTC"] },
    ],
  },

  // Group 11: Supports, Braces & Hosiery
  {
    groupNumber: 11,
    slug: "mobility-supports",
    memberLabel: "Supports & Braces",
    filterLabel: "Supports & braces",
    classes: [
      { slug: "compression-stockings", memberLabel: "Compression & support stockings", rails: ["OTC", "DME"], notes: "The $0-badge family" },
      { slug: "body-supports", memberLabel: "Back, knee, ankle, wrist & elbow supports", rails: ["OTC"], notes: "joint = variant axis, not class" },
      { slug: "support-cushions", memberLabel: "Seat & positioning cushions", rails: ["HS", "OTC"] },
      { slug: "canes-mobility", memberLabel: "Canes & mobility aids", rails: ["HS", "DME"] },
    ],
  },

  // Group 12: Monitoring, Testing & Diabetes
  {
    groupNumber: 12,
    slug: "monitoring-devices",
    memberLabel: "Health Monitoring",
    filterLabel: "Health monitoring",
    classes: [
      { slug: "bp-monitors", memberLabel: "Blood pressure monitors", rails: ["OTC", "DME"] },
      { slug: "thermometers", memberLabel: "Thermometers", rails: ["OTC"] },
      { slug: "scales", memberLabel: "Scales", rails: ["OTC"], notes: "talking scales tag: low-vision" },
      { slug: "pulse-oximeters", memberLabel: "Pulse oximeters", rails: ["OTC"] },
      { slug: "diabetes-care", memberLabel: "Diabetes care (socks, glucose, organizers)", rails: ["OTC"], notes: "diabetic shoes/inserts → DME" },
      { slug: "home-tests", memberLabel: "Home test kits", rails: ["OTC"] },
    ],
  },
];

// Need slugs that classes map to
const CLASS_TO_NEEDS: Record<string, string[]> = {
  // Bladder & Bowel need
  "briefs-tabs": ["bladder-support"],
  "protective-underwear": ["bladder-support"],
  "pads-liners": ["bladder-support"],
  "underpads-chair": ["bladder-support"],
  "cleansing-wipes": ["bladder-support"],
  "urinals-bedpans": ["bladder-support"],
  "skin-barrier-protectants": ["bladder-support"],  // Crosslinked
  // Staying Steady / Joint Comfort need
  "bathroom-safety": ["joint-comfort-mobility"],
  "fall-prevention": ["joint-comfort-mobility"],
  "daily-living-aids": ["joint-comfort-mobility"],
  "compression-stockings": ["joint-comfort-mobility"],
  "body-supports": ["joint-comfort-mobility"],
  "support-cushions": ["joint-comfort-mobility"],
  "canes-mobility": ["joint-comfort-mobility"],
};

async function ensureCategory(slug: string, name: string): Promise<string> {
  const existing = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    // Update name if changed
    await db
      .update(productCategories)
      .set({ name })
      .where(eq(productCategories.slug, slug));
    return existing[0].id;
  }

  const [created] = await db
    .insert(productCategories)
    .values({ slug, name })
    .returning({ id: productCategories.id });

  return created.id;
}

async function ensureClass(
  slug: string,
  canonicalName: string,
  needIds: string[]
): Promise<string> {
  const existing = await db
    .select({ id: productClasses.id })
    .from(productClasses)
    .where(eq(productClasses.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    // Update canonical name if changed
    await db
      .update(productClasses)
      .set({ canonicalName })
      .where(eq(productClasses.slug, slug));
    return existing[0].id;
  }

  // Get first need ID if any
  const needId = needIds.length > 0 ? needIds[0] : null;

  const [created] = await db
    .insert(productClasses)
    .values({ 
      slug, 
      canonicalName,
      needId,
    })
    .returning({ id: productClasses.id });

  return created.id;
}

async function main() {
  console.log("=== Seeding HBS Canonical Taxonomy v1 ===\n");

  // Get existing needs for linking
  const existingNeeds = await db.select().from(needs);
  const needBySlug = Object.fromEntries(existingNeeds.map(n => [n.slug, n.id]));

  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  let classesCreated = 0;
  let classesUpdated = 0;

  for (const group of TAXONOMY_V1) {
    console.log(`\n[Group ${group.groupNumber}] ${group.memberLabel}`);

    // Check if category exists
    const existingCat = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(eq(productCategories.slug, group.slug))
      .limit(1);

    const isNewCategory = existingCat.length === 0;
    const categoryId = await ensureCategory(group.slug, group.memberLabel);
    
    if (isNewCategory) {
      categoriesCreated++;
      console.log(`  + Created category: ${group.slug}`);
    } else {
      categoriesUpdated++;
      console.log(`  ✓ Updated category: ${group.slug}`);
    }

    // Seed classes
    for (const cls of group.classes) {
      const existingCls = await db
        .select({ id: productClasses.id })
        .from(productClasses)
        .where(eq(productClasses.slug, cls.slug))
        .limit(1);

      const isNewClass = existingCls.length === 0;
      
      // Get need IDs for this class
      const needSlugs = CLASS_TO_NEEDS[cls.slug] ?? [];
      const needIds = needSlugs.map(s => needBySlug[s]).filter(Boolean);

      await ensureClass(cls.slug, cls.memberLabel, needIds);

      if (isNewClass) {
        classesCreated++;
        console.log(`    + Created class: ${cls.slug}`);
      } else {
        classesUpdated++;
        console.log(`    ✓ Updated class: ${cls.slug}`);
      }
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Categories: ${categoriesCreated} created, ${categoriesUpdated} updated`);
  console.log(`Classes: ${classesCreated} created, ${classesUpdated} updated`);
  console.log("\n✓ Taxonomy v1 seeded");
}

main().catch(console.error);
