# OTC Benefit Optimizer — Handoff Doc

**Source:** Strategy call between Michael (Mike), Peter (business partner), and Nick DiMauro (strategic advisor)
**Date of conversation:** Early June 2026
**Purpose of this doc:** Bring a new chat up to speed on where the concept stands and the open strategic questions.

---

## The Concept (one-paragraph version)

A benefit optimizer that helps Medicare Advantage members spend their OTC dollars on purpose instead of randomly burning the allowance on whatever's in the catalog. Members specify their health needs and budget; the tool builds a curated cart of appropriate products at optimal pricing. Fulfillment runs through a single partner (e.g., Medline). Differentiator: condition-based bundles (e.g., diabetes + pain/inflammation, $300/quarter) that use health conditions as filters without requiring members to disclose PHI directly. Quarterly subscription orders can be held and shipped when all SKUs are available.

---

## The Strategic Pivot (most important takeaway)

Mike and Peter originally pitched this as a tool to **help members capture unused benefit dollars**. Nick pushed back hard on that framing:

> Health plans generally *don't want* members to use 100% of their benefits — the ROI math doesn't work for them.

Nick's counter-framing — which the group converged on — is to position the tool as a **star ratings and health outcomes play**, not a utilization-maximization play. Plans care about:

- HEDIS measures
- CAHPS / CAP surveys
- Specific clinical metrics (e.g., fall prevention)

If the intake form and product bundles can be tied directly to those metrics, the ROI story writes itself. "Curated based on member health needs" beats "spend down your allowance."

Nick proposed framing it as a **transformation of OTC benefits from reactive spending to health-directed purchases with guardrails**, with a target launch frame of **January 1, 2027**.

---

## Business Model & Partnership Notes

- **Fulfillment, not tech, is the cleanest partnership angle.** Working with Medline (or similar) as a fulfillment partner avoids B2B2C complexity.
- **Margin upside for fulfillment partners:** curated bundles can favor Medline-branded items, which both lifts margin and leans on brand familiarity for the member.
- **Positioning vs. Medline LiveWell:** The group leaned toward a **standalone benefit optimizer site** rather than embedding inside Medline's LiveWell, given Medline's ongoing reframing efforts. Could later be embedded in plan member portals as a replacement for, or partner to, Medline.
- **Technical architecture:** A generic layer sitting on top of existing catalogs, cross-referencing products across catalogs via GTIN and other identifiers.

---

## Product Notes

- New bundle feature already demoed: diabetes + pain/inflammation, $300, quarterly cadence.
- Bundles use **health conditions as filters** — members aren't required to disclose PHI.
- Quarterly subscription model with held-and-shipped fulfillment.
- UX analogy Mike used: shopping for a computer with specific needs in mind — consumer-grade B2B e-commerce.
- Nick's UX guidance: bundles should map to **specific HEDIS metrics** rather than generic categories (e.g., target fall prevention, not "asthma support").

---

## Open Risks / Watch-outs

- **Nick's non-compete:** He flagged he needs to be careful given existing OTC-benefit-adjacent commitments. Affects how publicly he can advocate.
- **Plan ROI skepticism:** Until tied to a star-rating lever, plans will see this as "help members spend more of our money."
- **Medline relationship ambiguity:** Standalone vs. embedded vs. replacement — not yet decided.

---

## Action Items

**Michael**
- Send demo platform login credentials to Nick.

**Nick DiMauro**
- Reach out to health plans (Highmark, Horizon Blue named) to test the star-ratings framing.
- Review demo; provide UI/UX feedback with a lens on how intake + bundles can map to HEDIS/CAHPS/star metrics.
- Report back to Mike and Peter with plan feedback.

**Peter + Michael (parallel track)**
- Independently pursue conversations with health plan reps responsible for star ratings to validate the value prop and integration story.

---

## Key Vocabulary for the Next Chat

- **OTC benefit** — over-the-counter allowance in Medicare Advantage plans
- **HEDIS** — clinical quality measures plans are graded on
- **CAHPS / CAP surveys** — member experience surveys feeding star ratings
- **Star ratings** — CMS rating that drives plan reimbursement and enrollment
- **B2B2C** — selling through plans to members; the model we're trying to *avoid* complexity in
- **GTIN** — global product identifier used to cross-reference catalogs
- **LiveWell** — Medline's existing member-facing platform
