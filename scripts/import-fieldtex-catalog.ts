import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import { productCategories, products } from "../db/schema";

const SOURCE_PATH = path.join(
  process.cwd(),
  "product-catalog",
  "fieldtex-extract.json"
);
const VENDOR = "fieldtex2024";

interface FieldtexRow {
  itemCode: string;
  description: string;
  priceCents: number;
  priceDisplay: string;
  category: string | null;
  quarterlyLimit: number | null;
  isDualPurpose: boolean;
  page: number | null;
  rawLines: string[];
}

// Map to existing DB categories only:
// vitamins, supplements, monitoring, pain-relief, respiratory, sleep-mood, cognitive, mobility, incontinence
type SiteCategorySlug =
  | "vitamins"
  | "supplements"
  | "monitoring"
  | "pain-relief"
  | "respiratory"
  | "sleep-mood"
  | "cognitive"
  | "mobility"
  | "incontinence";

function normalizeSku(sku: string): string {
  // Fieldtex uses 5-digit codes, prefix with FTX for uniqueness
  const cleaned = sku.trim().replace(/\s+/g, "").replace(/[^A-Z0-9-]/gi, "");
  return `FTX-${cleaned}`;
}

function mapFieldtexCategoryToSite(category: string | null, description: string): SiteCategorySlug {
  const cat = (category ?? "").toLowerCase();
  const desc = description.toLowerCase();
  const text = `${cat} ${desc}`;

  // Allergy - map to respiratory
  if (/allergy/.test(cat)) return "respiratory";

  // Cold & Flu - map to respiratory
  if (/cold.*flu|flu|cold|cough/.test(cat)) return "respiratory";

  // Digestive / Stomach / Colon - map to supplements
  if (/colon|stomach|laxative|antacid|acid reducer|fiber supplement|lactose|hemorrhoid|motion.*sickness/.test(cat)) return "supplements";

  // Dental Care - map to mobility (daily living)
  if (/dental|toothbrush|toothpaste|denture|dry.*mouth/.test(cat)) return "mobility";

  // Diabetic
  if (/diabetic/.test(cat)) return "monitoring";

  // Ear/Eye Care - map to supplements
  if (/ear.*care|eye.*care/.test(cat)) return "supplements";

  // Feminine & UTI - map to pain-relief
  if (/feminine|uti/.test(cat)) return "pain-relief";

  // First Aid - map to pain-relief
  if (/first.*aid|bandage|dressing|gauze|tape/.test(cat)) return "pain-relief";

  // Foot Care - map to mobility
  if (/foot.*care/.test(cat)) return "mobility";

  // Home Testing
  if (/home.*testing|diagnostic/.test(cat)) return "monitoring";

  // Hot & Cold Therapy
  if (/hot.*cold|therapy/.test(cat)) return "pain-relief";

  // Incontinence
  if (/incontinence/.test(cat) || /incontinence/.test(desc)) return "incontinence";

  // Skin-related - map to supplements
  if (/lice|lip.*care|ointment|topical|skin.*care|sunscreen/.test(cat)) return "supplements";

  // Menopause - map to vitamins
  if (/menopause/.test(cat)) return "vitamins";

  // Pain Relief
  if (/pain.*relief/.test(cat)) return "pain-relief";

  // PPE - map to mobility (safety)
  if (/ppe|gloves|mask/.test(cat)) return "mobility";

  // Respiratory
  if (/respiratory|smoking/.test(cat)) return "respiratory";

  // Sleep Aid
  if (/sleep.*aid/.test(cat)) return "sleep-mood";

  // Supports (braces, cushions, etc.) - map to mobility
  if (/support|ankle|back|elbow|knee|wrist|cushion/.test(cat)) return "mobility";

  // Default
  return "supplements";
}

function inferSupplyDays(category: string | null, description: string): number {
  const text = `${category ?? ""} ${description}`.toLowerCase();
  
  // Durable goods
  if (/bath.*scale|scale|cushion|pillow|brace|support|sock|stocking/.test(text)) {
    return 90;
  }
  if (/thermometer|monitor|device/.test(text)) {
    return 365;
  }
  // Most OTC consumables
  return 30;
}

function inferTags(row: FieldtexRow): string[] {
  const tags = new Set<string>();
  tags.add(`source:${VENDOR}`);
  
  if (row.category) {
    const categoryTag = row.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    tags.add(`fieldtex-category:${categoryTag}`);
  }
  
  if (row.quarterlyLimit) {
    tags.add(`quarterly-limit:${row.quarterlyLimit}`);
  }
  
  if (row.isDualPurpose) {
    tags.add("dual-purpose");
  }

  // Eligibility tags for badge mapping
  const desc = row.description.toLowerCase();
  const cat = (row.category ?? "").toLowerCase();
  
  if (/support|cushion|bath|brace|mobility|grab|rail|aid/.test(`${cat} ${desc}`)) {
    tags.add("eligibility:home_safety");
  } else {
    tags.add("eligibility:otc");
  }

  return [...tags];
}

async function main() {
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`Source file not found: ${SOURCE_PATH}`);
    console.error("Run: npm run db:extract-fieldtex-catalog first");
    process.exit(1);
  }

  const raw = fs.readFileSync(SOURCE_PATH, "utf8");
  const rows = JSON.parse(raw) as FieldtexRow[];
  if (!Array.isArray(rows)) {
    console.error("Source JSON is not an array");
    process.exit(1);
  }

  // Get category map
  const catRows = await db.select().from(productCategories);
  const catMap = Object.fromEntries(catRows.map((c) => [c.slug, c.id])) as Record<string, string>;

  let upserted = 0;
  let skipped = 0;
  let skippedNoCategory = 0;

  for (const row of rows) {
    if (!row.itemCode || !row.description) {
      skipped++;
      continue;
    }

    const sku = normalizeSku(row.itemCode);
    const categorySlug = mapFieldtexCategoryToSite(row.category, row.description);
    const categoryId = catMap[categorySlug];

    if (!categoryId) {
      skipped++;
      skippedNoCategory++;
      console.warn(`No category found for slug: ${categorySlug} (row: ${row.itemCode})`);
      continue;
    }

    if (row.priceCents <= 0) {
      skipped++;
      continue;
    }

    await db
      .insert(products)
      .values({
        sku,
        name: row.description,
        description: row.description,
        categoryId,
        priceCents: row.priceCents,
        imageUrl: null, // Fieldtex PDF doesn't have images
        supplyDays: inferSupplyDays(row.category, row.description),
        tags: inferTags(row),
        vendor: VENDOR,
        eligible: true,
        active: true,
      })
      .onConflictDoUpdate({
        target: products.sku,
        set: {
          name: row.description,
          description: row.description,
          categoryId,
          priceCents: row.priceCents,
          supplyDays: inferSupplyDays(row.category, row.description),
          tags: inferTags(row),
          vendor: VENDOR,
          eligible: true,
          active: true,
        },
      });

    upserted++;
  }

  const activeCount = await db.$count(
    products,
    and(eq(products.vendor, VENDOR), eq(products.active, true))
  );

  console.log(
    JSON.stringify(
      {
        sourcePath: SOURCE_PATH,
        vendor: VENDOR,
        totalSourceRows: rows.length,
        upserted,
        skipped,
        skippedNoCategory,
        activeFieldtexProducts: activeCount,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
