/**
 * Parse apparel / brace / compression style variant hints from vendor copy.
 * Checks description first, then product name (duplicate titles often encode mmHg / S/M in the name).
 * Phase 1.5 variants will replace runtime parsing with structured columns.
 */

const SIZE_OPEN_PAREN = /\b(XXXL|XXL|XL|L|M|S)\b\s*\(/i;
/** Letter + balanced parenthetical (common for measurements). */
const SIZE_WITH_PARENS = /\b(XXXL|XXL|XL|L|M|S)\b\s*\(([^)]*)\)/i;
/** e.g. 8-15 mmHg, 15 – 20 mmHg */
const MMHG_RANGE = /\b(\d{1,3})\s*[-–/]\s*(\d{1,3})\s*mmHg\b/i;
/** e.g. S/M, L/XL — repeat segments for L/M/S triples rare */
const SLASH_SIZE =
  /\b(XS|XXL|XXXL|XL|L|M|S)(?:\s*\/\s*(XS|XXL|XXXL|XL|L|M|S))+\b/i;
/** e.g. "... Gray. S." — isolated letter size only at end (after slash combo check). */
const TERMINAL_LETTER_SIZE =
  /\b(XS|XXL|XXXL|XL|L|M|S)\s*\.?\s*$/i;
/** Small, Medium, Large, X-Large (avoid `\bMed\b` — hits "Medical") */
const WORD_SIZE =
  /\b(Small|Medium|Large|X-?Large|XLarge|Petite|One\s*Size)\b/i;

function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function normalizeDescriptionText(description: string | null | undefined): string {
  return normalizeWhitespace(description ?? "");
}

function normalizeVariantDetailInner(raw: string): string {
  let s = raw.trim().replace(/\.+$/, "");
  s = s.replace(/[\u201c\u201d\u2033\u2018\u2019`´]/g, '"');
  s = s.replace(/(\d+(?:\.\d+)?)\s*"\s*[-–/]\s*(\d+(?:\.\d+)?)\s*"/g, '$1"–$2"');
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Best-effort attribute line from a single blob of copy (name OR description).
 */
export function parseAttributeFromFreeText(text: string): string | null {
  const t = normalizeWhitespace(text);
  if (!t) return null;

  const full = t.match(SIZE_WITH_PARENS);
  if (full) {
    const letter = full[1]!.toUpperCase();
    const inner = normalizeVariantDetailInner(full[2] ?? "");
    if (!inner) return letter;
    return `${letter} · ${inner}`;
  }

  const mm = t.match(MMHG_RANGE);
  if (mm) return `${mm[1]}–${mm[2]} mmHg`;

  const slash = t.match(SLASH_SIZE);
  if (slash) {
    const raw = slash[0]!.replace(/\s*/g, "").toUpperCase();
    return raw.includes("/") ? raw : null;
  }

  const tailLetter = t.match(TERMINAL_LETTER_SIZE);
  if (tailLetter) return tailLetter[1]!.toUpperCase();

  const word = t.match(WORD_SIZE);
  if (word) {
    const wRaw = word[1]!.toLowerCase().replace(/\s+/g, " ");
    const w = wRaw.replace(/\./g, "");
    if (w === "x-large" || w === "xlarge") return "XL";
    if (w === "one size") return "One size";
    return w.charAt(0).toUpperCase() + w.slice(1);
  }

  const loose = t.match(SIZE_OPEN_PAREN);
  if (loose) return loose[1]!.toUpperCase();

  return null;
}

/** Short label for cart option keys — prefers description, then name. */
export function extractVariantOptionLabel(
  description: string | null | undefined,
  name?: string | null | undefined
): string | null {
  const fromDesc = parseAttributeFromFreeText(normalizeDescriptionText(description));
  if (fromDesc) {
    if (fromDesc.includes(" · ")) return fromDesc.split(" · ")[0]!.trim();
    return fromDesc;
  }
  if (name?.trim()) {
    const fromName = parseAttributeFromFreeText(name);
    if (fromName) {
      if (fromName.includes(" · ")) return fromName.split(" · ")[0]!.trim();
      return fromName;
    }
  }
  return null;
}

/**
 * Richer display line from description only (tests / legacy callers).
 */
export function extractVariantOptionDetail(description: string | null | undefined): string | null {
  const t = normalizeDescriptionText(description);
  return t ? parseAttributeFromFreeText(t) : null;
}

/**
 * Full listing line for PDP / grids / bundles: parse description first, then fall back to product name.
 * Use this when multiple SKUs share the same visible title.
 */
export function extractVariantListingAttribute(
  name: string,
  description: string | null | undefined
): string | null {
  const fromDesc = extractVariantOptionDetail(description);
  if (fromDesc) return fromDesc;
  if (name.trim()) return parseAttributeFromFreeText(name);
  return null;
}

/** Where the displayed variant line came from (for audits / tooling). */
export function variantListingParseSource(
  name: string,
  description: string | null | undefined
): "description" | "name" | "none" {
  const d = normalizeDescriptionText(description);
  if (d && parseAttributeFromFreeText(d)) return "description";
  if (name.trim() && parseAttributeFromFreeText(name)) return "name";
  return "none";
}

export function variantFamilyKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
