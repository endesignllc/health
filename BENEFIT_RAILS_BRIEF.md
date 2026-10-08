# Benefit Rails Brief — Multi-Benefit Badging + One-Place Personalization

**For:** Mike & Peter
**Concept owner:** Mike (from Oct 2026 discussion)
**Thesis:** A member's health benefit is really supposed to be *for them*. The shopping experience should know every benefit they hold — not just OTC — route each product to the purse that pays best, and ask for their sizes and preferences exactly once.

---

## 1. The insight, proven by a real plan document

The 2026 Senior Blue (HMO) Summary of Benefits (Highmark BCBS, Western NY) shows one member simultaneously holding **five product-relevant benefits**:

| Benefit rail | Senior Blue 651 value | Product territory |
|---|---|---|
| OTC allowance | **$40/quarter** | cold & cough, dental care items, eye/ear care, incontinence, vitamins |
| Vision / eyewear | **$200/year** allowance | glasses, frames, contacts; readers often OTC-eligible too |
| Hearing (via TruHearing) | 2 aids/year at $499–$799 copay | aids via rail; batteries, cleaning kits, amplifiers often OTC |
| Dental comprehensive | 50% coinsurance to **$2,000/year** | service-based, but adjacent products (denture care, brushes) are OTC |
| DME | 20% coinsurance; **$0 copay compression stockings & diabetic shoes/inserts** | overlaps directly with OTC catalog items |

Two observations that define the product:

1. **The same product can ride different rails.** Compression stockings are a $0 DME item on this plan — but an OTC purchase on another plan, and a cash purchase on a third. Reading glasses can be OTC; prescription glasses are the vision allowance. Hearing-aid batteries are OTC; the aids ride TruHearing.
2. **The rails have wildly different sizes.** This member has $160/year of OTC but $200 of eyewear and $2,000 of dental. A member who burns OTC dollars on something DME would cover at $0 has been failed by the shopping experience. **Routing is the optimization** — "maximize OTC benefit dollars" (the project mission) is achieved as much by keeping ineligible-rail spend *off* the OTC purse as by spending the OTC purse well.

Contrast: the Wholecare D-SNP design (prior research) collapses purses into one flex card ($300/mo SSBCI). So the architecture must handle both shapes: **many small discrete purses** (Senior Blue) and **one combined purse with category rules** (Wholecare/PayForward flex model).

---

## 2. The badge system (UI surface of the eligibility engine)

A badge = "this product is payable from this benefit, on *your* plan." Badges are **plan-config-driven claims, not static tags**.

### Badge taxonomy (v1)

`OTC` · `Vision` · `Hearing` · `Dental` · `DME` · `Food` · `Home Safety` · `SSBCI` — plus a derived state badge: **`$0 for you`** (the strongest message in the system, e.g., DME compression stockings).

### Data model: two layers, cleanly separated

1. **Product → benefit-category eligibility** (universal layer): each product family in the taxonomy carries zero or more benefit-category eligibility facts ("compression hosiery: OTC-eligible, DME-eligible"). This is an **extension of the naming-convention hierarchy** — benefit eligibility becomes an axis on the product family, assigned at the family level by the Assessment Engine (with human review), not per-SKU by hand. This is precisely why the canonical taxonomy exists.
2. **Plan config → rail terms** (plan layer): each plan config declares which rails exist, their amounts/cadence/copays, and category rules. Badges render at the intersection: *family eligibility × member's plan rails*.

Multi-badge products are just families whose eligibility set intersects more than one active rail. The UI shows at most **two badges + overflow** ("OTC · DME +1") — seniors should never parse a badge salad.

### Rail routing (the groundbreaking part)

When a multi-badge product enters the cart, the optimizer assigns a **payment rail**, best-first:

1. $0 rails first (DME items with $0 copay, post-cataract eyewear)
2. Use-it-or-lose-it purses expiring soonest (quarterly OTC before annual allowances)
3. Dedicated purses before the general/flex purse
4. Preserve OTC headroom for products that have *no other rail*

Checkout shows the result in member language: **"Your plan pays $31 of this order. Here's how."** — an itemized rail receipt (OTC $38.50, DME $0-copay stockings, $12 eyewear allowance applied). That one screen is the demo money-shot and nobody in the OTC-portal world shows it.

**Honesty rule:** where a rail is administered by a third party we can't transact against (e.g., TruHearing), the badge still appears but routes to a guided hand-off ("Covered through your hearing benefit — here's how to use it") rather than the cart. Never fake a rail; showing the member their *whole* benefit picture builds trust even when fulfillment is elsewhere, and it's a care-gap/Stars story for the plan.

---

## 3. One-place personalization: the Fit Profile

Today's pattern (ours and everyone's): every sized product makes the member re-answer size questions. Seniors deserve the inverse.

**The Fit Profile is a small, reusable set of person-level facts, captured once, applied everywhere:**

- Sizes: sock/shoe, brief/underwear size, glove size, compression strength once known
- Preferences: unscented, rechargeable over disposable, large-print labels, pull-tab packaging
- Household context (optional, later): "shopping for myself / my spouse too" → two profiles

Mechanics:

- Qualifier answers **write into the profile** (asked once, in context, the first time they matter — not as an upfront form; seniors abandon forms)
- Every variant-configurable listing **reads from the profile** and pre-resolves: "Size M — from your Fit Profile ✎" instead of a picker
- Checkout shows **one consolidated "Your fit" confirmation block** — change size in one place, it propagates to every affected line item
- Reorders inherit the profile silently; a profile edit prompts "update your quarterly order too?"

Privacy posture holds: these are **product facts, not person facts** — "size M brief," never a diagnosis. Same "ask about the product, not the person" frame, now persistent.

This is also a defensibility layer: the profile is cumulative member-specific value that a catalog portal cannot replicate without rebuilding the taxonomy underneath it (profiles only work because variants share canonical axes — size M means the same thing across families; another Assessment Engine dividend).

---

## 4. Senior-first UX principles (non-negotiables for this feature)

1. **One decision per screen.** Rail routing happens silently; the member sees outcomes, not plumbing.
2. **Badges speak benefit language, not insurance language.** "Covered by your OTC allowance," "$0 with your plan" — never "DME 20% coinsurance" on a product card (fine in the receipt detail).
3. **The wallet is always visible** — purses, balances, and expiry ("$40 resets Jan 1 — 12 days") on every page, not buried in an account screen.
4. **Nothing is retyped.** Fit Profile means sizes are typed once per lifetime, not once per order.
5. **Every auto-decision is reversible in one tap** ("paying with: OTC allowance ▾").

## 5. Build sequence (consultant's recommendation)

| Phase | Scope | Why first |
|---|---|---|
| R1 | Benefit-eligibility axis on product families + plan-config rails + badge rendering (Laurel demo plan gets Senior-Blue-shaped rails as a second config) | Proves the two-layer model; immediately feeds the PayForward demo — "one platform, two very different plan shapes" |
| R2 | Rail routing in cart + the "Your plan pays $X" receipt | The demo money-shot; needs R1 |
| R3 | Fit Profile v1 (sizes from existing qualifier/variant axes; checkout consolidation) | Highest member-love per engineering hour; variant infrastructure already exists |
| R4 | Third-party rail hand-offs (TruHearing-style) + SSBCI flex purse rules | Completeness; needed before any real plan pilot |

Catalog work alongside R1: tag the existing Medline-derived families for OTC/DME/Vision/Hearing/Dental eligibility — start with the ~10 need areas already live, using the audit-script pattern.

## 6. Open questions for Mike & Peter

1. **Rail data at member level:** in a PayForward integration, purse balances come from their platform. For the standalone demo we simulate. Is simulated-balance fidelity enough for the Vijay demo, or do we want a "bring your own balances" admin toggle for live working sessions?
2. **DME claim reality:** DME items at $0 copay normally require supplier billing. Do we show DME rails in v1 as *guidance* ("ask your provider — $0 through your plan") or model fulfillment-partner DME billing as a later capability?
3. **Badge vocabulary:** test with real seniors whether "allowance," "benefit," or "your plan pays" wins. Cheap test, big copy payoff.
