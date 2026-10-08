// Dependency-free full product export via Neon HTTP SQL API.
// Usage: node scripts/export-products-full.mjs
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const m = env.match(/^DATABASE_URL=["']?([^"'\n]+)/m);
if (!m) throw new Error("DATABASE_URL not found in .env.local");
const cs = m[1];
const host = new URL(cs.replace(/^postgres(ql)?:/, "https:")).hostname;

async function q(query) {
  const res = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: { "Neon-Connection-String": cs, "Content-Type": "application/json" },
    body: JSON.stringify({ query, params: [] }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const j = await res.json();
  return j.rows;
}

const rows = await q(`
  SELECT p.sku, p.name, p.description,
         c.name AS category, c.slug AS category_slug,
         pc.name AS product_class, pc.slug AS product_class_slug,
         p.price_cents, p.image_url, p.external_product_url,
         p.supply_days, p.units_per_package, p.estimated_daily_use,
         p.vendor, array_to_string(p.alternate_skus,'|') AS alternate_skus,
         p.eligible, array_to_string(p.tags,'|') AS tags,
         p.is_everyday_essential, p.in_stock, p.active, p.created_at,
         COALESCE(nd.needs_list,'') AS needs
  FROM products p
  LEFT JOIN product_categories c ON c.id = p.category_id
  LEFT JOIN product_classes pc ON pc.id = p.product_class_id
  LEFT JOIN (
    SELECT npr.required_category_id, string_agg(DISTINCT n.slug,'|') AS needs_list
    FROM need_product_rules npr JOIN needs n ON n.id = npr.need_id
    GROUP BY npr.required_category_id
  ) nd ON nd.required_category_id = p.category_id
  ORDER BY p.name`);

let sectionMap = {};
try { sectionMap = JSON.parse(fs.readFileSync("product-catalog/fieldtex-section-map.json","utf8")); } catch {}
for (const r of rows) {
  const code = (r.sku || "").replace(/^FTX-/, "");
  r.source_section = sectionMap[code] || "";
  r.price_dollars = (r.price_cents / 100).toFixed(2);
}

fs.writeFileSync("product-catalog/products-full-export.json", JSON.stringify(rows, null, 1));
const cols = Object.keys(rows[0]);
const esc = v => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
fs.writeFileSync("product-catalog/products-full-export.csv",
  [cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n"));
console.log(`exported ${rows.length} products, ${rows.filter(r=>r.source_section).length} with source_section`);
const cat = {}; for (const r of rows) cat[r.category ?? "NULL"] = (cat[r.category ?? "NULL"]||0)+1;
console.log(JSON.stringify(cat));
