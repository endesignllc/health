# HealthBenefits.Shop — The Road Ahead

**Working back from the CY2028 bid deadline: Monday, June 7, 2027**

Prepared: September 9, 2026 · Owner: Mike / Endesign · For: Mike, Peter, Nick

---

## 1. Honest read of where we are

**The build is in good shape.** Stages A and B of `DEV_SCHEDULE.md` are substantially done: the needs wizard, the two-tier qualifier system (need-tier + class-tier, now formalized in `QUALIFIER_SPEC.md`), variant consolidation, the bundle builder with budget solver, shared budget meter, the static benefit wallet, admin surface, Stripe in test, and the Google-gated preview. Four MA catalogs are extracted, normalized, deduped and image-mapped in `product-catalog/`. The privacy posture is real and implemented, not aspirational.

**Stage C — the assessment engine, the central piece of IP — has not been started.**

**The commercial side is at zero.** Last commit: July 14, 2026. Newest artifact: the Member Experience deck, July 27. Both pitch decks, the qualifier spec, and the continence tagging script are sitting *untracked* in the working directory. No live prospect, no scheduled conversation. The June action items — Nick to approach Highmark/Horizon, Peter and Mike to pursue Stars owners in parallel — did not close.

**The diagnosis:** the build is roughly nine months ahead of the commercial evidence, and nothing in the next stage of the build closes that gap. Stage C is three to six weeks of the hardest work in the project, and it makes the demo better for a conversation that isn't scheduled.

That's the whole problem. Everything below follows from it.

---

## 2. What changed while it was stalled

Three shifts, all pointing the same direction.

**a) The OTC benefit itself is shrinking.** OTC coverage fell to **68% of MA enrollees for 2026, down from 79% in 2025**. Roughly **70% of plan leaders expect leaner 2027 packages** — up from 40% the year before — and *not one* forecast richer benefits. OTC is named specifically as facing "significant degradation," alongside transportation and meals.

**b) The buyer has no money and no growth appetite.** **93% of surveyed MA plans are currently unprofitable**, with leaders projecting two to three years to recover. **54% of executives at least somewhat seriously considered exiting MA.** **69% expect flat or declining enrollment in 2027.** Stated priorities are coding accuracy, medical cost management, and quality improvement; growth is deprioritized.

**c) The CAHPS lever we were leaning on got structurally weaker.** Patient experience, complaints and access measures dropped **from weight 4 to weight 2**, effective with the 2026 Star Ratings (CY2025 final rule). The CY2027 final rule then **removes 11 measures**, including two Part C CAHPS measures — *Customer Service* and *Rating of Health Care Quality* — beginning measurement year 2027.

### What this does to the thesis

The old pitch — richer member experience on the OTC benefit lifts CAHPS, which lifts Stars — just had two of its three legs weakened. Don't retire it. **Demote it.**

The pitch that survives is stronger in this market, not weaker:

> **Your OTC line is getting cut. We make the smaller number do more, and we make what it did measurable.**

Curation is worth *more* per dollar as dollars shrink. When a plan takes a member from $150/quarter to $90, the difference between a guided $90 and a random $90 is the entire member-perception delta — the difference between a cut that costs you members and a cut nobody notices. That is a **benefit-design and retention** conversation held with Finance and Benefit Design, not only a Stars conversation held with Quality. It also happens to be the conversation every one of these plans is having internally right now.

**Second consequence: plan-direct-first is now the weaker of the two GTM motions.** A plan that is unprofitable, shrinking and cutting is the hardest possible first customer. An admin/card vendor's revenue is transaction- and engagement-driven — for them member engagement is the P&L line, not a cost line, and their incentive points the same way ours does. This doc recommends flipping to vendor-first (see decision **D-1**; this deliberately reverses the July instinct).

---

## 3. The calendar that governs everything

CY2028 bids are due **Monday, June 7, 2027** — the first Monday in June, submitted through HPMS. Anything a plan carries into 2028 must be decided before then, which means it has to be *believed* by roughly March 2027, which means the reference evidence has to exist by roughly January 2027.

| When | What must be true |
|---|---|
| Oct–Nov 2026 | Positioning corrected · 10 named targets · first meetings booked |
| Dec 2026 | 3+ real conversations held; one qualified prospect |
| **Jan 2027** | **A signed pilot, LOI, or data-sharing agreement — the single gate** |
| Feb–Apr 2027 | Pilot running · measurement framework live · first numbers |
| May 2027 | Reference story written · CY2028 bid asks in flight |
| **Jun 7, 2027** | **Bids lock. Anything not in by then waits for CY2029.** |

One more thing on the calendar, and it's the real deadline in this document: **AEP runs October 15 – December 7, 2026.** Plans and vendors are effectively unreachable from about October 1 through mid-December — their whole year turns on those eight weeks.

**So the outreach window before the holidays is the next three weeks, or it's January.**

---

## 4. The next 30 days (the restart)

Small, finite, and almost none of it is feature work.

### Week 1 · Sept 9–15 — clear the decks, literally

1. **Commit the untracked work.** Both decks, `QUALIFIER_SPEC.md`, `NotebookLM-*.md`, `OTC-Optimizer-Handoff.md`, `scripts/tag-continence.ts`, the continence tags preview. Fifteen minutes. That's seven files of real thinking living outside version control.
2. **Verify the preview still runs.** `npm run dev`, sign in, build one bundle end to end. Confirm the Vercel production deploy is still live and the Neon branch hasn't idled out. If something's broken, fixing it is the *only* build work on this list.
3. **Record a six-minute Loom of the working flow.** Nothing else gets built until this exists — it's what you send, and after eight weeks away it's also how you re-learn what you have.

### Week 2 · Sept 16–22 — correct the positioning

4. **One page, not a deck.** The shrinking-benefit reframe from §2, plus the CAHPS demotion. Both existing decks currently lead with a lever CMS is actively down-weighting; in front of anyone Stars-fluent that's a credibility risk, not a nuance.
5. **Rewrite slides 2–3 of the Member Experience deck** against that page. Do not rebuild the deck.

### Week 3 · Sept 23–29 — build the target list

6. **Ten named organizations, three tiers:** (a) admin/card vendors — the NationsBenefits / InComm–OTC Network / Andmore class; (b) small regional plans and D-SNPs carrying an OTC line; (c) Medline, through the existing relationship. **A named human at each, or it isn't a target.**
7. **One sentence per target: what they lose in 2027 if nothing changes.** That sentence is the email.

### Week 4 · Sept 30–Oct 6 — send

8. **Ten outreach emails.** Loom link, one paragraph, one ask: twenty minutes.
9. **Nick and Peter each take two of the ten.** Same asks as June — this time with a named person, a written sentence, and a date.

> **Gate G-0 (Oct 31):** at least three meetings held or booked. Zero after ten targeted sends and two follow-ups means the problem is the offer, not the outreach — go to §7.

---

## 5. Q4 2026 — conversations, not code

Treat Oct 15 – Dec 7 as a dead zone for new meetings. Use it for the two things that don't need a counterparty:

**The Andromeda validation.** Still untested and still load-bearing. Can they resolve MA *OTC benefit* eligibility — enrollment → benefit offered → remaining balance — or only active coverage? Every real-time-eligibility claim in both decks rests on the answer. This is one technical call with their team. If the answer is "coverage only," that capability comes out of the decks in December, quietly, rather than falling apart in front of a prospect in March.

**The measurement framework.** Write down what a pilot would measure *before* anyone asks: engagement lift, bundle completion rate, quarterly re-order rate, category mix against HEDIS-relevant categories, and cost per engaged member. Arriving with this is the difference between a vendor pilot and a favor.

> **Gate G-1 (Dec 15):** one qualified prospect — someone who has asked a second question, named an internal stakeholder, or asked for data.

---

## 6. Q1–Q2 2027 — the only thing that matters is a reference

**January.** Convert the qualified prospect into a pilot, LOI, or data-sharing agreement. Small is fine: one D-SNP, one region, 500 members, unpaid. What you need is a name you can say and a number you can show.

**Stage C gets built only after a partner asks for it.** The assessment engine is the right piece of IP and the wrong piece of speculative work. Its scope should be set by a real catalog from a real counterparty, not by the three PDFs already in `product-catalog/`. If nobody ever asks, that is itself information — it means the taxonomy isn't what they're buying, and six weeks were saved.

**February–April.** Run it. Instrument it. One number a month to Peter and Nick.

**May.** Write the reference story; get the CY2028 bid ask in front of the plan's benefit design team.

> **Gate G-2 (Mar 31):** a live pilot with real members and at least one measured number. Miss it and CY2028 is out of reach — at which point the right move is to re-target CY2029 deliberately, not sprint at a locked door.

---

## 7. What to stop

- **Stage C, for now** — see above.
- **Stages D and E as written.** The white-label layer, the aggregate-insights dashboard, the plan-config layer: all "build it and they will sign" work. Each becomes real when a real partner asks for it.
- **Broadening the catalog.** Three catalogs is already more than a first conversation needs. Kaiser CA and Memorial Hermann were the right call; a fourth is procrastination with a progress bar.
- **The Kaiser / MyChart "system of guidance" pitch.** Largest, slowest, most committee-bound buyer available, and the least likely to move before June 2027.
- **Deck polish.** Two decks exist. The next one gets built when a specific prospect objection requires it.

---

## 8. Decisions only you can make

**D-1 · Vendor-first, or plan-direct-first?**
This doc recommends reversing the July instinct and going vendor-first, for the margin reasons in §2. The counterargument is real: a card vendor is a competitor-adjacent buyer who may prefer to copy the UX than license it, whereas a small plan has no ability to build. If you weigh the copy risk heavily, plan-direct stays defensible. Either is fine — **but pick one and let the target list follow**, rather than running both at 50%.

**D-2 · What are you actually selling?**
Three different companies are latent in these files: a licensed member-experience layer (SaaS to vendors and plans), a standalone marketplace taking fulfillment margin, and an IP/team acquisition target. The build supports all three. The pitch can only support one at a time, and the pricing conversation is impossible until this is settled.

**D-3 · What is this worth of your time?**
Eight idle weeks is data, not a failure. This is a multi-year, June-gated market with an unprofitable buyer, running alongside Endesign client work. "One day a week through June 2027, with the gates deciding whether it continues" is a real plan. "When I get to it" is how it stalls again.

---

## 9. Kill criteria

Written down now, while it's still cheap to be honest.

- **G-0 missed** (zero meetings from ten targeted sends by Oct 31) → the offer is wrong. Rework the offer or shelve.
- **G-1 missed** (no qualified prospect by Dec 15) → shelve until the CY2029 cycle. The code and catalogs keep.
- **G-2 missed** (no pilot by Mar 31) → CY2028 is gone. Re-plan for CY2029 with the year's learning, or stop.
- **Andromeda can't resolve OTC benefit eligibility** → the real-time eligibility differentiator disappears. Re-underwrite the positioning before spending another month.

Shelving isn't failing. The asset — a working needs-based shopping layer, a formalized two-tier qualifier model, four normalized catalogs, and a genuinely defensible privacy posture — does not spoil.

---

## Sources

- [Medicare Advantage health plan outlook for 2027 — HealthScape Advisors](https://www.healthscape.com/insights/medicare-advantage-health-plan-outlook-2027)
- [Bids Are In! What Does 2027 Portend for Medicare Advantage and Part D Enrollees? — Payer Perspectives](https://payerperspectives.substack.com/p/bids-are-in-what-does-2027-portend)
- [CY2027 final rule removes 11 Star Ratings measures — RISE Health](https://www.risehealth.org/insights-articles/article/star-ratings-measure-set-shrinks-cut-point-strategy/)
- [Medicare Advantage Bid Process: Rules, Timeline, and Audits — LegalClarity](https://legalclarity.org/how-the-medicare-advantage-bid-process-works/)
- [2027 Medicare Advantage and Part D Rate Announcement — CMS](https://www.cms.gov/newsroom/fact-sheets/2027-medicare-advantage-part-d-rate-announcement)
