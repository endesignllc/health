# Phase 1 — Qualifier Rule Engine: Cursor Brief

> **Revision v1.4** — fourth review pass. Adds: concrete integration-test hook options (DI or test-only helper); explicit anti-regression check for baseline bundle output when qualifiers are omitted.
>
> **Revision v1.3** — third review pass. Adds: clearer acceptance-criterion cross-references; explicit Path-A dependency exception; `console.*` ban in qualifier-handling code paths; integration-test determinism via fixed fixture.
>
> **Revision v1.2** — second code-level review pass. Adds: explicit UI-primitive fallback (no new deps required); deterministic test script; sanitized validation-error response rule.
>
> **Revision v1.1** — first code-level review pass. Added: server-shell + client-island architecture for `/bundles`; `BundleItem.productClassId`; composite uniqueness; rule precedence; tag-taxonomy normalization; privacy guard on error payloads/logs; unit + integration test requirements.

## Goal

Add a product-class-scoped qualifier system that lets shoppers refine bundle picks through closed-choice fit/preference questions. Ship the engine end-to-end for **one category — hearing amplifiers** — as proof of the pattern. Every other category (compression, incontinence, mobility, oral care) will follow the same shape in a later phase.

## Non-negotiable privacy constraints

1. **No free-text inputs anywhere.** Only closed-choice options stored in `qualifier_options`.
2. **No persistence of answers keyed to user / session / cart / order.** Answers flow through the request payload only.
3. **No questions about diagnosis, condition, medication, or symptom.** Questions ask about product fit, form factor, or preference only.
4. **No server-side logging of raw answers** outside the request handler's local scope.
5. **Never echo `qualifierAnswers` in error payloads, validation error trees, telemetry, or server logs.** Strip them before any error is returned or logged.
6. **No `console.*` calls in any route handler, server action, or helper that parses `qualifierAnswers`.** This prevents accidental leakage during debugging. Use early returns and typed narrowing instead of log-as-you-go.
7. Any new analytics event must be aggregate only (no user-level linkage). None are required in this phase.

If a task appears to conflict with these, stop and surface it — do not resolve it silently.

## Data model

Add three tables to `db/schema.ts`, following existing conventions (uuid PKs, snake_case columns, `created_at` timestamps, Drizzle relations).

### `qualifier_questions`

| column | type | notes |
|---|---|---|
| `id` | uuid, PK | |
| `product_class_id` | uuid, FK → `product_classes.id`, cascade delete | |
| `slug` | text | **composite unique index on `(product_class_id, slug)`** — not globally unique |
| `prompt` | text, not null | the question |
| `help_text` | text, nullable | optional clarifier |
| `kind` | text, not null | `'single_choice'` in v1; schema allows `'multi_choice'` |
| `sort_order` | integer, default 0 | |
| `active` | boolean, default true | |
| `created_at` | timestamp | |

### `qualifier_options`

| column | type | notes |
|---|---|---|
| `id` | uuid, PK | |
| `question_id` | uuid, FK → `qualifier_questions.id`, cascade delete | |
| `slug` | text | **composite unique index on `(question_id, slug)`** — not globally unique |
| `label` | text, not null | display text |
| `sort_order` | integer, default 0 | |

### `qualifier_rules`

| column | type | notes |
|---|---|---|
| `id` | uuid, PK | |
| `option_id` | uuid, FK → `qualifier_options.id`, cascade delete | |
| `effect` | text, not null | `'hide' \| 'boost' \| 'penalty'` |
| `match_tag` | text, nullable | matches any product whose `tags` array contains this tag |
| `match_product_id` | uuid, nullable, FK → `products.id` | direct match override |
| `weight` | integer, default 0 | magnitude for boost/penalty; ignored for `hide` |
| `created_at` | timestamp | |

Validation: at least one of `match_tag` or `match_product_id` must be set. Enforce in the seed script and in a zod schema used by any admin endpoint (none in this phase).

## Evaluator contract

Create `lib/qualifiers.ts` with a pure, testable evaluator:

```ts
export type QualifierAnswer = {
  questionSlug: string;
  optionSlugs: string[]; // single-choice → length 1
};

export type ProductAdjustment = {
  hidden: boolean;
  scoreDelta: number; // boost positive, penalty negative
};

export async function evaluateQualifiers(params: {
  productClassIds: string[];
  answers: QualifierAnswer[];
  candidateProducts: Pick<Product, "id" | "tags" | "productClassId">[];
}): Promise<Map<string, ProductAdjustment>>;
```

Behavior:

- An option's rules apply only when its slug appears in the answer for its question.
- **Precedence:** apply all `hide` rules across all selected options first. Any product with at least one matching `hide` is marked `hidden = true` and its `scoreDelta` stays at 0. Only then apply `boost`/`penalty` to the remaining (non-hidden) products.
- `boost` adds `weight` to `scoreDelta`; `penalty` subtracts.
- Unknown question/option slugs are ignored silently (forward compat).
- Empty `answers` → every product gets `{ hidden: false, scoreDelta: 0 }`.
- The evaluator does not log, cache, or persist. It takes data in, returns a map.

## Hearing amplifier seed data

Extend `scripts/seed.ts`. If the hearing amplifier product class doesn't exist, create it: slug `hearing-amplifier`, canonical name `Hearing Amplifier`. Then seed:

### Question 1 — `style-preference`

Prompt: **"What style do you prefer?"**  kind: `single_choice`

| option slug | label | rules |
|---|---|---|
| `in_ear` | In-ear | `hide` products tagged `form:bte` |
| `behind_ear` | Behind-the-ear | `hide` products tagged `form:ite` |
| `no_pref` | No preference | — |

### Question 2 — `battery-type`

Prompt: **"Which do you prefer for power?"**  kind: `single_choice`

| option slug | label | rules |
|---|---|---|
| `rechargeable` | Rechargeable | `boost` tagged `power:rechargeable`, weight 10 |
| `replaceable` | Replaceable batteries | `boost` tagged `power:disposable`, weight 10 |
| `no_pref` | No preference | — |

### Question 3 — `easy-controls`

Prompt: **"Do you prefer larger, simpler controls?"**  kind: `single_choice`

| option slug | label | rules |
|---|---|---|
| `yes` | Yes | `boost` tagged `usability:easy_controls`, weight 15 |
| `no_pref` | No preference | — |

### Seed product tags

Ensure at least four hearing amplifier SKUs exist in `scripts/seed.ts` with these tag distributions so gates and scoring are observably different end-to-end:

- Product A: `['form:ite', 'power:rechargeable', 'usability:easy_controls']`
- Product B: `['form:bte', 'power:rechargeable']`
- Product C: `['form:ite', 'power:disposable']`
- Product D: `['form:bte', 'power:disposable', 'usability:easy_controls']`

Use realistic product names/prices consistent with the rest of the catalog.

### Tag taxonomy rules (normalization)

- Tags are stored and matched **case-sensitive, exact-match**.
- Convention: `<namespace>:<value>`, both lowercase, underscores for multi-word values (e.g. `usability:easy_controls`).
- Do not introduce synonyms (`form:in_ear` vs `form:ite`) — pick one form and use it everywhere.
- `qualifier_rules.match_tag` values must match the product `tags` array byte-for-byte. A trailing space will break matching silently.
- If Cursor adds any tag not listed above, document it inline in `scripts/seed.ts` with a one-line comment.

## Integration points (file-by-file)

### `lib/bundle-builder.ts`

1. **Extend the `BundleItem` interface** to include `productClassId: string | null` (products without a class are allowed; the class field may be nullable). Populate it from the `products.product_class_id` column wherever `BundleItem` values are constructed. Downstream consumers that don't need it can ignore it; the client-side qualifier renderer needs it.
2. Extend `buildBundles()` (and any helper that does scoring) to accept an optional `qualifierAnswers?: QualifierAnswer[]`. Before final ranking:
   - Call `evaluateQualifiers()` with the candidate pool and answers.
   - Remove products where `hidden === true` from the candidate pool for that class.
   - Add `scoreDelta` to the existing product score before sorting.
3. Behavior must be unchanged when `qualifierAnswers` is empty or undefined (i.e. the current `/bundles` experience must not regress).

### `app/api/bundles/generate/route.ts`

Extend the zod request schema to include an optional `qualifierAnswers: QualifierAnswer[]`. Validate shape only — never enrich, log, or persist the values.

**Sanitized validation errors (required).** If validation fails on any request that includes a `qualifierAnswers` field, return a sanitized response:

```ts
return NextResponse.json({ error: "Validation failed" }, { status: 400 });
```

Do **not** return a zod issue tree (`z.treeifyError(...)`, `error.flatten()`, `error.issues`, etc.) when the payload contains qualifier answers — those structures echo the input back and would leak closed-choice selections into logs, error trackers, and browser devtools. Applies equally to any other route that accepts `qualifierAnswers`.

### New: `app/api/qualifiers/route.ts`

GET handler, query param `productClassId`. Returns `{ questions: [...], options: [...] }` for active qualifiers on that class. No auth. Cache-safe (no user data). Returns `{ questions: [], options: [] }` for classes without qualifiers.

### New: `components/QualifierPanel.tsx`

Client component. Props: `productClassId`, `answers`, `onChange(nextAnswers)`. Renders a collapsible "Refine this pick" section with a radio-style selection per question and a single **"Just show me options"** button that resets all answers for this class.

**UI primitives — pick one of two paths and note the choice in the PR:**

- **Path A (preferred if you have budget):** add `@radix-ui/react-radio-group` and `@radix-ui/react-collapsible`, then generate shadcn-style wrappers at `components/ui/radio-group.tsx` and `components/ui/collapsible.tsx` matching the existing component style. This is the cleaner long-term choice because later categories (Phase 1.5+) will reuse these.
- **Path B (zero new deps):** implement the collapsible with a `Button` toggle + conditional render, and the radio group as a set of styled `<Button variant="outline">` options with `aria-pressed` for selected state. Accessible, works today, no dependency additions.

Either is acceptable for Phase 1. Do not mix both. Do not introduce any other UI libraries.

### `app/(store)/bundles/page.tsx` — **architecture refactor required**

Today the page is a Server Component that calls `buildBundles()` directly for every render. Qualifier-driven re-ranking needs a client-owned state loop, so the rendering boundary has to move.

Do it as a **server shell + client island**, not a full rewrite:

1. Keep `page.tsx` as a Server Component. It still parses `searchParams`, calls `buildBundles()` for the initial render (preserves SEO, first-paint performance, and the no-qualifier experience), and passes the result into a new client component.
2. Create `components/BundlesList.tsx` (client component, `"use client"`). Props: `initialBundles`, plus the original `BundleParams` needed to refetch (`budgetCents`, `cadence`, `needSlug`, `goals`, `usageIntensity`).
3. `BundlesList` owns:
   - `bundles` state (seeded with `initialBundles`)
   - `qualifierAnswers` state, a map keyed by `productClassId` → `QualifierAnswer[]`
4. For each bundle item whose `productClassId` has active qualifiers, render `<QualifierPanel>` inline under the item card.
5. On qualifier change, POST `/api/bundles/generate` with the original params plus the full `qualifierAnswers` payload, debounced ~300ms. Replace `bundles` state with the response. Show a subtle loading shimmer during the refetch.
6. `AddBundleButton` and `CustomizeButton` continue to work against the current client state (they already receive bundle data as props — they should now receive it from `BundlesList` instead of the server page).
7. The `/api/bundles/generate` response shape must match what `buildBundles()` returns so the client can swap it in without transformation. If the current endpoint returns a different shape, either align it or add a thin adapter in `BundlesList` — do not change the return type of `buildBundles()`.

## Acceptance criteria

1. `npm run db:push` applies the new schema cleanly; `npm run db:seed` inserts the 3 questions, their options and rules, and 4 tagged hearing amplifier products without errors.
2. Composite unique indexes exist: `(product_class_id, slug)` on `qualifier_questions` and `(question_id, slug)` on `qualifier_options`. Verify via the generated Drizzle migration SQL.
3. The four seed hearing amplifier products have exactly the tag sets specified, stored lowercase and byte-exact. A `scripts/seed.ts` assertion or a test must confirm this (no silent typos).
4. A bundle recommendation that includes a hearing amplifier renders a "Refine this pick" panel under that item on `/bundles`.
5. Selecting **"In-ear"** removes all `form:bte` seed products from subsequent renders; **"Behind-the-ear"** removes `form:ite`.
6. With style = "No preference", selecting **"Rechargeable"** ranks Product A or B ahead of C or D; **"Replaceable"** reverses it.
7. With other fields set to "No preference", selecting **"Larger, simpler controls: Yes"** ranks A and D ahead of B and C.
8. The **"Just show me options"** button clears answers for the class and returns the original unfiltered recommendation.
9. The server-shell + client-island refactor is in place: `page.tsx` remains a Server Component for initial render; `BundlesList.tsx` owns state and refetches from `/api/bundles/generate` on qualifier change.
10. `grep -r "qualifier" .` shows **no** writes to `carts`, `cart_items`, `orders`, `subscriptions`, or any user-adjacent table carrying qualifier answers, and **no** occurrences of `qualifierAnswers` in error-response construction or log calls.
11. `npm run build` produces zero new TypeScript errors. No new `any`. **No new top-level dependencies except the optional Path A Radix UI primitives** (`@radix-ui/react-radio-group` and/or `@radix-ui/react-collapsible`) — and those only if Path A is chosen and explicitly called out in the PR description.
12. `/api/qualifiers?productClassId=<hearing-amplifier-uuid>` returns the three questions with their options; an unknown class returns empty arrays, not a 404.
13. `npm run test:qualifiers` exits 0 and runs every unit test plus the one integration test described below.
14. Validation failures on `/api/bundles/generate` for requests containing `qualifierAnswers` return `{ error: "Validation failed" }` — not a zod issue tree. Manually verify by sending a malformed payload and inspecting the response body.
15. **Anti-regression — baseline equivalence.** With `qualifierAnswers` omitted (or empty), `buildBundles()` output for the hearing amplifier fixture set must match the pre-qualifier baseline ordering and contents byte-for-byte. An explicit test case should snapshot or assert this. Any intentional scoring change must be called out in the PR, not absorbed silently.

### Test requirements

This feature is rule-heavy and easy to regress silently. Ship with:

- **Unit tests for `evaluateQualifiers()`** covering: empty answers, single hide rule, single boost, single penalty, hide + boost conflict (hide wins), hide precedence applied before scoring, unknown slugs ignored, products without `productClassId` untouched.
- **One integration test** that calls `buildBundles()` with the hearing amplifier seed data, once without qualifiers and once with `{ style: in_ear }`, asserting the `form:bte` products are absent from the second result and that Product A (`form:ite` + rechargeable + easy-controls) outranks Product C (`form:ite` + disposable) when `battery=rechargeable` is also set.
- **Integration-test determinism.** The integration test must run against a **fixed fixture set of exactly the four seeded hearing amplifier products** (A–D defined above) — not the full catalog. `buildBundles()` currently queries the DB internally, so pick one of these two hook points to avoid fighting existing function boundaries:
   - **Option 1 — dependency injection:** refactor `buildBundles()` to accept an optional `productSource` (function or pre-fetched candidate array). Default behavior unchanged; test passes the fixture in.
   - **Option 2 — test-only helper:** extract the class-scoped scoring/gating logic into a pure helper (e.g. `rankClassCandidates(candidates, qualifierAnswers)`) exported from `lib/bundle-builder.ts`. The test imports the helper directly and feeds it the fixture.

  Either is acceptable. Do not mock the whole DB layer — too brittle. Document the chosen approach in the PR.
- **Add a deterministic test script to `package.json`.** The repo currently has no `test` script. Add `"test:qualifiers": "npx tsx scripts/test-qualifiers.ts"` (or equivalent — the exact runner is Cursor's call, but the script name must be stable). The `test:qualifiers` acceptance criterion in the list above references it by name.
- No new test framework dependencies unless strictly needed. A plain `tsx` script with `assert` from `node:assert/strict` is sufficient for the scope.

## Out of scope

- Qualifiers for any product class other than hearing amplifiers
- Plan configuration, white-label, theming
- Aggregate analytics or dashboards
- Changes to the build wizard, product detail page, cart, or checkout
- Changes to Stripe / subscription flow
- Authenticated profiles or cross-session preference persistence

## Working notes for the agent

- Keep `evaluateQualifiers()` pure. If caching is ever needed, wrap the caller — not the evaluator.
- One Drizzle migration, not three. Run `npm run db:generate` at the end.
- Match existing code style. Don't introduce new lint rules or formatters.
- The bundles page refactor is the trickiest piece — do it in its own commit, before wiring qualifier UI, so the server-shell + client-island split is reviewable on its own.
- If the hearing amplifier product class already exists with a different slug, use it and note the mismatch in the PR description rather than renaming things.
- Before writing any code: re-read this brief's **Non-negotiable privacy constraints** section.
