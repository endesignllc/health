import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";

const PDF_PATH = path.join(
  process.cwd(),
  "product-catalog",
  "source-pdfs",
  "formulary2024_OTC.pdf"
);
const OUTPUT_JSON_PATH = path.join(
  process.cwd(),
  "product-catalog",
  "fieldtex-extract.json"
);
const OUTPUT_CSV_PATH = path.join(
  process.cwd(),
  "product-catalog",
  "fieldtex-extract.csv"
);

type ExtractedRow = {
  itemCode: string;
  description: string;
  priceCents: number;
  priceDisplay: string;
  category: string | null;
  quarterlyLimit: number | null;
  isDualPurpose: boolean;
  page: number | null;
  rawLines: string[];
};

/** Match category headers like "Allergy Category Item Limit: 6 Per Quarter" */
const CATEGORY_HEADER_RE =
  /^(.+?)\s*(?:Category\s+)?Item Limit:\s*(\d+)\s*Per Quarter\s*$/i;

/** Match price like "$32.50" */
const PRICE_RE = /^\$(\d+)\.(\d{2})$/;

/** Match 5-digit item codes (may have N suffix for new items) */
const ITEM_CODE_RE = /^(\d{5})N?$/;

/** Match page markers */
const PAGE_MARKER_RE = /^--\s*(\d+)\s*of\s*\d+\s*--$/;

/** Skip lines (headers, footers, etc.) */
const SKIP_RE =
  /^(?:\d+\s+(?:Call us Toll-Free|highmarkwholecareotcstore\.com).*|Use this Catalog|Jan\. 1|Start using your|Over-the-Counter|How much you get:|Highmark Wholecare|Medicare Assured|DiamondSM|RubySM|per quarter|\*Unused amounts|See next page|Table of contents|\.{3,}|Ordering Process|Easy Ways to Order|Order (?:Online|by Mail|by Phone)|www\.|Fieldtex Products|1-\d{3}-\d{3}-\d{4}|Monday|Sunday|You will need to provide|Have the form available|Total all the items|Important Things to Remember|Please keep this catalog|Your OTC benefit covers|If an item is deemed|The website is available|Please allow|If you receive a damaged|are not responsible for|is the supplier|The health information|The OTC benefit only|Products in this catalog|Products with two asterisks|Limitations and restrictions|Sizing Information|Active Ingredients|Dual Purpose Items).*$/i;

function normalizeSpaces(input: string): string {
  return input.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function priceToCents(dollars: string, cents: string): number {
  return parseInt(dollars, 10) * 100 + parseInt(cents, 10);
}

function toCsv(rows: ExtractedRow[]): string {
  const header =
    "itemCode,description,priceCents,priceDisplay,category,quarterlyLimit,isDualPurpose,page";
  const escape = (value: string | number | boolean | null) => {
    if (value === null || value === undefined) return "";
    const v = String(value).replace(/"/g, '""');
    return `"${v}"`;
  };
  const lines = rows.map((r) =>
    [
      escape(r.itemCode),
      escape(r.description),
      escape(r.priceCents),
      escape(r.priceDisplay),
      escape(r.category),
      escape(r.quarterlyLimit),
      escape(r.isDualPurpose),
      escape(r.page),
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

function parseFieldtexCatalog(text: string): ExtractedRow[] {
  const lines = text.split("\n").map((l) => normalizeSpaces(l));
  const rows: ExtractedRow[] = [];

  let currentCategory: string | null = null;
  let currentLimit: number | null = null;
  let currentPage: number | null = null;

  // Buffer for collecting product info
  let descLines: string[] = [];
  let pendingCode: string | null = null;

  const flushProduct = (priceMatch: RegExpMatchArray | null) => {
    if (!pendingCode || !priceMatch) return;

    const priceCents = priceToCents(priceMatch[1], priceMatch[2]);
    const priceDisplay = `$${priceMatch[1]}.${priceMatch[2]}`;

    // Filter out empty/skip lines from description
    const filteredDesc = descLines.filter(
      (l) => l && !SKIP_RE.test(l) && !PAGE_MARKER_RE.test(l)
    );

    if (filteredDesc.length === 0) {
      // No description, reset
      pendingCode = null;
      descLines = [];
      return;
    }

    const description = filteredDesc.join(" ").trim();
    const isDualPurpose = description.includes("**");

    rows.push({
      itemCode: pendingCode,
      description: description.replace(/\*\*/g, "").trim(),
      priceCents,
      priceDisplay,
      category: currentCategory,
      quarterlyLimit: currentLimit,
      isDualPurpose,
      page: currentPage,
      rawLines: [...filteredDesc, pendingCode, priceDisplay],
    });

    pendingCode = null;
    descLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Check for page marker
    const pageMatch = line.match(PAGE_MARKER_RE);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
      continue;
    }

    // Skip known non-product lines
    if (SKIP_RE.test(line)) continue;

    // Check for category header
    const categoryMatch = line.match(CATEGORY_HEADER_RE);
    if (categoryMatch) {
      currentCategory = normalizeSpaces(categoryMatch[1]);
      currentLimit = parseInt(categoryMatch[2], 10);
      continue;
    }

    // Also check for "Continued" category lines
    const continuedMatch = line.match(
      /^(.+?)\s+Continued\s+(?:Category\s+)?Item Limit:\s*(\d+)\s*Per Quarter\s*$/i
    );
    if (continuedMatch) {
      currentCategory = normalizeSpaces(continuedMatch[1]);
      currentLimit = parseInt(continuedMatch[2], 10);
      continue;
    }

    // Check for price
    const priceMatch = line.match(PRICE_RE);
    if (priceMatch) {
      flushProduct(priceMatch);
      continue;
    }

    // Check for item code
    const codeMatch = line.match(ITEM_CODE_RE);
    if (codeMatch) {
      // New product starting - if we had a pending one without price, discard it
      if (pendingCode) {
        descLines = [];
      }
      pendingCode = codeMatch[1];
      continue;
    }

    // Must be a description line
    if (pendingCode) {
      // We're collecting description after seeing a code? That's weird.
      // Actually the pattern seems to be: description lines, then code, then price
      // So if we have a code pending and see more text, it's probably noise
      continue;
    }

    // Collect as potential description
    descLines.push(line);
  }

  return rows;
}

/**
 * Alternative parsing approach - look for code+price pairs and work backwards
 */
function parseFieldtexReverse(text: string): ExtractedRow[] {
  const lines = text.split("\n").map((l) => normalizeSpaces(l));
  const rows: ExtractedRow[] = [];

  let currentCategory: string | null = null;
  let currentLimit: number | null = null;
  let currentPage: number | null = null;

  // First pass: collect metadata for each line
  const lineInfo: Array<{
    line: string;
    idx: number;
    isPrice: boolean;
    isCode: boolean;
    isCategory: boolean;
    isPage: boolean;
    isSkip: boolean;
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    lineInfo.push({
      line,
      idx: i,
      isPrice: PRICE_RE.test(line),
      isCode: ITEM_CODE_RE.test(line),
      isCategory: CATEGORY_HEADER_RE.test(line) || /Continued\s+(?:Category\s+)?Item Limit/i.test(line),
      isPage: PAGE_MARKER_RE.test(line),
      isSkip: !line || SKIP_RE.test(line),
    });
  }

  // Second pass: find price lines and work backwards
  for (let i = 0; i < lineInfo.length; i++) {
    const info = lineInfo[i];

    // Track page
    if (info.isPage) {
      const m = info.line.match(PAGE_MARKER_RE);
      if (m) currentPage = parseInt(m[1], 10);
      continue;
    }

    // Track category
    if (info.isCategory) {
      const m = info.line.match(CATEGORY_HEADER_RE) ||
        info.line.match(/^(.+?)\s+Continued\s+(?:Category\s+)?Item Limit:\s*(\d+)\s*Per Quarter\s*$/i);
      if (m) {
        currentCategory = normalizeSpaces(m[1]);
        currentLimit = parseInt(m[2], 10);
      }
      continue;
    }

    if (!info.isPrice) continue;

    // Found a price - look for code immediately before
    const priceMatch = info.line.match(PRICE_RE);
    if (!priceMatch) continue;

    let codeIdx = i - 1;
    while (codeIdx >= 0 && (lineInfo[codeIdx].isSkip || !lineInfo[codeIdx].line)) {
      codeIdx--;
    }

    if (codeIdx < 0 || !lineInfo[codeIdx].isCode) continue;

    const codeMatch = lineInfo[codeIdx].line.match(ITEM_CODE_RE);
    if (!codeMatch) continue;

    // Collect description lines going backwards from code
    const descParts: string[] = [];
    let descIdx = codeIdx - 1;
    while (descIdx >= 0) {
      const descInfo = lineInfo[descIdx];
      if (descInfo.isPrice || descInfo.isCode || descInfo.isCategory || descInfo.isPage) break;
      if (descInfo.isSkip || !descInfo.line) {
        descIdx--;
        continue;
      }
      descParts.unshift(descInfo.line);
      if (descParts.length >= 5) break; // Max 5 lines of description
      descIdx--;
    }

    if (descParts.length === 0) continue;

    const description = descParts.join(" ").trim();
    const isDualPurpose = description.includes("**");

    rows.push({
      itemCode: codeMatch[1],
      description: description.replace(/\*\*/g, "").trim(),
      priceCents: priceToCents(priceMatch[1], priceMatch[2]),
      priceDisplay: `$${priceMatch[1]}.${priceMatch[2]}`,
      category: currentCategory,
      quarterlyLimit: currentLimit,
      isDualPurpose,
      page: currentPage,
      rawLines: [...descParts, codeMatch[1], `$${priceMatch[1]}.${priceMatch[2]}`],
    });
  }

  return rows;
}

async function main() {
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`PDF not found at ${PDF_PATH}`);
    process.exit(1);
  }

  const dataBuffer = fs.readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: dataBuffer });
  const textResult = await parser.getText();
  await parser.destroy();

  // Try both parsing approaches and merge
  const forwardRows = parseFieldtexCatalog(textResult.text);
  const reverseRows = parseFieldtexReverse(textResult.text);

  // Dedupe by item code
  const byCode = new Map<string, ExtractedRow>();
  for (const row of [...reverseRows, ...forwardRows]) {
    if (!byCode.has(row.itemCode)) {
      byCode.set(row.itemCode, row);
    }
  }
  const rows = [...byCode.values()].sort((a, b) =>
    (a.category ?? "").localeCompare(b.category ?? "") ||
    a.itemCode.localeCompare(b.itemCode)
  );

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(rows, null, 2));
  fs.writeFileSync(OUTPUT_CSV_PATH, toCsv(rows));

  const uniqueCodes = new Set(rows.map((r) => r.itemCode)).size;
  const categories = new Set(rows.map((r) => r.category).filter(Boolean));
  const dualPurpose = rows.filter((r) => r.isDualPurpose).length;

  console.log(
    JSON.stringify(
      {
        sourcePdf: PDF_PATH,
        outputJson: OUTPUT_JSON_PATH,
        outputCsv: OUTPUT_CSV_PATH,
        extractedRows: rows.length,
        uniqueCodes,
        categories: [...categories],
        dualPurposeItems: dualPurpose,
        forwardParseRows: forwardRows.length,
        reverseParseRows: reverseRows.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
