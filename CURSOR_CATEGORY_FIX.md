# Cursor Prompt — Fieldtex Category Fix (Deterministic, Not Guessed)

## Root cause

Live-site audit (see the /products PDF capture from Oct 8): toothpaste/toothbrushes/dry-mouth
rinse are in "Mobility & Safety", a blood-pressure monitor is in "Supplements", a TENS device is
in "Supplements", a sharps container is in "Monitoring Devices". The import assigned categories
by keyword guess / fallback. Stop guessing — **the source catalog states every product's
category** via its section headers, and we have extracted that mapping.

## The authoritative input

`product-catalog/fieldtex-section-map.json` — `{ itemCode: sourceSection }` for **543 of 566**
Fieldtex products, extracted from the 2024 catalog's own section headers (57 sections, e.g.
"Dental Care - Dry Mouth", "Supports - Stockings", "Diagnostic Equipment - Scales",
"Incontinence Protection", "Wholecare For You").

## Task 1 — Re-categorize by inheritance

Write `scripts/fix-fieldtex-categories.ts`:
1. Load the section map; join on itemCode (strip the FTX- prefix).
2. Map source section → our category/class via the dictionary below. Where our slug doesn't
   exist yet, create it (flag new ones in the run report).
3. Overwrite the category/class of every matched fieldtex2024 product. Store the raw
   `sourceSection` on the product row too — it's ground truth for later taxonomy work.
4. The ~23 unmatched codes: write to `product-catalog/fieldtex-category-review.csv`
   (code, name, current category) for manual review. Do NOT guess for them.

### Section → category dictionary

| Source sections | Our category/class |
|---|---|
| Allergy · Cold & Flu · Cough Drops · Respiratory Relief | cold-flu-allergy (respiratory stays a filter tag) |
| Dental Care · - Denture · - Dry Mouth · - Toothbrush(+Electric) · - Toothpaste | oral-care (denture-care as subclass) |
| Diabetic Supplies · Diabetic Supplies - Socks | diabetes-care (socks also tag: diabetic-socks) |
| Diagnostic Equipment · - Thermometers · - Scales · Home Testing | monitoring-devices (scales also body-scales class) |
| Ear Care · Eye Care | eye-ear-care |
| Feminine & UTI | feminine-uti-care |
| Fiber Supplements · Colon Support · Lactose · Stomach & Laxatives · Stomach - Antacids · Hemorrhoid | digestive-health |
| First Aid - Bandages / Dressings & Gauze / Tape · First Aid Kits | first-aid |
| Foot Care | foot-care |
| Pain Relief · Hot & Cold Therapy · Ointments & Topicals - Analgesics | pain-relief |
| Incontinence · Incontinence Protection | incontinence (bladder-support need feeds from here) |
| Ointments & Topicals · - Cleaners · Skin Care · Skin Care - Sunscreen | skin-care (barrier creams keep skin-barrier-cream class) |
| Lip Care · Sleep Aid · Motion Sickness · Menopause Relief · Smoking Cessation · Lice | personal-wellness |
| PPE · PPE - Gloves | home-health-supplies |
| Supports - Back/Elbow/Knee/Wrist/Ankle | mobility-supports (keep per-joint as variant axis or tags) |
| Supports - Stockings | compression-stockings |
| Supports - Cushions | support-cushions |
| Wholecare For You | daily-living-aids |
| Diagnostic Equipment - Scales · Weight Loss - Kitchen Scales | body-scales / kitchen-scales |
| Vitamins, Minerals, & Supplements | vitamins-supplements |

Note what this fixes automatically: "Supplements" shrinks to actual vitamins; the TENS device and
heat wraps land in pain-relief; BP monitor joins monitoring-devices; all dental lands in oral-care;
**Supports - Stockings gives compression-stockings a clean authoritative membership** (relevant to
the $0-badge family).

## Task 2 — Repair truncated names

"36 x 72 in." has no product name — multi-line names lost their first line(s) at extraction.
The extractor must concatenate ALL name lines between the previous price/code and the item code
(the mapping JSON work used up-to-3-line reconstruction; mirror that). Re-run extraction for
names only, update rows where the stored name is a strict suffix of the reconstructed name.
Report count fixed.

## Task 3 — Shop filter sanity

After re-categorization, the "All Categories" dropdown on /products must list the new category
set, human-labeled in benefit language (Oral Care, Pain Relief, Incontinence, Home & Daily
Living, Monitoring & Testing, …) — no slugs, no "Supplements" as a dumping ground.

## Acceptance

- Zero dental/oral items under any mobility/safety category; BP monitor + thermometers +
  scales under Monitoring; TENS + heat wraps under Pain Relief; A&D ointment under Skin Care.
- Run report: products re-categorized per category, new classes created, review-CSV count,
  truncated names repaired.
- Spot-check page 1 of /products A–Z against the Oct 8 PDF capture — every item visible there
  must now sit in a sensible category.

## The longer-term principle (capture in code comments)

This is the pattern for every future catalog: **(1) inherit the source document's own taxonomy
deterministically; (2) map source sections → our canonical classes via a reviewed dictionary;
(3) only what the source doesn't classify goes to keyword rules / LLM classification, below a
confidence threshold → human review queue.** That is the Assessment Engine's intake path — never
ship a keyword-guessed category to a member-facing surface again.
