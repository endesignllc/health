/**
 * Fixture tests for lib/variant-label.ts (no test runner dependency).
 * Run: npx tsx scripts/test-variant-label.ts
 */
import {
  extractVariantOptionLabel,
  extractVariantOptionDetail,
  extractVariantListingAttribute,
  variantListingParseSource,
} from "../lib/variant-label";

const CASES: { desc: string; label: string | null; detail: string | null }[] = [
  {
    desc: 'Compression for weak/injured wrist. Fits right or left. M (6"-7" circum).',
    label: "M",
    detail: 'M · 6"–7" circum',
  },
  {
    desc: "Fits most. XL (12\"–14\" wrist).",
    label: "XL",
    detail: "XL · 12\"–14\" wrist",
  },
  {
    desc: "Support brace. S (5\" / 6\").",
    label: "S",
    detail: "S · 5\"–6\"",
  },
  {
    desc: "Elastic sleeve. L (large fit).",
    label: "L",
    detail: "L · large fit",
  },
  {
    desc: "Unisex wrap. XXL (20\" max).",
    label: "XXL",
    detail: "XXL · 20\" max",
  },
  {
    desc: "Vitamin D supplement 1000 IU.",
    label: null,
    detail: null,
  },
  {
    desc: "Sock pair. M (pending close paren",
    label: "M",
    detail: "M",
  },
  {
    desc: "Trial size \u2014 no size token.",
    label: null,
    detail: null,
  },
  {
    desc: "Brace \u2014 M (6\u201c-7\u201d circum).",
    label: "M",
    detail: 'M · 6"–7" circum',
  },
  {
    desc: 'XXXL (48"-52" waist).',
    label: "XXXL",
    detail: 'XXXL · 48"–52" waist',
  },
  {
    desc: "For arthritis, carpal tunnel, tendonitis. Breathable cotton/spandex. Gray. S.",
    label: "S",
    detail: "S",
  },
  {
    desc: "Light compression for tired legs. Black. XL Regular.",
    label: "XL",
    detail: "XL",
  },
  {
    desc: "Sheer. 8-15 mmHg. Black. XL.",
    label: "XL",
    detail: "XL",
  },
  {
    desc: 'Breathable & contoured with leg gathers. Moderate absorbency. 5.5" x 10.5".',
    label: "Moderate absorbency",
    detail: 'Moderate absorbency · 5.5" × 10.5"',
  },
  {
    desc: 'Breathable & contoured with leg gathers. Maximum absorbency. 6.5" x 13.5".',
    label: "Maximum absorbency",
    detail: 'Maximum absorbency · 6.5" × 13.5"',
  },
  {
    desc: 'Breathable & contoured with leg gathers. Ultimate absorbency. 8" x 17".',
    label: "Ultimate absorbency",
    detail: 'Ultimate absorbency · 8" × 17"',
  },
  {
    desc: 'Breathable & contoured with leg gathers. Ultimate absorbency. 8"" x 17"".',
    label: "Ultimate absorbency",
    detail: 'Ultimate absorbency · 8" × 17"',
  },
];

let failed = 0;
for (let i = 0; i < CASES.length; i++) {
  const c = CASES[i]!;
  const label = extractVariantOptionLabel(c.desc);
  const detail = extractVariantOptionDetail(c.desc);
  if (label !== c.label || detail !== c.detail) {
    failed++;
    console.error(`FAIL case ${i + 1}`);
    console.error("  desc:", c.desc);
    console.error("  expected label:", c.label, "got:", label);
    console.error("  expected detail:", c.detail, "got:", detail);
  }
}

if (failed === 0) {
  console.log("test-variant-label: all", CASES.length, "description cases passed");
} else {
  console.error("test-variant-label:", failed, "case(s) failed");
  process.exit(1);
}

const LISTING_CASES: {
  name: string;
  desc: string | null;
  listing: string | null;
  source: "description" | "name" | "none";
}[] = [
  {
    name: "CURAD Knee High Compression Hosiery 8-15 mmHg",
    desc: "Sheer support.",
    listing: "8–15 mmHg",
    source: "name",
  },
  {
    name: "CURAD Infrared Elastic Pull-Over Ankle Support",
    desc: "L/XL wrap. Fits most.",
    listing: "L/XL",
    source: "description",
  },
  {
    name: "CURAD Arthritis Relief Compression Gloves",
    desc: "For arthritis, carpal tunnel, tendonitis. Breathable cotton/spandex. Gray. M.",
    listing: "M",
    source: "description",
  },
  {
    name: "Medline ContourPlus Bladder Pads",
    desc: 'Breathable & contoured with leg gathers. Maximum absorbency. 6.5" x 13.5".',
    listing: 'Maximum absorbency · 6.5" × 13.5"',
    source: "description",
  },
  {
    name: "Medline ContourPlus Bladder Pads",
    desc: 'Breathable & contoured with leg gathers. Ultimate absorbency. 8" x 17".',
    listing: 'Ultimate absorbency · 8" × 17"',
    source: "description",
  },
  {
    name: "CURAD Knee High Compression Hosiery 8-15 mmHg",
    desc: "Light compression for tired legs. Black. XL Regular.",
    listing: "XL",
    source: "description",
  },
  {
    name: "Plain retail title with no tokens",
    desc: null,
    listing: null,
    source: "none",
  },
];

let failedListing = 0;
for (let i = 0; i < LISTING_CASES.length; i++) {
  const c = LISTING_CASES[i]!;
  const listing = extractVariantListingAttribute(c.name, c.desc);
  const source = variantListingParseSource(c.name, c.desc);
  if (listing !== c.listing || source !== c.source) {
    failedListing++;
    console.error(`FAIL listing case ${i + 1}`);
    console.error("  name:", c.name);
    console.error("  expected listing:", c.listing, "got:", listing);
    console.error("  expected source:", c.source, "got:", source);
  }
}

if (failedListing > 0) {
  console.error("test-variant-label:", failedListing, "listing case(s) failed");
  process.exit(1);
}

console.log("test-variant-label: all", LISTING_CASES.length, "listing cases passed");
