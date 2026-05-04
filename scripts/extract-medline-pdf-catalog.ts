import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";

const DEFAULT_PDF_URL =
  "https://catalogcontent.medline.com/wp-content/uploads/2020/04/CAT_OTC-Products-Catalog.pdf";
const DEFAULT_PDF_PATH = path.join(
  process.cwd(),
  "product-catalog",
  "CAT_OTC-Products-Catalog.pdf"
);
const OUTPUT_JSON_PATH = path.join(
  process.cwd(),
  "product-catalog",
  "medline-pdf-extract.json"
);
const OUTPUT_CSV_PATH = path.join(
  process.cwd(),
  "product-catalog",
  "medline-pdf-extract.csv"
);

type ExtractedRow = {
  sku: string;
  description: string;
  pkg: string | null;
  price: string | null;
  compareTo: string | null;
  section: string | null;
  page: number | null;
  medlineBrand: boolean;
  rawLine: string;
};

const TABLE_HEADER_RE =
  /^Item No\.\s+Description\s+Pkg\.?(?:\s+Compare To)?$/i;
const SKU_LINE_RE =
  /^(n{1,2}\s+)?([A-Z0-9][A-Z0-9-]{4,})\s+(.+)$/;

const SKIP_LINE_RE =
  /^(?:--\s+\d+\s+of\s+\d+\s+--|Flag Highlighter|MEDLINE|1-800-MEDLINE|n = Medline Brand Product|nn = Medline Brand Product)\s*$/i;

const HEADING_CANDIDATE_RE =
  /^(Antacids\/Anti-Gas|Anti-Diarrheals|Anti-Nausea|Bisacodyl|Docusate Calcium|Docusate Sodium|Fiber|Magnesium Citrate|Polyethylene Glycol|Senna(?: with Docusate)?|Miscellaneous Laxatives|Cold, Cough & Allergy|Pain Management|Acetaminophen|Aspirin|Ibuprofen|Naproxen Sodium|Pain Relief Patches|Other|Dietary Supplements|Vitamins & Minerals|Supplements|Calcium|Iron|Magnesium|Zinc|Probiotics(?: and Digestive Aids)?|Topicals|CURAD\s*®?|Anti-Infective|Anti-Itch|Anti-Fungals|Pain Relief|Skin Protectants?|Lip Protectant|Moisturizer|Shampoo|Miscellaneous|Ophthalmics|Ear Care|Nasal Care|Pill Management|Oral Syringes|Activated Charcoal|Lice Treatment|Smoking Cessation|Insect Repellent|Emergency Contraception|Sunscreen|Oral Care|Unit Dose Medications|Drug Disposal|Cryodose(?: Topical Anesthetic)?|Histofreezer|Verruca Freeze|Cryomega|Nitrospray)\s*$/i;

function normalizeSpaces(input: string): string {
  return input.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function trimKeepColumns(input: string): string {
  return input.replace(/\u00a0/g, " ").replace(/\r/g, "").trim();
}

function looksLikeHeading(line: string): boolean {
  const t = normalizeSpaces(line);
  if (!t || SKIP_LINE_RE.test(t)) return false;
  return HEADING_CANDIDATE_RE.test(t);
}

function canonicalizeSection(input: string): string {
  const t = normalizeSpaces(input);
  const upper = t.toUpperCase();
  const map: Record<string, string> = {
    "COLD, COUGH & ALLERGY": "Cold, Cough & Allergy",
    "PAIN MANAGEMENT": "Pain Management",
    TOPICALS: "Topicals",
    "DIETARY SUPPLEMENTS": "Dietary Supplements",
    "ANTACIDS/ANTI-GAS": "Antacids/Anti-Gas",
    "ANTI-DIARRHEA/ANTI-NAUSEA/LAXATIVES":
      "Anti-Diarrhea/Anti-Nausea/Laxatives",
    "OTICS AND NASAL": "Otics and Nasal",
    OPHTHALMICS: "Ophthalmics",
    "MISCELLANEOUS OTCS": "Miscellaneous OTCs",
    "UNIT DOSE MEDICATIONS": "Unit Dose Medications",
    "CRYOSURGERY/TOPICAL ANESTHETIC": "Cryosurgery/Topical Anesthetic",
  };
  return map[upper] ?? t;
}

function splitColumns(rest: string): {
  description: string;
  pkg: string | null;
  compareTo: string | null;
} {
  const cols = rest
    .split(/\t+|\s{2,}/)
    .map((s) => normalizeSpaces(s))
    .filter(Boolean);

  if (cols.length === 0) {
    return { description: "", pkg: null, compareTo: null };
  }
  if (cols.length === 1) {
    const single = cols[0];
    const pkgTail = single.match(
      /(.*)\s+(\d+(?:\.\d+)?\s?(?:oz|ml|gm|lb|gal|spray|ct|pk|pkg|pkts|bt|bx|bag|jar|ea|cs|UD\/bx|ud\/bx|pkgs?))(?:\s+(.*))?$/i
    );
    if (pkgTail) {
      return {
        description: normalizeSpaces(pkgTail[1]),
        pkg: normalizeSpaces(pkgTail[2]),
        compareTo: pkgTail[3] ? normalizeSpaces(pkgTail[3]) : null,
      };
    }
    return { description: single, pkg: null, compareTo: null };
  }
  if (cols.length === 2) {
    return { description: cols[0], pkg: cols[1], compareTo: null };
  }

  return {
    description: cols[0],
    pkg: cols[1] ?? null,
    compareTo: cols.slice(2).join(" ") || null,
  };
}

function toCsv(rows: ExtractedRow[]): string {
  const header =
    "sku,description,pkg,price,compareTo,section,page,medlineBrand,rawLine";
  const escape = (value: string | number | boolean | null) => {
    if (value === null || value === undefined) return "";
    const v = String(value).replace(/"/g, "\"\"");
    return `"${v}"`;
  };
  const lines = rows.map((r) =>
    [
      escape(r.sku),
      escape(r.description),
      escape(r.pkg),
      escape(r.price),
      escape(r.compareTo),
      escape(r.section),
      escape(r.page),
      escape(r.medlineBrand),
      escape(r.rawLine),
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

async function ensurePdf(pdfPath: string, sourceUrl: string): Promise<void> {
  if (fs.existsSync(pdfPath)) return;
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to download PDF: ${res.status} ${res.statusText}`);
  }
  const arr = await res.arrayBuffer();
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  fs.writeFileSync(pdfPath, Buffer.from(arr));
}

function parseRows(text: string): ExtractedRow[] {
  const lines = text
    .split("\n")
    .map((l) => trimKeepColumns(l));

  const rows: ExtractedRow[] = [];
  let currentSection: string | null = null;
  let inTable = false;
  let page: number | null = null;
  let pending: {
    sku: string;
    medlineBrand: boolean;
    rest: string;
    page: number | null;
    section: string | null;
  } | null = null;

  const flushPending = () => {
    if (!pending) return;
    const parsed = splitColumns(pending.rest);
    if (parsed.description) {
      rows.push({
        sku: pending.sku,
        description: parsed.description,
        pkg: parsed.pkg,
        price: null,
        compareTo: parsed.compareTo,
        section: pending.section,
        page: pending.page,
        medlineBrand: pending.medlineBrand,
        rawLine: pending.rest,
      });
    }
    pending = null;
  };

  for (const line of lines) {
    if (!line) continue;

    const pageMatch = line.match(/^--\s+(\d+)\s+of\s+\d+\s+--$/);
    if (pageMatch) {
      page = Number.parseInt(pageMatch[1], 10);
      continue;
    }

    if (looksLikeHeading(line)) {
      currentSection = canonicalizeSection(line);
      continue;
    }

    if (TABLE_HEADER_RE.test(line)) {
      inTable = true;
      continue;
    }

    if (SKIP_LINE_RE.test(line)) {
      continue;
    }

    if (!inTable) continue;

    const skuMatch = line.match(SKU_LINE_RE);
    if (skuMatch) {
      flushPending();
      pending = {
        sku: skuMatch[2],
        medlineBrand: Boolean(skuMatch[1]),
        rest: skuMatch[3],
        page,
        section: currentSection,
      };
      continue;
    }

    if (pending) {
      // Continuation line for wrapped descriptions/columns
      pending.rest = `${pending.rest} ${line}`.trim();
    }
  }

  flushPending();

  const deduped = new Map<string, ExtractedRow>();
  for (const row of rows) {
    // keep first seen row per SKU+description to reduce visual duplicates
    const key = `${row.sku}::${row.description}`;
    if (!deduped.has(key)) deduped.set(key, row);
  }
  return [...deduped.values()];
}

function parseCardLayoutRows(text: string): ExtractedRow[] {
  const lines = text.split("\n").map((l) => trimKeepColumns(l));
  const rows: ExtractedRow[] = [];
  let page: number | null = null;
  let currentSection: string | null = null;

  const priceRe = /^\$\s*(\d+)\s+(\d{2})$/;
  const skuRe = /^\d{3,8}$/;
  const pkgRe =
    /^\d+(?:\.\d+)?\s*(?:Ct|ct|oz|ml|lb|pk|pkg|pack|ea|pair|roll|tabs?|caps?|sprays?)$/i;
  const sectionRe =
    /^(?:Advanced Wound Care|Bedding & Seating Support|Daily Living Aids|First Aid|Hearing Aids & Amplifiers|Home Diagnostics|Home Health Care|Incontinence|Medications Over The Counter|Mobility|Nutrition|Personal Care|Bladder Pads|Briefs|Protective Underwear|Underpads|Allergy & Sinus|Pain & Fever Relief|Sleep Aids|Stomach Remedies|Oral Care|Eye Care|Foot Care|Skin Care \+ Hair Care|Sunscreens|Antibiotics & Antiseptics|Bandages|Dressings & Gauze|Tapes|Wound Care)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = normalizeSpaces(lines[i]);
    if (!line) continue;

    const pageMatch = line.match(/^--\s+(\d+)\s+of\s+\d+\s+--$/);
    if (pageMatch) {
      page = Number.parseInt(pageMatch[1], 10);
      continue;
    }

    if (sectionRe.test(line)) {
      currentSection = canonicalizeSection(line);
      continue;
    }

    const priceMatch = line.match(priceRe);
    if (!priceMatch) continue;

    const price = `$${priceMatch[1]}.${priceMatch[2]}`;
    const skuLine = normalizeSpaces(lines[i - 1] ?? "");
    const pkgLine = normalizeSpaces(lines[i - 2] ?? "");
    if (!skuRe.test(skuLine) || !pkgRe.test(pkgLine)) continue;

    // Collect up to 4 preceding description lines.
    const descParts: string[] = [];
    for (let j = i - 3; j >= 0 && descParts.length < 4; j--) {
      const candidate = normalizeSpaces(lines[j] ?? "");
      if (!candidate) break;
      if (priceRe.test(candidate) || skuRe.test(candidate) || pkgRe.test(candidate))
        break;
      if (candidate.match(/^--\s+\d+\s+of\s+\d+\s+--$/)) break;
      if (candidate.match(/^\d+$/)) break;
      if (sectionRe.test(candidate)) break;
      descParts.unshift(candidate);
    }

    if (descParts.length === 0) continue;
    const description = normalizeSpaces(descParts.join(" "));

    rows.push({
      sku: skuLine,
      description,
      pkg: pkgLine,
      price,
      compareTo: null,
      section: currentSection,
      page,
      medlineBrand: description.toLowerCase().includes("medline"),
      rawLine: `${description} ${pkgLine} ${skuLine} ${price}`,
    });
  }

  const deduped = new Map<string, ExtractedRow>();
  for (const row of rows) {
    const key = `${row.sku}::${row.description}`;
    if (!deduped.has(key)) deduped.set(key, row);
  }
  return [...deduped.values()];
}

async function main() {
  const pdfPath = process.argv[2] ?? DEFAULT_PDF_PATH;
  const sourceUrl = process.argv[3] ?? DEFAULT_PDF_URL;

  await ensurePdf(pdfPath, sourceUrl);
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  const textResult = await parser.getText();
  await parser.destroy();
  const tableRows = parseRows(textResult.text);
  const cardRows = parseCardLayoutRows(textResult.text);
  const extractedRows = [...tableRows, ...cardRows];

  const finalDeduped = new Map<string, ExtractedRow>();
  for (const row of extractedRows) {
    const key = `${row.sku}::${row.description}`;
    if (!finalDeduped.has(key)) finalDeduped.set(key, row);
  }
  const dedupedRows = [...finalDeduped.values()];

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(dedupedRows, null, 2));
  fs.writeFileSync(OUTPUT_CSV_PATH, toCsv(dedupedRows));

  const uniqueSku = new Set(dedupedRows.map((r) => r.sku)).size;
  const withPkg = dedupedRows.filter((r) => r.pkg).length;
  const withCompare = dedupedRows.filter((r) => r.compareTo).length;
  const withPrice = dedupedRows.filter((r) => r.price).length;

  console.log(
    JSON.stringify(
      {
        sourcePdf: pdfPath,
        outputJson: OUTPUT_JSON_PATH,
        outputCsv: OUTPUT_CSV_PATH,
        extractedRows: dedupedRows.length,
        uniqueSku,
        withPkg,
        withPrice,
        withCompareTo: withCompare,
        tableRows: tableRows.length,
        cardRows: cardRows.length,
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
