/**
 * Parse apparel / brace style size hints from free-text vendor descriptions.
 * Phase 1.5 variants will replace runtime parsing with structured columns.
 */

const SIZE_OPEN_PAREN = /\b(XXXL|XXL|XL|L|M|S)\b\s*\(/i;
/** Letter + balanced parenthetical (common for measurements). */
const SIZE_WITH_PARENS = /\b(XXXL|XXL|XL|L|M|S)\b\s*\(([^)]*)\)/i;

function normalizeDescriptionText(description: string | null | undefined): string {
  return (description ?? "").trim();
}

function normalizeVariantDetailInner(raw: string): string {
  let s = raw.trim().replace(/\.+$/, "");
  // Fancy quotes / inch marks → straight " for consistent display
  s = s.replace(/[\u201c\u201d\u2033\u2018\u2019`´]/g, '"');
  // 6"-7", 6" - 7", 6" / 7" (inches range)
  s = s.replace(/(\d+(?:\.\d+)?)\s*"\s*[-–/]\s*(\d+(?:\.\d+)?)\s*"/g, '$1"–$2"');
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** Short label for cart option keys (letter size only). */
export function extractVariantOptionLabel(description: string | null | undefined): string | null {
  const text = normalizeDescriptionText(description);
  if (!text) return null;
  const size = text.match(SIZE_OPEN_PAREN);
  if (size) return size[1]!.toUpperCase();
  return null;
}

/**
 * Richer display label: size letter + normalized parenthetical, e.g. `M · 6"–7" circum`.
 * Falls back to letter-only when parentheses are incomplete (same as {@link extractVariantOptionLabel}).
 */
export function extractVariantOptionDetail(description: string | null | undefined): string | null {
  const text = normalizeDescriptionText(description);
  if (!text) return null;
  const full = text.match(SIZE_WITH_PARENS);
  if (full) {
    const letter = full[1]!.toUpperCase();
    const inner = normalizeVariantDetailInner(full[2] ?? "");
    if (!inner) return letter;
    return `${letter} · ${inner}`;
  }
  return extractVariantOptionLabel(description);
}

export function variantFamilyKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
