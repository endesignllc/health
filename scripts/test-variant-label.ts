/**
 * Fixture tests for lib/variant-label.ts (no test runner dependency).
 * Run: npx tsx scripts/test-variant-label.ts
 */
import { extractVariantOptionLabel, extractVariantOptionDetail } from "../lib/variant-label";

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
  console.log("test-variant-label: all", CASES.length, "cases passed");
} else {
  console.error("test-variant-label:", failed, "case(s) failed");
  process.exit(1);
}
