/**
 * Fix quantity limits in product names
 * Strips leading "N Per (Year|Quarter)" patterns and stores in quantityLimit field
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../lib/db";
import { products } from "../db/schema";
import { sql, like, or } from "drizzle-orm";

// Match patterns like "1 Per Year", "1 Per Quarter", etc.
const LIMIT_PREFIX_RE = /^(\d+)\s+Per\s+(Year|Quarter)\s*/i;
// Match "Category Item Limit: N Per Year" anywhere in name
const LIMIT_CATEGORY_RE = /\s*(?:Category\s+)?Item Limit:\s*\d+\s*Per\s+(?:Year|Quarter)\s*/gi;
// Match descriptions that are just category limits
const PURE_CATEGORY_RE = /^(.+?)\s*(?:Category\s+)?Item Limit:\s*(\d+)\s*Per\s*(Year|Quarter)\s*(.*)$/i;

interface CleanedProduct {
  id: string;
  originalName: string;
  cleanedName: string;
  quantityLimit: string | null;
}

function cleanProductName(name: string): { cleanedName: string; quantityLimit: string | null } {
  let cleanedName = name;
  let quantityLimit: string | null = null;

  // Check for leading "N Per Year/Quarter"
  const prefixMatch = cleanedName.match(LIMIT_PREFIX_RE);
  if (prefixMatch) {
    quantityLimit = `${prefixMatch[1]} per ${prefixMatch[2].toLowerCase()}`;
    cleanedName = cleanedName.replace(LIMIT_PREFIX_RE, "");
  }

  // Check for "Category Item Limit: N Per Year/Quarter" pattern
  const categoryMatch = cleanedName.match(PURE_CATEGORY_RE);
  if (categoryMatch) {
    // Extract limit if we don't have one yet
    if (!quantityLimit) {
      quantityLimit = `${categoryMatch[2]} per ${categoryMatch[3].toLowerCase()}`;
    }
    // Rebuild name from the meaningful parts
    const prefix = categoryMatch[1].trim();
    const suffix = (categoryMatch[4] || "").trim();
    cleanedName = suffix ? `${prefix} ${suffix}`.trim() : prefix;
  }

  // Remove any remaining "Item Limit: N Per Year/Quarter" fragments
  cleanedName = cleanedName.replace(LIMIT_CATEGORY_RE, " ").trim();

  // Clean up double spaces and trailing category markers
  cleanedName = cleanedName.replace(/\s+/g, " ").trim();
  
  // Remove trailing " -" or " Category"
  cleanedName = cleanedName.replace(/\s+-\s*$/, "").replace(/\s+Category\s*$/i, "").trim();

  return { cleanedName, quantityLimit };
}

async function main() {
  console.log("Fixing quantity limits in product names...\n");

  // Get all products with potential quantity limits
  const productsWithLimits = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
    })
    .from(products)
    .where(
      or(
        like(products.name, "%Per Year%"),
        like(products.name, "%Per Quarter%"),
        like(products.name, "%Item Limit:%")
      )
    );

  console.log(`Found ${productsWithLimits.length} products with quantity limits in names\n`);

  const cleaned: CleanedProduct[] = [];
  
  for (const product of productsWithLimits) {
    const { cleanedName, quantityLimit } = cleanProductName(product.name);
    
    if (cleanedName !== product.name) {
      cleaned.push({
        id: product.id,
        originalName: product.name,
        cleanedName,
        quantityLimit,
      });
    }
  }

  console.log(`Will update ${cleaned.length} products:\n`);

  // Show before/after
  for (const p of cleaned.slice(0, 10)) {
    console.log(`BEFORE: ${p.originalName.substring(0, 60)}`);
    console.log(`AFTER:  ${p.cleanedName.substring(0, 60)}`);
    if (p.quantityLimit) console.log(`LIMIT:  ${p.quantityLimit}`);
    console.log("");
  }

  if (cleaned.length > 10) {
    console.log(`... and ${cleaned.length - 10} more\n`);
  }

  // Apply updates
  console.log("Applying updates...");
  let updated = 0;

  for (const p of cleaned) {
    // Build tags array with quantity limit
    const existingProduct = await db
      .select({ tags: products.tags })
      .from(products)
      .where(sql`${products.id} = ${p.id}`)
      .limit(1);
    
    const existingTags = existingProduct[0]?.tags ?? [];
    const newTags = existingTags.filter((t: string) => !t.startsWith("limit:"));
    
    if (p.quantityLimit) {
      newTags.push(`limit:${p.quantityLimit}`);
    }

    await db
      .update(products)
      .set({ 
        name: p.cleanedName,
        tags: newTags.length > 0 ? newTags : null,
      })
      .where(sql`${products.id} = ${p.id}`);
    
    updated++;
  }

  console.log(`\n✓ Updated ${updated} products`);
}

main().catch(console.error);
