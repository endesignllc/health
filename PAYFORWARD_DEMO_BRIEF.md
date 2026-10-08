# PayForward Demo Brief — "One Real Member Moment"

**For:** Mike & Peter
**Audience of the demo:** Vijay Mandalam + PayForward's internal product lead (who was *not* in the room — the demo must survive being forwarded)
**Promise already made (Mike's 9/22 email):** one real member moment, on a PayForward-representative setup, no integration, no data lift
**Status:** Demo was promised "next week" from late September. Ship a focused version now; polish is secondary to momentum.

---

## 1. The strategic frame the demo must land

Vijay's stated belief: **the moat is at the fulfillment/logistics layer, not the portal layer.** Peter's reply expanded the prize: a smarter PayForward marketplace overall.

So the demo is NOT "look at our nice storefront." It is:

> PayForward built the rails (flex card, purses, nationwide acceptance).
> We make each member's next purchase *intelligent* — and every intelligent purchase
> generates the demand data that feeds the fulfillment moat Vijay already believes in.

Bonus alignment discovered in research: PayForward's own homepage pitches **AI-driven tools to close care gaps and improve Star performance**. That is *exactly* the star-ratings framing from the Nick DiMauro strategy call (fall prevention → HEDIS, curated purchases → health-directed spending). Use their own language back at them.

**The sharpest fact we hold (per Mike): ShopHighmarkOTC.com is a PayForward-operated property** — plan members are redirected there after login (the site is a "My Total Benefits" app shell). That transforms the demo's framing from hypothetical to concrete: we are not pitching "imagine a client like Highmark" — we are showing **what the OTC storefront PayForward already runs for a real client could become** when an intelligence layer sits in front of the catalog. Today that experience is a browse/search catalog grid; the demo shows the same member instead being asked what she's trying to accomplish. (Handle with care in the room: describe it as "a storefront experience representative of what you operate today" — complimentary, never critical, consistent with Mike's "not proposing to replace anything you've built.")

---

## 2. The demo plan skin: "Laurel Complete Care"

Model the fictional plan on **Highmark Wholecare Medicare Assured (HMO D-SNP, Pennsylvania)** — Highmark is a plausible PayForward-profile client and its 2026 D-SNP flex design is public:

| Real Highmark Wholecare 2026 fact | Use in demo as |
|---|---|
| Flex Card, combined purses: OTC + Home/Bathroom Safety + Food + Utility + Gas (SSBCI) | "Laurel Flex Card" with visible purses — mirrors PayForward's one-card/many-benefits model |
| **$300/month** combined allowance (SSBCI members); **$100/month** OTC + Home Safety (non-SSBCI) | Member wallet amounts (both already exist as budget tiers in our wizard) |
| Unused allowance **expires end of period**, no rollover | The urgency driver in the script: "use it well before it's gone" |
| Quarterly OTC cadence on standard Highmark MA plans; order via catalog/online | Reorder cadence story |
| Eligible categories: cough/cold, dental care, eye & ear, incontinence supplies, dual-purpose vitamins | Constrain demo bundles to these categories so a plan person sees compliance awareness |
| Catalog administered via Medline-run OTC fulfillment (catalog hosted on catalogcontent.medline.com) | Our Medline catalog data is *literally the same supply base* — the demo products are real |

**Branding rules (important):**
- Fictional name + fictional logo only. "Laurel Complete Care (HMO D-SNP)" — laurel is the PA state flower; reads regional without touching any real trademark. Do **not** use Highmark's name, Blue Cross marks, or any real plan logo anywhere in the demo.
- Safe to say verbally: "modeled on the public 2026 benefit design of a Pennsylvania D-SNP."
- PayForward's visual language (card imagery, purse concept) can be *representative*, not replicated.

**Fictional brand kit (sourced from the 2026 Highmark ACA brochure Mike pulled — brand *voice*, never marks):**
- Palette: deep navy primary, sky-blue accent, soft coral/salmon secondary, generous white space
- Voice: warm, plain-spoken, second person ("Say hello to…", "No hoops, no hoopla") — friendly imperative headlines, short sentences
- Photography mood: real people at home, warm light — matches both the brochure and the senior audience
- Caveat: that brochure is **ACA individual/family**, so it informs look-and-feel only; all wallet amounts and OTC rules in the demo come from the MA/D-SNP sources above

**Build cost:** this is the plan-config/white-label layer we already scoped (Stage E item) in minimal form — logo slot, color tokens, wallet label, benefit amounts, category exclusions. One config file, not a platform.

**Source documents for the wallet design** (keep on file in case a PayForward person asks "where did these numbers come from?"):
- 2026 Highmark Wholecare Medicare Assured Summary of Benefits (SE PA) — the $300/mo SSBCI and $100/mo non-SSBCI combined-purse amounts, expiry rules
- 2026 Wholecare Diamond EOC (medicare.highmark.com, dsnp/2026-resources/pa) — the authoritative chapter-4 benefits chart if exact-to-the-dollar fidelity is ever needed
- 2026 Highmark MA OTC catalog + benefit flyer (Medline-hosted; PASSHE retiree copies are public) — category rules and quarterly cadence for non-dual plans
- Regional SOBs (Community Blue HMO, Together Blue HMO, Senior Blue HMO) — show how widely benefits vary by region, which is itself a selling point: *a config-driven plan layer is the only way to serve this variance*
- One caution: generic web sources attribute Highmark OTC cards to NationsBenefits; that citation traces to a different insurer (CDPHP). Our firsthand fact — ShopHighmarkOTC.com resolves to a PayForward "My Total Benefits" app — is better information. Don't repeat the NationsBenefits claim.

---

## 3. The member moment (demo script, ~7 minutes)

**Persona:** Margaret, 74, Pittsburgh. Laurel Complete Care member, SSBCI-eligible. **$300/month on her Laurel Flex Card**, of which she routinely lets a chunk expire. Two things she's trying to accomplish: manage bladder leaks with dignity, and not fall in the bathroom again.

> Framing line to say out loud: "Notice Margaret never tells us a diagnosis. She tells us what she's trying to accomplish. No PHI, no diagnosis logging, no trackers."

| Step | On screen | What it proves |
|---|---|---|
| 1. Wallet | Laurel Flex Card wallet: purses visible, "$300 this month — expires in 9 days" | We understand PayForward's actual card/purse architecture |
| 2. Goals | "What matters to you?" wizard: *Bladder support* + *Staying steady at home*; budget auto-set from wallet | Goal-based discovery — the sentence from Mike's email, live |
| 3. Qualifiers | Product questions, never person questions ("Pad or brief? Overnight?") | "Ask about the product, not the person" privacy pattern |
| 4. Bundle | Curated cart grouped by need, Tier 1/2/3 badges, variant pickers (one listing, not 12 duplicate SKUs), generic-savings badges | The intelligence layer: a care-plan-shaped cart, not a grab bag |
| 5. Budget meter | Coverage meter + "$X left" bar; one what-if swap ("switch to generic → covers 6 more days of supply") | The optimizer is real math, not aspiration |
| 6. Reorder | "Margaret's quarterly plan" — held-and-shipped, auto-rebalanced next cycle | Recurring utilization, not one-off spend |

**Stop before checkout.** Say: "Checkout is yours. The rails are PayForward's — that's the point." (Our Stripe test checkout must never appear; it invites the wrong conversation.)

### The ending — speak to Vijay's moat (2 minutes, most important slide/screen)
After Margaret's cart, show the *aggregate* view (even a static mock of our product-class stats is fine):
- Demand by product class and region, substitution patterns, benefit-cycle timing → **forecastable fulfillment**
- Reorder signals → inventory held-and-shipped economics
- Purchase mix vs. goals → **care-gap / Star story for the plan** (fall-prevention purchases are a reportable intervention, in PayForward's own homepage language)

Close: "Every one of these signals only exists because the member told us what she was trying to accomplish. Portal UX can't generate this data. An intelligence layer does — and it flows straight into the fulfillment layer you said is the moat."

---

## 4. Prep checklist (in priority order)

1. **Laurel plan config** — name, fake laurel logo, colors, wallet = $300/mo SSBCI structure with purse labels. (~half day)
2. **Verify the two demo needs end-to-end** — bladder support (categorization fix must hold) + home/bathroom safety-adjacent need for fall prevention. Run the existing audit script on just these two. (~half day)
3. **Wallet expiry banner** — "expires in 9 days" urgency element on the budget meter. (small)
4. **Aggregate-insights ending** — one screen or slide from compute-product-class-stats output; static is acceptable. (~half day)
5. **Cross-check demo SKUs against the real Highmark 2026 OTC catalog PDF** (public, Medline-hosted). Optional stretch: run that PDF through the existing product-intel extraction pipeline — then the line becomes "we ingested this plan's actual catalog in an afternoon." That's the single strongest proof of the no-data-lift promise. (~1 day, pipeline already exists)
6. **Record a 6–8 min Loom** of the scripted run *before* offering the live working session — the Loom is what gets forwarded to the product lead; the live session is the follow-up.

## 5. Do not show
- Admin UI, review queues, or any raw catalog table
- Stripe checkout
- Any need/bundle that hasn't passed the audit script
- Real Highmark branding or logos anywhere in the demo. We know ShopHighmarkOTC.com is PayForward-operated, but naming their client's brand in our materials is their prerogative, not ours — "a plan storefront representative of what you operate today" says everything without overstepping
- Any screenshot of or direct reference to the live ShopHighmarkOTC experience — Vijay knows what his own product looks like; implying we studied it closely can read as adversarial

## 6. Intel from the My Total Benefits Terms of Service (PayForward, eff. 10/25/2024 — on file)

What the member-facing MTB ToS confirms, in order of usefulness:

1. **PayForward owns the whole member surface.** The plan's benefit-card website and apps are "owned and operated by PayForward LLC on behalf of your health plan," and Enterprise Partners are "not responsible for maintenance, creation, or operation of the Site." The storefront decision-maker is Vijay's org, not the plan — our instinct to sell the intelligence layer to PayForward (not to Highmark first) is structurally correct.
2. **They already run catalog commerce.** The ToS names prepaid debit cards, wellness incentive rewards, benefit/allowance payments, *and* "purchases in our online catalog." We slot into an existing commerce motion; no new business line required on their side.
3. **Program-rules enforcement is real and plan-configurable.** Transaction data is shared with the Enterprise Partner for verification; partners can audit usage, suspend access, and expire unused funds. This is the Benefit Rails model described from the other side of the table — purse rules, expiry, category policing all exist as config today. Our routing layer makes members *compliant by construction*, which is a selling point to whoever at PayForward owns program-rules enforcement.
4. **Their experience explicitly disclaims guidance** ("No Professional Advice" — informational only, no endorsement of views). The guidance vacuum is our product. Our privacy frame (goal-based, product-questions-not-person-questions, no PHI) is what makes filling that vacuum defensible; keep it front and center in the demo narration.
5. **Hard guardrail for us:** the ToS prohibits scraping/crawling their Services. All catalog sourcing stays on publicly posted PDFs (see CATALOG_SOURCES.md) — never pull data from ShopHighmarkOTC or any MTB property. This also reinforces the "never screenshot their live product" rule above.

## 7. Timing
Vijay committed to socializing internally as of Sept 23 and the demo was promised the following week. Every additional week lets the internal conversation go cold. Recommend: Loom + this one-pager to Vijay within days, offering the live working session as the next step.
