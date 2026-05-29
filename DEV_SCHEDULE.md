# Health Benefits Shop — Development Schedule

**For:** Peter
**From:** Mike / Endesign
**Status:** Live preview at healthbenefits.shop, May 2026
**Refresh cadence:** updated after each stage completes

---

This is the rough development sequence for the platform described in your April architecture doc, broken into stages that each ship something visible. Timing assumes continued cadence and no major scope changes. The whole sequence targets a procurement-grade Medline conversation by mid-summer.

The piece I texted you about last week — *"an LLM setup that will work on this while we're sleeping to build this product naming hierarchy"* — is **Stage C** below. That's the Assessment Engine in your architecture doc; it's the largest single piece of work and the central piece of IP. Everything before it is groundwork; everything after assumes it's running.

## Where we are right now

Live preview at **https://healthbenefits.shop** is shipping the foundation:

- Google sign-in with allowlisted access (you, me, and anyone we add)
- "What matters to you?" multi-need wizard with $25 / $50 / $100 / $300 budgets + monthly/quarterly cadence
- Bundle output grouped by need with Tier 1 / Tier 2 / Tier 3 badges per your architecture doc
- "Everyday essentials" as a separate, tier-less section
- Variant detail (size / fit) now visible on simple-SKU cards so duplicates differentiate
- Cart, customize, checkout flow wired end-to-end (Stripe in test mode)
- Privacy posture: no PHI, no diagnosis logging, no third-party trackers

Known broken: bladder-support bundle currently pulls miscategorized items. Fix is queued for this week (Stage A item 1).

---

## Stage A — Visible polish for the demo (this week, 1–2 weeks)

Small, independently-shippable improvements that fix the headline issues a partner would spot in five minutes and add the most distinctive visual elements from your architecture doc.

| Item | Effect | Effort |
|---|---|---|
| Bladder-support categorization fix | Bladder bundle returns actual incontinence products instead of denture cleansers. Validates the "consumer equivalence layer" thesis. | ~1 hour, brief already written |
| Audit + fix for the other 8 needs | Same shape of fix repeated. We've built a reusable audit script. | ~1 day across all needs |
| $150 budget option + improved Step 1 copy | Aligns with the most common D-SNP allowance tier (~$150/quarter). | 10 min |
| "Our Pick" preferred-partner labels on Medline SKUs | Demonstrates the partner ranking framework from your doc without committing to a full algorithm yet. | ~1 hour |
| Generic savings badges ("Save $X with the generic →") | The single most pitchable visual in your doc. Hand-curated for 4–5 obvious brand/generic pairs. | ~2 hours |

**End of Stage A:** site is visibly demonstrating three of the doc's distinctive ideas — Tiers, Generic Savings, Our Pick — on real product data with believable categorization. **Demo-ready for an informal Medline coffee.**

## Stage B — UX depth via two pilot categories (weeks 2–3)

Two pilots that prove the architecture extends cleanly beyond the foundation. Both already have full implementation briefs Cursor has reviewed.

| Pilot | What it demonstrates |
|---|---|
| **Qualifier engine** (hearing amplifiers pilot) | Closed-choice fit/preference questions per product type ("Style? In-ear / Behind-the-ear" / "Battery: rechargeable / replaceable") that narrow recommendations without ever asking medical questions. Privacy frame: "ask about the product, not the person." |
| **Variants + catalog consolidation** (compression socks pilot) | Multiple Medline SKUs that differ only in size / color / strength render as **one configurable listing** with inline pickers instead of 12 near-duplicate rows. This is something Medline doesn't offer in their own catalog presentation. |

**End of Stage B:** the demo includes two production-ready category demonstrations that show how the consumer-friendly shopping pattern extends from the foundation. **Demo-ready for a formal Medline introduction.**

## Stage C — The Assessment Engine (weeks 3–6) — *this is the LLM-overnight work*

The taxonomy automation layer from your architecture doc. Six working parts, all running offline (not at member request time) with human review gates:

1. **Classifier** — raw SKU title/description → product class (rules + alias matching first, LLM for the long tail)
2. **Variant detector** — finds sibling SKUs that belong in one family by stem + divergent axes
3. **Axis extractor** — pulls size / color / strength values out of variant titles
4. **Canonical namer** — generates healthcare-literate family names ("Graduated Compression Hosiery, Knee-High, 20–30 mmHg") using a controlled vocabulary
5. **Canonical descriptor** — family-level descriptions in a consistent voice (not Medline's retail copy, not clinical jargon)
6. **Human review surface** — admin UI to approve / reject / edit any auto-classification below a confidence threshold. Non-negotiable for a Medline-grade pitch.

The work in Stages A and B is what defines what "good output" from this engine looks like. We can't automate toward a target we haven't validated by hand, so this is intentionally sequenced after the manual pilots.

**End of Stage C:** Medline's full SNF catalog (and any others we ingest) flows through the engine and produces structured, reviewed, healthcare-literate product taxonomy. **The platform's value proposition becomes data-defensible at scale.** This is the moment the demo stops being "look what's possible with two categories" and starts being "here's what your real catalog looks like in our system."

## Stage D — Optimizer intelligence (weeks 6–8)

Two pieces that make the budget+benefit optimizer from your architecture doc actually optimize.

| Piece | What it does |
|---|---|
| **Need consumption profiles** | Per-need, per-90-day breakdown of typical product mix (incontinence: ~55% briefs/pads, ~12% wipes, ~8% skin barrier, etc.). LLM drafts from clinical care literature, human reviews. Bundle builder uses profiles to allocate budget proportionally instead of grab-bag. |
| **Benefit Optimizer dashboard** | Coverage meter (days-of-supply across the bundle), budget utilization bar with "$X left," what-if swap previews. This is the single screenshot that sells the procurement pitch. |

**End of Stage D:** the optimizer story is real, not aspirational. Bladder-support bundles look like a clinician's care plan, not a random assortment.

## Stage E — Partner readiness (weeks 8–12)

The pieces that move us from "Medline likes the demo" to "Medline can sign a pilot agreement."

- **Plan configuration / white-label layer** — embed the experience inside a plan's portal under their brand, with their benefit amount and excluded categories pre-loaded
- **Aggregate insights dashboard** — anonymized merchandising data for Medline (category mix by region, substitution patterns, budget utilization distribution). Built on real data from the engine.
- **Pitch artifacts** — deck, Loom demo walkthrough, one-pager, regulatory FAQ (HIPAA, CMS audit defensibility)

**End of Stage E:** procurement-grade pitch is ready. Roughly 10–12 weeks from now.

---

## Pitch-readiness milestones

| When | Pitch level | What changes |
|---|---|---|
| End of Stage A (~2 weeks) | Informal coffee | Foundation is honest; visible failures fixed; three distinctive ideas (Tiers, Our Pick, Generic Savings) on the site |
| End of Stage B (~3 weeks) | Formal introduction | Two pilot categories prove the architecture pattern scales |
| End of Stage C (~6 weeks) | Real demo | The Assessment Engine has processed real Medline catalog data; partner sees their own SKUs in our system |
| End of Stage D (~8 weeks) | Optimizer demo | Bundles look intentional, optimizer math is real |
| End of Stage E (~12 weeks) | Procurement-grade pitch | White-label / embed-ready, aggregate insights for merchandising, full regulatory FAQ |

## What flexes, what's locked

**Locked (not negotiable):**

- Privacy posture (no PHI, no diagnosis, no third-party trackers, no log interpolation of member input)
- Site-gating during preview (we are not making this publicly accessible until a partnership warrants it)
- Sequence A → B → C (the engine has to follow the manual pilots, not precede them)

**Flexible (we can move):**

- Whether Stage C's engine is built fully in-house or relies on an external taxonomy provider for the seed pass — depends on what we hear from partner conversations
- Timing of Stages D and E — these can run partly in parallel if we have help
- Stripe vs. plan-funded checkout — production checkout will eventually integrate with a flex-card or OTC-allowance debit rail (not Stripe). That work plugs in at Stage E and isn't on the critical path until then.
- Whether Stage E builds white-label *first* or aggregate insights *first* — both serve different partner conversations

## Open questions for you

These are decisions where your read of the partner side would shift the schedule:

1. **First Medline conversation timing.** Informal coffee at end of Stage A, formal at end of Stage B, real demo at end of Stage C — which is the right anchor for the build sequence?
2. **Direct partnership vs. plan-direct.** Are we positioning as Medline-embedded (their catalog, our shopping layer) or plan-direct (we're the marketplace, Medline is the fulfillment partner)? The architecture supports both, but the emphasis in Stages D and E would shift.
3. **Catalog scope for Stage C.** Do we run the engine against just Medline SNF catalog (~1,300 SKUs) or pull in Kaiser CA / Memorial Hermann / Aetna OTCHS too (~5,000+ combined)? Wider catalog = stronger pitch but ~2x the review-queue burden.

## How you can plug in

- **Sanity-check the sequence.** Anything in A or B that should be moved up or down based on what you know about the partner side?
- **Test the live site as new things ship.** Each stage produces a visible improvement worth a 10-minute reaction.
- **Vet pitch positioning.** Stages B and C set the framing we'll lead with — your read on what resonates with plans and Medline matters more than mine.

---

*Next refresh: after Stage A completes (within ~2 weeks).*
