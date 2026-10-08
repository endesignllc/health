# Demo Sprint Assessment — Phase 0

**Assessed:** October 8, 2026  
**Sprint brief:** `CURSOR_DEMO_SPRINT.md`  
**Demo script:** `PAYFORWARD_DEMO_BRIEF.md` §3

---

## 1. Theming / Plan-Config Readiness

**Current state:** No plan-config layer exists. All branding is hardcoded:

| Element | Location | Current Value |
|---------|----------|---------------|
| Logo | `components/SiteLogo.tsx` → `/branding/logo.svg` | HealthBenefits.Shop wordmark |
| Colors | `app/globals.css` CSS variables | Clinical blue (--primary: 203 83% 31%) |
| Budget tiers | `app/(store)/build/page.tsx` BUDGET_OPTIONS | $25, $50, $100, $150, $300 |
| Wallet label | `lib/benefit-wallet/config.ts` env | "OTC Benefit" or "Your benefit" |
| Site name | Hardcoded strings | "HealthBenefits.Shop" |

**Path forward:** Create `lib/plan-config/` with:
- `PlanConfig` type (slug, name, logo, colors, wallet purses, need aliases, category exclusions)
- Env-switched resolution (`PLAN_CONFIG=laurel-complete-care`)
- Layout injection of CSS variables + logo swap

**Effort:** 1–1.5 days

---

## 2. Wallet UI Readiness

**Current state:**

| Feature | Status |
|---------|--------|
| `BenefitWalletChip` (header) | Exists, single-purse |
| `BenefitWalletCard` (detail) | Exists, single-purse |
| `BudgetMeter` | Exists |
| Static profile via env | Works |
| Monthly $300 | Supported (config) |
| Expiry urgency | **Missing** |
| Multi-purse | **Missing** |

**Changes needed:**
- Add `periodEndDate`, `expiresInDays` to `BenefitWalletSnapshot`
- Add `purses: Array<{ label, allowanceCents, usedCents }>` for real multi-purse
- Render expiry banner ("expires in 9 days")
- Render purse breakdown in wallet card

**Effort:** 1 day (real multi-purse model per decision)

---

## 3. Demo-Need Data Quality

### Bladder Support
- **Slug:** `bladder-support`
- **Qualifiers:** Yes (support-type, skin-protection, absorbency, size)
- **Product classes:** bladder-pads, protective-underwear, underpads, skin-barrier-cream, cleansing-wipes
- **Status:** Ready

### Home Safety / Fall Prevention
- **Slug:** `joint-comfort-mobility`
- **Display name:** "Joint Comfort & Mobility" (needs alias to "Staying Steady at Home" for Laurel)
- **Products with safety tag:**
  - Shower Chair ($49.99)
  - Bedside Rail ($34.99)
  - Motion Night Light ($12.99)
  - Non-Slip Mat ($14.99)
  - Reacher Grabber ($19.99)
- **Status:** Exists but needs display alias; product depth improved by Fieldtex import

**Fix:** Plan-config need display aliases (decision: Laurel only, not global)

---

## 4. Fieldtex Import Fit

**PDF:** `product-catalog/source-pdfs/formulary2024_OTC.pdf` (13.7 MB, 78 pages)

**Parse assessment (from CATALOG_SOURCES.md):**
- Native text layer — no OCR
- 3-column grid, one product per cell
- 5-digit item codes (N-suffix = generic)
- Category headers: "Category Item Limit: N Per Quarter"
- 583 embedded images (577 product shots, 342×342 JPEG)
- Image↔product mapping by column x-range + row proximity

**Pipeline work:**
1. New extractor profile (`--profile fieldtex` or separate script)
2. Parse rules: category quarter-limits, N-suffix generic
3. Column-based image mapping
4. Tag rows `sourceCatalog: fieldtex2024`
5. Do NOT import prices (structure only)

**Schema additions:**
- `products.sourceCatalog` (text, nullable)
- `products.quarterlyLimit` or class-level (integer, nullable)

**Effort:** 1–1.5 days

**Decision:** Import now (adds home-safety depth for demo bundle)

---

## 5. Badge Surface

**Product card locations:**

| View | File | Line |
|------|------|------|
| Bundle list | `components/BundlesList.tsx` | ~315 |
| Bundle editor | `app/(store)/bundle/[bundleId]/page.tsx` | item loop |
| Cart | `app/(store)/cart/page.tsx` | ~87 |
| Product detail | `app/(store)/products/[id]/page.tsx` | near price |

**Implementation:**
- `<ProductBadges productId planConfig />` component
- Looks up product → class → benefit-eligibility tags
- Filters by plan config's active rails
- Renders 1–2 badges + "+N" overflow

**Badge copy:**
- OTC → "Covered by your OTC allowance"
- Home Safety → "Covered by your Home Safety allowance"
- $0 → "$0 with your plan"

**Effort:** 4 hours (display-only with static eligibility map)

---

## 6. Risk List

| Risk | Mitigation |
|------|------------|
| Stripe checkout visible | Demo script stops at cart review (decision: button visible, not clicked) |
| Admin nav reachable | Already gated by `ADMIN_TOKEN` cookie — not in demo path |
| Broken/empty needs in wizard | Plan config filters visible needs to audited ones |
| Missing product images | Audit demo products; Fieldtex import includes images |
| "Demo allowance" badge | Remove `showDemoBadge` for Laurel config |
| HealthBenefits.Shop branding | Plan config overrides in layout |

---

## Decisions Made

| Item | Decision |
|------|----------|
| Multi-purse model | Real (separate balances per purse) |
| Fieldtex import | Now |
| Need rename scope | Laurel config only |
| Checkout handling | Script stops at cart review |

---

## Phase 1 Build Order

| # | Task | Effort | Status |
|---|------|--------|--------|
| 1 | Plan config layer + Laurel theme | 1.5 days | Starting |
| 2 | Real multi-purse wallet model | 1 day | Pending |
| 3 | Wallet expiry banner | 3 hours | Pending |
| 4 | Fieldtex extractor + import | 1.5 days | Pending |
| 5 | Demo needs audit + alias | 2 hours | Pending |
| 6 | Badges v1 (display-only) | 4 hours | Pending |
| 7 | Demo hardening (filter wizard needs) | 2 hours | Pending |

**Acceptance test:** Walk Margaret script at $300 Laurel wallet, clean twice in a row.
