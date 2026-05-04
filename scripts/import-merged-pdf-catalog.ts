import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { productCategories, products } from "../db/schema";

const DEFAULT_SOURCE_PATH = path.join(
  process.cwd(),
  "product-catalog",
  "pdf-catalog-merged-all-normalized-unique.json"
);
const DEFAULT_VENDOR = "medline-pdf-merged";

type SiteCategorySlug =
  | "vitamins"
  | "supplements"
  | "monitoring"
  | "pain-relief"
  | "respiratory"
  | "sleep-mood"
  | "cognitive"
  | "mobility";

interface MergedPdfRow {
  sku: string;
  description: string;
  pkg?: string | null;
  price?: string | null;
  compareTo?: string | null;
  section?: string | null;
  sourceCatalog?: string | null;
}

const MANUAL_ROW_OVERRIDES: Record<
  string,
  Partial<Pick<MergedPdfRow, "description" | "pkg" | "section" | "compareTo">>
> = {
  CUR005331H: {
    description: "Petroleum Jelly 1-oz. Tube",
    pkg: "1 oz",
    section: "Topicals",
    compareTo: "Vaseline",
  },
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const a = sorted[mid - 1];
  const b = sorted[mid];
  if (a == null || b == null) return null;
  return Math.round((a + b) / 2);
}

function parsePriceToCents(price?: string | null): number | null {
  if (!price) return null;
  const cleaned = price.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, "");
}

function countSkuLikeTokens(input: string): number {
  const tokens = input.match(/[A-Z0-9-]{5,}/g) ?? [];
  return tokens.filter((t) => /\d/.test(t)).length;
}

function isLikelyGarbledRow(description: string, pkg?: string | null): boolean {
  const d = description.trim().toUpperCase();
  const skuTokens = countSkuLikeTokens(d);
  const hasNaturalWords = /[a-z]/.test(description);
  const hasSectionShout =
    d.includes("ANTI-DIARRHEA/ANTI-NAUSEA/LAXATIVES") ||
    d.includes("COLD, COUGH & ALLERGY") ||
    d.includes("PAIN MANAGEMENT");
  const pkgLooksWrong = (pkg ?? "").trim().toUpperCase().startsWith("MEDLINE");

  if (!hasNaturalWords && skuTokens >= 2) return true;
  if (hasSectionShout && skuTokens >= 2) return true;
  if (pkgLooksWrong && skuTokens >= 2) return true;
  return false;
}

function normalizeSection(section?: string | null): string {
  return (section ?? "").trim().toLowerCase();
}

function mapSectionToCategory(
  section: string,
  description: string
): SiteCategorySlug {
  const s = normalizeSection(section);
  const d = description.toLowerCase();
  const text = `${s} ${d}`;

  if (
    /vitamin|mineral|supplement|probiotic|nutrition|medical nutrition|zinc|iron|calcium|magnesium/.test(
      text
    )
  ) {
    return /vitamin/.test(text) ? "vitamins" : "supplements";
  }

  if (
    /blood pressure|glucose|thermometer|test kit|diagnostic|measuring device|pulse oximeter|oximeter/.test(
      text
    )
  ) {
    return "monitoring";
  }

  if (/sleep aid|melatonin|sleep/.test(text)) {
    return "sleep-mood";
  }

  if (/sinus|cough|cold|flu|respiratory|nasal/.test(text)) {
    return "respiratory";
  }

  if (
    /mobility|walker|cane|bath safety|daily living|incontinence|underpad|brief|protective underwear|hearing aids|personal care|compression|oral care|eye care|feminine|foot care/.test(
      text
    )
  ) {
    return "mobility";
  }

  if (
    /first aid|wound|bandage|gauze|tape|pain|fever|anti-fungal|anti-itch|antibiotic|medication over the counter|stomach remedies|topicals/.test(
      text
    )
  ) {
    return "pain-relief";
  }

  return "supplements";
}

function inferSupplyDays(section: string, description: string): number {
  const text = `${section} ${description}`.toLowerCase();
  if (
    /walker|cane|bath|shower chair|grab bar|scale|monitor|thermometer|reacher|pillow|seat|rollator|hearing amplifier/.test(
      text
    )
  ) {
    return 365;
  }
  return 30;
}

function inferTags(row: MergedPdfRow): string[] {
  const tags = new Set<string>();
  const section = normalizeSection(row.section);
  const desc = row.description.toLowerCase();

  if (section) tags.add(`section:${section.replace(/\s+/g, "-")}`);
  if (row.sourceCatalog) tags.add(`source:${row.sourceCatalog}`);
  if (row.compareTo) tags.add("compare-brand");
  if (/medline/.test(desc)) tags.add("medline-brand");
  if (/curad/.test(desc)) tags.add("curad");
  if (tags.size === 0) tags.add("catalog-import");

  return [...tags];
}

async function main() {
  const args = process.argv.slice(2);
  const showOnlyImported = args.includes("--show-only-imported");
  const estimateMissingPrices = !args.includes("--no-estimate-missing-prices");
  const sourcePathArg = args.find((a) => a.startsWith("--source="));
  const vendorArg = args.find((a) => a.startsWith("--vendor="));

  const sourcePath = sourcePathArg
    ? sourcePathArg.slice("--source=".length)
    : DEFAULT_SOURCE_PATH;
  const vendor = vendorArg ? vendorArg.slice("--vendor=".length) : DEFAULT_VENDOR;

  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(sourcePath, "utf8");
  const rows = JSON.parse(raw) as MergedPdfRow[];
  if (!Array.isArray(rows)) {
    console.error("Source JSON is not an array");
    process.exit(1);
  }

  const catRows = await db.select().from(productCategories);
  const catMap = Object.fromEntries(catRows.map((c) => [c.slug, c.id])) as Record<
    string,
    string
  >;

  const existing = await db
    .select({ sku: products.sku, priceCents: products.priceCents })
    .from(products);
  const existingBySku = new Map(existing.map((r) => [r.sku, r.priceCents]));

  let upserted = 0;
  let skipped = 0;
  let skippedNoPrice = 0;
  let skippedGarbled = 0;
  let estimatedPriceCount = 0;
  const garbledSkippedSkus = new Set<string>();

  const dedupedBySku = new Map<string, MergedPdfRow>();
  for (const row of rows) {
    if (!row?.sku || !row?.description) continue;
    const sku = normalizeSku(row.sku);
    if (!sku) continue;
    const current = dedupedBySku.get(sku);
    if (!current) {
      dedupedBySku.set(sku, { ...row, sku });
      continue;
    }
    // Keep richer row
    const currentScore =
      (current.description?.length ?? 0) +
      (current.pkg ? 20 : 0) +
      (current.compareTo ? 20 : 0) +
      (current.price ? 10 : 0);
    const nextScore =
      (row.description?.length ?? 0) +
      (row.pkg ? 20 : 0) +
      (row.compareTo ? 20 : 0) +
      (row.price ? 10 : 0);
    if (nextScore > currentScore) {
      dedupedBySku.set(sku, { ...row, sku });
    }
  }

  const sectionPriceBuckets = new Map<string, number[]>();
  const allKnownPrices: number[] = [];
  for (const row of dedupedBySku.values()) {
    const p = parsePriceToCents(row.price);
    if (!p || p <= 0) continue;
    const section = normalizeSection(row.section);
    if (!sectionPriceBuckets.has(section)) sectionPriceBuckets.set(section, []);
    sectionPriceBuckets.get(section)!.push(p);
    allKnownPrices.push(p);
  }
  const sectionMedianMap = new Map<string, number>();
  for (const [section, prices] of sectionPriceBuckets.entries()) {
    const m = median(prices);
    if (m && m > 0) sectionMedianMap.set(section, m);
  }
  const globalMedianPrice = median(allKnownPrices);

  for (const row of dedupedBySku.values()) {
    const sku = normalizeSku(row.sku);
    const override = MANUAL_ROW_OVERRIDES[sku];
    const rowWithOverride: MergedPdfRow = {
      ...row,
      ...(override ?? {}),
    };

    const description = rowWithOverride.description?.trim() ?? "";
    if (!sku || !description) {
      skipped++;
      continue;
    }
    if (isLikelyGarbledRow(description, rowWithOverride.pkg)) {
      skipped++;
      skippedGarbled++;
      garbledSkippedSkus.add(sku);
      continue;
    }

    const section = rowWithOverride.section?.trim() ?? "";
    const categorySlug = mapSectionToCategory(section, description);
    const categoryId = catMap[categorySlug];
    if (!categoryId) {
      skipped++;
      continue;
    }

    const explicitPrice = parsePriceToCents(rowWithOverride.price ?? row.price);
    const fallbackPrice = existingBySku.get(sku) ?? null;
    let estimatedPrice: number | null = null;
    if (!explicitPrice && !fallbackPrice && estimateMissingPrices) {
      const sectionKey = normalizeSection(section);
      estimatedPrice =
        sectionMedianMap.get(sectionKey) ?? globalMedianPrice ?? null;
    }
    const priceCents = explicitPrice ?? fallbackPrice ?? estimatedPrice;
    if (!priceCents || priceCents <= 0) {
      skipped++;
      skippedNoPrice++;
      continue;
    }
    if (!explicitPrice && !fallbackPrice && estimatedPrice) {
      estimatedPriceCount++;
    }

    await db
      .insert(products)
      .values({
        sku,
        name: description,
        description,
        categoryId,
        priceCents,
        imageUrl: null,
        supplyDays: inferSupplyDays(section, description),
        tags: [
          ...inferTags(rowWithOverride),
          ...(!explicitPrice && !fallbackPrice ? ["estimated-price"] : []),
        ],
        vendor,
        eligible: true,
        active: true,
      })
      .onConflictDoUpdate({
        target: products.sku,
        set: {
          name: description,
          description,
          categoryId,
          priceCents,
          supplyDays: inferSupplyDays(section, description),
          tags: [
            ...inferTags(rowWithOverride),
            ...(!explicitPrice && !fallbackPrice ? ["estimated-price"] : []),
          ],
          vendor,
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
      .where(eq(products.vendor, vendor));
  }

  if (garbledSkippedSkus.size > 0) {
    await db
      .update(products)
      .set({ active: false, eligible: false })
      .where(
        inArray(products.sku, [...garbledSkippedSkus])
      );
  }

  const activeImportedCount = await db.$count(
    products,
    and(eq(products.vendor, vendor), eq(products.active, true))
  );

  console.log(
    JSON.stringify(
      {
        sourcePath,
        vendor,
        totalSourceRows: rows.length,
        dedupedSourceRows: dedupedBySku.size,
        upserted,
        skipped,
        skippedNoPrice,
        skippedGarbled,
        garbledSkippedSkus: [...garbledSkippedSkus],
        estimatedPriceCount,
        estimateMissingPrices,
        showOnlyImported,
        activeImportedCount,
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
