# Multi-Need Wizard + Priority Tiers + Everyday Essentials: Cursor Brief

> **Revision v1.2** — second code-level review pass. Resolves: `console.*` contradiction (no interpolation, generic strings only); `priorityTier` on `BundleItem` so the UI can render badges without an extra fetch; explicit HTTP status discipline (400 vs 500); `variantSelections` dropped from this PR's schema (deferred to Phase 1.5); slug `UPDATE` collision guard; deterministic tie-break for ordering; goals-equivalence assertion tightened to ordered tuples; integration test harness pinned to the `test-qualifiers.ts` pattern.
>
> **Revision v1.1** — first code-level review pass. Adds: legacy slug alias strategy; explicit wizard step numbering against current code; one-bundle-with-grouped-sections clarification; `bundleSection` coexists with existing `section` (core/support/maintenance) instead of replacing it; primary-need rule for cart-routing; essentials-only direct product query path; sanitized builder error responses; `goals` field removed from wizard URL output; explicit list of other callers to update vs leave alone.
>
> **Revision v1.0** — initial draft. Two related UX/data changes shipped as one focused PR. Pre-pitch polish for the Peter review build.

## Goal

Three coordinated changes that together move the bundle wizard closer to how members actually shop their OTC benefit:

1. **Merge "What do you need support with?" and "Wellness priorities" into ONE multi-select step.** Drop Step 4 entirely. Multi-select with no artificial single-choice constraint.
2. **Add a need priority tier system** (Tier 1: Essential / Tier 2: Beneficial / Tier 3: Comfort) per the OTC Smart Shopping transition doc. Drives bundle ordering and adds visible badges on the bundle output.
3. **Separate "everyday essentials" from the need taxonomy.** Items like tissues, hand sanitizer, lip balm aren't a health need — they're universal maintenance. Single toggle below the multi-select, defaults to **on**.

Ship as one PR because the three pieces only make sense together: multi-need selection makes priority tiers actually do something, and pulling everyday items out of the need list is what cleans up the merged option list.

## Non-negotiable constraints

1. **Backward compatibility.** Existing URLs like `/bundles?needSlug=heart-health&...` must continue to work. Treat singular `needSlug` as a 1-element `needSlugs` array.
2. **Privacy carries forward.** No new user-data collection. Selected needs and the everyday toggle are session/query-scoped, not persisted to a user profile. Sanitized validation errors — `{ error: "Validation failed" }`, never a zod issue tree.

   **Logging rule (resolves the v1.1 contradiction):** server-side logging is permitted *only* with generic, hard-coded strings. Calls like `console.error("bundle generate failed")` or `console.warn("validation failed")` are fine. **Never interpolate `needSlugs`, `includeEveryday`, `bundleSection`, `goals`, or any user-supplied input into a log line.** The grep rule (criterion #11) checks for these field names inside `console.*` calls and log statements specifically — generic literal strings pass; interpolations fail.
3. **No regression for existing fields.** Budget, cadence, and any Phase 1 / Phase 1.5 work continue to function identically. This brief only changes need selection, priority tier display, and everyday-essential bundling.
4. **Sanitize all error responses, not just zod failures.** The current `/api/bundles/generate` route returns `{ error: e.message }` on builder errors — that can leak internal detail. After this PR, all error responses must be sanitized to `{ error: "Bundle generation failed" }` (or "Validation failed" for schema errors) with the real error logged server-side at most. Same rule from Phase 1's privacy spec.

## Data model changes

### `needs` table — add priority tier

| column | change |
|---|---|
| `priority_tier` | **new**: integer, not null, default 2. Values: `1` (Essential), `2` (Beneficial), `3` (Comfort). |

Update `scripts/seed.ts` to assign tiers to existing needs:

- **Tier 1 (Essential):** `blood-sugar-support`, `heart-health`, `bladder-support`, anything chronic-condition-supporting
- **Tier 2 (Beneficial):** `pain-inflammation`, `respiratory-support`, `joint-comfort-mobility`, `cognitive-support`, `vision-hearing-support`, `sleep-mood-support`
- **Tier 3 (Comfort):** none in the merged need list (Tier 3 lives in the everyday-essentials bucket, not in needs)

### `products` table — add everyday essential flag

| column | change |
|---|---|
| `is_everyday_essential` | **new**: boolean, not null, default false. |

Hand-tag a starter set in `scripts/seed.ts`. Mark products like:
- Tissues / Kleenex
- Hand sanitizer
- Lip balm / chapstick
- Cotton swabs
- Wet wipes / cleansing wipes
- Disposable gloves (if present)
- Adhesive bandages — basic / generic only

Aim for ~6–10 products. These are products that any member would reasonably add to any bundle regardless of health need.

### Need slug normalization (one-time cleanup)

The current `needs` list in `scripts/seed.ts` has slugs like `blood-sugar`, `mobility-fall`, `respiratory`, `sleep-mood`, `cognitive`, `vision-hearing`, `medication-adherence`. Consolidate to this canonical set:

| Current slug(s) | New canonical slug |
|---|---|
| `blood-sugar` | `blood-sugar-support` |
| `heart-health` | `heart-health` (no change) |
| `mobility-fall` | `joint-comfort-mobility` |
| `pain-inflammation` | `pain-inflammation` (no change) |
| `respiratory` | `respiratory-support` |
| `sleep-mood` | `sleep-mood-support` |
| `cognitive` | `cognitive-support` |
| `vision-hearing` | `vision-hearing-support` |
| (new) | `bladder-support` |
| `medication-adherence` | drop entirely |
| `daily-routines-organization` (if present) | drop entirely |

Drop `medication-adherence` and any "Daily routines" / "Daily living essentials" need — those products move to the `is_everyday_essential` flag instead.

### Migration strategy (not just seed updates)

Renaming slugs has DB implications beyond the seed file. The migration must:

1. **Update existing `needs` rows** rather than insert new ones — preserves IDs and existing FK references in `need_product_rules`, `bundles.needId`, `carts.needId`, `product_classes.needId`.
2. **Don't `DELETE` and re-`INSERT`** — that breaks every dependent FK. Use `UPDATE needs SET slug = '<new>', name = '<new>' WHERE slug = '<old>'`.
3. **Rules cleanup** — for dropped needs (`medication-adherence`, `daily-routines-organization`), update or delete the corresponding `need_product_rules` rows. Products previously rule-mapped to those needs should be reviewed for `is_everyday_essential = true` candidacy.
4. **`product_classes.needId`** — re-point or null out for dropped needs.
5. **Existing bundles / carts** — leave singular `needId` alone; they're historical. New bundle generation works fine because the DB is the source of truth for active needs.

6. **Unique-constraint guard on slug renames.** `needs.slug` is unique. The renames in this PR don't collide (every old slug maps to a free target), but if a future rename ever swaps two slugs (`a→b`, `b→a`), use a temporary slug to avoid a unique violation:
   ```sql
   UPDATE needs SET slug = '__tmp_a__' WHERE slug = 'a';
   UPDATE needs SET slug = 'a'         WHERE slug = 'b';
   UPDATE needs SET slug = 'b'         WHERE slug = '__tmp_a__';
   ```
   For this PR, a single-pass `UPDATE` per row is safe — but document the temp-slug pattern in a code comment so the next editor doesn't trip on it.

Apply all of the above inside `scripts/seed.ts` (since the project uses idempotent seed scripts, not formal migrations). Make the script safe to re-run.

### Legacy URL alias strategy

Cursor flagged that renaming slugs breaks any bookmarks like `/bundles?needSlug=blood-sugar`. Decision: **add a small server-side alias map** (not a DB column, not runtime normalization) in `app/(store)/bundles/page.tsx` that translates legacy slugs to canonical ones at request time:

```ts
const LEGACY_NEED_SLUG_ALIASES: Record<string, string> = {
  "blood-sugar": "blood-sugar-support",
  "mobility-fall": "joint-comfort-mobility",
  "respiratory": "respiratory-support",
  "sleep-mood": "sleep-mood-support",
  "cognitive": "cognitive-support",
  "vision-hearing": "vision-hearing-support",
  // medication-adherence: dropped need with no successor
};
```

**Behavior for dropped legacy slugs (`medication-adherence`, `daily-routines-organization`):** filter them out of `needSlugs` after applying the alias map. No log, no notice. If filtering leaves `needSlugs` empty:
- If `includeEveryday=true`, fall through to the essentials-only path (valid bundle).
- If `includeEveryday=false`, behave the same as a request with no needs and toggle off — render the "select at least one need or include everyday essentials" bail state.

Apply the alias map only to URL parsing in `app/(store)/bundles/page.tsx` and the wizard's redirect path. Do not push it into `lib/bundle-builder.ts` or any DB query — runtime code reads canonical slugs only.

## Wizard UI changes

### `app/(store)/build/BuildWizardForm.tsx`

**Current step layout in code:**
- Step 1 — Budget + Cadence (combined card)
- Step 2 — "What do you need support with?" (single-select)
- Step 3 — Shopper ("Shopping for…")
- Step 4 — Wellness priorities (multi-select)

**After this PR:**
- Step 1 — Budget + Cadence (**unchanged**)
- Step 2 — "What do you need support with?" (**multi-select** + everyday toggle below)
- Step 3 — Shopper (**unchanged**)
- Step 4 — **deleted**

Specific changes:

1. **Delete Step 4 entirely** ("Wellness priorities (optional)") and remove the `goals` state from the form.
2. **Step 2 becomes multi-select.** Toggleable cards/buttons; visual selected state (border highlight + checkmark icon). Maintain the existing card-grid layout.
3. **Update the helper copy** under Step 2 from *"Select one category. We never ask for a diagnosis."* to *"Pick any that apply. We never ask for a diagnosis."*
4. **Below the multi-select, add a single toggle row:**

```
☑ Also include everyday essentials (tissues, hand sanitizer, lip balm, etc.)
```

Defaults to **on**. Persist alongside `needSlugs` in the wizard form state.

5. **Submit button validation:** the current `disabled={!needSlug}` becomes `disabled={needSlugs.length === 0 && !includeEveryday}`. If both are empty, the button stays disabled and an inline note explains "Pick at least one need or include everyday essentials."

6. **Drop `goals` from the URL.** The submit handler currently builds a query string with `?goals=…`. Remove that field entirely. Builder still tolerates an incoming `goals` param for backward compat (see builder section), but the wizard stops emitting it.

### Submission

The form's submit handler currently builds a URL with `?needSlug=heart-health&goals=joint-comfort,heart-health&...`. After this change:

- `needSlugs` (plural, comma-separated): one or more selected needs (may be empty if `includeEveryday=true`)
- `includeEveryday` (`true`/`false`): the toggle state
- `goals` parameter is **removed** — the merged multi-select replaces it (the builder still accepts `goals` for legacy callers but ignores it for selection)
- `usageIntensity`: keep as-is for now (separate concept)
- `shopper`: keep as-is (Step 3 unchanged)

## Bundle generator changes

### `lib/bundle-builder.ts`

The current `BundleBuilderInput` type takes a single `needSlug`. `BuiltBundle` carries singular `needSlug` and `needName`. `BundleItem.section` is `"core" | "support" | "maintenance"` (the existing budget allocation labels). All of this stays — we extend, not replace.

1. **Extend `BundleBuilderInput`:**
   - Add `needSlugs: string[]` (preferred, may be empty when `includeEveryday=true`).
   - Add `includeEveryday: boolean`.
   - Keep `needSlug?: string` for legacy callers — backward-compat shim wraps to `[needSlug]` when `needSlugs` is absent.
   - Keep `goals?: string[]` — accept but **stop applying** to scoring logic in this PR. Strip `scoringGoalTags` usage (or guard it behind a feature flag) so the multi-need flow doesn't double-rank by stale signals.

2. **Builder shape — one bundle, grouped sections inside, NOT multiple bundles.** `buildBundles()` continues to return `BuiltBundle[]`, but for multi-need it produces a **single** `BuiltBundle` whose items span all selected needs plus optional everyday. This matches the existing one-bundle-per-call call pattern; we don't introduce N bundles for N needs.

3. **`BuiltBundle` extension:**
   - Keep `needSlug` and `needName` populated as the **primary need** (rule below) for downstream cart/admin code that still reads them.
   - Add `needSlugs: string[]` and `needNames: string[]` alongside.
   - Add `includeEveryday: boolean`.

4. **Primary-need rule** (deterministic, for cart routing and `bundle.needSlug`/`bundle.needName`): the lowest-`priority_tier` selected need; ties broken by URL order. When `needSlugs` is empty (essentials-only), `needSlug = "everyday"` and `needName = "Everyday Essentials"`.

5. **`BundleItem.bundleSection` and `BundleItem.priorityTier` are added alongside the existing `section`:**
   - Existing `section: "core" | "support" | "maintenance"` stays — sufficiency and cart logic depend on it.
   - New `bundleSection: string` carries the *display grouping* — the source need slug (e.g. `heart-health`) or the literal `everyday`. UI groups by `bundleSection`; allocation/sufficiency math still reads `section`.
   - New `priorityTier: 1 | 2 | 3 | null` — the tier of the source need. `null` for `bundleSection === "everyday"` (everyday is intentionally tier-less). The UI reads this directly to render the tier badge on the section heading; **no extra fetch required.** Populated by the builder from each need's `priority_tier` column at item-construction time.

6. **Bundle composition logic:**
   - Resolve all `needSlugs` to need rows; sort by `priority_tier` ascending.
   - For each need, pull active products via `need_product_rules`; track which need each candidate came from.
   - **Budget allocation across needs:** weight by tier — Tier 1 gets 60%, Tier 2 gets 35%, Tier 3 gets 5%. Within a tier, split equally across selected needs in that tier. (No Tier 3 needs in v1, but the math should handle it cleanly.)
   - **Everyday slot:** when `includeEveryday=true`, reserve `min(10% of budget, $15)` for `is_everyday_essential = true` products. **Source these directly via `select * from products where is_everyday_essential = true and active = true`** — they don't go through `need_product_rules`. Pick highest-coverage / lowest-priced until the slot fills.
   - Each picked product carries the source need's slug as `bundleSection`, or `"everyday"` for the essentials slot.

7. **Essentials-only path:** when `needSlugs.length === 0` and `includeEveryday=true`, the builder skips need-rules entirely and produces a bundle whose items all have `bundleSection = "everyday"`, `priorityTier = null`, and primary `needSlug = "everyday"`.

8. **Deterministic tie-break for product ordering.** Within any allocation pass (per-tier, per-need, or essentials), when products tie on the primary scoring signal, break ties by `priceCents` ascending, then `sku` ascending. This stability is what makes the goals-equivalence test (#12 in acceptance criteria) reliable — never let scoring nondeterminism leak into ordered output.

## API contract changes

### `app/api/bundles/generate/route.ts`

Update the zod request schema:

```ts
{
  budgetCents: number,
  cadence: 'monthly' | 'quarterly',
  needSlugs?: string[],          // new: preferred field
  needSlug?: string,             // deprecated: still accepted for back-compat
  includeEveryday?: boolean,     // new: defaults to true server-side if omitted
  qualifierAnswers?: ...,        // existing from Phase 1 spec
  variantSelections?: ...,       // existing from Phase 1.5 spec
  // ...
}
```

**Schema validation union rule:** at least one of these must be true, otherwise the request is rejected:
- `needSlugs` is non-empty array, **OR**
- `needSlug` (legacy singular) is a non-empty string, **OR**
- `includeEveryday === true`

If none are satisfied, return `{ error: "Validation failed" }` with status `400`. (You can build an "essentials only" bundle without picking any need, which is why `includeEveryday` alone is a valid request.)

The current `GenerateSchema` has `needSlug: z.string().min(1)` — relax this to `.optional()` and add the union via `.refine()` or a discriminated check after `safeParse`.

**`variantSelections` is deferred.** Earlier drafts mentioned passing it through. **Do not include it in `GenerateSchema` or the builder input in this PR.** It's a Phase 1.5 concept — leave the schema clean to avoid drift between the brief and what the runtime accepts. When variants ship, that PR adds the field.

### HTTP status discipline

To keep error responses honest without leaking internals, branch by error class:

| Condition | Status | Body |
|---|---|---|
| Body fails zod validation (shape, types, union rule) | `400` | `{ error: "Validation failed" }` |
| Slug is well-formed but unknown (after alias resolution, no matching `needs` row) | `400` | `{ error: "Validation failed" }` |
| Builder throws unexpectedly (DB error, internal bug) | `500` | `{ error: "Bundle generation failed" }` |
| Empty bundle result (no eligible products at all) | `200` with empty array | (current behavior — don't break) |

```ts
catch (e) {
  console.error("bundle generate failed");          // generic literal, no interpolation
  return NextResponse.json(
    { error: "Bundle generation failed" },
    { status: 500 }
  );
}
```

No zod issue tree, no `e.message` echoed. Same rule applies to any other route in this PR that touches `needSlugs` or `includeEveryday`.

### `app/(store)/bundles/page.tsx`

The current page bails early with a "Select Your Need" message if `!needSlug`. After this PR:

1. Read `needSlugs` from `searchParams` (split on comma, filter empty).
2. If `needSlugs` is empty and singular `needSlug` is present, wrap it via `[needSlug]`.
3. Apply the **legacy alias map** (see "Legacy URL alias strategy" above) to translate old slugs to canonical ones at request time.
4. Read `includeEveryday` (default `true` if omitted, since the wizard always emits it after this PR).
5. **Bail condition changes** — render the "Select Your Need" message only when `needSlugs.length === 0 && !includeEveryday`. If `includeEveryday=true` with no needs, that's a valid essentials-only request.
6. Pass `needSlugs`, `includeEveryday`, and the rest into `buildBundles()`.

The page stays a Server Component for this PR. Phase 1's client-island refactor (when it lands) handles dynamic re-ranking; this brief doesn't depend on it.

## UI changes on the bundle page (`BundlesList.tsx`)

The current code groups by `BundleItem.section` (`core` / `support` / `maintenance`) using `SECTION_ORDER`. After this PR, **add a parallel grouping by `bundleSection`** without removing the existing `section` data — sufficiency math still reads `section`.

For each bundle:

1. **Primary grouping by `bundleSection`** under labeled headings:
   - `"Your <Need Name>"` for need-derived sections (e.g. *"Your Heart Health"*).
   - `"Everyday essentials"` for `bundleSection === "everyday"` (no tier badge — intentionally).

2. **Tier badge per need-section heading.** Small color-coded pill next to the heading text:
   - 🟢 **Essential** — green pill — `priority_tier = 1`
   - 🔵 **Beneficial** — blue pill — `priority_tier = 2`
   - ⚪ **Comfort** — gray pill — `priority_tier = 3`
   - Everyday section gets **no tier badge**.

3. **Section ordering:** Tier 1 sections first, then Tier 2, then Tier 3 if any. Everyday essentials always renders **last**.

4. **Within a need section, retain the existing `core` / `support` / `maintenance` ordering** as the secondary sort. So a heart-health section reads top-to-bottom: tier badge → core items → support items → maintenance items.

5. **`AddBundleButton` and `CustomizeButton` keep their existing single-`needSlug` props.** Use the **primary need** rule (lowest tier, ties broken by URL order) populated by the builder on `bundle.needSlug`. This keeps cart routing and customize-flow URLs working without prop-shape changes. If you do want to pass the full `needSlugs` array to those components for richer context later, do it as an additive prop — not a replacement.

6. The existing per-bundle subtotal, sufficiency summary, and supply-day notes stay unchanged.

## Other callers — what changes vs. what stays

Cursor's grep surfaced these additional files that reference `needSlug`. Triage:

| File | Action |
|---|---|
| `app/(store)/bundles/page.tsx` | **Update** — read `needSlugs[]`, apply legacy alias map, allow essentials-only path. |
| `lib/bundle-builder.ts` | **Update** — extend types and composition logic per builder section. |
| `app/api/bundles/generate/route.ts` | **Update** — schema union rule, sanitize errors. |
| `app/(store)/bundles/AddBundleButton.tsx` | **Leave** — keeps singular `needSlug` prop, populated from primary-need rule. |
| `app/(store)/bundles/CustomizeButton.tsx` | **Leave** — same. |
| `app/(store)/bundle/[bundleId]/*` | **Leave** for this PR — historical bundles keep their singular slug. |
| `app/api/bundle/create-custom` | **Leave** for this PR — singular slug input still valid for custom bundles. |
| `app/api/cart/bundle` | **Leave** for this PR — uses `bundle.needSlug` (primary). |
| `lib/validators.ts` | **Audit** — if it has a `needSlug` schema referenced from updated routes, extend; otherwise leave. |
| `app/build/actions.ts` | **Audit** — verify it's still wired in the wizard; if not, no-op. |
| `app/(store)/build/BuildWizardForm.tsx` | **Update** — wizard changes. |
| `components/BundlesList.tsx` (if it exists from Phase 1 work, otherwise the bundles page render) | **Update** — bundleSection grouping, tier badges. |

Default rule of thumb: any caller that today reads a singular `bundle.needSlug` and uses it for routing (cart, customize) keeps working because the primary-need rule keeps that field populated. Any caller that today *generates* bundles needs the new shape.

## Acceptance criteria

1. `npm run db:push` applies the new columns cleanly. `npm run db:seed` runs idempotently, performs the slug rename via `UPDATE` (not `DELETE+INSERT`), populates `priority_tier` on every active need and `is_everyday_essential` on the hand-tagged products, and reconciles `need_product_rules` and `product_classes.needId` for renamed/dropped needs.
2. The wizard shows **one** multi-select step labeled "What do you need support with?" with the consolidated need list. Step 4 is gone. `goals` does not appear in the submitted URL.
3. The "Include everyday essentials" toggle appears below the multi-select with the helper text from this brief, defaults to checked.
4. Submitting the wizard with two needs selected and the toggle on produces a `/bundles?needSlugs=heart-health,joint-comfort-mobility&includeEveryday=true&...` URL.
5. The `/bundles` page renders sections grouped by `bundleSection` with correct tier badges (Essential / Beneficial / Comfort), and an "Everyday essentials" section last when items qualify. Within each need section, items still render in `core` → `support` → `maintenance` order.
6. **Backward compatibility — singular needSlug:** Hitting `/bundles?needSlug=heart-health&...` renders identically to `/bundles?needSlugs=heart-health&...`. Explicit test.
7. **Backward compatibility — legacy slug aliases:** Hitting `/bundles?needSlug=blood-sugar&...` (the old slug) produces a valid bundle for the renamed `blood-sugar-support` need. Same for `mobility-fall`, `respiratory`, `sleep-mood`, `cognitive`, `vision-hearing`. Explicit test for at least one alias mapping.
8. **Essentials-only path:** Submitting the wizard with **zero** needs selected but the everyday toggle on produces a valid bundle whose items all carry `bundleSection = "everyday"` and the bundle's primary `needSlug = "everyday"`. Submitting with zero needs and the toggle **off** keeps the submit button disabled with a clear inline note — does not 500 or render a broken state.
9. **Primary-need rule:** A bundle generated from `needSlugs=heart-health,joint-comfort-mobility` has `bundle.needSlug = "heart-health"` (Tier 1 outranks Tier 2). `AddBundleButton` and `CustomizeButton` keep working off that primary slug.
10. **Sanitized errors:** Both validation failures and builder runtime errors return generic messages (`{ error: "Validation failed" }` or `{ error: "Bundle generation failed" }`). No `e.message`, no zod issue tree. Verify by sending a malformed payload and an intentionally-broken builder input.
11. `grep -r "needSlugs\|includeEveryday\|bundleSection" .` shows no occurrences inside `console.*` calls, log statements, or error-response payload construction.
12. **Goals neutralized:** A request with stale `goals=joint-comfort,heart-health` produces the **same ordered list of `(productId, quantity)` tuples** as the same request without `goals`. Compare as ordered tuples (not as sets) to catch any ranking drift. Tie-breaks (price ascending, SKU ascending) ensure determinism — see builder section #8.
13. `npm run build` produces zero new TypeScript errors. No new `any`. No new top-level dependencies.
14. The existing `/bundle/[bundleId]/*` routes still resolve historical bundles by ID (singular `needSlug` flow on those rows is undisturbed).

### Test requirements

Add a new `scripts/test-wizard.ts` and a `"test:wizard": "npx tsx scripts/test-wizard.ts"` entry in `package.json`, **mirroring the `scripts/test-qualifiers.ts` pattern exactly** — same imports, same DB connection setup from `.env.local`, same `node:assert/strict` style, same exit-code conventions. Do not invent a new test harness.

**Test types and their harnesses:**

- **Unit tests** (most of the list below): import `buildBundles` and helpers directly. Use the dev DB seeded by `npm run db:seed`. No HTTP layer.
- **Integration tests** (the two POST tests): wrap the `fetch('http://localhost:3009/...')` calls behind a `SKIP_INTEGRATION` env check, same as `test-qualifiers.ts` does for any HTTP cases. If `SKIP_INTEGRATION=1`, those cases are reported as skipped, not failed. CI / dev can run with the local server up; quick local iterations skip them.

**Cases:**

- **Unit — tier ordering:** given mixed-tier needs, builder output groups items in Tier 1 → 2 → 3 order, Everyday always last.
- **Unit — budget allocation:** $200 quarterly budget, one Tier 1 need + one Tier 2 need + everyday on. Assert Tier 1 section's subtotal > Tier 2 section's subtotal, and Everyday slot subtotal > 0 and ≤ `min(0.10 * budget, 1500)` cents.
- **Unit — primary-need rule:** `needSlugs=["pain-inflammation","heart-health"]` produces `bundle.needSlug = "heart-health"` (Tier 1 wins despite later URL position).
- **Unit — essentials-only:** `needSlugs=[]` + `includeEveryday=true` produces a non-empty bundle, all items `bundleSection="everyday"`, all items `priorityTier=null`, primary `needSlug="everyday"`.
- **Unit — `priorityTier` populated:** for any need-derived item, `priorityTier` matches the `priority_tier` of the source need. For `bundleSection="everyday"`, `priorityTier === null`.
- **Unit — goals ignored:** Two builder calls with identical inputs except one has `goals=["joint-comfort"]` produce **the same ordered list of `(productId, quantity)` tuples**. Use `assert.deepStrictEqual` on the tuple arrays.
- **Unit — deterministic tie-break:** Two builder calls with identical inputs produce byte-identical output (no nondeterminism leaking from scoring ties).
- **Integration — request shape:** POST `/api/bundles/generate` with `needSlugs:["heart-health","pain-inflammation"]` returns a bundle whose items carry `bundleSection` values matching those two slugs (plus possibly `everyday`) and correct `priorityTier` values.
- **Regression — legacy singular:** POST with `needSlug:"heart-health"` returns an equivalent bundle to `needSlugs:["heart-health"]`.
- **Regression — legacy alias:** GET `/bundles?needSlug=blood-sugar` resolves to the renamed `blood-sugar-support` need (asserts at the page-render level via the alias map).
- **Regression — dropped legacy slug fallthrough:** GET `/bundles?needSlug=medication-adherence&includeEveryday=true` falls through to the essentials-only path. With `includeEveryday=false`, hits the bail state.
- **Sanitized errors — validation:** POST a malformed body, assert response body is exactly `{ error: "Validation failed" }` with status `400`.
- **Sanitized errors — unknown slug:** POST `needSlugs:["this-slug-does-not-exist"]`, assert `400` with `{ error: "Validation failed" }`.
- **Sanitized errors — runtime:** Force a builder error (e.g., mock the DB layer to throw, or use a known broken seed condition), assert `500` with `{ error: "Bundle generation failed" }` and **no `e.message` content** in the response.

## Out of scope

- The full **Generic Savings / Brand Premium** badge work from the OTC Smart Shopping transition doc — that's the next push (Push 2 in our earlier discussion).
- The **"Our Pick" preferred partner label** — Push 3 in the earlier discussion.
- Real Ollama-driven need classification or consumer equivalence grouping — Phase 1.6 territory, separate brief.
- Changes to the qualifier engine or variant runtime (Phase 1 / 1.5 specs) — those land separately.
- Tier 3 needs in the merged need list — intentionally none in v1; Tier 3 maps to everyday essentials, not a clinical need slot.
- Persisting selected needs / the everyday toggle to the user's profile — session-scoped only.

## Working notes for the agent

- **One PR, but split into reviewable commits in this order:**
  1. Schema migration + seed (slug renames via UPDATE, `priority_tier`, `is_everyday_essential`, `need_product_rules` reconciliation).
  2. `BundleBuilderInput` + `BuiltBundle` + `BundleItem` type extensions, with the singular `needSlug` shim wiring through.
  3. `buildBundles()` composition rewrite (tier ordering, budget split, everyday reserve, `bundleSection`).
  4. Wizard form + `/bundles` page query parsing + legacy alias map.
  5. `BundlesList` grouping + tier badges.
  6. `GenerateSchema` union rule + sanitized errors.
  7. Tests.
- **Match the existing wizard form style.** No new UI dependencies. Reuse `Button`, `Card`, and existing toggle patterns from the codebase.
- **The legacy alias map lives only in `app/(store)/bundles/page.tsx`.** Don't push it into the builder, the API route schema, or the DB. Runtime code reads canonical slugs only.
- **The wizard stops emitting `goals`.** The builder still tolerates it for legacy callers but does not use it for selection. Don't delete it from `BundleBuilderInput` or `GenerateSchema` — neutralize it semantically only.
- **`section` (core/support/maintenance) and `bundleSection` (need-slug or "everyday") coexist.** `section` drives sufficiency math; `bundleSection` drives display grouping. Don't conflate them.
- **Primary-need rule is deterministic** (lowest tier, ties by URL order). Cart routing depends on this being stable across the same input.
- Before writing any code: re-read the **Non-negotiable constraints** section.
- **If you discover a caller this brief didn't anticipate, stop and surface it before changing it.** Better to extend the brief than freelance the integration.
