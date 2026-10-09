/**
 * Seed benefit_rails and dual_purpose for all v1 product classes
 * Based on TAXONOMY_V1.md definitions
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../lib/db";
import { productClasses } from "../db/schema";
import { eq } from "drizzle-orm";

// Rail values: otc, home_safety, dme_zero, food, utilities, vision, hearing, dental
// From TAXONOMY_V1.md "Rails key":
// - OTC = otc
// - HS = home_safety  
// - DME = dme_zero (for $0-with-plan items)
// - DUAL = dual_purpose flag (vitamins etc.)

interface ClassRails {
  slug: string;
  benefitRails: string[];
  dualPurpose: boolean;
  memberLabel: string;
}

// All 44 v1 classes with their benefit rails from TAXONOMY_V1.md
const CLASS_RAILS: ClassRails[] = [
  // Group 1: Pain & Recovery
  { slug: "pain-relief-oral", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Pain relievers" },
  { slug: "topical-analgesics", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Pain relief creams & patches" },
  { slug: "hot-cold-therapy", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Heating pads & ice packs" },
  { slug: "tens-devices", benefitRails: ["otc", "dme_zero"], dualPurpose: false, memberLabel: "Electrotherapy (TENS)" },

  // Group 2: Cold, Flu & Allergy
  { slug: "cold-flu", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Cold & flu remedies" },
  { slug: "allergy", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Allergy relief" },
  { slug: "cough-sore-throat", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Cough drops & throat care" },
  { slug: "respiratory-care", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Humidifiers & breathing care" },

  // Group 3: Digestive Health
  { slug: "antacids", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Heartburn & antacids" },
  { slug: "laxatives-fiber", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Constipation & fiber" },
  { slug: "digestive-other", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Nausea, anti-diarrheal & probiotics" },
  { slug: "hemorrhoid-care", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Hemorrhoid care" },

  // Group 4: Vitamins & Supplements (DUAL)
  { slug: "multivitamins", benefitRails: ["otc"], dualPurpose: true, memberLabel: "Daily multivitamins" },
  { slug: "targeted-supplements", benefitRails: ["otc"], dualPurpose: true, memberLabel: "Targeted supplements" },

  // Group 5: Oral Care
  { slug: "toothbrushes", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Toothbrushes" },
  { slug: "toothpaste-rinse", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Toothpaste & mouth rinse" },
  { slug: "denture-care", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Denture care" },
  { slug: "dry-mouth-care", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Dry mouth relief" },

  // Group 6: Eye & Ear
  { slug: "eye-care", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Eye drops & eye care" },
  { slug: "reading-glasses", benefitRails: ["otc", "vision"], dualPurpose: false, memberLabel: "Reading glasses" },
  { slug: "ear-care", benefitRails: ["otc", "hearing"], dualPurpose: false, memberLabel: "Ear care" },

  // Group 7: First Aid
  { slug: "bandages-dressings", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Bandages, gauze & tape" },
  { slug: "antiseptics-ointments", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Antiseptics & first aid ointments" },
  { slug: "first-aid-kits", benefitRails: ["otc"], dualPurpose: false, memberLabel: "First aid kits" },

  // Group 8: Skin Care
  { slug: "skin-barrier-protectants", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Protective skin creams" },
  { slug: "lotions-moisturizers", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Lotions & moisturizers" },
  { slug: "sun-lip-care", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Sunscreen & lip care" },

  // Group 9: Bladder & Bowel Care
  { slug: "briefs-tabs", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Briefs (tab-style)" },
  { slug: "protective-underwear", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Protective underwear" },
  { slug: "pads-liners", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Pads & liners" },
  { slug: "underpads-chair", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Bed & chair protection" },
  { slug: "cleansing-wipes", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Wipes & washcloths" },
  { slug: "urinals-bedpans", benefitRails: ["otc", "dme_zero"], dualPurpose: false, memberLabel: "Urinals & bedpans" },

  // Group 10: Home Safety & Daily Living
  { slug: "bathroom-safety", benefitRails: ["home_safety", "dme_zero"], dualPurpose: false, memberLabel: "Bathroom safety" },
  { slug: "fall-prevention", benefitRails: ["home_safety"], dualPurpose: false, memberLabel: "Night lights & fall prevention" },
  { slug: "daily-living-aids", benefitRails: ["home_safety", "otc"], dualPurpose: false, memberLabel: "Daily living aids" },
  { slug: "home-health-supplies", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Gloves, masks & home health" },

  // Group 11: Supports, Braces & Hosiery
  { slug: "compression-stockings", benefitRails: ["otc", "dme_zero"], dualPurpose: false, memberLabel: "Compression stockings" },
  { slug: "body-supports", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Body supports & braces" },
  { slug: "support-cushions", benefitRails: ["home_safety", "otc"], dualPurpose: false, memberLabel: "Seat & positioning cushions" },
  { slug: "canes-mobility", benefitRails: ["home_safety", "dme_zero"], dualPurpose: false, memberLabel: "Canes & mobility aids" },

  // Group 12: Monitoring, Testing & Diabetes
  { slug: "bp-monitors", benefitRails: ["otc", "dme_zero"], dualPurpose: false, memberLabel: "Blood pressure monitors" },
  { slug: "thermometers", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Thermometers" },
  { slug: "scales", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Scales" },
  { slug: "pulse-oximeters", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Pulse oximeters" },
  { slug: "diabetes-care", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Diabetes care" },
  { slug: "home-tests", benefitRails: ["otc"], dualPurpose: false, memberLabel: "Home test kits" },
];

async function main() {
  console.log("=== Seeding Benefit Rails for v1 Classes ===\n");

  let updated = 0;
  let notFound = 0;

  for (const cls of CLASS_RAILS) {
    const existing = await db.query.productClasses.findFirst({
      where: eq(productClasses.slug, cls.slug),
    });

    if (!existing) {
      console.log(`  ⚠ Class not found: ${cls.slug}`);
      notFound++;
      continue;
    }

    await db
      .update(productClasses)
      .set({
        benefitRails: cls.benefitRails,
        dualPurpose: cls.dualPurpose,
        memberLabel: cls.memberLabel,
      })
      .where(eq(productClasses.slug, cls.slug));

    console.log(`  ✓ ${cls.slug}: [${cls.benefitRails.join(", ")}]${cls.dualPurpose ? " DUAL" : ""}`);
    updated++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`\n✓ Benefit rails seeded`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
