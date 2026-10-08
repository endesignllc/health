# Cursor Prompt — PayForward Demo Sprint (Assess, then Build)

Copy everything below the line into Cursor as the working brief. Companion docs in repo root: `PAYFORWARD_DEMO_BRIEF.md` (demo script + Laurel plan spec), `CATALOG_SOURCES.md` (Fieldtex parse assessment), `BENEFIT_RAILS_BRIEF.md` (context only — NOT in scope this sprint).

---

## Mission

We are producing a partner demo of HealthBenefits.Shop skinned as a fictional Medicare Advantage plan ("Laurel Complete Care"), showing one scripted member moment end-to-end on the **real app** with **real catalog data**. Deadline-driven: working demo > elegant code, but no refactors and nothing that destabilizes existing flows. Read `PAYFORWARD_DEMO_BRIEF.md` §2–3 first — the demo script is the acceptance test for this entire sprint.

## Phase 0 — Assessment (do this first, report before writing code)

Produce a short written assessment (`DEMO_SPRINT_ASSESSMENT.md`) answering:

1. **Theming/plan-config readiness.** What exists today for per-plan configuration (branding, budget amounts, copy)? Is there any config layer, or are budgets/branding hardcoded in the wizard and layout? Smallest viable path to a "plan config" object (name, logo, color tokens, wallet structure, budget tiers, category exclusions) that the (store) routes consume — env-switched or DB-backed, whichever is less invasive.
2. **Wallet UI readiness.** Current state of `BenefitWalletCard`, `BenefitWalletChip`, `BudgetMeter`, and the `test:benefit-wallet` script's model. Can the wallet render: purse labels, a monthly $300 allowance, and an "expires in N days" banner with config-only or minor changes?
3. **Demo-need data quality.** Run the existing audit tooling (`audit:variant-label-coverage`, the categorization audit pattern from the bladder-support fix) against **bladder support** and whatever need is closest to **home safety / fall prevention**. Report: does a fall-prevention-shaped need exist in the wizard at all, and what products back it? If none exists, what's the smallest way to add one need definition backed by existing + newly imported products?
4. **Fieldtex import fit.** Review `scripts/extract-medline-pdf-catalog.ts`, `scripts/extract-pdf-images-and-map.ts`, `scripts/import-merged-pdf-catalog.ts`. Confirm the cleanest way to add a second extractor profile for `formulary2024_OTC.pdf` (layout facts in `CATALOG_SOURCES.md` → "Parse assessment": 3-column grid, image-per-cell, 5-digit codes with N-suffix generics, `Category Item Limit: N Per Quarter` headers, prices present but to be ignored for display). Flag schema gaps: per-category quarterly quantity limits, a `sourceCatalog` tag, benefit-eligibility tags on product families.
5. **Badge surface.** Where product cards render (store + bundle views): cheapest insertion point for 1–2 small benefit badges per card driven by (a) a static family→benefit-eligibility map and (b) the plan config's active rails. No routing logic — display only.
6. **Risk list.** Anything in the current build (broken needs, dead images, checkout surfaces) that could appear on camera during the scripted demo path, with the cheapest way to keep each off-screen.

Stop after Phase 0 and review the assessment with Mike before proceeding.

## Phase 1 — Build (in this order, each independently shippable)

1. **Fieldtex extractor profile + import.** New script following the existing extractor pattern → products, images, categories, quarter-limits into the merged-catalog pipeline. Tag all rows `sourceCatalog: fieldtex2024`. Do NOT import catalog prices as display prices; keep existing pricing sources authoritative.
2. **Plan config layer (minimal) + Laurel theme.** One config: `laurel-complete-care` — name, laurel logo asset (placeholder SVG fine), navy/sky/coral tokens, wallet = $300/month combined purse (labels: OTC & Everyday Essentials · Home & Bathroom Safety · Food · Utilities), budget tiers mapped to existing wizard tiers, cadence monthly. Default config = current HBS branding so nothing changes for existing routes unless the Laurel config is active.
3. **Wallet expiry urgency.** "$300 this month — expires in 9 days" banner on the wallet/budget meter, driven by config (fixed demo date is fine; no real date math required beyond days-remaining display).
4. **Two demo needs, audited clean.** Bladder support + fall prevention/home safety return correct, well-imaged products with variant labels at the $300 tier. Fix data, not engine.
5. **Badges v1 (display only).** `OTC`, `Home Safety`, and derived `$0 for you` on a hand-curated compression-stocking family. Max two badges + "+1" overflow per card. Senior-readable copy: "Covered by your OTC allowance", "$0 with your plan".
6. **Demo-path hardening.** Checkout stops at cart review for the Laurel config (no Stripe screen reachable in the scripted path); admin and non-demo needs stay out of nav if they're not clean.

## Hard non-goals this sprint

- No rail-routing engine, no payment-rail math (receipt screen is produced OUTSIDE the app as static frames)
- No Fit Profile
- No Stripe/checkout changes beyond hiding it in the Laurel path
- No schema refactors beyond additive columns/tables
- No visual redesign of existing components — theme tokens only

## Acceptance test

Walk the `PAYFORWARD_DEMO_BRIEF.md` §3 script as Margaret at the $300 wallet: every screen in steps 1–4 (wallet → goals → qualifiers → bundle) renders with Laurel branding, real products, real images, correct badges, zero broken cards, on the gated deployment. Record nothing until that walk is clean twice in a row.
