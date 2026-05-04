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
      SELECT p.sku, p.name, pc.slug
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
  }

  const r3 = await db.execute(sql`
    SELECT sku, name, category_id
    FROM products
    WHERE active = true
      AND (
        name ILIKE '%incontinence%'
        OR name ILIKE '%brief%'
        OR name ILIKE '%pad%'
        OR name ILIKE '%liner%'
        OR name ILIKE '%bladder%'
        OR name ILIKE '%pull-up%'
        OR name ILIKE '%fitright%'
      )
  `);

  const rows3 = asRows(r3);
  console.log("\n=== 3. Name match (bladder / incontinence / pad / etc.) ===\n");
  console.table(rows3);
  console.log(`(row count: ${rows3.length})\n`);
}

main().catch(() => {
  console.error("query-bladder-catalog failed");
  process.exit(1);
});
