/**
 * Parse apparel / brace / compression style variant hints from vendor copy,
 * plus pad absorbency lines (e.g. Moderate absorbency · 5.5" × 10.5").
 * Size tokens (parens, slash pairs, terminal letters, spelled sizes) win over mmHg ranges
 * when both appear — mmHg stays available in the product title for compression garments.
 * Checks description first, then product name for listing/cart helpers below.
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
/** e.g. Moderate absorbency. 5.5" x 10.5" (bladder pads / liners). */
const ABSORBENCY_INCH_DIMS =
  /\b(Light|Moderate|Medium|Heavy|Maximum|Ultimate|Super|Extra)(\s+absorbency)\s*\.\s*(\d+(?:\.\d+)?)\s*(?:"+|[\u2033\u201d])\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:"+|[\u2033\u201d])/i;
/** e.g. "... Gray. S." — isolated letter size only at end (after slash combo check). */
const TERMINAL_LETTER_SIZE =
  /\b(XS|XXL|XXXL|XL|L|M|S)\s*\.?\s*$/i;
/**
 * Spelled-out / letter sizes (avoid `\bMed\b` — hits "Medical").
 * Put `X-?Large` / `XLarge` before `Large` so "X-Large" is not captured as "Large".
 */
const WORD_SIZE =
  /\b(Small|Medium|Petite|One\s*Size|XL|X-?Large|XLarge|Large)\b/i;

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

  const slash = t.match(SLASH_SIZE);
  if (slash) {
    const raw = slash[0]!.replace(/\s*/g, "").toUpperCase();
    return raw.includes("/") ? raw : null;
  }

  const padAbsorb = t.match(ABSORBENCY_INCH_DIMS);
  if (padAbsorb) {
    const lvlRaw = padAbsorb[1]!;
    const phrase =
      lvlRaw.charAt(0).toUpperCase() + lvlRaw.slice(1).toLowerCase() + padAbsorb[2];
    const w = padAbsorb[3]!;
    const h = padAbsorb[4]!;
    return `${phrase} · ${w}" × ${h}"`;
  }

  const tailLetter = t.match(TERMINAL_LETTER_SIZE);
  if (tailLetter) return tailLetter[1]!.toUpperCase();

  const word = t.match(WORD_SIZE);
  if (word) {
    const wRaw = word[1]!.toLowerCase().replace(/\s+/g, " ");
    const w = wRaw.replace(/\./g, "");
    if (w === "xl" || w === "x-large" || w === "xlarge") return "XL";
    if (w === "one size") return "One size";
    return w.charAt(0).toUpperCase() + w.slice(1);
  }

  const loose = t.match(SIZE_OPEN_PAREN);
  if (loose) return loose[1]!.toUpperCase();

  const mm = t.match(MMHG_RANGE);
  if (mm) return `${mm[1]}–${mm[2]} mmHg`;

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
