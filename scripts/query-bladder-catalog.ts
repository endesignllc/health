/**
 * Run bladder-support need rules + catalog checks (SQL from product brief).
 * Usage: npx tsx scripts/query-bladder-catalog.ts
 */
import { db } from "../lib/db";
import { sql } from "drizzle-orm";

function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray((result as { rows: unknown }).rows)) {
    return (result as { rows: Record<string, unknown>[] }).rows;
  }
  return [];
}

async function main() {
  const r1 = await db.execute(sql`
    SELECT n.slug, pc.slug AS category_slug, npr.min_items, npr.max_items, npr.priority_weight
    FROM need_product_rules npr
    JOIN needs n ON n.id = npr.need_id
    JOIN product_categories pc ON pc.id = npr.required_category_id
    WHERE n.slug = 'bladder-support'
    ORDER BY npr.priority_weight DESC, pc.slug
  `);

  const rows1 = asRows(r1);
  console.log("\n=== 1. Rules for bladder-support ===\n");
  console.table(rows1);

  const categories = rows1.map((r) => String(r.category_slug)).filter(Boolean);

  if (categories.length === 0) {
    console.log("\n=== 2. Products in rule categories ===\n(no rules — skipped)\n");
  } else {
    const inList = categories.map((c) => `'${c.replace(/'/g, "''")}'`).join(", ");
    const r2 = await db.execute(sql.raw(`
      SELECT p.sku, p.name, pc.slug AS category_slug
      FROM products p
      JOIN product_categories pc ON pc.id = p.category_id
      WHERE pc.slug IN (${inList})
        AND p.active = true
      ORDER BY pc.slug, p.price_cents
    `));
    const rows2 = asRows(r2);
    console.log("\n=== 2. Active products in those categories ===\n");
    console.table(rows2);
    console.log(`(row count: ${rows2.length})\n`);

    const byCat = rows2.reduce<Record<string, number>>((acc, row) => {
      const slug = String(row.category_slug ?? "");
      acc[slug] = (acc[slug] ?? 0) + 1;
      return acc;
    }, {});
    console.log("=== 2b. Count by category slug ===\n");
    console.table(Object.entries(byCat).map(([category_slug, active_count]) => ({ category_slug, active_count })));
  }

  const r3 = await db.execute(sql`
    SELECT p.sku, p.name, pc.slug AS category_slug
    FROM products p
    JOIN product_categories pc ON pc.id = p.category_id
    WHERE p.active = true
      AND (
        p.name ILIKE '%incontinence%'
        OR p.name ILIKE '%brief%'
        OR p.name ILIKE '%pad%'
        OR p.name ILIKE '%liner%'
        OR p.name ILIKE '%bladder%'
        OR p.name ILIKE '%pull-up%'
        OR p.name ILIKE '%fitright%'
      )
    ORDER BY pc.slug, p.name
  `);

  const rows3 = asRows(r3);
  console.log("\n=== 3. Name match (coarse ILIKE — audit baseline) ===\n");
  console.table(rows3);
  console.log(`(row count: ${rows3.length})\n`);

  const coarseBySlug = rows3.reduce<Record<string, number>>((acc, row) => {
    const slug = String(row.category_slug ?? "");
    acc[slug] = (acc[slug] ?? 0) + 1;
    return acc;
  }, {});
  console.log("=== 3b. Coarse name-match rows by category slug ===\n");
  console.table(
    Object.entries(coarseBySlug)
      .sort((a, b) => b[1] - a[1])
      .map(([category_slug, row_count]) => ({ category_slug, row_count }))
  );
}

main().catch(() => {
  console.error("query-bladder-catalog failed");
  process.exit(1);
});
