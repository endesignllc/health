# Health Benefits Shop — Partner Brief

**For:** Peter
**From:** Mike / Endesign
**Status:** Private preview, May 2026

---

## What you're looking at

The live preview at **https://healthbenefits.shop** is the working foundation of the *Smart OTC Healthcare Shopping System* concept from the April architecture doc. It's gated behind Google sign-in (your account is on the allowlist). You're seeing real product data from the Medline OTC SNF catalog, a working bundle builder, and the early shape of the consumer experience.

The site is intentionally rough in places. It's a build-in-public preview — not a polished demo — because we're using your eyes to catch exactly the kinds of issues we need to fix before any external pitch.

## What's working today

- **Site-gated sign-in** with allowlisted access (privacy-defensible for an unverified app in early review).
- **Multi-need bundle wizard.** Pick budget, pick what you care about, get a bundle in seconds. No diagnosis questions, ever.
- **Tier framework live in the UI.** Needs are tagged Tier 1 (Essential), Tier 2 (Beneficial), Tier 3 (Comfort) per the architecture doc. Bundle output groups items under those tiers with color-coded badges.
- **Everyday essentials toggle.** Universal-use items (tissues, hand sanitizer, lip balm) are pulled into a separate, tier-less section — solving a UX problem you'd hit immediately if those got mixed into clinical needs.
- **Cart, customize, and checkout flow** wired end-to-end. Stripe is in test mode.
- **Privacy posture is clean.** No third-party trackers, no PHI, no diagnosis logging, ephemeral session-scoped preferences.

## What's known to be broken (and why)

You'll spot this within five minutes of using the wizard:

**Bundle composition for narrow needs is currently wrong.** Example: select only "Bladder Support" and the bundle returns denture cleansers, vitamin ointment, and a hearing amplifier battery — not a single incontinence brief.

We ran a diagnostic against the live database and the cause is clean: **the catalog actually has 71 real incontinence SKUs** (FitRight pads, briefs, underwear, ContourPlus, Poise, Ultrasorbs) — they're just lumped into a broad `mobility` category alongside slippers, wipes, and oral care. The bladder-support rules pull from three overly broad buckets (`supplements`, `vitamins`, `mobility`), so the bundle builder is working as designed; it just doesn't know which slice of `mobility` is actually relevant.

This is the most concrete validation possible of *why we need the universal taxonomy and consumer equivalence layer* from your architecture doc. Broad category rules fail; narrow tagging wins. The fix here is small — create an `incontinence` category, re-tag the 71 matching SKUs, point bladder-support's rules at the new category. ~1 hour of work. The same pattern is almost certainly lurking in other needs (what's `supplements` mixing?), so we'll do an audit pass at the same time.

**Other gaps you'll notice:**

- "Our Pick" / Medline preferred-partner labels are not yet rendered.
- Generic-vs-brand savings ("Save $X with the generic") not yet visible.
- Variant selection (size, color, strength) not yet implemented — a compression sock currently appears as 8–10 separate listings, not one configurable product.
- Some categories outside bladder-support may have similar fit issues we haven't audited.

## Strategic direction (recap of the April architecture doc)

The build is moving toward what you laid out: a **universal product taxonomy** above all catalog SKUs, a **consumer equivalence layer** that groups genuine substitutes (Tylenol/Advil/Aleve in one bucket), a **combined budget + benefit optimizer**, and a **preferred-partner ranking layer** that gives Medline a defensible positioning ("Our Pick" — value-competitive private label).

The pitch frame I'd use with Medline isn't "another OTC marketplace." It's: *"Plans lose 30–50% of OTC allowance to breakage. We get members to spend it, on the right products, without building a medical intake form."* Benefit utilization, not benefit distribution.

## Priorities and rough timeline

The work splits into four tiers. Time estimates assume continued cadence and no major scope changes.

### P0 — This week

**Catalog and rules audit, bladder-support fix.** The bladder bundle is the most embarrassing visible failure. Three queries against the live DB will tell us whether it's a rules problem, a catalog problem, or both — then a tight one-day fix to either tighten rules or seed real incontinence SKUs (probably both).

**Outcome:** Selecting "Bladder Support" returns actual bladder-support products. We'll spot-check the other 8 needs at the same time so we don't get caught with the same bug elsewhere.

### P1 — Next 1–2 weeks

Three small, independently-shippable visible improvements that make the site demo-ready and align with the strategic doc:

- **"Our Pick" Medline preferred-partner label.** Schema flag, hand-tag Medline products in seed, render a small badge. Demonstrates the partner ranking framework without committing to the full algorithm yet. (~1 hour)
- **Generic savings badge** ("Save $X with the generic →"). Hand-curate 4–5 obvious brand/generic pairs (Tylenol↔Acetaminophen, Advil↔Ibuprofen, etc.). The single most pitchable visual in the doc. (~2 hours)
- **Need-priority tier visual polish.** Tier badges already render; this pass refines copy and color and verifies tier-1 items genuinely come first in budget allocation. (~30 min)

**Outcome:** Site visibly demonstrates three of the doc's distinctive ideas — Tiers, Generic Savings, Our Pick — on real product data. Ready for the first informal Medline conversation.

### P2 — Weeks 3–5

Two pilot features that prove the core architecture extends cleanly:

- **Qualifier engine** — closed-choice fit/preference questions per product class. Pilot category: hearing amplifiers (style, battery type, control size). Proves the "ask about the product, not the person" privacy frame. Detailed brief already written and Cursor-reviewed (`PHASE_1_QUALIFIERS_BRIEF.md` v1.4).
- **Variants + catalog consolidation** — multiple Medline SKUs that differ only in size/color/strength render as one configurable listing with inline variant pickers. Pilot category: compression socks. Brief already written and Cursor-reviewed (`PHASE_1_5_VARIANTS_BRIEF.md` v1.0).

**Outcome:** Two production-ready category demonstrations of the consumer-friendly shopping pattern. The compression-sock consolidation in particular is a real differentiator — Medline doesn't present their own catalog this cleanly.

### P3 — Months 2–3 (the strategic engine)

**Assessment Engine** — the automated taxonomy your architecture doc describes. Classifier, variant detector, canonical naming, admin review surface, healthcare-literate vocabulary controlled at the data layer. This is what scales the bladder-support fix from "we hand-curated 5 SKUs" to "we processed Medline's full catalog with 90%+ auto-classification accuracy and human review for the rest."

This is the central piece of IP for the Medline pitch. It's also the longest piece of work — 2–3 weeks of focused build, plus iteration on classification quality.

**Outcome:** The platform's value proposition becomes data-defensible at scale. Anything below P3 is showing what's possible with one or two categories; P3 is what makes it real for Medline's full catalog.

## Where you can plug in

- **Use the site.** Click through the wizard with different need combinations. Send screenshots of anything that looks wrong — the bladder-support failure was caught by exactly this kind of usage.
- **Vet the strategic framing.** The "benefit utilization, not benefit distribution" pitch angle for Medline — does it resonate with what you've heard from plan-side conversations?
- **Sanity-check the priority order.** Anything in P0–P2 that you think should move up or down based on what you know about the partner conversation timing?
- **Catalog domain knowledge.** If you've seen real OTC catalogs from CVS Health Solutions, NationsOTC, or InComm, knowing which ones are most representative of what plans actually offer would help us seed more realistic data.

## Open questions

- **Pitch timing.** When do we want the first Medline conversation? P1 work is enough for an informal coffee; P2 is enough for a formal demo; P3 is what makes a procurement-grade pitch. The answer to this drives the build sequence.
- **Plan partnership scope.** Are we positioning this as Medline-direct (white-label inside their fulfillment) or plan-direct (we're the marketplace, they're a fulfillment partner)? The architecture supports both, but the demo emphasis would shift.
- **Stripe vs. plan-funded checkout.** Real production would mean integrating with the plan's flex-card or OTC-allowance debit rail, not Stripe. That's a separate workstream — happy to scope when relevant.

## What I need from you

A 30-minute call this week to walk through the live preview together would catch a lot of issues quickly. Outside of that, send screenshots of anything that catches your eye — even small things. Every "huh, that's weird" reaction is one less surprise in front of a real partner.

---

*This brief lives at the project root and will stay updated as priorities shift. Next refresh: after the P0 audit lands.*
