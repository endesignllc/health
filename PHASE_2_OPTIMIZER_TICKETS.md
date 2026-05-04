# Phase 2 - Optimizer Controls + Partner Policy

Build-ready ticket set for adding a single global optimization slider and flexible partner-promotion controls to `HealthBenefits.Shop`.

## Confirmed Product Decisions

- One global slider for optimization blend in MVP.
- Slider must support a blend between member-outcome optimization and partner-adoption optimization.
- Partner-promotion criteria must support:
  - Uploaded allowlist of SKU/item numbers.
  - Explicit push list of SKU/item numbers.
  - Blanket rule matching products with "Medline" in title/description (and vendor where available).
- Initial category focus: `incontinence`, `mobility`, `diabetes`.
- Confidence threshold policy is deferred but must be designed as configurable policy, not hardcoded.

## Scope and Architecture

- Keep storefront and ranking in `HealthBenefits.Shop` for MVP.
- Add a policy layer consumed by `lib/bundle-builder.ts`.
- Add admin controls under `app/admin/rules/page.tsx` (or adjacent admin pages).
- Keep request contract in `app/api/bundles/generate/route.ts` stable for shopper flows.
- Implement policy auditability (who changed what, when).

## Implementation Context (Current Stack)

- Frontend and API: Next.js App Router (routes under `app/*`).
- Language/runtime: TypeScript on Node.
- Data layer: Neon Postgres + Drizzle ORM (`db/schema.ts`, `drizzle/*`).
- Ranking engine: `lib/bundle-builder.ts` (already qualifier-aware).
- Qualifier logic: `lib/qualifiers.ts` and `app/api/qualifiers/route.ts`.
- Admin UI baseline: `app/admin/rules/page.tsx` and `app/admin/layout.tsx`.
- Request entry point for recompute: `app/api/bundles/generate/route.ts`.
- Scripts and deterministic test pattern: `scripts/*` (notably `scripts/test-qualifiers.ts`).

## Epic-to-File Mapping (HealthBenefits.Shop)

- **Epic 0 (baseline + flags)**
  - `lib/bundle-builder.ts`
  - `scripts/test-qualifiers.ts` (pattern reference)
  - `scripts/test-optimizer-baseline.ts` (new)
  - `package.json` (new `test:optimizer-baseline` script)
- **Epic 1 (policy schema + seed)**
  - `db/schema.ts`
  - `drizzle/*` migration SQL
  - `scripts/seed.ts`
  - `lib/db.ts` (if helper access patterns are needed)
- **Epic 2 (policy-aware scoring)**
  - `lib/optimizer-policy.ts` (new)
  - `lib/bundle-builder.ts`
  - `app/api/bundles/generate/route.ts`
- **Epic 3 (admin controls)**
  - `app/admin/rules/page.tsx` (extend) or `app/admin/optimizer/page.tsx` (new)
  - `app/admin/layout.tsx` (nav link updates if new page added)
  - `app/api/admin/*` policy routes (new, if split by concern)
- **Epic 4 (criteria processing + precedence)**
  - `lib/optimizer-policy.ts`
  - `scripts/*` CSV parsing helper (new or shared utility)
- **Epic 5 (guardrails + explainability)**
  - `lib/optimizer-policy.ts`
  - `lib/bundle-builder.ts`
  - `app/api/bundles/generate/route.ts`
- **Epic 6 (tests + rollout)**
  - `scripts/test-optimizer.ts` (new)
  - `package.json` (`test:optimizer`)
  - CI config (where existing test scripts are invoked)

## Epic 0 - Baseline + Guardrails (required first)

### Ticket E0-1: Snapshot current ranking behavior

**Goal**
Create deterministic baseline outputs before optimization changes.

**Implementation Notes**
- Add a deterministic script test for bundle ranking behavior with fixed fixture inputs.
- Reuse pattern from `scripts/test-qualifiers.ts`.

**Acceptance Criteria**
- `npm run test:optimizer-baseline` exists and exits `0`.
- Test captures baseline ordering/subtotals for at least one need slug per target category.

### Ticket E0-2: Add optimizer feature flags

**Goal**
Allow safe rollout and rollback of phase 2 behavior.

**Implementation Notes**
- Add global config flag(s): `optimizer_policy_enabled`, `partner_policy_enabled`.
- Gate new scoring logic behind flags.

**Acceptance Criteria**
- With flags off, output from `buildBundles()` is byte-equivalent to current behavior for same inputs.

## Epic 1 - Data Model for Policy Controls

### Ticket E1-1: Add policy tables

**Goal**
Persist global optimizer settings and partner criteria.

**Schema Additions (proposed)**
- `optimizer_policies`
  - `id` (uuid pk)
  - `name` (text)
  - `active` (boolean)
  - `outcome_weight` (integer 0-100)
  - `partner_weight` (integer 0-100)
  - `require_price_competitiveness` (boolean default true)
  - `max_price_delta_pct` (integer nullable, e.g. 20)
  - `enforce_locked_qualifier_fit` (boolean default true)
  - `created_at`, `updated_at`
- `partner_promotion_rules`
  - `id` (uuid pk)
  - `policy_id` (fk optimizer_policies.id, cascade)
  - `rule_type` (`allowlist`, `push_list`, `contains_text`, `vendor_match`)
  - `priority` (integer, lower executes first)
  - `enabled` (boolean)
  - `payload` (jsonb)
  - `created_at`, `updated_at`
- `optimizer_policy_audit_log`
  - `id` (uuid pk)
  - `policy_id` (fk optimizer_policies.id)
  - `actor` (text)
  - `change_summary` (jsonb)
  - `created_at`

**Acceptance Criteria**
- Drizzle schema compiles and migrates cleanly.
- Exactly one active policy is enforced at runtime.
- Audit row written on policy change.

### Ticket E1-2: Seed default MVP policy

**Goal**
Ensure local/dev/prod have a safe default.

**Default Proposal**
- `outcome_weight = 70`
- `partner_weight = 30`
- `require_price_competitiveness = true`
- `max_price_delta_pct = 20`
- Partner rules:
  - Contains `medline` (title/description/vendor) as low-priority candidate boost.

**Acceptance Criteria**
- `npm run db:seed` creates one active policy.
- App runs without manual policy setup.

## Epic 2 - Ranking Engine Integration

### Ticket E2-1: Add policy-aware scoring module

**Goal**
Centralize new scoring behavior.

**Implementation Notes**
- Create `lib/optimizer-policy.ts`:
  - `getActivePolicy()`
  - `scoreProductWithPolicy(product, context, policy)`
  - `evaluatePartnerPromotion(product, policyRules)`
- Keep pure scoring where possible for testability.

**Acceptance Criteria**
- Unit tests validate weight blending and rule precedence.
- Unknown/malformed rules fail closed (no boost) and do not crash bundle generation.

### Ticket E2-2: Integrate into `buildBundles()`

**Goal**
Apply blended optimization in all candidate ranking passes.

**Implementation Notes**
- Update scoring segments in `lib/bundle-builder.ts`:
  - rule-driven core pass
  - support pass
  - maintenance pass
- Preserve existing qualifier adjustments:
  - hide rules still take precedence.
  - policy boosts/penalties only apply to visible candidates.

**Acceptance Criteria**
- Existing qualifier tests still pass.
- New tests demonstrate slider impact (same input -> different ordering at low vs high partner weight).

### Ticket E2-3: Add rationale metadata in response

**Goal**
Support explainability and debugging.

**Implementation Notes**
- Optional response enrichment from `app/api/bundles/generate/route.ts`:
  - `policyVersion`
  - per-item scoring reasons (lightweight summary fields only).

**Acceptance Criteria**
- Response includes policy identifier/version when policy flags are enabled.
- No sensitive qualifier input is echoed in errors/logs.

## Epic 3 - Admin Controls (Single Global Slider)

### Ticket E3-1: Slider + guardrails UI

**Goal**
Allow non-engineering users to manage policy.

**Implementation Notes**
- Extend `app/admin/rules/page.tsx` or add `app/admin/optimizer/page.tsx`.
- Controls:
  - single slider 0-100 (`member outcomes <-> partner adoption`)
  - price competitiveness toggle
  - max price delta input
  - save + activate policy

**Acceptance Criteria**
- Updating slider persists to active policy.
- Bundle recomputation reflects new weights without redeploy.

### Ticket E3-2: Partner criteria manager

**Goal**
Support all requested rule modes.

**Implementation Notes**
- Admin supports:
  - CSV upload of SKU/item allowlist.
  - explicit ordered push list editor.
  - blanket text rule ("medline" contains match).
- Show effective precedence order in UI.

**Acceptance Criteria**
- Upload validates bad rows and reports rejected SKUs.
- Ordered push list executes before allowlist.
- Blanket "medline" rule can be enabled/disabled independently.

### Ticket E3-3: Audit panel

**Goal**
Operational trust and CMS-readiness.

**Implementation Notes**
- Add read-only table of policy changes from `optimizer_policy_audit_log`.

**Acceptance Criteria**
- Every admin save emits exactly one audit row with changed fields.

## Epic 4 - Partner Rule Processing Pipeline

### Ticket E4-1: Normalize matching inputs

**Goal**
Reliable matching for SKU/item/title/description/vendor.

**Implementation Notes**
- Add shared normalizer for case/whitespace.
- Prefer exact matching for SKU/item id lists.
- Use contains/regex only for explicit rule types.

**Acceptance Criteria**
- Unit tests for case-insensitive matching and false-positive prevention.

### Ticket E4-2: Rule precedence and conflict handling

**Goal**
Deterministic outcomes when multiple rules match.

**Precedence Proposal**
1. Explicit block (future-safe; if added later)
2. Push list
3. Allowlist
4. Blanket contains/vendor
5. Baseline ranking

**Acceptance Criteria**
- Test coverage confirms deterministic precedence for overlapping matches.

## Epic 5 - Compliance + Trust Guardrails

### Ticket E5-1: Price competitiveness guardrail

**Goal**
Prevent partner boost from surfacing clearly worse-value items.

**Implementation Notes**
- Compare candidate vs class/category local low price (or min in current candidate set).
- If above threshold, suppress partner boost.

**Acceptance Criteria**
- Guardrail blocks boost when item exceeds configured delta.
- Admin can tune threshold without code changes.

### Ticket E5-2: Explainability strings

**Goal**
Provide transparent recommendation reasons.

**Implementation Notes**
- Add internal reason codes:
  - `need_match`
  - `value_price`
  - `partner_policy_match`
  - `qualifier_fit`
  - `guardrail_limited`

**Acceptance Criteria**
- Each recommended line has at least one reason code.

## Epic 6 - Test Plan and Rollout

### Ticket E6-1: Test suite additions

**Goal**
Prevent silent ranking regressions.

**Required Tests**
- Unit:
  - weight blending behavior
  - partner rule parsing/matching
  - precedence conflicts
  - guardrail suppression behavior
- Integration:
  - `buildBundles()` with policy off vs on
  - slider low/high scenarios
  - all three partner criteria modes
  - no qualifier answer leakage in validation errors

**Acceptance Criteria**
- Add script: `test:optimizer`.
- CI includes `test:optimizer` alongside existing tests.

### Ticket E6-2: Staged rollout playbook

**Goal**
Control production risk.

**Rollout Steps**
1. Deploy with flags off.
2. Enable read-only admin UI in production.
3. Activate policy at conservative defaults.
4. Monitor bundle deltas and complaints.
5. Adjust slider/guardrails gradually.

**Acceptance Criteria**
- Rollback documented: set feature flags off and revert to baseline ranking immediately.

## Implementation Sequence (recommended)

1. Epic 0 baseline and flags.
2. Epic 1 schema + seed.
3. Epic 2 scoring integration.
4. Epic 6 tests wired in parallel with Epic 2.
5. Epic 3 admin UI + audit.
6. Epic 4/5 hardening and rollout controls.

## Suggested Ticket Breakdown for Sprint Planning

- Sprint A (foundation): E0 + E1 + E2-1
- Sprint B (runtime): E2-2 + E2-3 + E6-1
- Sprint C (admin): E3-1 + E3-2 + E3-3
- Sprint D (hardening): E4 + E5 + E6-2

## Open Decisions (carry into backlog grooming)

- Whether slider should auto-normalize weights (`outcome + partner = 100`) or allow independent entry.
- Whether push list should be absolute top rank or constrained by price guardrails.
- Whether matching should include `products.vendor` for "Medline" blanket rule by default.
- Whether to expose recommendation reason codes to members or keep admin-only in MVP.
