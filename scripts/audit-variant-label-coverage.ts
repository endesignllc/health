/**
 * Scan active eligible products and measure variant-label parser coverage.
 *
 * Usage:
 *   npx tsx scripts/audit-variant-label-coverage.ts
 *   npx tsx scripts/audit-variant-label-coverage.ts --csv   # full rows to stdout (pipe to file)
 *
 * Requires DATABASE_URL (e.g. from .env.local via scripts that load dotenv — run via npm script below).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../lib/db";
import { products } from "../db/schema";
import { and, eq } from "drizzle-orm";
import {
  extractVariantOptionDetail,
  extractVariantOptionLabel,
  variantFamilyKey,
} from "../lib/variant-label";

type Row = {
  sku: string;
  name: string;
  description: string | null;
};

function isRichDetail(detail: string | null): boolean {
  return Boolean(detail?.includes(" · "));
}

function main() {
  const csv = process.argv.includes("--csv");
  return run(csv).catch(() => {
    console.error("audit-variant-label-coverage failed");
    process.exit(1);
  });
}

async function run(csv: boolean) {
  const rows: Row[] = await db
    .select({
      sku: products.sku,
      name: products.name,
      description: products.description,
    })
    .from(products)
    .where(and(eq(products.active, true), eq(products.eligible, true)));

  let richDetail = 0;
  let letterOnlyDetail = 0;
  let noDetail = 0;
  let missingDescription = 0;

  const byFamily = new Map<
    string,
    Array<{ sku: string; detail: string | null; label: string | null }>
  >();

  for (const r of rows) {
    const desc = r.description;
    if (!desc?.trim()) missingDescription++;

    const detail = extractVariantOptionDetail(desc);
    const label = extractVariantOptionLabel(desc);

    if (detail === null) noDetail++;
    else if (isRichDetail(detail)) richDetail++;
    else letterOnlyDetail++;

    const key = variantFamilyKey(r.name);
    const list = byFamily.get(key) ?? [];
    list.push({ sku: r.sku, detail, label });
    byFamily.set(key, list);
  }

  let dupFamilies = 0;
  let dupAllDetailNull = 0;
  let dupParserDistinctDetails = 0;
  /** Same normalized title, ≥2 SKUs, parser gave zero or one unique non-null detail across the family */
  let dupParserAmbiguous = 0;

  for (const [, list] of byFamily) {
    if (list.length < 2) continue;
    dupFamilies++;
    const nonNull = list.map((x) => x.detail).filter((d): d is string => d !== null);
    const distinct = new Set(nonNull);
    if (nonNull.length === 0) dupAllDetailNull++;
    else if (distinct.size >= 2) dupParserDistinctDetails++;
    else dupParserAmbiguous++;
  }

  if (csv) {
    console.log("sku,name,detail,label,has_description");
    for (const r of rows) {
      const detail = extractVariantOptionDetail(r.description);
      const label = extractVariantOptionLabel(r.description);
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      console.log(
        [
          r.sku,
          esc(r.name),
          detail === null ? "" : esc(detail),
          label === null ? "" : esc(label),
          r.description?.trim() ? "1" : "0",
        ].join(",")
      );
    }
    return;
  }

  console.log("=== Variant label coverage (active + eligible products) ===\n");
  console.log("total_rows:", rows.length);
  console.log("missing_description:", missingDescription);
  console.log("detail_rich_paren:", richDetail);
  console.log("detail_letter_only:", letterOnlyDetail);
  console.log("detail_none:", noDetail);
  console.log("");
  console.log("duplicate_title_families_count:", dupFamilies);
  console.log("duplicate_title_parser_distinct_details:", dupParserDistinctDetails);
  console.log("duplicate_title_parser_all_miss:", dupAllDetailNull);
  console.log(
    "duplicate_title_parser_ambiguous:",
    dupParserAmbiguous,
    "(same parsed detail or mix of null + single detail across SKUs)"
  );
  console.log("");
  console.log("Tip: extend lib/variant-label.ts for patterns like S/M, mmHg ranges,");
  console.log("then re-run this audit. Use --csv > coverage.csv for spreadsheets.");
}

main();
