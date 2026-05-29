# Bladder Support Categorization Fix: Cursor Brief

> **Revision v1.1** — first code-level review pass. Adds: bladder-rule update unified across all three seed branches (`!hasRules` loop, `bladderNeedRow` hydrate path, `hasRules === true` else branch); TypeScript classification path replaces compound SQL; verification tied to rules + bundle output rather than name-pattern audit alone; `query-bladder-catalog.ts` must emit category slugs not just UUIDs; clarified table formatting.
>
> **Revision v1.0** — small targeted fix, not a phase. Outcome of the catalog audit at `scripts/query-bladder-catalog.ts` (commit `662dd5c`).

## Goal

The catalog has ~71 active incontinence SKUs (FitRight pads/briefs/underwear, ContourPlus, Poise, Ultrasorbs, etc.) that are currently lumped into the broad `mobility` `product_categories` row alongside slippers, wipes, oral care, and other unrelated SNF maintenance items. The `bladder-support` need's `need_product_rules` point at `supplements`, `vitamins`, and `mobility` — three buckets too coarse to surface real bladder-care products.

Result: selecting only "Bladder Support" in the wizard returns denture cleansers, vitamin ointment, and a hearing amplifier battery. None of the actual incontinence SKUs surface.

This brief fixes the categorization (catalog-data only — no engine changes) so the bladder-support bundle returns genuinely incontinence-focused items.

## Non-negotiable constraints

1. **Non-destructive.** The `mobility` category stays. Only the 71 incontinence SKUs are re-tagged out of it. Other mobility products (slippers, oral care, wipes) are untouched.
2. **Idempotent seed.** `npm run db:seed` must be safe to re-run. Use `INSERT … ON CONFLICT` for the new category and `UPDATE` for the SKU re-tagging.
3. **No engine changes.** `lib/bundle-builder.ts`, qualifier engine, variant runtime, all unchanged. This is purely seed + DB content.
4. **No false positives.** Audit flagged "CURAD wart remover pad" matched `%pad%`. The re-tagging logic must use a **brand+keyword allowlist with an explicit denylist**, not loose pattern matching.
5. **Privacy carries forward.** No `console.*` interpolating product names or user input. Generic literal log strings only.
6. **Rule-update logic must be unified across all seed branches.** The current `scripts/seed.ts` has *three* code paths that touch `need_product_rules` for bladder-support: the `!hasRules` initial-seed loop, the `bladderNeedRow` hydrate path when bladder is added to a partial install, and the `hasRules === true` else branch (where today only cognitive's rules get refreshed). All three must apply the bladder-support delete+insert, or extract a single helper that all three call. Without this, an environment that already has a `need_product_rules` table populated (i.e., the production DB) will keep the old supplements/vitamins/mobility rules even after re-running the seed.

## Data changes

### 1. Add new product category

In `scripts/seed.ts`, add the new row to the existing category seed block (the same place `mobility`, `supplements`, `vitamins`, etc. are inserted) using the project's existing `onConflictDoNothing()` pattern:

- `slug`: `incontinence`
- `name`: `Incontinence Care`

After the upsert, refresh `catMap` (the in-memory slug→id lookup that the rule-insert and SKU-update steps both depend on) before proceeding to steps 2 and 3. If `catMap` is built once at the top of the seed, you must rebuild it after the new row exists, or the subsequent code will fail with `incontinence` being undefined.

### 2. Re-tag SKUs from `mobility` → `incontinence`

Build a deterministic SQL update inside the seed script using these allowlist patterns. **Case-insensitive matches** against `products.name`:

**Brand allowlist (any of):**
- `FitRight`
- `Poise`
- `ContourPlus`
- `Ultrasorbs` / `Ultrasorb`
- `Tena`
- `Depend`
- `Always Discreet`
- `Prevail`
- `Attends`

**Generic incontinence keyword allowlist (any of):**
- `incontinence`
- `bladder`
- `underpad` / `under pad`
- `bed pad` (incontinence bed pads)
- `protective underwear`
- `bladder control`
- `pull-on underwear` (incontinence-specific phrasing)

**Pad/brief/liner allowlist — narrower, must combine with another signal:**
- `pad` AND any of: `bladder`, `incontinence`, `underwear`, `women`, `men`, `overnight`, `maximum`, `light`, `moderate`, `heavy`, `Poise`, `Always`, or one of the brand allowlist matches
- `brief` AND any of: brand allowlist OR `incontinence` OR `protective`
- `liner` AND any of: brand allowlist OR `incontinence` OR `light`

**Denylist (exclude even if other rules match):**
- `wart` (catches "CURAD wart remover pad")
- `heating pad`
- `gauze pad`
- `eye pad`
- `cotton pad`
- `cosmetic`
- `tens` (TENS unit pads)

**Implementation pattern — use TypeScript classification, not compound SQL.**

Compound rules like *"`pad` AND any of these brand markers AND not in the denylist"* turn into an unreadable SQL `WHERE` clause that's hard to review and impossible to regression-test cleanly. Do this instead:

1. Define the brand allowlist, keyword allowlist, narrow-token combinators, and denylist as plain TypeScript arrays at the top of `scripts/seed.ts`.
2. `SELECT id, name FROM products WHERE category_id = <mobility id> AND active = true` — a single read.
3. Iterate in TypeScript. For each row, run `classifyAsIncontinence(name, allowlists, denylist) → boolean` against your arrays. Pure function, easy to unit-test.
4. Collect the matched IDs into a single array.
5. One batched `UPDATE products SET category_id = <incontinence id> WHERE id IN (<matched ids>)`.
6. Log only the count: `console.log("re-tagged", matchedIds.length, "products into incontinence")` — no product names, no SKU interpolation.

The `classifyAsIncontinence` helper should also be exported (or at least importable from the seed file) so the verification step can use the same function — see Verification section below.

### 3. Update `bladder-support` need rules — apply in **all three** seed branches

Target rule set (replace the existing three rules — supplements, vitamins, mobility — with these):

- `incontinence`: min 2, max 4, priority weight 5
- `vitamins`: min 0, max 1, priority weight 1

The optional `vitamins` rule at low weight allows a skin-barrier / vitamin A&D ointment to surface as a useful adjunct, but never as the dominant content. Drop the `supplements` and `mobility` rules for `bladder-support` entirely.

**Where to apply this — all three branches that today touch bladder-support rules:**

1. **The `!hasRules` initial-seed loop** — first-install path on an empty DB.
2. **The `bladderNeedRow` hydrate path** — runs when bladder-support is being added to a DB that already has *some* needs but no bladder rules yet.
3. **The `hasRules === true` else branch** — runs when the DB already has `need_product_rules` populated. **This is the production case.** Today only `cognitive`'s rules get refreshed in this branch; bladder must follow the same pattern.

**Recommended implementation:** extract a single helper, e.g.:

```ts
async function refreshBladderSupportRules(db, bladderNeedId, catMap) {
  await db.delete(needProductRules).where(eq(needProductRules.needId, bladderNeedId));
  await db.insert(needProductRules).values([
    { needId: bladderNeedId, requiredCategoryId: catMap.incontinence, minItems: 2, maxItems: 4, priorityWeight: 5 },
    { needId: bladderNeedId, requiredCategoryId: catMap.vitamins,    minItems: 0, maxItems: 1, priorityWeight: 1 },
  ]);
}
```

Call it from all three branches. Without this, re-running `npm run db:seed` against the production DB will *not* fix the bladder-support bundle even though the new category and SKU re-tagging take effect.

## Verification

### Extend `scripts/query-bladder-catalog.ts` first

The current script returns `category_id` UUIDs in query 3, which makes "is this thing in `incontinence` now?" hard to read by eye. Update the script so:

- Query 1 already returns `category_slug` — leave as-is.
- Query 2 should output `category_slug` alongside count of products per category.
- Query 3 should join to `product_categories` and output `category_slug` per row, sorted by category, so you can see at a glance how many of the matched names are in `incontinence` vs. left behind elsewhere.

### Verification steps post-seed

1. **Confirm the rule update applied** (most important — proves the unified-helper change worked across branches):
   ```bash
   npx tsx scripts/query-bladder-catalog.ts
   ```
   Query 1 must show exactly two rules for `bladder-support`: `incontinence` (2/4/5) and `vitamins` (0/1/1). Anything else means a seed branch was missed.

2. **Confirm SKU re-tagging:** Query 2 should show ~70 products in `incontinence`. Query 3 should show all/most of the brand+keyword matches with `category_slug = 'incontinence'`. The wart-remover and other denylisted matches should remain in their original categories — verify by spot-checking those names appear with non-`incontinence` slugs.

3. **Hit the bundle endpoint:**
   ```
   http://localhost:3009/bundles?budgetCents=30000&cadence=quarterly&needSlugs=bladder-support&includeEveryday=true
   ```
   Expected: the "Your Bladder Support" section is dominated by FitRight / Poise / ContourPlus / Ultrasorbs SKUs. No denture cleansers, no hearing amplifier batteries.

4. **Spot-check `/products/<one-of-the-retagged-SKUs>`** — page should still render fine; only the category changed.

**Verification rule:** "tied to query 2 (categorical breakdown) + query 1 (rules) + bundle output." Do **not** rely on query 3's row count alone — it's a name-pattern match and will return ~71 rows regardless of whether the re-tagging worked.

## Acceptance criteria

1. `npm run db:seed` runs idempotently; second consecutive run reports 0 rows newly tagged and the `bladder-support` rules unchanged.
2. **The unified bladder-rule update applies across all three seed branches.** Verifiable by running the seed against:
   - a fresh DB (exercises `!hasRules`),
   - a partially-seeded DB missing `bladder-support` (exercises hydrate path),
   - a fully-seeded DB with the old supplements/vitamins/mobility rules (exercises `hasRules === true` else branch).
   
   In all three, post-seed `bladder-support` rules must end up with the two specified rows. The third case is the production scenario and is the one most likely to silently regress without the unified helper.
3. The new `incontinence` `product_categories` row exists with `slug='incontinence'`, `name='Incontinence Care'`.
4. The 70 (give or take) incontinence SKUs identified by the brand+keyword classifier now have `category_id` pointing at `incontinence`. The wart-remover and any other denylisted matches **stay in their original categories** — confirm via the extended `query-bladder-catalog.ts` query 3 output (now including `category_slug`).
5. `bladder-support` `need_product_rules` contains exactly the two rows specified (incontinence 2/4/5, vitamins 0/1/1) — no leftover supplements/mobility rule.
6. Selecting only "Bladder Support" in the wizard (with everyday on or off) produces a bundle whose "Your Bladder Support" section is incontinence-focused. Manual visual verification on `/bundles?needSlugs=bladder-support&...`. (A `test:wizard` assertion for composition is out of scope — see Out of Scope below.)
7. **No regression for other needs.** Re-run the existing `npm run test:wizard` (with `SKIP_INTEGRATION=1` if needed) — no failures. Other categories' bundles compose the same as before.
8. `grep -r "FitRight\|Poise\|ContourPlus\|Ultrasorbs" .` shows no occurrences inside `console.*` calls or log statements (generic literal logs only). Note: `console.error(e)` calls in pre-existing seed error-handling are out of scope for this brief; don't tighten them as part of this PR.
9. `npm run build` produces zero new TypeScript errors.

## Out of scope (future briefs)

- **Audit pass for the other 8 needs.** Same shape of work — repeat `query-bladder-catalog.ts` per need, identify mis-categorized SKUs, propose category creation. Do *after* this PR ships and the bladder-support fix is verified visually.
- **Engine-level fit-strictness check** (a stricter eligibility filter beyond category membership). Anticipated in Phase 1.6 (Assessment Engine).
- **Adding new incontinence SKUs to the catalog.** The 70 we already have are sufficient for the demo. Future catalog ingestion is its own workstream.
- **`test:wizard` composition assertion.** A test that computes "≥X% of bundle items match the incontinence classifier" would require importing the classifier and re-running it against the bundle output. Manual verification is sufficient for this PR; if drift becomes a recurring problem after we extend this to other needs, we'll add a generic per-need composition test then.
- **Tightening pre-existing `console.error(e)` in seed error paths.** That's a broader logging-hygiene pass; not coupled to this fix.
- **SKU-prefix classification fallbacks.** A few products with brandless, SKU-heavy titles will likely stay in `mobility` post-fix. Acceptable for demo scope; revisit when we audit the other categories.

## Working notes

- Keep this PR small and reviewable in one sitting. Schema migration not required (no new columns).
- Update the existing `query-bladder-catalog.ts` script if needed so its post-fix output is informative — but don't rename it; it's a generic audit pattern we'll reuse for other needs.
- After merging, run the same fix against production Neon: `DATABASE_URL=$DATABASE_URL_UNPOOLED npm run db:seed`. The seed is idempotent so this is safe.
