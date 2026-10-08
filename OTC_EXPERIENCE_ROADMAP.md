# HealthBenefits.Shop — The OTC Shopping Experience

**What's implemented, what the experience still requires, and the order to build it in**

Prepared: September 2026 · Owner: Mike / Endesign · For: Mike, Peter, Nick

---

## 1. What the experience has to do

A Medicare Advantage member gets an allowance and a catalog. The catalog is organized the way a distributor organizes a warehouse — by section, by SKU, by pack size — and the member is left to translate their own life into it. The predictable outcomes are a cart of whatever looked familiar, a scramble in the last week of the quarter, or an allowance that quietly goes unused.

The job of this experience is to move someone from *"I have $150 and a couple of things I'm managing"* to a configured, budget-fit, reorderable cart — **without ever asking a medical question.**

Everything below is organized around the five functions that requires. Any credible OTC shopping layer has to perform all five; most incumbents perform one or two.

| Function | The member's question | What it takes |
|---|---|---|
| **Translate** | "Where would my thing even be?" | Catalog language → needs a person recognizes |
| **Narrow** | "Which of these forty is mine?" | Need → specific SKU, with no medical questions |
| **Allocate** | "How do I split this across everything?" | A fixed allowance spent on purpose |
| **Reassure** | "Is this actually right?" | Enough supply, no conflicts, fair price |
| **Repeat** | "Do I have to do this again?" | One-tap reorder that survives January |

---

## 2. Where the experience stands today

### Translate — largely built

A non-diagnostic need taxonomy (nine needs plus everyday essentials) sits over a product class hierarchy with an alias layer, so vendor naming drift resolves to one class. A **variant labeling layer** parses size, absorbency with dimensions, compression ranges, scent, and gender out of raw vendor copy, so a dozen near-identical SKUs present as one configurable listing instead of twelve rows of noise — something the source catalogs themselves don't do. A **catalog gate** keeps pet food, fishing supplies, and general retail out of a health shop. **Need-affinity tagging** surfaces genuinely need-relevant items above generic in-category filler, so blood-sugar support returns cinnamon and berberine before it returns a multivitamin.

*The gap: all of this is hand-curated per category. It works beautifully and it doesn't yet scale to a catalog nobody has seen. See §3.*

### Narrow — the model is solved, the coverage isn't

The qualifier system is now a single, documented, two-layer contract:

> **Need-tier qualifiers decide *whether* a product class enters the cart. Class-tier qualifiers decide *which* variant within it.**

A member picks a need; need-tier questions assemble the cart skeleton (do you use insulin, do you already own a meter); class-tier questions resolve each class to one SKU (absorbency, size, style); the solver spends the allowance across the result. Allergies and sensitivities — latex-free, fragrance-free — are the one legitimate cross-tier case and are handled as global exclusion tags evaluated before both layers.

Every question is closed-choice. No free text, no measurements, no diagnosis. **The continence flow is five taps end to end.**

The privacy line is drawn precisely and it's the right line: *capture the product attribute, never the body metric or the condition.* Store `size-l`, not a waist measurement. Store `absorbency-heavy`, not a description of someone's continence. That distinction is what keeps the no-PHI claim literally true rather than rhetorically true, and it holds up against consumer-health statutes — Washington's My Health My Data Act and California's CMIA reach health data *inferred from shopping behavior*, not just clinical records.

*The gap: two of nine needs are modeled to this depth. The rest is volume work against a proven pattern.*

### Allocate — real, and the most under-shown part of the product

The solver is cadence-aware: it knows a 30- vs 90-day period, caps quantities at what a person would plausibly use before the benefit renews, treats durables as one-per-period, and holds a small buffer under the allowance. Multi-need selection drives priority tiers (Essential / Beneficial / Comfort), which order the output; items sort into core, support, and maintenance sections; everyday essentials sit outside the need taxonomy entirely, where they belong.

The scoring stack has a deliberate hierarchy — qualifier fit outranks need affinity, which outranks core-rule membership, which outranks value — so a member's stated fit always beats a merchandising preference.

The **benefit wallet** tracks allowance, prior usage, cart, and remaining, and — importantly — abstracts *where the number comes from*: static, member-entered, API, file, EDI, or computed. That abstraction is the right architecture, because it's what lets the same experience sit on top of a partner who has a real-time API and a partner who sends a nightly file.

### Reassure — computed, but mostly invisible to the member

More is running here than the interface shows:

- **Sufficiency** estimates days of supply per line against the benefit period and labels each undersupplied, rightsized, or oversupplied.
- **Interaction flags** — a controlled five-flag vocabulary covering blood glucose, blood pressure, INR, serotonergic, and renal effects — pull flagged supplements out of automatic recommendations and show a plain-language "confirm with your doctor" notice if a member adds one deliberately. Not clinical advice, not decision support; a guardrail.
- **Price observations** roll up to trimmed-median class statistics — the honest basis for a "here's the equivalent for less" badge.
- **Marination logic** decides hold-versus-substitute when a SKU is out of stock, so a quarterly order arrives complete instead of in four boxes.

*The gap: most of this never reaches the member's screen. Fixing that is the highest-return work in the document.*

### Repeat — the plumbing exists, the hard part doesn't

Subscriptions, shipment scheduling, a pre-shipment notification, and a member response endpoint are wired, with hold-and-ship so an order ships complete. What isn't addressed at all is **January** — see §3.

### The operator layer

Behind the member view: an optimizer policy with partner promotion rules (allowlist, push list, text match, vendor match), guardrails, and an audit trail of who changed what; admin surfaces for products, needs, rules, orders, and visibility. Privacy is enforced in code rather than in policy prose — need selections are never logged, member input is never interpolated into a log line, error responses are sanitized, and selections stay session-scoped.

---

## 3. What the experience still requires

### 3.1 A canonical naming and classification layer — *the central IP*

Everything in **Translate** today is hand-built. To make catalog number five cost what catalog number two cost, six parts have to exist, all running offline and never at member request time:

1. **Classifier** — raw SKU title and description → product class. Rules and alias matching first, language model for the long tail only.
2. **Variant family detector** — find sibling SKUs that belong in one listing by shared stem and divergent axes.
3. **Axis extractor** — pull size, color, absorbency, strength out of variant titles into structured columns, replacing today's runtime text parsing.
4. **Canonical namer** — healthcare-literate family names from a controlled vocabulary ("Graduated Compression Hosiery, Knee-High, 20–30 mmHg").
5. **Canonical descriptor** — family-level copy in one consistent voice: neither distributor retail copy nor clinical jargon.
6. **Human review queue** — approve, reject, or edit anything below a confidence threshold. Non-negotiable for any partner-grade conversation; an unreviewed automated taxonomy is a liability, not an asset.

One judgment worth stating plainly: **this should be built against a real partner's catalog, not the extracts already on hand.** The manual pilots defined what good output looks like; a partner defines what output is actually needed. Building it speculatively risks automating toward the wrong target at the highest cost of anything in this plan.

### 3.2 Consumption profiles — the biggest jump in perceived quality

The solver currently allocates by score and price. It should allocate by **how a need is actually consumed over a period**: a continence bundle that lands around 55% briefs and pads, 12% wipes, 8% skin barrier reads as a care plan. Without profiles, the same budget produces a defensible-but-arbitrary assortment, and anyone with clinical fluency spots the difference immediately.

This is mostly authoring and review work rather than engineering — draft from care literature, have a clinician review, encode per need and period. It is the single change that most improves what a stranger sees in the first thirty seconds.

### 3.3 Surface what's already computed

Sufficiency, price statistics, and coverage math all run and none of it is really visible. The member-facing pieces this unlocks:

- **A coverage meter** — days of supply across the whole cart, not just dollars spent.
- **"$X left, and here's what it buys"** — the remaining allowance framed as options rather than a number.
- **What-if swap previews** — change one item, see budget and coverage move.
- **Equivalence badges** — "the same thing for $6 less," grounded in observed price data rather than assertion.
- **Reason codes** — *why is this in my cart.* Currently an open question of whether to expose these to members or keep them admin-only. **Recommend exposing them.** Explainability is the trust differentiator in a category where members assume they're being upsold, and it's the first question anyone asks in a demo.

Very little of this is new math. It's interface work on top of engines that already run, which makes it the best effort-to-impact ratio available.

### 3.4 Finish the narrowing model across the catalog

Two needs are modeled to full depth. The remaining seven need the same treatment: decide per class whether it requires need-tier branching, class-tier variants, or both, then seed the questions. The pattern is proven and the spec is written; this is volume, not invention.

Alongside it: the **device-local preference layer**, so a returning member sees *"same as last time?"* and re-confirms in one tap. Nothing leaves the device, which keeps the privacy claim intact. It should be built behind a small pluggable interface so a consented, token-keyed server-side store can be swapped in later without a rewrite.

### 3.5 The January problem — the most differentiated feature nobody has built

On January 1, the allowance resets, the plan's covered catalog changes, and some SKUs simply disappear. The incumbent experience makes the member start over from nothing, and that is exactly where engagement silently leaks out of the year.

The experience should carry configuration across that boundary invisibly: preferences and reorder history persist, anything no longer covered is swapped for its nearest equivalent, and the member is told plainly what changed and why. **This is the clearest single demonstration that the shopping layer is a product and not a catalog skin** — and it's worth building before most of §3.4, because it demos in ninety seconds.

### 3.6 Live eligibility — an integration question, not a code question

The wallet abstraction is ready for a live API mode. What's unproven is whether a partner can actually return the full chain — enrollment → benefit offered → **remaining balance** — in real time, rather than just confirming active coverage. Every claim about instant onboarding and no declined checkouts rests on that distinction.

This is answered in one call with a partner's integration team, and it should be answered **before** it appears in front of a prospect. If the answer is "coverage only," the real-time story needs re-underwriting rather than repeating.

### 3.7 The checkout rail

Card processing today is scaffolding for demonstration. Real production checkout runs on the OTC allowance or flex-card rail, not a consumer payment processor. It isn't on the critical path until a partner is real — but it is the one component that cannot be approximated in a live pilot, so it needs to be scoped the moment a pilot becomes likely.

---

## 4. What the market is doing to this priority order

Worth stating because it changes what to build, not just what to say.

OTC coverage fell to **68% of MA enrollees for 2026, from 79% in 2025**. Roughly **70% of plan leaders expect leaner 2027 benefit packages** — up from 40% the prior year — with none forecasting richer, and OTC named specifically among the benefits facing significant degradation. **93% of surveyed plans are currently unprofitable.** And the member-experience lever has weakened structurally: patient experience, complaints and access measures dropped **from weight 4 to weight 2** with the 2026 Star Ratings, and the CY2027 final rule removes eleven measures including two Part C CAHPS measures.

So the proposition is no longer *help members enjoy a generous benefit.* It's:

> **The allowance is shrinking. Make the smaller number do more, and make what it did measurable.**

That reorders this document. **Efficiency per dollar beats breadth of selection.** Consumption profiles, sufficiency, coverage math, and equivalence pricing (§3.2, §3.3) all speak directly to doing more with less — they get *more* valuable as allowances shrink. Catalog breadth speaks to selection, which is exactly what plans are cutting. Build depth, not width.

---

## 5. Build order

**Tier 1 — completes the experience (weeks, highest leverage)**
Consumption profiles · surfacing sufficiency, coverage, and equivalence pricing · member-visible reason codes · the January carry-over · the device-local preference layer.

Together these turn a working demo into something a benefit team would recognize as a care plan. None of them require a partner, a new catalog, or a decision from anyone outside the project.

**Tier 2 — build when a partner asks**
Canonical naming and classification engine · white-label and plan configuration · aggregate insights for a merchandising partner · live eligibility API mode · the card rail.

Each of these is expensive, each is only correct when shaped by a real counterparty's requirements, and each is a strong signal *because* a partner asked for it.

**Tier 3 — not yet**
More source catalogs. Three is already more than any first conversation needs.

**The governing rule:** the experience should be complete and convincing for **two or three needs, at a depth a clinician would recognize** — not shallow across nine. Depth is what gets believed in a demo; breadth is what gets asked about afterward.

---

## 6. The calendar around it

CY2028 benefit designs lock at the **CMS bid deadline, Monday June 7, 2027**. Anything a plan carries into 2028 has to be believed by roughly March 2027, which means evidence has to exist by January. Working back, a pilot needs to be live and instrumented by early spring — which is achievable, and only achievable if Tier 1 is done first and Tier 2 stays partner-triggered.

One practical note: **AEP runs October 15 – December 7.** Plans and vendors are effectively unreachable through that window and into the holidays. It's the right stretch to do Tier 1 work, and the wrong stretch to expect anyone to answer.

---

## 7. Open product decisions

| # | Decision | Note |
|---|---|---|
| 1 | Reason codes: member-visible or admin-only? | Recommend member-visible — explainability is the trust differentiator |
| 2 | Which two or three needs get full care-plan depth first? | Continence and diabetes are furthest along; a third should be chosen for demo value |
| 3 | Push-list ranking: absolute top, or constrained by price guardrails? | Guardrails protect the equivalence-pricing claim; unconstrained ranking quietly undermines it |
| 4 | Does the optimization blend auto-normalize between member outcome and partner adoption? | Affects how defensible the slider is in front of a partner |
| 5 | When does preference storage move server-side? | Device-local through pilot; server-side only token-keyed, opt-in, and after counsel review |
| 6 | Does the canonical naming engine get built in-house or seeded by an external taxonomy provider? | Answer depends on what a partner's catalog actually looks like |

---

## Sources

- [Medicare Advantage health plan outlook for 2027 — HealthScape Advisors](https://www.healthscape.com/insights/medicare-advantage-health-plan-outlook-2027)
- [Bids Are In! What Does 2027 Portend for Medicare Advantage and Part D Enrollees? — Payer Perspectives](https://payerperspectives.substack.com/p/bids-are-in-what-does-2027-portend)
- [CY2027 final rule removes 11 Star Ratings measures — RISE Health](https://www.risehealth.org/insights-articles/article/star-ratings-measure-set-shrinks-cut-point-strategy/)
- [Medicare Advantage Bid Process: Rules, Timeline, and Audits — LegalClarity](https://legalclarity.org/how-the-medicare-advantage-bid-process-works/)
