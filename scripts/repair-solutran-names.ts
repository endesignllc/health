/**
 * Replace Solutran product names with the corrected catalog names.
 * Usage: npx tsx scripts/repair-solutran-names.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { products } from "../db/schema";

interface Item {
  asin: string;
  name: string;
}

async function main() {
  const items = JSON.parse(fs.readFileSync("product-catalog/solutran-items.json", "utf8")) as Item[];
  const bySku = new Map(items.map((item) => [`SOL-${item.asin}`, item.name.trim()]));

  const rows = await db
    .select({ id: products.id, sku: products.sku, name: products.name })
    .from(products)
    .where(eq(products.vendor, "solutran2025"));

  let updated = 0;
  let missing = 0;
  let stillBad = 0;
  for (const row of rows) {
    const next = bySku.get(row.sku);
    if (!next) {
      missing += 1;
      continue;
    }
    if (row.name !== next) {
      await db.update(products).set({ name: next }).where(eq(products.id, row.id));
      updated += 1;
    }
    if (/\bB0[A-Z0-9]{4,}/.test(next)) stillBad += 1;
  }

  const leftover = await db.execute(sql`
    select count(*)::int as n
    from products
    where vendor = 'solutran2025' and name ~ 'B0[A-Z0-9]{4,}'
  `);
  console.log({
    rows: rows.length,
    updated,
    missing,
    namesStillContainingAsin: (leftover.rows[0] as { n: number }).n,
    stillBadInSource: stillBad,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
