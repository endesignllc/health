/**
 * tag-continence.ts — enrichment pass for continence-care SKUs.
 *
 * The merged-catalog importer already adds `section:*` and `source:*` tags but does
 * NOT parse the variant attributes that live inside the description text. This script
 * fills that gap: it parses normalized `absorbency:*`, `size:*`, and `gender:*` tags
 * and resolves each row to its target product-class slug, per QUALIFIER_SPEC.md §4.
 *
 * Privacy note (QUALIFIER_SPEC.md §5): we emit the PRODUCT ATTRIBUTE (`size:l`), never
 * a body measurement. The waist range is parsed only as a human-readable display hint.
 *
 *   Dry run (default, no DB):  npx tsx scripts/tag-continence.ts
 *     → parses the catalog JSON, writes a review CSV, prints a summary.
 *   Write to DB:               npx tsx scripts/tag-continence.ts --write
 *     → merges the new tags into products.tags and sets product_class_id by SKU.
 *
 * Source defaults to the merged normalized catalog; override with --source=path.json
 */

import fs from "node:fs";
import path from "node:path";

// ── Types ────────────────────────────────────────────────────────────────────
type CatalogRow = {
  sku: string;
  description: string;
  pkg?: string | null;
  price?: string | null;
  section?: string | null;
  sourceCatalog?: string | null;
};

type TaggedRow = {
  sku: string;
  description: string;
  productClassSlug: string;
  absorbency: string | null; // normalized tier
  sizes: string[]; // normalized size tags (component-expanded)
  gender: string | null;
  waistDisplay: string | null; // display hint only — NOT stored as a measurement
  tags: string[]; // full namespaced tag set to merge
};

// ── Config: approved mappings (QUALIFIER_SPEC.md §4.0 + §4.5) ──────────────────
const SECTION_TO_CLASS: Record<string, string> = {
  incontinence: "bladder-pads",
  "protective underwear": "protective-underwear",
  underpads: "underpads",
};

/** Approved absorbency normalization (§4.5). Marketing word → normalized tier. */
const ABSORBENCY_MAP: Record<string, string> = {
  light: "light",
  moderate: "moderate",
  heavy: "heavy",
  max: "heavy",
  maximum: "heavy",
  extra: "heavy",
  ultra: "maximum",
  ultimate: "maximum",
};

const DEFAULT_SOURCE = path.join(
  "product-catalog",
  "pdf-catalog-merged-all-normalized-unique.json"
);

// ── Parsers ────────────────────────────────────────────────────────────────────
function normalizeSection(section?: string | null): string {
  return (section ?? "").trim().toLowerCase();
}

function parseAbsorbency(desc: string): string | null {
  // Scan every "<word> absorbency" phrase and return the first that maps to a tier.
  // (Descriptions can contain noise like "...core for absorbency and odor control.
  //  Heavy absorbency." — we must skip "for" and find the real tier word.)
  const matches = desc.matchAll(/\b([A-Za-z]+)\s+absorbency\b/gi);
  for (const m of matches) {
    const tier = ABSORBENCY_MAP[m[1].toLowerCase()];
    if (tier) return tier;
  }
  return null;
}

function parseGender(desc: string): string | null {
  const d = desc.toLowerCase();
  if (/\bfor men\b/.test(d)) return "mens";
  if (/\bfor women\b/.test(d)) return "womens";
  if (/\bunisex\b/.test(d)) return "unisex";
  return null;
}

/**
 * Parses size letters and the waist-range display hint.
 * Handles single (L) and combined (S/M, L/XL) sizes. Combined sizes expand to
 * each component tag so a member picking "M" matches an "S/M" product.
 */
function parseSize(desc: string): { sizes: string[]; waistDisplay: string | null } {
  const m = desc.match(
    /\b(2?X?[SML]+(?:\/[SML]+)?)\s*\(\s*([\d”"'\-–\sto]+?waist)\s*\)/i
  );
  if (!m) return { sizes: [], waistDisplay: null };

  const rawSize = m[1].toUpperCase();
  const waistDisplay = m[2].replace(/\s+/g, " ").trim();

  const sizes = new Set<string>();
  for (const part of rawSize.split("/")) {
    const norm = normalizeSizeToken(part.trim());
    if (norm) sizes.add(norm);
  }
  return { sizes: [...sizes], waistDisplay };
}

function normalizeSizeToken(tok: string): string | null {
  switch (tok) {
    case "S":
      return "size:s";
    case "M":
      return "size:m";
    case "L":
      return "size:l";
    case "XL":
      return "size:xl";
    case "2XL":
    case "XXL":
      return "size:2xl";
    default:
      return null;
  }
}

function buildTags(row: CatalogRow): TaggedRow | null {
  const section = normalizeSection(row.section);
  const productClassSlug = SECTION_TO_CLASS[section];
  if (!productClassSlug) return null; // not a continence row

  const desc = row.description ?? "";
  const absorbency = parseAbsorbency(desc);
  const gender = parseGender(desc);
  const { sizes, waistDisplay } = parseSize(desc);

  const tags = new Set<string>();
  tags.add(`class:${productClassSlug}`);
  if (absorbency) tags.add(`absorbency:${absorbency}`);
  for (const s of sizes) tags.add(s);
  if (gender) tags.add(`gender:${gender}`);

  return {
    sku: row.sku,
    description: desc,
    productClassSlug,
    absorbency,
    sizes,
    gender,
    waistDisplay,
    tags: [...tags],
  };
}

// ── Output ───────────────────────────────────────────────────────────────────
function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function writePreviewCsv(rows: TaggedRow[], outPath: string): void {
  const header = [
    "sku",
    "productClassSlug",
    "absorbency",
    "sizes",
    "gender",
    "waistDisplay",
    "tags",
    "description",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.sku,
        r.productClassSlug,
        r.absorbency ?? "",
        r.sizes.join("|"),
        r.gender ?? "",
        r.waistDisplay ?? "",
        r.tags.join("|"),
        r.description,
      ]
        .map((c) => csvEscape(String(c)))
        .join(",")
    );
  }
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
}

function printSummary(rows: TaggedRow[]): void {
  const byClass = new Map<string, number>();
  const byAbs = new Map<string, number>();
  let missingAbs = 0;
  let missingSize = 0;
  for (const r of rows) {
    byClass.set(r.productClassSlug, (byClass.get(r.productClassSlug) ?? 0) + 1);
    const a = r.absorbency ?? "(none)";
    byAbs.set(a, (byAbs.get(a) ?? 0) + 1);
    if (!r.absorbency) missingAbs++;
    if (r.sizes.length === 0) missingSize++;
  }
  console.log(`\nTagged ${rows.length} continence SKUs`);
  console.log("\nBy product class:");
  for (const [k, v] of [...byClass].sort()) console.log(`  ${k.padEnd(22)} ${v}`);
  console.log("\nBy normalized absorbency:");
  for (const [k, v] of [...byAbs].sort()) console.log(`  ${k.padEnd(22)} ${v}`);
  console.log(
    `\nRows with no absorbency parsed: ${missingAbs}  (expected for underpads / pads sold by size only)`
  );
  console.log(`Rows with no size parsed:       ${missingSize}  (expected for pads/liners — one-size)`);
}

// ── DB write (only with --write) ───────────────────────────────────────────────
async function writeToDb(rows: TaggedRow[]): Promise<void> {
  const { db } = await import("../lib/db");
  const { products, productClasses } = await import("../db/schema");
  const { eq, inArray } = await import("drizzle-orm");

  const classRows = await db.select().from(productClasses);
  const classBySlug = new Map(classRows.map((c) => [c.slug, c.id]));

  const skus = rows.map((r) => r.sku);
  const existing = await db
    .select({ sku: products.sku, tags: products.tags })
    .from(products)
    .where(inArray(products.sku, skus));
  const tagsBySku = new Map(existing.map((e) => [e.sku, e.tags ?? []]));

  let updated = 0;
  let skippedMissing = 0;
  for (const r of rows) {
    if (!tagsBySku.has(r.sku)) {
      skippedMissing++;
      continue;
    }
    const classId = classBySlug.get(r.productClassSlug) ?? null;
    // merge: keep existing tags, drop stale attribute tags, add fresh ones
    const kept = (tagsBySku.get(r.sku) ?? []).filter(
      (t) => !/^(class|absorbency|size|gender):/.test(t)
    );
    const merged = [...new Set([...kept, ...r.tags])];
    await db
      .update(products)
      .set({ tags: merged, productClassId: classId })
      .where(eq(products.sku, r.sku));
    updated++;
  }
  console.log(`\nDB write complete: ${updated} updated, ${skippedMissing} not yet imported (run db:import-merged-pdf-catalog first).`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const sourceArg = args.find((a) => a.startsWith("--source="));
  const source = sourceArg ? sourceArg.slice("--source=".length) : DEFAULT_SOURCE;

  if (!fs.existsSync(source)) {
    console.error(`Source not found: ${source}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(source, "utf8")) as CatalogRow[];
  const tagged = raw
    .map(buildTags)
    .filter((r): r is TaggedRow => r !== null)
    .sort((a, b) => a.productClassSlug.localeCompare(b.productClassSlug) || a.sku.localeCompare(b.sku));

  printSummary(tagged);

  const outPath = path.join("product-catalog", "continence-tags-preview.csv");
  writePreviewCsv(tagged, outPath);
  console.log(`\nReview file written: ${outPath}`);

  if (write) {
    await writeToDb(tagged);
  } else {
    console.log("\nDry run — no DB changes. Re-run with --write to apply.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
