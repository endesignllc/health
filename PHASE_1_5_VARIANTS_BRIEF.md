# Phase 1.5 — Variants + Catalog Consolidation: Cursor Brief

> **Revision v1.0** — initial draft. Pilot category: **Medline compression socks**, anchor product UUID `2a85bb35-47c7-4fcd-8ab5-075880f8656f`. Hand-curated crosswalk. Automated classification is Phase 1.6 (separate brief).

## Goal

Introduce a variant layer so that multiple Medline SKUs differing only in size / color / strength render as **one configurable listing** with inline variant selection. Prove the pattern end-to-end with one pilot family (compression socks). The crosswalk for this pilot is human-authored; automated classification is deferred.

Downstream features that depend on this phase — the Benefit Optimizer dashboard (Phase 2), qualifier expansion to variant-heavy categories (Phase 1.6+), and plan-scoped availability (Phase 4) — assume the variant runtime is in place.

## Non-negotiable constraints

1. **Non-destructive transform.** Source products are never deleted. Consolidation creates a new parent product + variants and marks source products `active = false` with an audit pointer (`replaced_by_product_id`) to the replacement. Removing a family from the crosswalk and re-running the import must be able to restore standalones via manual SQL; scripted rollback is out of scope for this phase but must not be architecturally blocked.
2. **No regression for non-configurable products.** Any product not touched by the crosswalk must render, price, bundle, and check out identically to pre-Phase-1.5 behavior. This is an explicit acceptance test (see #7 below).
3. **Privacy constraints from Phase 1 carry forward verbatim.** No user-data collection introduced. No `console.*` in any handler, action, or helper that parses `variantId` or `variantSelections`. Sanitized validation-error responses on any new or modified API route that accepts variant input — `{ error: "Validation failed" }`, never a zod issue tree.
4. **Crosswalk is reviewable data, not code.** Stored at `product-catalog/variant-crosswalk.json`. Every change lands via PR. Never edited inline inside scripts or runtime code paths.
5. **Commit A (propose crosswalk) is gated by explicit human approval.** Do not proceed to Commit B until the crosswalk JSON is approved. See the Pilot section.

## Data model

### New: `product_variants` table

| column | type | notes |
|---|---|---|
| `id` | uuid, PK | |
| `product_id` | uuid, FK → `products.id`, cascade delete | |
| `sku` | text, unique globally | sellable SKU (source SKU for Medline-originated variants) |
| `name` | text, nullable | variant display override; null = derive from parent + axes |
| `description` | text, nullable | variant description; null = inherit parent |
| `price_cents` | integer, not null | **variants are pricing authority** |
| `image_url` | text, nullable | variant image; null = fall back per inheritance rules |
| `in_stock` | boolean, default true, not null | |
| `restock_eta_hours` | integer, nullable | |
| `supply_days` | integer, default 30, not null | |
| `units_per_package` | integer, default 1, not null | |
| `estimated_daily_use` | integer, nullable | |
| `size` | text, nullable | typed variant axis |
| `color` | text, nullable | typed variant axis |
| `strength` | text, nullable | typed variant axis |
| `attributes` | jsonb, nullable | long-tail axes (`side`, `width`, `capacity`, etc.) |
| `is_default` | boolean, default false, not null | exactly one per configurable product |
| `active` | boolean, default true, not null | |
| `source_product_id` | uuid, FK → `products.id`, nullable | provenance — the original standalone product this variant replaces |
| `created_at` | timestamp, default now, not null | |

Constraints:
- **Partial unique index** `(product_id) WHERE is_default = true AND active = true` — exactly one active default per parent.
- Every active product must have at least one active variant (enforced by migration + seed; softly enforced going forward).

Add Drizzle relations: `product_variants.product → products`, `product_variants.sourceProduct → products` (nullable).

### Changes to `products`

| column | change |
|---|---|
| `is_configurable` | **new**: boolean, default false, not null |
| `family_key` | **new**: text, nullable, unique — stable identifier for idempotent crosswalk re-runs |
| `replaced_by_product_id` | **new**: uuid, FK → `products.id`, nullable — set when a source product is consolidated |
| `price_cents` | keep. For configurable products, treated as a derived "starts at" display value computed at read time. Document the semantic shift in code comments. |
| `image_url` | keep. For configurable products, rendered from the default variant at query time; this column is not required to stay in sync. |

### Changes to `cart_items`, `bundle_items`, `orders`-adjacent tables

Both `cart_items` and `bundle_items` currently reference `product_id`. Add `variant_id` (uuid, FK → `product_variants.id`).

- `cart_items.variant_id`: nullable initially, required (`not null`) after backfill.
- `bundle_items.variant_id`: nullable initially, required after backfill.
- `orders`: leave as-is. Line-item fidelity is handled in cart_items / bundle_items.

**Keep `product_id` populated** on both tables — never drop it. Convenience joins and analytics depend on it.

### Migration sequence (single Drizzle migration)

1. Create `product_variants`.
2. For every existing `products` row, create a corresponding `product_variants` row with SKU, price, image, `in_stock`, `restock_eta_hours`, `supply_days`, `units_per_package`, `estimated_daily_use` copied 1:1 from the product. Mark `is_default = true`.
3. Add `variant_id` to `cart_items` and `bundle_items` as nullable.
4. Backfill `variant_id` on every existing row from the product's newly created default variant.
5. Alter `cart_items.variant_id` and `bundle_items.variant_id` to `not null`.
6. Add `is_configurable`, `family_key`, `replaced_by_product_id` to `products`.

Run `npm run db:generate` at the end. Commit the generated SQL.

## Crosswalk data format

File: `product-catalog/variant-crosswalk.json`

```json
{
  "version": 1,
  "families": [
    {
      "familyKey": "medline-compression-socks-20-30",
      "parentName": "Medline Compression Socks, 20–30 mmHg",
      "parentDescription": "Graduated compression support for daily wear. Choose your size and color below.",
      "productClassSlug": "compression-hosiery",
      "defaultVariantSourceSku": "<sku of intended default variant>",
      "variantAxes": ["size", "color"],
      "sourceProducts": [
        { "sourceSku": "<sku>", "size": "s",  "color": "black" },
        { "sourceSku": "<sku>", "size": "s",  "color": "tan"   },
        { "sourceSku": "<sku>", "size": "m",  "color": "black" },
        { "sourceSku": "<sku>", "size": "m",  "color": "tan"   },
        { "sourceSku": "<sku>", "size": "l",  "color": "black" },
        { "sourceSku": "<sku>", "size": "l",  "color": "tan"   },
        { "sourceSku": "<sku>", "size": "xl", "color": "black" },
        { "sourceSku": "<sku>", "size": "xl", "color": "tan"   }
      ]
    }
  ]
}
```

Rules:
- Validate with zod at import time. Invalid entries fail the import loudly — never silently proceed.
- `defaultVariantSourceSku` must appear in `sourceProducts`.
- `productClassSlug` must resolve against `product_classes`. If missing, error with the slug and abort — do not auto-create classes inside the import.
- Axis values are stored **lowercase tokens** (`s`, `m`, `l`, `xl`, `black`, `tan`, `20-30_mmhg`). Display labels are generated from a small label map inside the import script (e.g. `s → "Small"`, `black → "Black"`).

## Inheritance rules (product ↔ variant display)

| Field | Configurable product (parent) | Standalone product |
|---|---|---|
| `name` | Authored in crosswalk. Required. | Authored as today. |
| `description` | Authored in crosswalk. Null OK — variant description shown in cart. | Authored as today. |
| `image_url` (display) | Derived at query time from the variant matching `defaultVariantSourceSku`; falls back to first active variant with an image; then null. | Variant image if set; else the product's `image_url`. |
| `price_cents` display | "From $X.XX" = `min(variants.price_cents)` across active variants. | Single variant price. |
| `supply_days` | Derived from the default variant. | Variant value (identical to product value post-migration). |

Do not store derived values on `products`. Compute at read time. The one exception is `is_configurable`, which is an explicit persisted flag.

## Import script

Create `scripts/apply-variant-crosswalk.ts`. Add to `package.json`:

```json
"db:apply-variant-crosswalk": "npx tsx scripts/apply-variant-crosswalk.ts"
```

Behavior:

1. Load and zod-validate `product-catalog/variant-crosswalk.json`.
2. For each family:
   - Look up every `sourceSku` in `products`. If any is missing, abort that family with a loud error that lists missing SKUs. Do not partial-apply.
   - Confirm `productClassSlug` resolves. If not, abort the family.
   - If a parent product with `family_key = familyKey` already exists, **update in place** (idempotent re-run): re-sync `name`, `description`, `product_class_id`, and variant rows. Soft-deleted source products stay soft-deleted.
   - Otherwise, create the parent product: `is_configurable = true`, `family_key = familyKey`, `name` + `description` from crosswalk, `category_id` inherited from source products (use the modal category; if source products span multiple categories, abort with a clear error).
   - For each source product, create (or update) a `product_variants` row: `product_id = parent.id`, axes from crosswalk, pricing and stock fields copied from source, `source_product_id = source.id`.
   - Mark the variant matching `defaultVariantSourceSku` as `is_default = true`; clear the flag on all other variants in the family.
   - For each source product, set `active = false`, `replaced_by_product_id = parent.id`.
3. Print a summary table at the end: families created, families updated, source products consolidated, variants created.

Rollback is manual in this phase. Document the SQL rollback steps in a comment at the top of the script.

## Integration points

### `lib/bundle-builder.ts`

1. Candidate-product queries that currently select `products` must also select the product's variants (active only) for configurable products.
2. Add `variants` and `defaultVariantId` to the `BundleItem` type. Retain `productId` and add `variantId: string | null` — `null` during initial bundle build when no variant has been selected yet, otherwise the currently-selected variant.
3. When ranking, if a product is configurable, use the **default variant's** price, stock, and supply for budget / sufficiency math. Variant selection (by the shopper) updates these values on re-rank.
4. Respect the Phase 1 `qualifierAnswers` contract — no behavior change for products without variants.

### `app/api/bundles/generate/route.ts`

Extend the zod request schema to include optional `variantSelections: Record<productId, variantId>`. The bundle builder uses the selection map (when present) to override default-variant math for those products.

Sanitized validation errors: unchanged from Phase 1 — `{ error: "Validation failed" }` when any variant or qualifier field is present in the payload.

### `app/api/cart/items/route.ts` (and related cart endpoints)

- Accept `variantId` alongside `productId`.
- If the target product is `is_configurable`, `variantId` is **required**. Reject with sanitized 400 if absent.
- If the target product is not configurable, `variantId` is optional; if absent, resolve to the product's default variant server-side.
- Persist `variant_id` on the inserted `cart_items` row.

### `app/(store)/products/[id]/page.tsx`

For configurable products:
- Title and description from the parent.
- "Starts at $X.XX" header price until a variant is fully selected.
- One picker per axis declared in `variantAxes`. Unavailable combinations (no matching active variant, or `in_stock = false` on the only match) are **visibly disabled** with an aria-label noting the reason.
- Default selection pre-applied from `is_default` variant.
- Image and price update when a complete variant combination is selected.
- "Add to cart" is enabled only when a complete variant is selected (the default satisfies this immediately).

### `components/BundlesList.tsx` (from Phase 1)

For each bundle item whose product is `is_configurable`:
- Inline variant picker under the item card, below any existing `QualifierPanel`.
- Default variant pre-selected at first render (bundle totals must be correct immediately).
- Changing the variant triggers the same debounced `/api/bundles/generate` refetch as qualifier changes. Include the current `variantSelections` in the payload.
- Line total reflects the selected variant's price.

### `app/(store)/cart/page.tsx`

- Cart items for configurable products show "Size: Medium, Color: Black" (or similar derived label) under the product name, generated from variant axes using the label map.
- "Change size/color" link opens a modal reusing the variant picker. Submitting updates `cart_items.variant_id` via an existing PATCH endpoint (add one if needed, `PATCH /api/cart/items/:id` accepting `variantId`).

## Pilot: compression sock family

**Two commits. Gated by human review between them.**

### Commit A — propose crosswalk (no runtime changes)

1. Resolve anchor product `2a85bb35-47c7-4fcd-8ab5-075880f8656f`. Extract its `name`, `description`, `sku`, `category_id`, `product_class_id`, `price_cents`, `image_url`.
2. Search `products` for sibling rows that share the anchor's `product_class_id` and a name stem (the anchor name with size / color tokens regex-stripped). Include only siblings that look like the same base product at the same strength and silhouette (knee-high vs crew). When in doubt, **exclude** the sibling and note it in the PR.
3. For each included sibling, extract `size` and `color` tokens from the name.
4. Write `product-catalog/variant-crosswalk.json` with one family entry. Fill `defaultVariantSourceSku` with the M-black sibling if present; else median-priced in-stock variant.
5. **Commit only the crosswalk file.** PR description must list:
   - The anchor product's current name and SKU.
   - Every source SKU included with its extracted axes.
   - Every sibling product that looked close but was excluded, with one-line reasons.
   - The chosen `defaultVariantSourceSku` with rationale.
6. Do not run the migration. Do not run the import. Wait for explicit human approval.

### Commit B — migrate + import + UX

After the crosswalk is approved:

1. Land the schema migration in its own commit within this PR (reviewable in isolation).
2. Run `npm run db:apply-variant-crosswalk` in a follow-up commit — commit the resulting DB state is not version-controlled, but include a note in the PR confirming the import summary.
3. Implement the UX changes (PDP, BundlesList, cart).
4. Add and run tests.

## Acceptance criteria

1. Migration applies cleanly via `npm run db:push`. Every pre-existing `cart_items` and `bundle_items` row ends up with a non-null `variant_id` pointing to a valid default variant of its original product.
2. `npm run db:apply-variant-crosswalk`, run against the approved crosswalk, produces one configurable parent product with the correct number of variants, each tagged with the correct `size` / `color`, with exactly one `is_default` variant. Source products are `active = false` with `replaced_by_product_id` set.
3. Visiting `/products/<new-parent-id>` shows one listing with a size picker and a color picker. The default combination is pre-selected; its image is displayed; the price reflects the default variant.
4. Source product UUIDs still resolve in the database (rows aren't deleted). Visiting a source product URL either redirects to the new parent or returns 410 — implementer's choice, documented in the PR.
5. Adding a compression sock to cart captures `variant_id`. The cart line item renders "Size: Medium, Color: Black" (or the equivalent label from the label map).
6. Bundles that include compression socks pre-select the default variant. Changing the variant inline updates the bundle total and sends the new `variantSelections` on the next `/api/bundles/generate` call.
7. **Baseline equivalence for non-configurable products.** Take any product not touched by the crosswalk. Its render on `/products/[id]`, its inclusion in bundles, and a cart-add round-trip must be byte-equivalent to pre-Phase-1.5 behavior. An explicit test case compares outputs.
8. Re-running `npm run db:apply-variant-crosswalk` against the same crosswalk is a **no-op** (idempotent): no duplicate parents, no duplicate variants, no change in default flag.
9. `grep -r "variantSelections\|variantId" .` shows **no** occurrences inside error-response construction, `console.*` calls, or log statements for any route that parses those fields.
10. `npm run test:variants` exits 0 and runs all tests described below.
11. `npm run build` produces zero new TypeScript errors. No new `any`. No new top-level dependencies beyond the optional Radix primitives allowed in Phase 1.
12. Any validation failure on `/api/bundles/generate`, `/api/cart/items`, or `PATCH /api/cart/items/:id` that touches variant fields returns `{ error: "Validation failed" }` — never a zod issue tree.

### Test requirements

Add `"test:variants": "npx tsx scripts/test-variants.ts"` to `package.json`. Use `node:assert/strict` — no new test-framework dependencies.

- **Unit tests** covering: crosswalk zod validation (valid, missing `defaultVariantSourceSku`, non-existent sibling, ambiguous category), partial-unique-default-variant enforcement (attempting to set a second default on the same parent fails), image inheritance chain (default variant image → first active variant image → null), "starts at" price derivation across active/inactive variants, label-map rendering.
- **Integration test 1 — import correctness:** run the import script against a fixture of 8 synthetic compression sock products; assert one parent created, eight variants created with correct axes, correct default, source products marked `active = false` with `replaced_by_product_id` set.
- **Integration test 2 — idempotency:** run the import twice against the same crosswalk; assert no row duplication and identical final state.
- **Integration test 3 — baseline equivalence:** pick a product not in the crosswalk. Snapshot `/products/[id]` render data, bundle inclusion, and cart-add round-trip before and after the migration. Must be byte-identical.

## Out of scope

- Automated classification, variant detection, or canonical naming — Phase 1.6.
- Crosswalks for any category other than compression socks.
- Variant-level inventory depth beyond the `in_stock` boolean and `restock_eta_hours`.
- Plan-scoped variant availability — Phase 4.
- Scripted rollback of applied crosswalks (manual SQL is acceptable this phase).
- Stripe line-item metadata changes beyond including the variant SKU if trivially available.
- Any changes to the build wizard (Phase 1 stays untouched).
- Displaying the SKU on the product detail page (separate UI bug — file independently; do not fold into this phase).

## Working notes for the agent

- Commit A and Commit B are **two separate PRs**, not two commits in one PR. Commit A's crosswalk JSON must be reviewed and approved before Commit B starts.
- One Drizzle migration for the whole schema change. Don't split it into per-table migrations.
- Don't introduce a variant framework dep. This is a ~300-line problem, not a framework.
- Use `node:assert/strict` for tests. Match Phase 1.
- Re-read the **Non-negotiable constraints** section and the Phase 1 privacy constraints before writing code.
- If the anchor product's siblings can't be cleanly identified by name stem, **stop and ask** — do not guess consolidations into the crosswalk.
- The label map (`s → "Small"`, `black → "Black"`) is a small constant in the import script / a shared helper — not a database table in this phase.
