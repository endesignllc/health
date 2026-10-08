# Catalog Sources — Products for the Multi-Benefit Shopping Experience

**Purpose:** Highmark gates its member catalog behind login, but plan OTC catalogs leak into public view constantly — employer/retiree group sites, state Medicaid pages, and carriers that just publish them. Verified sources below, ranked by what each adds to the Benefit Rails build. All are PDFs our existing `intel:extract-pdfs` pipeline can ingest.

---

## Verified public catalogs (checked Oct 8, 2026)

| # | Catalog | Administrator / shape | Size | Why it matters for us |
|---|---|---|---|---|
| 1 | **Highmark MA OTC Product Catalog** — public copy on PASSHE retiree site (passhe.edu → freedom-blue-ppo → otc-product-catalog.pdf) | Medline-run OTC Fulfillment Center → **the PayForward-adjacent catalog** | full Highmark member catalog | The exact supply base behind ShopHighmarkOTC. Demo products drawn from here are *literally what a Highmark member sees*. Top priority. |
| 1b | **Highmark Wholecare 2024 OTC Catalog** (highmark.com /content/dam/ … /formulary/formulary2024_OTC.pdf — **verified live**, found by Mike) | **Fieldtex Products** (Rochester NY) — Wholecare Diamond/Ruby D-SNP; $320/qtr Diamond, $140/qtr Ruby | hundreds of items with **part numbers, prices, sizes** | The most *structured* Highmark-family source yet: item codes + prices + **sizing charts for socks/stockings/supports** (direct seed data for the Fit Profile size axes). Compression 8-15 → 30-40 mmHg, BP monitors, TENS, supports — DME-overlap depth. Also encodes two eligibility semantics our rails model must support: **per-year quantity limits** and **dual-purpose items gated on physician recommendation**. One year old, so use for structure/families, not current pricing. |
| 2 | **CDPHP 2026 OTC Catalog** (cdphp.com → medicare2026 → medicare-otc-catalog.pdf) — **verified live, current year** | **NationsBenefits** | ~800–900 items, 22 categories | Richest multi-rail content: dedicated **Bathroom Safety & Fall Prevention** category (grab bars, commodes, bed rails), reading glasses +1.0 to +4.0, compression stockings, BP monitors, TENS — the DME/vision/home-safety overlap products the badge system needs. Also shows the NationsBenefits catalog shape. |
| 3 | **CVS OTCHS catalog** (cvs.com/bizcontent/otchs/catalog/250714.pdf — verified: 2025 Aetna Better Health MD) | **CVS OTC Health Solutions** (Aetna & many others) | ~600–700 items, 36 OTC categories + grocery | Item-code system (A1–V132) = a second naming convention to map against ours. Includes Reading Glasses, Batteries, Home Health Care, Home Diagnostics, plus **grocery** (the Food purse). The `/bizcontent/otchs/catalog/` path hosts many per-plan PDFs — one URL pattern, many plan variants. |
| 4 | **Humana I-SNP OTC catalog** (assets.humana.com → "2025 ISNP OTC catalog_English") | Humana / CenterWell mail order | mid-size | Third administrator shape; I-SNP skew = institutional/frailty products (good for fall-prevention and incontinence depth). |
| 5 | **Medline CAT_OTC-Products.pdf** (catalogcontent.medline.com) | Medline supplier-side master | large | The supplier master our catalog already leans on — use for GTIN/manufacturer-number enrichment rather than as a plan catalog. |

**Already in the repo:** Memorial Hermann 2026 extract, Medline SNF extract, Walmart pricing/images, Kaiser CA + Aetna OTCHS flagged in DEV_SCHEDULE. **Dead end:** the Solutran-hosted UHC UCard national catalog PDF 404s now; UHC is lowest priority anyway (S3/UCard shape, obtainable later via mirror sites if needed).

---

## What this unlocks per benefit rail

- **OTC** — every catalog above; the intersection across 4+ administrators defines the "typical plan" product set Mike described.
- **Home Safety / SSBCI** — CDPHP's fall-prevention category is the cleanest seed list (≈15–20 product families, straight onto the HEDIS falls story).
- **Vision** — reading glasses (CDPHP, CVS), eye care consumables everywhere; prescription eyewear stays a **guided hand-off rail** (allowance badge, no cart) per the Benefit Rails brief — no SKUs needed.
- **Hearing** — ear care consumables + batteries are in-catalog; our existing **hearing amplifier qualifier pilot** products carry the Hearing badge; aids remain a TruHearing-style hand-off.
- **Dental** — oral hygiene/denture care in every catalog; dental *services* stay a hand-off rail.
- **DME overlap** — compression stockings, canes, commodes, BP monitors (CDPHP, CVS Home Health Care) — the exact items that earn the **"$0 for you"** badge on Senior-Blue-shaped plans.

## Recommended ingestion order

1. **Highmark/PASSHE catalog** → run through `intel:extract-pdfs`; tag families against our taxonomy. This is the demo catalog.
2. **CDPHP 2026** → primarily to seed the Home Safety, Reading Glasses, and DME-overlap families and their benefit-eligibility facts.
3. **CVS OTCHS** → cross-reference pass: items appearing in 3+ catalogs get a `commonality` score — those are the "typical plan" products; the item-code ↔ our-taxonomy mapping also stress-tests the naming hierarchy against a second convention.
4. Humana I-SNP → depth pass on incontinence/frailty once 1–3 are merged.

Matching note: these catalogs use internal item codes, not GTINs — match via the existing normalized-name pipeline, then enrich with GTIN/manufacturer numbers from the Medline master (#5) so cross-catalog identity stays data-defensible.

**Honest sourcing rule:** these are publicly posted documents and we extract *product facts* (names, sizes, categories) to build our own canonical families — we don't reproduce any catalog's copy, pricing, or branding on the site.

---

## Parse assessment: formulary2024_OTC.pdf (Wholecare/Fieldtex) — verified Oct 8, 2026

Mike's uploaded copy was inspected programmatically. **Verdict: parses cleanly into the demo with the existing pipeline.**

- **Text layer:** native PDF — 76 of 78 pages carry full text. No OCR needed.
- **Row structure:** `product name + size/count` → `5-digit item code` (occasional `N` suffix = generic variant) → `$price`. Category headers carry **"Category Item Limit: N Per Quarter"** — parse these into the quantity-limit field the Benefit Rails model needs.
- **Brand/generic linkage is explicit** ("(generic allegra)", "loratidine") — free training/seed data for Generic Savings badges.
- **Images: 583 embedded; 577 are product shots**, dominant format 342×342 JPEG, clean white-background pack shots (sample verified visually). Quality is right for product cards; soft for zoom views — keep Walmart image sync as the upgrade path.
- **Image↔product mapping is deterministic:** 3-column grid, one image per cell with code/price in the same column band (verified on page 6: 15 images ↔ 15 item codes). Bind by column x-range + row proximity — same approach as `extract-pdf-images-and-map.ts`, new layout profile.
- **Pipeline work:** one new extractor profile (Fieldtex layout) feeding the existing merge/import scripts, plus two new parse rules: category quarter-limits and the N-suffix generic convention. The sock/stocking/support **sizing-chart pages should be parsed into Fit Profile axis definitions**, not discarded as non-product pages.
- **Caveats:** 2024 prices (structure yes, pricing no); manufacturer pack-shot images are fine for the gated demo, revisit rights for public production.
