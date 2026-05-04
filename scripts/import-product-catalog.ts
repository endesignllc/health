import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { productCategories, products } from "../db/schema";

const VENDOR = "medline-catalog";
const DEFAULT_IMAGE_PREFIX = "/product-catalog/images/";

type SiteCategorySlug =
  | "vitamins"
  | "supplements"
  | "monitoring"
  | "pain-relief"
  | "respiratory"
  | "sleep-mood"
  | "cognitive"
  | "mobility";

interface CatalogRow {
  cat1?: string;
  cat2?: string;
  sku?: string;
  name?: string;
  desc?: string;
  image?: string;
  price?: string;
}

function parsePriceToCents(input?: string): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

function mapCatalogCategory(cat1: string, cat2: string, name: string): SiteCategorySlug {
  const t = `${cat1} ${cat2} ${name}`.toLowerCase();

  if (
    /(blood pressure|pulse oximeter|oximeter|thermometer|diagnostic|measuring devices|pedometer|heart rate monitor|scale)/.test(
      t
    )
  ) {
    return "monitoring";
  }

  if (/(compression|brace|support|first aid|bandage|wound|arthritis|pain)/.test(t)) {
    return "pain-relief";
  }

  if (/(respiratory|cpap|oxygen|sinus|nasal)/.test(t)) {
    return "respiratory";
  }

  if (/(sleep|calm|relax|mood)/.test(t)) {
    return "sleep-mood";
  }

  if (/(memory|cognitive|focus|brain)/.test(t)) {
    return "cognitive";
  }

  if (/(vitamin|supplement|capsule|tablet|gummy|mineral)/.test(t)) {
    return /(vitamin)/.test(t) ? "vitamins" : "supplements";
  }

  return "mobility";
}

function inferTags(cat1: string, cat2: string, name: string): string[] {
  const t = `${cat1} ${cat2} ${name}`.toLowerCase();
  const tags = new Set<string>();

  if (/(monitor|blood pressure|pulse|thermometer|diagnostic)/.test(t)) tags.add("monitoring");
  if (/(compression|brace|support|arthritis|pain)/.test(t)) tags.add("pain");
  if (/(incontinence|daily living|walker|cane|rollator|safety|underpad)/.test(t)) tags.add("mobility");
  if (/(oral care|tooth|denture|mouthwash)/.test(t)) tags.add("adherence");
  if (/(respiratory|cpap|oxygen)/.test(t)) tags.add("respiratory");
  if (tags.size === 0) tags.add("core");

  return [...tags];
}

function inferSupplyDays(cat1: string, cat2: string, name: string): number {
  const t = `${cat1} ${cat2} ${name}`.toLowerCase();
  if (
    /(walker|rollator|cane|bracelet|monitor|scale|thermometer|pillow|reacher|watch)/.test(
      t
    )
  ) {
    return 365;
  }
  return 30;
}

async function main() {
  const showOnlyImported = process.argv.includes("--show-only-imported");
  const sourcePath = path.join(process.cwd(), "product-catalog", "products.json");

  if (!fs.existsSync(sourcePath)) {
    console.error(`Catalog file not found: ${sourcePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(sourcePath, "utf8");
  const rows = JSON.parse(raw) as CatalogRow[];
  if (!Array.isArray(rows)) {
    console.error("Catalog JSON is not an array");
    process.exit(1);
  }

  const categoryRows = await db.select().from(productCategories);
  const categoryMap = Object.fromEntries(categoryRows.map((c) => [c.slug, c.id])) as Record<
    string,
    string
  >;

  let upserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const sku = row.sku?.trim();
    const name = row.name?.trim();
    const priceCents = parsePriceToCents(row.price);

    if (!sku || !name || !priceCents) {
      skipped++;
      continue;
    }

    const cat1 = row.cat1?.trim() ?? "";
    const cat2 = row.cat2?.trim() ?? "";
    const categorySlug = mapCatalogCategory(cat1, cat2, name);
    const categoryId = categoryMap[categorySlug] ?? categoryMap["supplements"];
    if (!categoryId) {
      skipped++;
      continue;
    }

    let imageUrl: string | null = null;
    if (row.image) {
      const normalized = row.image.replace(/^\/+/, "");
      const absoluteImagePath = path.join(
        process.cwd(),
        "public",
        "product-catalog",
        "images",
        normalized
      );
      if (fs.existsSync(absoluteImagePath)) {
        imageUrl = `${DEFAULT_IMAGE_PREFIX}${normalized}`;
      }
    }

    await db
      .insert(products)
      .values({
        sku,
        name,
        description: row.desc?.trim() || null,
        categoryId,
        priceCents,
        imageUrl,
        supplyDays: inferSupplyDays(cat1, cat2, name),
        tags: inferTags(cat1, cat2, name),
        vendor: VENDOR,
        eligible: true,
        active: true,
      })
      .onConflictDoUpdate({
        target: products.sku,
        set: {
          name,
          description: row.desc?.trim() || null,
          categoryId,
          priceCents,
          imageUrl,
          supplyDays: inferSupplyDays(cat1, cat2, name),
          tags: inferTags(cat1, cat2, name),
          vendor: VENDOR,
          eligible: true,
          active: true,
        },
      });

    upserted++;
  }

  if (showOnlyImported) {
    await db.update(products).set({ active: false });
    await db
      .update(products)
      .set({ active: true, eligible: true })
      .where(eq(products.vendor, VENDOR));
  }

  const activeCatalogCount = await db.$count(
    products,
    and(eq(products.vendor, VENDOR), eq(products.active, true))
  );

  console.log(
    JSON.stringify(
      {
        vendor: VENDOR,
        totalRows: rows.length,
        upserted,
        skipped,
        showOnlyImported,
        activeCatalogCount,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
