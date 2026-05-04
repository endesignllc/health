import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { products } from "../db/schema";

type CatalogConfig = {
  key: string;
  pdfPath: string;
  rowsPath: string;
  outputDir: string;
};

type Row = {
  sku: string;
  description: string;
  section?: string | null;
  page?: number | null;
};

type Candidate = {
  sourceCatalog: string;
  sku: string;
  section: string | null;
  page: number;
  rowOrderOnPage: number;
  imageOrderOnPage: number;
  imageFile: string;
  imageUrl: string;
  confidence: number;
  width: number;
  height: number;
};

type UnmappedRow = {
  sourceCatalog: string;
  sku: string;
  section: string | null;
  page: number;
  rowOrderOnPage: number;
  reason: string;
};

type UnusedImage = {
  sourceCatalog: string;
  page: number;
  imageOrderOnPage: number;
  imageName: string;
  width: number;
  height: number;
  reason: string;
};

type PageSummary = {
  sourceCatalog: string;
  page: number;
  sectionCount: number;
  rowCount: number;
  imageCount: number;
  pairCount: number;
  confidence: number;
};

type CatalogResult = {
  candidates: Candidate[];
  unmappedRows: UnmappedRow[];
  unusedImages: UnusedImage[];
  pageSummaries: PageSummary[];
};

const CATALOGS: CatalogConfig[] = [
  {
    key: "memorial-hermann-2026",
    pdfPath: "/tmp/memorial-hermann-2026-otc.pdf",
    rowsPath: path.join(
      process.cwd(),
      "product-catalog",
      "memorial-hermann-2026-extract-normalized-unique.json"
    ),
    outputDir: path.join(
      process.cwd(),
      "public",
      "product-catalog",
      "pdf-images",
      "memorial-hermann-2026"
    ),
  },
  {
    key: "kaiser-ca-2025",
    pdfPath: "/tmp/kaiser-ca-2025-otc.pdf",
    rowsPath: path.join(
      process.cwd(),
      "product-catalog",
      "kaiser-ca-2025-extract-normalized-unique.json"
    ),
    outputDir: path.join(
      process.cwd(),
      "public",
      "product-catalog",
      "pdf-images",
      "kaiser-ca-2025"
    ),
  },
];

function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, "");
}

function imageExtensionFromDataUrl(dataUrl?: string): string {
  if (!dataUrl) return "png";
  if (dataUrl.startsWith("data:image/jpeg")) return "jpg";
  if (dataUrl.startsWith("data:image/jpg")) return "jpg";
  if (dataUrl.startsWith("data:image/webp")) return "webp";
  if (dataUrl.startsWith("data:image/gif")) return "gif";
  return "png";
}

function imagePayloadFromDataUrl(dataUrl: string): Buffer {
  const idx = dataUrl.indexOf(",");
  if (idx < 0) return Buffer.alloc(0);
  return Buffer.from(dataUrl.slice(idx + 1), "base64");
}

function isLikelyProductImage(width: number, height: number): boolean {
  // Catalog row thumbnails are typically small and near-square.
  if (width < 45 || height < 45) return false;
  if (width > 260 || height > 260) return false;
  const ratio = width / height;
  if (ratio < 0.72 || ratio > 1.35) return false;
  const area = width * height;
  if (area < 2500 || area > 55000) return false;
  return true;
}

function confidenceForPageMatch(rowCount: number, imageCount: number): number {
  if (rowCount === 0 || imageCount === 0) return 0;
  const diff = Math.abs(rowCount - imageCount);
  const overlapRatio = Math.min(rowCount, imageCount) / Math.max(rowCount, imageCount);
  let confidence = overlapRatio;

  // Reward exact or near-exact cardinality match.
  if (diff === 0) confidence += 0.08;
  else if (diff === 1) confidence += 0.03;

  // Penalize large mismatches where page-order pairing is risky.
  if (diff >= 4) confidence -= 0.2;
  if (diff >= 7) confidence -= 0.2;

  return Math.max(0, Math.min(1, confidence));
}

function parseImageOrdinal(name: string): number {
  // pdf-parse typically emits names like img_p4_12 (page index, ordinal).
  const m = name.match(/_p\d+_(\d+)$/i);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function sectionValue(section?: string | null): string | null {
  const s = section?.trim();
  return s ? s : null;
}

function toCsv(candidates: Candidate[]): string {
  const headers = [
    "sourceCatalog",
    "sku",
    "section",
    "page",
    "rowOrderOnPage",
    "imageOrderOnPage",
    "imageFile",
    "imageUrl",
    "confidence",
    "width",
    "height",
  ];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, "\"\"")}"`;
  const lines = candidates.map((c) =>
    [
      esc(c.sourceCatalog),
      esc(c.sku),
      esc(c.section ?? ""),
      esc(c.page),
      esc(c.rowOrderOnPage),
      esc(c.imageOrderOnPage),
      esc(c.imageFile),
      esc(c.imageUrl),
      esc(c.confidence.toFixed(2)),
      esc(c.width),
      esc(c.height),
    ].join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

function toUnmappedRowsCsv(rows: UnmappedRow[]): string {
  const headers = [
    "sourceCatalog",
    "sku",
    "section",
    "page",
    "rowOrderOnPage",
    "reason",
  ];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, "\"\"")}"`;
  const lines = rows.map((r) =>
    [
      esc(r.sourceCatalog),
      esc(r.sku),
      esc(r.section ?? ""),
      esc(r.page),
      esc(r.rowOrderOnPage),
      esc(r.reason),
    ].join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

function toUnusedImagesCsv(rows: UnusedImage[]): string {
  const headers = [
    "sourceCatalog",
    "page",
    "imageOrderOnPage",
    "imageName",
    "width",
    "height",
    "reason",
  ];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, "\"\"")}"`;
  const lines = rows.map((r) =>
    [
      esc(r.sourceCatalog),
      esc(r.page),
      esc(r.imageOrderOnPage),
      esc(r.imageName),
      esc(r.width),
      esc(r.height),
      esc(r.reason),
    ].join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

function toPageSummaryCsv(rows: PageSummary[]): string {
  const headers = [
    "sourceCatalog",
    "page",
    "sectionCount",
    "rowCount",
    "imageCount",
    "pairCount",
    "confidence",
  ];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, "\"\"")}"`;
  const lines = rows.map((r) =>
    [
      esc(r.sourceCatalog),
      esc(r.page),
      esc(r.sectionCount),
      esc(r.rowCount),
      esc(r.imageCount),
      esc(r.pairCount),
      esc(r.confidence.toFixed(2)),
    ].join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

async function processCatalog(config: CatalogConfig): Promise<CatalogResult> {
  if (!fs.existsSync(config.pdfPath) || !fs.existsSync(config.rowsPath)) {
    return {
      candidates: [],
      unmappedRows: [],
      unusedImages: [],
      pageSummaries: [],
    };
  }
  fs.mkdirSync(config.outputDir, { recursive: true });

  const rowsRaw = JSON.parse(fs.readFileSync(config.rowsPath, "utf8")) as Row[];
  const rows = rowsRaw
    .filter((r) => r.page != null && r.sku && r.description)
    .map((r) => ({
      ...r,
      sku: normalizeSku(r.sku),
      section: sectionValue(r.section),
    }));
  const rowsByPage = new Map<number, Row[]>();
  for (const row of rows) {
    const page = Number(row.page);
    if (!rowsByPage.has(page)) rowsByPage.set(page, []);
    rowsByPage.get(page)!.push(row);
  }

  const parser = new PDFParse({ data: fs.readFileSync(config.pdfPath) });
  const imageResult = await parser.getImage();
  await parser.destroy();

  const candidates: Candidate[] = [];
  const unmappedRows: UnmappedRow[] = [];
  const unusedImages: UnusedImage[] = [];
  const pageSummaries: PageSummary[] = [];

  for (const page of imageResult.pages) {
    const pageNum = page.pageNumber;
    const pageRows = rowsByPage.get(pageNum) ?? [];
    const pageRowsWithOrder = pageRows.map((row, idx) => ({
      row,
      rowOrderOnPage: idx + 1,
    }));
    if (pageRows.length === 0) continue;

    const productImages = (page.images ?? [])
      .filter((img) => isLikelyProductImage(img.width, img.height))
      .filter((img) => Boolean(img.dataUrl))
      .sort((a, b) => {
        const ao = parseImageOrdinal(a.name);
        const bo = parseImageOrdinal(b.name);
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name);
      });

    if (productImages.length === 0) {
      for (const rowInfo of pageRowsWithOrder) {
        unmappedRows.push({
          sourceCatalog: config.key,
          sku: rowInfo.row.sku,
          section: rowInfo.row.section ?? null,
          page: pageNum,
          rowOrderOnPage: rowInfo.rowOrderOnPage,
          reason: "no_likely_images_on_page",
        });
      }
      pageSummaries.push({
        sourceCatalog: config.key,
        page: pageNum,
        sectionCount: new Set(pageRows.map((r) => r.section ?? "uncategorized")).size,
        rowCount: pageRows.length,
        imageCount: 0,
        pairCount: 0,
        confidence: 0,
      });
      continue;
    }

    const confidence = confidenceForPageMatch(pageRows.length, productImages.length);
    // Page-order mapping is only safe above this floor.
    if (confidence < 0.5) {
      for (const rowInfo of pageRowsWithOrder) {
        unmappedRows.push({
          sourceCatalog: config.key,
          sku: rowInfo.row.sku,
          section: rowInfo.row.section ?? null,
          page: pageNum,
          rowOrderOnPage: rowInfo.rowOrderOnPage,
          reason: "low_page_confidence",
        });
      }
      for (let i = 0; i < productImages.length; i++) {
        const img = productImages[i]!;
        unusedImages.push({
          sourceCatalog: config.key,
          page: pageNum,
          imageOrderOnPage: i + 1,
          imageName: img.name,
          width: img.width,
          height: img.height,
          reason: "low_page_confidence",
        });
      }
      pageSummaries.push({
        sourceCatalog: config.key,
        page: pageNum,
        sectionCount: new Set(pageRows.map((r) => r.section ?? "uncategorized")).size,
        rowCount: pageRows.length,
        imageCount: productImages.length,
        pairCount: 0,
        confidence,
      });
      continue;
    }

    const pairCount = Math.min(pageRows.length, productImages.length);

    for (let i = 0; i < pairCount; i++) {
      const rowInfo = pageRowsWithOrder[i]!;
      const row = rowInfo.row;
      const img = productImages[i]!;
      if (!img.dataUrl) continue;
      const ext = imageExtensionFromDataUrl(img.dataUrl);
      const safeSku = row.sku.replace(/[^A-Z0-9-]/g, "");
      const fileName = `${safeSku}--p${pageNum}--${String(i + 1).padStart(
        2,
        "0"
      )}.${ext}`;
      const filePath = path.join(config.outputDir, fileName);
      fs.writeFileSync(filePath, imagePayloadFromDataUrl(img.dataUrl));

      const relUrl = `/product-catalog/pdf-images/${config.key}/${fileName}`;
      candidates.push({
        sourceCatalog: config.key,
        sku: row.sku,
        section: row.section ?? null,
        page: pageNum,
        rowOrderOnPage: rowInfo.rowOrderOnPage,
        imageOrderOnPage: i + 1,
        imageFile: fileName,
        imageUrl: relUrl,
        confidence,
        width: img.width,
        height: img.height,
      });
    }

    for (let i = pairCount; i < pageRowsWithOrder.length; i++) {
      const rowInfo = pageRowsWithOrder[i]!;
      unmappedRows.push({
        sourceCatalog: config.key,
        sku: rowInfo.row.sku,
        section: rowInfo.row.section ?? null,
        page: pageNum,
        rowOrderOnPage: rowInfo.rowOrderOnPage,
        reason: "more_rows_than_images",
      });
    }

    for (let i = pairCount; i < productImages.length; i++) {
      const img = productImages[i]!;
      unusedImages.push({
        sourceCatalog: config.key,
        page: pageNum,
        imageOrderOnPage: i + 1,
        imageName: img.name,
        width: img.width,
        height: img.height,
        reason: "more_images_than_rows",
      });
    }

    pageSummaries.push({
      sourceCatalog: config.key,
      page: pageNum,
      sectionCount: new Set(pageRows.map((r) => r.section ?? "uncategorized")).size,
      rowCount: pageRows.length,
      imageCount: productImages.length,
      pairCount,
      confidence,
    });
  }

  // Handle rows on pages where parser had zero image entries.
  const pagesSeen = new Set(imageResult.pages.map((p) => p.pageNumber));
  for (const [pageNum, pageRows] of rowsByPage.entries()) {
    if (pagesSeen.has(pageNum)) continue;
    for (let i = 0; i < pageRows.length; i++) {
      const row = pageRows[i]!;
      unmappedRows.push({
        sourceCatalog: config.key,
        sku: row.sku,
        section: row.section ?? null,
        page: pageNum,
        rowOrderOnPage: i + 1,
        reason: "no_image_entries_for_page",
      });
    }
    pageSummaries.push({
      sourceCatalog: config.key,
      page: pageNum,
      sectionCount: new Set(pageRows.map((r) => r.section ?? "uncategorized")).size,
      rowCount: pageRows.length,
      imageCount: 0,
      pairCount: 0,
      confidence: 0,
    });
  }

  return { candidates, unmappedRows, unusedImages, pageSummaries };
}

async function applyToDatabase(candidates: Candidate[]): Promise<number> {
  const bySkuBest = new Map<string, Candidate>();
  for (const c of candidates) {
    const existing = bySkuBest.get(c.sku);
    if (!existing || c.confidence > existing.confidence) {
      bySkuBest.set(c.sku, c);
    }
  }
  const selected = [...bySkuBest.values()].filter((c) => c.confidence >= 0.95);
  if (selected.length === 0) return 0;

  const skuToUrl = new Map(selected.map((s) => [s.sku, s.imageUrl]));
  const skuList = [...skuToUrl.keys()];

  const rows = await db
    .select({ id: products.id, sku: products.sku })
    .from(products)
    .where(and(eq(products.vendor, "medline-pdf-merged"), inArray(products.sku, skuList)));

  for (const row of rows) {
    const url = skuToUrl.get(row.sku);
    if (!url) continue;
    await db.update(products).set({ imageUrl: url }).where(eq(products.id, row.id));
  }

  return rows.length;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const catalogKey = process.argv.includes("--catalog")
    ? process.argv[process.argv.indexOf("--catalog") + 1]
    : null;
  const pdfPathArg = process.argv.includes("--pdf-path")
    ? process.argv[process.argv.indexOf("--pdf-path") + 1]
    : null;
  const rowsPathArg = process.argv.includes("--rows-path")
    ? process.argv[process.argv.indexOf("--rows-path") + 1]
    : null;

  const selectedCatalogs = catalogKey
    ? CATALOGS.filter((c) => c.key === catalogKey)
    : CATALOGS;
  if (selectedCatalogs.length === 0) {
    throw new Error(`Unknown catalog key: ${catalogKey}`);
  }

  const runtimeCatalogs = selectedCatalogs.map((c) => ({
    ...c,
    pdfPath: pdfPathArg ?? c.pdfPath,
    rowsPath: rowsPathArg ?? c.rowsPath,
  }));

  const allCandidates: Candidate[] = [];
  const allUnmappedRows: UnmappedRow[] = [];
  const allUnusedImages: UnusedImage[] = [];
  const allPageSummaries: PageSummary[] = [];
  for (const config of runtimeCatalogs) {
    const result = await processCatalog(config);
    allCandidates.push(...result.candidates);
    allUnmappedRows.push(...result.unmappedRows);
    allUnusedImages.push(...result.unusedImages);
    allPageSummaries.push(...result.pageSummaries);
  }

  const outJson = path.join(
    process.cwd(),
    "product-catalog",
    "pdf-image-candidates.json"
  );
  const outCsv = path.join(
    process.cwd(),
    "product-catalog",
    "pdf-image-candidates.csv"
  );
  const outUnmappedJson = path.join(
    process.cwd(),
    "product-catalog",
    "pdf-image-unmapped-products.json"
  );
  const outUnmappedCsv = path.join(
    process.cwd(),
    "product-catalog",
    "pdf-image-unmapped-products.csv"
  );
  const outUnusedJson = path.join(
    process.cwd(),
    "product-catalog",
    "pdf-image-unused-images.json"
  );
  const outUnusedCsv = path.join(
    process.cwd(),
    "product-catalog",
    "pdf-image-unused-images.csv"
  );
  const outPageSummaryJson = path.join(
    process.cwd(),
    "product-catalog",
    "pdf-image-page-summary.json"
  );
  const outPageSummaryCsv = path.join(
    process.cwd(),
    "product-catalog",
    "pdf-image-page-summary.csv"
  );
  fs.writeFileSync(outJson, JSON.stringify(allCandidates, null, 2));
  fs.writeFileSync(outCsv, toCsv(allCandidates));
  fs.writeFileSync(outUnmappedJson, JSON.stringify(allUnmappedRows, null, 2));
  fs.writeFileSync(outUnmappedCsv, toUnmappedRowsCsv(allUnmappedRows));
  fs.writeFileSync(outUnusedJson, JSON.stringify(allUnusedImages, null, 2));
  fs.writeFileSync(outUnusedCsv, toUnusedImagesCsv(allUnusedImages));
  fs.writeFileSync(outPageSummaryJson, JSON.stringify(allPageSummaries, null, 2));
  fs.writeFileSync(outPageSummaryCsv, toPageSummaryCsv(allPageSummaries));

  let updated = 0;
  if (apply) {
    updated = await applyToDatabase(allCandidates);
  }

  const uniqueSkus = new Set(allCandidates.map((c) => c.sku)).size;
  const highConfidence = allCandidates.filter((c) => c.confidence >= 0.9).length;
  const mediumConfidence = allCandidates.filter(
    (c) => c.confidence >= 0.75 && c.confidence < 0.9
  ).length;
  const lowConfidence = allCandidates.filter((c) => c.confidence < 0.75).length;

  console.log(
    JSON.stringify(
      {
        catalogsProcessed: runtimeCatalogs.map((c) => c.key),
        candidates: allCandidates.length,
        uniqueCandidateSkus: uniqueSkus,
        highConfidenceCandidates: highConfidence,
        mediumConfidenceCandidates: mediumConfidence,
        lowConfidenceCandidates: lowConfidence,
        unmappedProducts: allUnmappedRows.length,
        unusedImages: allUnusedImages.length,
        pageSummaries: allPageSummaries.length,
        outputJson: outJson,
        outputCsv: outCsv,
        outputUnmappedJson: outUnmappedJson,
        outputUnmappedCsv: outUnmappedCsv,
        outputUnusedJson: outUnusedJson,
        outputUnusedCsv: outUnusedCsv,
        outputPageSummaryJson: outPageSummaryJson,
        outputPageSummaryCsv: outPageSummaryCsv,
        apply,
        updatedProducts: updated,
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
