import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";

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

const DEFAULT_INPUT_DIR = process.cwd();
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "product-intel", "output");
const DEFAULT_OUTPUT_FILE = "medline-pdf-product-rows.json";

const SKIP_LINE_RE =
  /^(?:item no\.?|description|pkg\.?|compare to|retail price|order no\.?|sku|catalog|--\s*\d+\s*of\s*\d+\s*--|page\s*\d+|confidential|phone|website)\s*$/i;
const PAGE_MARKER_RE = /^--\s*(\d+)\s*of\s*\d+\s*--$/i;
const PRICE_RE = /\$\s*(\d+(?:\.\d{2})?)/;
const SECTION_RE = /^[A-Za-z][A-Za-z/&,+\- ]{2,70}$/;
const SKU_TOKEN_RE = /^(?:[A-Z]{1,4}\d[A-Z0-9-]{2,}|\d{4,}|[A-Z]{2,}\d{2,}[A-Z0-9-]*)$/;
const PKG_RE =
  /\b(\d+(?:\.\d+)?\s?(?:ct|count|pk|pack|pkg|bx|box|ea|oz|ml|lb|pair|pairs|roll|tabs?|tablets|caps?|capsules|sprays?))\b/i;

const BRAND_MARKERS = [
  "medline",
  "curad",
  "cvs",
  "equate",
  "up&up",
  "tylenol",
  "advil",
  "aleve",
  "zyrtec",
];

function normalizeSpaces(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function pickBrand(description: string): string | null {
  const lower = description.toLowerCase();
  for (const brand of BRAND_MARKERS) {
    if (lower.includes(brand)) return brand;
  }
  return null;
}

function isLikelySection(line: string): boolean {
  if (!SECTION_RE.test(line)) return false;
  if (/\d/.test(line)) return false;
  const words = line.split(" ").filter(Boolean).length;
  return words >= 1 && words <= 10;
}

function parseLineAsProduct(line: string): {
  itemNumber: string;
  sku: string;
  productNameRaw: string;
  pkgRaw: string | null;
  priceRaw: string | null;
} | null {
  const normalized = normalizeSpaces(line);
  if (!normalized || SKIP_LINE_RE.test(normalized)) return null;

  const tokens = normalized.split(" ");
  if (tokens.length < 3) return null;

  const skuCandidate = tokens[0];
  if (!SKU_TOKEN_RE.test(skuCandidate)) return null;

  let remainder = tokens.slice(1).join(" ");
  const priceMatch = remainder.match(PRICE_RE);
  const priceRaw = priceMatch ? `$${priceMatch[1]}` : null;
  if (priceMatch) {
    remainder = normalizeSpaces(remainder.replace(priceMatch[0], " "));
  }

  const pkgMatch = remainder.match(PKG_RE);
  const pkgRaw = pkgMatch ? normalizeSpaces(pkgMatch[1]) : null;
  if (pkgMatch) {
    remainder = normalizeSpaces(remainder.replace(pkgMatch[0], " "));
  }

  const productNameRaw = normalizeSpaces(remainder);
  if (!productNameRaw || productNameRaw.length < 3) return null;

  return {
    itemNumber: skuCandidate,
    sku: skuCandidate,
    productNameRaw,
    pkgRaw,
    priceRaw,
  };
}

function parseCardLayoutRows(lines: string[]): Array<{
  sku: string;
  itemNumber: string;
  productNameRaw: string;
  pkgRaw: string | null;
  priceRaw: string | null;
}> {
  const rows: Array<{
    sku: string;
    itemNumber: string;
    productNameRaw: string;
    pkgRaw: string | null;
    priceRaw: string | null;
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = normalizeSpaces(lines[i] ?? "");
    if (!line) continue;
    const priceMatch = line.match(/^[$]\s*(\d+\.\d{2})$/);
    if (!priceMatch) continue;

    const skuLine = normalizeSpaces(lines[i - 1] ?? "");
    if (!SKU_TOKEN_RE.test(skuLine)) continue;

    const pkgLine = normalizeSpaces(lines[i - 2] ?? "");
    const pkgRaw = PKG_RE.test(pkgLine) ? pkgLine : null;

    const descParts: string[] = [];
    for (let j = i - 3; j >= 0 && descParts.length < 4; j--) {
      const candidate = normalizeSpaces(lines[j] ?? "");
      if (!candidate) break;
      if (SKIP_LINE_RE.test(candidate)) break;
      if (PAGE_MARKER_RE.test(candidate)) break;
      if (candidate.match(/^[$]\s*\d+\.\d{2}$/)) break;
      if (SKU_TOKEN_RE.test(candidate)) break;
      if (PKG_RE.test(candidate) && candidate.split(" ").length <= 3) break;
      descParts.unshift(candidate);
    }
    const productNameRaw = normalizeSpaces(descParts.join(" "));
    if (!productNameRaw) continue;

    rows.push({
      sku: skuLine,
      itemNumber: skuLine,
      productNameRaw,
      pkgRaw,
      priceRaw: `$${priceMatch[1]}`,
    });
  }

  return rows;
}

async function extractRowsFromPdf(pdfPath: string): Promise<ExtractedProductRow[]> {
  const parser = new PDFParse({ data: fs.readFileSync(pdfPath) });
  const textResult = await parser.getText();
  await parser.destroy();

  const lines = textResult.text.split("\n").map(normalizeSpaces);
  const rows: ExtractedProductRow[] = [];

  let page: number | null = null;
  let section: string | null = null;

  for (const line of lines) {
    if (!line) continue;
    const pageMatch = line.match(PAGE_MARKER_RE);
    if (pageMatch) {
      page = Number.parseInt(pageMatch[1], 10);
      continue;
    }
    if (isLikelySection(line) && !parseLineAsProduct(line)) {
      section = line;
      continue;
    }
    const parsed = parseLineAsProduct(line);
    if (!parsed) continue;
    rows.push({
      sourcePdf: path.basename(pdfPath),
      page,
      section,
      itemNumber: parsed.itemNumber,
      sku: parsed.sku,
      productNameRaw: parsed.productNameRaw,
      pkgRaw: parsed.pkgRaw,
      priceRaw: parsed.priceRaw,
      brandGuess: pickBrand(parsed.productNameRaw),
      rawLine: line,
    });
  }

  const cardRows = parseCardLayoutRows(lines);
  for (const row of cardRows) {
    rows.push({
      sourcePdf: path.basename(pdfPath),
      page,
      section,
      itemNumber: row.itemNumber,
      sku: row.sku,
      productNameRaw: row.productNameRaw,
      pkgRaw: row.pkgRaw,
      priceRaw: row.priceRaw,
      brandGuess: pickBrand(row.productNameRaw),
      rawLine: `${row.productNameRaw} ${row.pkgRaw ?? ""} ${row.sku} ${row.priceRaw ?? ""}`.trim(),
    });
  }

  const dedup = new Map<string, ExtractedProductRow>();
  for (const row of rows) {
    const key = `${row.sourcePdf}::${row.sku}::${row.productNameRaw.toLowerCase()}`;
    if (!dedup.has(key)) dedup.set(key, row);
  }
  return [...dedup.values()];
}

function getPdfFiles(inputDir: string, explicitFiles: string[]): string[] {
  if (explicitFiles.length > 0) {
    return explicitFiles
      .map((f) => path.resolve(inputDir, f))
      .filter((full) => full.toLowerCase().endsWith(".pdf") && fs.existsSync(full));
  }
  return fs
    .readdirSync(inputDir)
    .filter((name) => name.toLowerCase().endsWith(".pdf"))
    .map((name) => path.join(inputDir, name));
}

async function main() {
  const args = process.argv.slice(2);
  const inputDirArg = args.find((a) => a.startsWith("--input-dir="));
  const outputArg = args.find((a) => a.startsWith("--output="));
  const filesArg = args.find((a) => a.startsWith("--files="));

  const inputDir = inputDirArg
    ? path.resolve(inputDirArg.slice("--input-dir=".length))
    : DEFAULT_INPUT_DIR;
  const outputDir = DEFAULT_OUTPUT_DIR;
  const outputPath = path.join(
    outputDir,
    outputArg ? outputArg.slice("--output=".length) : DEFAULT_OUTPUT_FILE
  );
  const explicitFiles = filesArg
    ? filesArg
        .slice("--files=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const pdfFiles = getPdfFiles(inputDir, explicitFiles);
  if (pdfFiles.length === 0) {
    throw new Error(`No PDF files found in ${inputDir}`);
  }

  const allRows: ExtractedProductRow[] = [];
  for (const pdfFile of pdfFiles) {
    const rows = await extractRowsFromPdf(pdfFile);
    allRows.push(...rows);
  }

  const dedupBySkuAndName = new Map<string, ExtractedProductRow>();
  for (const row of allRows) {
    const key = `${row.sku}::${row.productNameRaw.toLowerCase()}`;
    const existing = dedupBySkuAndName.get(key);
    if (!existing) {
      dedupBySkuAndName.set(key, row);
      continue;
    }
    // Prefer row with explicit section/price if duplicates exist.
    const existingScore =
      (existing.section ? 1 : 0) +
      (existing.priceRaw ? 1 : 0) +
      (existing.pkgRaw ? 1 : 0);
    const rowScore =
      (row.section ? 1 : 0) + (row.priceRaw ? 1 : 0) + (row.pkgRaw ? 1 : 0);
    if (rowScore > existingScore) dedupBySkuAndName.set(key, row);
  }

  const outputRows = [...dedupBySkuAndName.values()];
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(outputRows, null, 2));

  const uniqueSkus = new Set(outputRows.map((r) => r.sku)).size;
  const medlineBrandRows = outputRows.filter(
    (r) => r.brandGuess === "medline" || r.sourcePdf.toLowerCase().includes("medline")
  ).length;

  process.stdout.write(
    `${JSON.stringify(
      {
        pdfFilesProcessed: pdfFiles.map((p) => path.basename(p)),
        outputPath,
        totalRows: outputRows.length,
        uniqueSkus,
        medlineBrandRows,
      },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

