import fs from "fs";
import path from "path";

type ExtractedProductRow = {
  sourcePdf: string;
  page: number | null;
  section: string | null;
  itemNumber: string;
  sku: string;
  productNameRaw: string;
  pkgRaw: string | null;
  priceRaw: string | null;
  brandGuess: string | null;
  rawLine: string;
};

type NormalizedSkuRecord = {
  sku: string;
  itemNumber: string;
  sourcePdf: string;
  productNameRaw: string;
  section: string | null;
  brand: string | null;
  normalizedName: string;
  genericTypeKey: string;
  genericTypeName: string;
  formFactor: string | null;
  dosage: string | null;
  strength: string | null;
  countOrSize: string | null;
  mmhg: string | null;
  absorbency: string | null;
  sizeQualifier: string | null;
  lockedQualifiers: string[];
  suggestedGroupKey: string;
  confidence: number;
};

const DEFAULT_INPUT_PATH = path.join(
  process.cwd(),
  "product-intel",
  "output",
  "medline-pdf-product-rows.json"
);
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "product-intel", "output");

const STOP_WORDS = new Set([
  "for",
  "with",
  "and",
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "plus",
  "extra",
  "maximum",
  "regular",
  "daily",
  "advanced",
  "premium",
  "new",
  "formula",
  "soft",
]);

const BRAND_WORDS = new Set([
  "medline",
  "curad",
  "equate",
  "cvs",
  "up&up",
  "tylenol",
  "advil",
  "aleve",
  "zyrtec",
  "bayer",
  "motrin",
]);

function normalizeSpaces(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function toLowerClean(value: string): string {
  return normalizeSpaces(value)
    .toLowerCase()
    .replace(/[^a-z0-9%/\- ]/g, " ");
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseStrength(name: string): string | null {
  const match = name.match(/\b(\d+(?:\.\d+)?)\s?(mg|mcg|g|iu|%)\b/i);
  return match ? `${match[1]} ${match[2].toLowerCase()}` : null;
}

function parseDosage(name: string): string | null {
  const match = name.match(/\b(\d+(?:\.\d+)?)\s?(mg|mcg|g|ml|oz)\b/i);
  return match ? `${match[1]} ${match[2].toLowerCase()}` : null;
}

function parseCountOrSize(name: string, pkg: string | null): string | null {
  const source = `${name} ${pkg ?? ""}`;
  const match = source.match(
    /\b(\d+(?:\.\d+)?)\s?(ct|count|pk|pack|pkg|box|bx|ea|pair|pairs|roll|tabs?|tablets|caps?|capsules|oz|ml|lb)\b/i
  );
  return match ? `${match[1]} ${match[2].toLowerCase()}` : null;
}

function parseMmhg(name: string): string | null {
  const match = name.match(/\b(\d{1,2}\s?-\s?\d{1,2}\s?mmhg|\d{1,2}\s?mmhg)\b/i);
  return match ? normalizeSpaces(match[1].toLowerCase()) : null;
}

function parseAbsorbency(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes("maximum absorb")) return "maximum";
  if (lower.includes("moderate absorb")) return "moderate";
  if (lower.includes("light absorb")) return "light";
  if (lower.includes("overnight absorb")) return "overnight";
  return null;
}

function parseSizeQualifier(name: string): string | null {
  const m1 = name.match(/\b(xs|s|m|l|xl|xxl|xxxl)\b/i);
  if (m1) return m1[1].toUpperCase();
  const m2 = name.match(/\b(small|medium|large|x-large|xx-large)\b/i);
  return m2 ? m2[1].toLowerCase() : null;
}

function inferFormFactor(name: string): string | null {
  const lower = name.toLowerCase();
  if (/\btablet|caplet|capsule\b/.test(lower)) return "tablet/capsule";
  if (/\bcream|ointment|gel|lotion\b/.test(lower)) return "topical";
  if (/\bpatch\b/.test(lower)) return "patch";
  if (/\bspray\b/.test(lower)) return "spray";
  if (/\bbrief|underwear|pad|underpad\b/.test(lower)) return "incontinence";
  if (/\bsock|stocking|compression\b/.test(lower)) return "compression";
  if (/\bmonitor|meter|thermometer|oximeter|device\b/.test(lower)) return "device";
  if (/\bbandage|gauze|tape|dressing\b/.test(lower)) return "first-aid";
  if (/\btoothpaste|toothbrush|floss\b/.test(lower)) return "oral-care";
  return null;
}

function normalizeNameForGeneric(name: string): string {
  const clean = toLowerClean(name);
  const tokens = clean.split(" ").filter(Boolean);
  const filtered = tokens.filter((token) => {
    if (STOP_WORDS.has(token)) return false;
    if (BRAND_WORDS.has(token)) return false;
    if (/^\d+([./-]\d+)?$/.test(token)) return false;
    if (/^(mg|mcg|g|ml|oz|ct|pack|pk|box|ea|mmhg|iu|%)$/.test(token)) return false;
    return true;
  });
  return filtered.slice(0, 7).join(" ");
}

function buildGenericTypeName(normalizedName: string, formFactor: string | null): string {
  if (!normalizedName) return "Unclassified Product";
  return titleCase(`${normalizedName}${formFactor ? ` ${formFactor}` : ""}`.trim());
}

function parsePriceToCents(priceRaw: string | null): number | null {
  if (!priceRaw) return null;
  const match = priceRaw.match(/(\d+(?:\.\d{2})?)/);
  if (!match) return null;
  const num = Number.parseFloat(match[1]);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}

function computeConfidence(record: {
  genericTypeKey: string;
  formFactor: string | null;
  strength: string | null;
  countOrSize: string | null;
  lockedQualifiers: string[];
}): number {
  let score = 0.45;
  if (record.genericTypeKey.length > 5) score += 0.15;
  if (record.formFactor) score += 0.12;
  if (record.strength) score += 0.1;
  if (record.countOrSize) score += 0.08;
  if (record.lockedQualifiers.length > 0) score += 0.1;
  return Math.min(0.98, Math.round(score * 100) / 100);
}

function main() {
  const args = process.argv.slice(2);
  const inputArg = args.find((a) => a.startsWith("--input="));
  const medlineOnly = !args.includes("--all-brands");
  const inputPath = inputArg
    ? path.resolve(inputArg.slice("--input=".length))
    : DEFAULT_INPUT_PATH;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const rawRows = JSON.parse(fs.readFileSync(inputPath, "utf8")) as ExtractedProductRow[];
  if (!Array.isArray(rawRows)) {
    throw new Error("Input JSON is not an array");
  }

  const filteredRows = rawRows.filter((row) => {
    if (!medlineOnly) return true;
    const sourceLooksMedline = row.sourcePdf.toLowerCase().includes("medline");
    const brandLooksMedline =
      row.brandGuess?.toLowerCase() === "medline" ||
      row.productNameRaw.toLowerCase().includes("medline");
    return sourceLooksMedline || brandLooksMedline;
  });

  const normalizedRecords: NormalizedSkuRecord[] = filteredRows.map((row) => {
    const formFactor = inferFormFactor(row.productNameRaw);
    const strength = parseStrength(row.productNameRaw);
    const dosage = parseDosage(row.productNameRaw);
    const countOrSize = parseCountOrSize(row.productNameRaw, row.pkgRaw);
    const mmhg = parseMmhg(row.productNameRaw);
    const absorbency = parseAbsorbency(row.productNameRaw);
    const sizeQualifier = parseSizeQualifier(row.productNameRaw);

    const lockedQualifiers: string[] = [];
    if (mmhg) lockedQualifiers.push(`compression:${mmhg}`);
    if (absorbency) lockedQualifiers.push(`absorbency:${absorbency}`);
    if (sizeQualifier) lockedQualifiers.push(`size:${sizeQualifier}`);
    if (strength) lockedQualifiers.push(`strength:${strength}`);

    const normalizedName = normalizeNameForGeneric(row.productNameRaw);
    const genericTypeKey = normalizedName.replace(/\s+/g, "-") || "unclassified";
    const genericTypeName = buildGenericTypeName(normalizedName, formFactor);
    const qualifierKey =
      lockedQualifiers.length > 0 ? lockedQualifiers.sort().join("|") : "standard";
    const suggestedGroupKey = `${genericTypeKey}::${qualifierKey}`;

    return {
      sku: row.sku,
      itemNumber: row.itemNumber,
      sourcePdf: row.sourcePdf,
      productNameRaw: row.productNameRaw,
      section: row.section,
      brand: row.brandGuess,
      normalizedName,
      genericTypeKey,
      genericTypeName,
      formFactor,
      dosage,
      strength,
      countOrSize,
      mmhg,
      absorbency,
      sizeQualifier,
      lockedQualifiers,
      suggestedGroupKey,
      confidence: computeConfidence({
        genericTypeKey,
        formFactor,
        strength,
        countOrSize,
        lockedQualifiers,
      }),
    };
  });

  const genericTypeMap = new Map<
    string,
    {
      genericTypeKey: string;
      genericTypeName: string;
      representativeSkus: string[];
      skuCount: number;
      sampleNames: string[];
    }
  >();

  for (const record of normalizedRecords) {
    const existing = genericTypeMap.get(record.genericTypeKey);
    if (!existing) {
      genericTypeMap.set(record.genericTypeKey, {
        genericTypeKey: record.genericTypeKey,
        genericTypeName: record.genericTypeName,
        representativeSkus: [record.sku],
        skuCount: 1,
        sampleNames: [record.productNameRaw],
      });
      continue;
    }
    existing.skuCount += 1;
    if (existing.representativeSkus.length < 5) existing.representativeSkus.push(record.sku);
    if (existing.sampleNames.length < 5) existing.sampleNames.push(record.productNameRaw);
  }

  const groupMap = new Map<
    string,
    {
      groupKey: string;
      genericTypeKey: string;
      lockedQualifiers: string[];
      skuCount: number;
      skus: string[];
      minPriceCents: number | null;
      maxPriceCents: number | null;
      avgPriceCents: number | null;
    }
  >();

  for (const record of normalizedRecords) {
    const existing = groupMap.get(record.suggestedGroupKey);
    const priceCents = parsePriceToCents(
      filteredRows.find((r) => r.sku === record.sku && r.productNameRaw === record.productNameRaw)
        ?.priceRaw ?? null
    );
    if (!existing) {
      groupMap.set(record.suggestedGroupKey, {
        groupKey: record.suggestedGroupKey,
        genericTypeKey: record.genericTypeKey,
        lockedQualifiers: [...record.lockedQualifiers],
        skuCount: 1,
        skus: [record.sku],
        minPriceCents: priceCents,
        maxPriceCents: priceCents,
        avgPriceCents: priceCents,
      });
      continue;
    }

    existing.skuCount += 1;
    if (!existing.skus.includes(record.sku)) existing.skus.push(record.sku);
    if (priceCents !== null) {
      existing.minPriceCents =
        existing.minPriceCents === null
          ? priceCents
          : Math.min(existing.minPriceCents, priceCents);
      existing.maxPriceCents =
        existing.maxPriceCents === null
          ? priceCents
          : Math.max(existing.maxPriceCents, priceCents);
      const prevAvg = existing.avgPriceCents ?? priceCents;
      existing.avgPriceCents = Math.round((prevAvg + priceCents) / 2);
    }
  }

  const reviewQueue = normalizedRecords
    .filter((record) => record.confidence < 0.72 || record.genericTypeKey === "unclassified")
    .map((record) => ({
      sku: record.sku,
      itemNumber: record.itemNumber,
      productNameRaw: record.productNameRaw,
      genericTypeKey: record.genericTypeKey,
      suggestedGroupKey: record.suggestedGroupKey,
      confidence: record.confidence,
      reason:
        record.genericTypeKey === "unclassified"
          ? "missing_generic_key"
          : "low_confidence",
    }));

  fs.mkdirSync(DEFAULT_OUTPUT_DIR, { recursive: true });
  const outNormalized = path.join(DEFAULT_OUTPUT_DIR, "medline-sku-normalized.json");
  const outGeneric = path.join(DEFAULT_OUTPUT_DIR, "medline-generic-types.json");
  const outGroups = path.join(DEFAULT_OUTPUT_DIR, "medline-consumer-groups.json");
  const outMap = path.join(DEFAULT_OUTPUT_DIR, "medline-sku-group-map.json");
  const outReview = path.join(DEFAULT_OUTPUT_DIR, "medline-manual-review-queue.json");

  fs.writeFileSync(outNormalized, JSON.stringify(normalizedRecords, null, 2));
  fs.writeFileSync(outGeneric, JSON.stringify([...genericTypeMap.values()], null, 2));
  fs.writeFileSync(outGroups, JSON.stringify([...groupMap.values()], null, 2));
  fs.writeFileSync(
    outMap,
    JSON.stringify(
      normalizedRecords.map((record) => ({
        sku: record.sku,
        itemNumber: record.itemNumber,
        genericTypeKey: record.genericTypeKey,
        groupKey: record.suggestedGroupKey,
        confidence: record.confidence,
      })),
      null,
      2
    )
  );
  fs.writeFileSync(outReview, JSON.stringify(reviewQueue, null, 2));

  process.stdout.write(
    `${JSON.stringify(
      {
        inputPath,
        medlineOnly,
        rowsRead: rawRows.length,
        rowsUsed: filteredRows.length,
        normalizedRecords: normalizedRecords.length,
        genericTypes: genericTypeMap.size,
        consumerGroups: groupMap.size,
        manualReviewCount: reviewQueue.length,
        outputs: {
          normalized: outNormalized,
          genericTypes: outGeneric,
          consumerGroups: outGroups,
          skuGroupMap: outMap,
          reviewQueue: outReview,
        },
      },
      null,
      2
    )}\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

