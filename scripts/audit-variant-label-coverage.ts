/**
 * Scan active eligible products and measure variant-label parser coverage.
 *
 * Usage:
 *   npx tsx scripts/audit-variant-label-coverage.ts
 *   npx tsx scripts/audit-variant-label-coverage.ts --dupes   # duplicate titles + parse source per SKU
 *   npx tsx scripts/audit-variant-label-coverage.ts --csv      # full rows (listing attribute + source)
 *
 * Requires DATABASE_URL (e.g. from .env.local).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../lib/db";
import { products } from "../db/schema";
import { and, eq } from "drizzle-orm";
import {
  extractVariantListingAttribute,
  extractVariantOptionLabel,
  variantFamilyKey,
  variantListingParseSource,
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
  const dupes = process.argv.includes("--dupes");
  return run({ csv, dupes }).catch(() => {
    console.error("audit-variant-label-coverage failed");
    process.exit(1);
  });
}

async function run(flags: { csv: boolean; dupes: boolean }) {
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
  let fromDescription = 0;
  let fromName = 0;

  const byFamily = new Map<
    string,
    Array<{
      sku: string;
      listing: string | null;
      label: string | null;
      source: ReturnType<typeof variantListingParseSource>;
    }>
  >();

  for (const r of rows) {
    const desc = r.description;
    if (!desc?.trim()) missingDescription++;

    const listing = extractVariantListingAttribute(r.name, r.description);
    const label = extractVariantOptionLabel(r.description, r.name);
    const source = variantListingParseSource(r.name, r.description);

    if (source === "description") fromDescription++;
    else if (source === "name") fromName++;

    if (listing === null) noDetail++;
    else if (isRichDetail(listing)) richDetail++;
    else letterOnlyDetail++;

    const key = variantFamilyKey(r.name);
    const list = byFamily.get(key) ?? [];
    list.push({ sku: r.sku, listing, label, source });
    byFamily.set(key, list);
  }

  let dupFamilies = 0;
  let dupAllListingNull = 0;
  let dupListingDistinct = 0;
  let dupListingAmbiguous = 0;

  const dupeReports: {
    key: string;
    members: Array<{
      sku: string;
      listing: string | null;
      label: string | null;
      source: ReturnType<typeof variantListingParseSource>;
    }>;
  }[] = [];

  for (const [key, list] of byFamily) {
    if (list.length < 2) continue;
    dupFamilies++;
    const nonNull = list.map((x) => x.listing).filter((d): d is string => d !== null);
    const distinct = new Set(nonNull);
    if (nonNull.length === 0) dupAllListingNull++;
    else if (distinct.size >= 2) dupListingDistinct++;
    else dupListingAmbiguous++;

    if (flags.dupes) {
      dupeReports.push({ key, members: list });
    }
  }

  if (flags.csv) {
    console.log("sku,name,listing_attribute,short_label,parse_source,has_description");
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    for (const r of rows) {
      const listing = extractVariantListingAttribute(r.name, r.description);
      const label = extractVariantOptionLabel(r.description, r.name);
      const source = variantListingParseSource(r.name, r.description);
      console.log(
        [
          r.sku,
          esc(r.name),
          listing === null ? "" : esc(listing),
          label === null ? "" : esc(label),
          source,
          r.description?.trim() ? "1" : "0",
        ].join(",")
      );
    }
    return;
  }

  console.log("=== Variant listing coverage (active + eligible products) ===\n");
  console.log("total_rows:", rows.length);
  console.log("missing_description:", missingDescription);
  console.log("parse_source_description:", fromDescription);
  console.log("parse_source_name:", fromName);
  console.log("listing_rich_paren_style:", richDetail);
  console.log("listing_other:", letterOnlyDetail);
  console.log("listing_none:", noDetail);
  console.log("");
  console.log("duplicate_title_families_count:", dupFamilies);
  console.log("duplicate_title_listing_distinct:", dupListingDistinct);
  console.log("duplicate_title_listing_all_miss:", dupAllListingNull);
  console.log(
    "duplicate_title_listing_ambiguous:",
    dupListingAmbiguous,
    "(same listing line or mix null + one line across SKUs)"
  );
  console.log("");

  if (flags.dupes && dupeReports.length > 0) {
    console.log("=== Duplicate titles (sample: attribute + source) ===\n");
    dupeReports.sort((a, b) => b.members.length - a.members.length);
    const maxFamilies = 25;
    for (let i = 0; i < Math.min(maxFamilies, dupeReports.length); i++) {
      const { members } = dupeReports[i]!;
      const head = members.slice(0, 8);
      console.log("family_size:", members.length);
      for (const m of head) {
        console.log(
          " ",
          m.sku,
          "|",
          m.listing ?? "—",
          "|",
          m.source
        );
      }
      if (members.length > head.length) {
        console.log(" ", "... +" + String(members.length - head.length), "more SKUs");
      }
      console.log("");
    }
    if (dupeReports.length > maxFamilies) {
      console.log("... +" + String(dupeReports.length - maxFamilies), "more families (raise maxFamilies in script)");
    }
  } else if (flags.dupes) {
    console.log("(no duplicate title families)");
  }

  console.log("Tips: --dupes for per-SKU source; --csv > coverage.csv; extend lib/variant-label.ts for new patterns.");
}

main();
