# HBS Canonical Taxonomy v1

**Status:** Proposal for Mike/Peter sign-off, then becomes the closed vocabulary all imports map into.
**Grounding:** synthesized from four real source taxonomies — Fieldtex 2024 (57 sections),
CDPHP/NationsBenefits 2026 (22 categories), CVS OTCHS (36 categories), Highmark MA eligible-category
rules — plus our Benefit Rails model. Nothing here is invented; every class exists in at least two
source catalogs.

## Governance rules (the part that keeps it clean)

1. **Closed vocabulary.** Top-level groups and classes below are THE list. An import may never
   create a category. New classes require a human-approved edit to this file first.
2. **Dictionary-only mapping.** Every source catalog gets a `source-section → class` dictionary
   (like fieldtex-section-map + the dictionary in CURSOR_CATEGORY_FIX.md). Imports join through
   the dictionary; unmapped rows go to a review CSV, never to a default bucket.
3. **No dumping grounds.** Nothing defaults to "Supplements"/"Misc". Unclassifiable = review queue.
4. **Classifier of last resort.** Keyword/LLM classification is only for sources with no usable
   section structure, must emit a confidence score, and anything < 0.9 goes to review. Member-facing
   surfaces only ever show dictionary- or human-approved assignments.
5. **Two naming registers per class:** `slug` (system), `memberLabel` (shelf language a senior
   reads). Member surfaces never show slugs or source-section names.

## The tree — 12 groups, 44 classes

Per class: slug · member label · default benefit rails · notes/rules.
Rails key: OTC = OTC purse · HS = Home Safety purse · DME = $0-with-plan candidates ·
DUAL = dual-purpose (vitamins etc., physician-recommendation gating on some plans).

### 1. Pain & Recovery — "Pain relief"
- pain-relief-oral · Pain relievers · OTC
- topical-analgesics · Pain relief creams & patches · OTC
- hot-cold-therapy · Heating pads & ice packs · OTC
- tens-devices · Electrotherapy (TENS) · OTC/DME

### 2. Cold, Flu & Allergy — "Cold, flu & allergy"
- cold-flu · Cold & flu remedies · OTC
- allergy · Allergy relief · OTC
- cough-sore-throat · Cough drops & throat care · OTC
- respiratory-care · Humidifiers & breathing care · OTC

### 3. Digestive Health — "Stomach & digestion"
- antacids · Heartburn & antacids · OTC
- laxatives-fiber · Constipation & fiber · OTC
- digestive-other · Nausea, anti-diarrheal, lactose, probiotics · OTC
- hemorrhoid-care · Hemorrhoid care · OTC

### 4. Vitamins & Supplements — "Vitamins" (DUAL by default)
- multivitamins · Daily multivitamins · OTC+DUAL
- targeted-supplements · Targeted supplements (eye, bone, heart) · OTC+DUAL
  Rule: DUAL classes carry the "talk with your provider" microcopy on some plan configs.

### 5. Oral Care — "Mouth & denture care"
- toothbrushes · Toothbrushes (manual & powered) · OTC
- toothpaste-rinse · Toothpaste & mouth rinse · OTC
- denture-care · Denture care · OTC
- dry-mouth-care · Dry mouth relief · OTC

### 6. Eye & Ear — "Eye & ear care"
- eye-care · Eye drops & eye care · OTC
- reading-glasses · Reading glasses · OTC + Vision-rail crosslink
- ear-care · Ear care · OTC + Hearing-rail crosslink (batteries, wax kits)

### 7. First Aid & Wound Care — "First aid"
- bandages-dressings · Bandages, gauze & tape · OTC
- antiseptics-ointments · Antiseptics & first aid ointments · OTC
- first-aid-kits · First aid kits · OTC

### 8. Skin Care — "Skin care"
- skin-barrier-protectants · Protective skin creams (zinc, A&D) · OTC — crosslinked to Bladder & Bowel need
- lotions-moisturizers · Lotions & moisturizers · OTC
- sun-lip-care · Sunscreen & lip care · OTC

### 9. Bladder & Bowel Care — "Bladder & bowel care" (never "adult diapers")
- briefs-tabs · Briefs (tab-style) · OTC
- protective-underwear · Protective underwear (pull-on) · OTC
- pads-liners · Pads & liners · OTC
- underpads-chair · Bed & chair protection · OTC
- cleansing-wipes · Wipes & washcloths · OTC
- urinals-bedpans · Urinals & bedpans · OTC/DME

### 10. Home Safety & Daily Living — "Staying safe at home" (HS purse home)
- bathroom-safety · Bathroom safety (grab bars, mats, benches) · HS/DME — HEDIS falls story
- fall-prevention · Night lights & fall prevention · HS
- daily-living-aids · Daily living aids (reachers, sock aids, openers, pill organizers) · HS/OTC
- home-health-supplies · Gloves, masks, sharps & home health supplies · OTC

### 11. Supports, Braces & Hosiery — "Supports & braces"
- compression-stockings · Compression & support stockings · OTC/DME — the $0-badge family
- body-supports · Back, knee, ankle, wrist & elbow supports · OTC (joint = variant axis, not class)
- support-cushions · Seat & positioning cushions · HS/OTC
- canes-mobility · Canes & mobility aids · HS/DME

### 12. Monitoring, Testing & Diabetes — "Health monitoring"
- bp-monitors · Blood pressure monitors · OTC/DME
- thermometers · Thermometers · OTC
- scales · Scales · OTC (talking scales tag: low-vision)
- pulse-oximeters · Pulse oximeters · OTC
- diabetes-care · Diabetes care (socks, glucose, organizers) · OTC — diabetic shoes/inserts → DME
- home-tests · Home test kits · OTC

**Cross-cutting flags (not categories):** `everyday-essential`, `personal-wellness`
(feminine/UTI, motion sickness, sleep, smoking cessation, menopause, lice → group 1–4 homes with
this tag; they get a shelf under "Personal wellness" in shop filters without owning taxonomy slots).

## Rules that ride on the class (the "rules that apply within")

Each class row in the DB carries:
- `benefitRails: string[]` — defaults above; plan config can override per plan (Senior Blue makes
  compression-stockings DME-$0; Wholecare keeps it OTC).
- `dualPurpose: boolean` — physician-recommendation microcopy gating.
- `defaultQuantityLimitHint` — from source catalogs ("6 per quarter" patterns); plan config decides
  whether to enforce or merely display.
- `needSlugs: string[]` — which wizard needs draw from this class (bladder-support ← group 9 +
  skin-barrier-protectants; staying-steady ← group 10 + 11).
- `negativeKeywords` — classifier guardrails (e.g. "denture" can never land in group 9; "sunscreen"
  never in group 4). These encode every miscategorization we've actually seen.
- `variantAxes` — size/count/strength/joint/mmHg; joint and mmHg live here so "Supports - Knee/Ankle"
  collapse into one class with a joint axis, per the variants architecture.

## Migration & dictionary order

1. Approve this file → seed `product_categories`/`product_classes` from it (idempotent script).
2. Re-point the Fieldtex dictionary (CURSOR_CATEGORY_FIX.md) at these slugs — it already aligns ~90%.
3. Medline/Walmart legacy products: map existing classes → v1 classes (mostly renames), review CSV
   for leftovers.
4. CDPHP & CVS OTCHS imports (when we run them) each get their own 1-page dictionary into v1 —
   their categories map cleanly (CDPHP "Bathroom Safety & Fall Prevention" → bathroom-safety +
   fall-prevention; CVS "Home Health Care" → split by keyword rules into 10/11/12 with review).
5. The full-export CSV (`products-full-export.csv`) is the audit surface: pivot by
   category × source_section to find residual mismatches after migration.
