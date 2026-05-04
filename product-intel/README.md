# Medline Product Intelligence Pipeline

This pipeline is intentionally isolated from storefront rendering. It runs as scripts only and writes output artifacts under `product-intel/output`.

## Purpose

- Parse PDF catalogs into structured product rows.
- Normalize Medline SKU/product records.
- Propose generic product types and consumer rollup groups.
- Generate a manual-review queue for low-confidence mappings.

## Inputs

- Place Medline product PDFs in the project root (`HealthBenefits.Shop/*.pdf`), or pass explicit files.

## Outputs

Files are generated in `product-intel/output`:

- `medline-pdf-product-rows.json`
- `medline-sku-normalized.json`
- `medline-generic-types.json`
- `medline-consumer-groups.json`
- `medline-sku-group-map.json`
- `medline-manual-review-queue.json`

## Commands

Run extraction:

```bash
npm run intel:extract-pdfs
```

Build rollups from extracted rows:

```bash
npm run intel:build-rollups
```

Run full pipeline:

```bash
npm run intel:pipeline
```

## Notes

- This does **not** modify runtime routes/components.
- This does **not** update database records unless you choose to add a separate import step.
- The current grouping logic is deterministic and intended as a baseline for human review.
- You can later add an LLM enrichment step between extraction and rollups for better synonym and function inference.

