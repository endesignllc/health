# Cursor Prompt — Laurel UI Polish Sprint

Visual target: `mockups/benefit-wallet-vision.html` in repo root — open it in a browser first and
keep it side-by-side while working. The goal is that the live Laurel site reads like that mock's
sibling: calm, senior-first, benefit-language everywhere. Scope is the Laurel plan config only —
the default HBS theme must not change. No feature work; polish + data hygiene only.

## 1. Logo — replace entirely (current one reads as a bat)

Replace `/public/branding/laurel-logo.svg` with exactly this — a soft navy tile with a rounded
healthcare cross and a single laurel-leaf accent. Do not redraw or "improve" it:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
  <rect x="1" y="1" width="38" height="38" rx="11" fill="#1C3D5F"/>
  <path d="M20 10.5c-5.2 0-5.2 0-5.2 5.3v4.4h-4.3c-5.3 0-5.3 0-5.3 5.2" fill="none"/>
  <path d="M16.6 11.5h6.8c.6 0 1 .4 1 1v4.1h4.1c.6 0 1 .4 1 1v6.8c0 .6-.4 1-1 1h-4.1v4.1c0 .6-.4 1-1 1h-6.8c-.6 0-1-.4-1-1v-4.1h-4.1c-.6 0-1-.4-1-1v-6.8c0-.6.4-1 1-1h4.1v-4.1c0-.6.4-1 1-1z" fill="#FFFFFF"/>
  <path d="M27.5 8.2c.3 2.6-1 4.6-3.6 5.1-.2-2.7 1.1-4.6 3.6-5.1z" fill="#7FC0A8"/>
</svg>
```

Header lockup: logo tile 36px, then "Laurel Complete Care" in semibold, with "HMO D-SNP" in
11px uppercase muted BELOW the name (not crammed beside it). Use the same SVG (cross only,
no leaf) as favicon. Delete the old laurel/bat asset.

## 2. Data hygiene — visible on camera right now

a. **Quantity limits are polluting product names.** "1 Per Quarter Pill crusher", "1 Per Year
   Bath sponge with rigid handles" — the Fieldtex extractor leaked the catalog's limit text into
   `name`. Fix in the extractor AND migrate existing rows: strip leading `^\d+ Per (Year|Quarter)\s*`
   into a `quantityLimit` field ("1 per year"). Render it as a small neutral chip on the card:
   `Limit: 1 per year` — muted gray, never part of the title.

b. **"Wholecare For You" page images are shifted one cell** (same off-by-one as the ointment
   pages). Verified from the live site: Pill crusher shows a jar-opener-style tool; Auto drop eye
   drop guide shows a pill organizer; Bariatric sock aid AND Bath sponge both show the Autodrop
   eye-drop-guide image (10686.jpeg is actually the Autodrop product photo). Fix by shifting
   assignments on that page's products one position: the image currently on product N belongs to
   product N−1's neighbor. Concretely: give Auto drop eye drop guide → 10686.jpeg; re-derive pill
   crusher / pill organizer / jar opener / sock aid images from the corrected offset; anything
   unresolvable → null. Add this page to the UNTRUSTED pages rule.

c. **Null-image cards must look designed, not broken.** Replace the broken-image glyph with a
   tinted placeholder: category line-icon centered on `#EDF2EE` (or the theme's surface-tint),
   same fixed image area as real photos. No gray mountain icon anywhere.

## 3. Header wallet chip — match the mock

Current boxy "LAUREL COMPLETE CARE / $300.00 left / per month" block → replace with the mock's
navy pill: wallet icon + `$300` bold + `· 9 days left` lighter, white text on #1C3D5F, radius 999.
Plan identity lives in the logo lockup, not inside the chip. Chip is a button (will open wallet
later; href="/build" for now). Keep it visible on every page.

## 4. Expiry banner — keep the copy voice, upgrade the dress

The current yellow bar's copy is close. Final copy:
  **"Your October benefit expires in 9 days."**
  "You have $300.00 ready to use. It doesn't carry over — let's put it to work."
Styling per mock: amber tint bg (#FBF0DC), amber-800 text, clock icon, radius 12, max-width
aligned with content column, one quiet dismiss ×. Add one primary action inline:
`Build my bundle →`. Never red, never all-caps.

## 5. Product cards — one consistent anatomy

Fixed slots, every card identical: image area (4:3, object-contain, white bg, 12px radius) →
badge row → name (2-line clamp, 17px semibold) → limit chip if any → price bottom-aligned
(tabular-nums). Specifics:
- **Badge row speaks benefit language, not taxonomy.** The pink "Mobility & Safety" chip on every
  card is noise when it's identical across the grid. Replace with the EligibilityBadge purse
  badges (max 2 + overflow): `Home Safety` teal, `OTC` blue, `$0 with your plan` green. Category
  stays as a filter, not a per-card chip.
- Hover: subtle lift (2px translate + shadow-sm), nothing bouncy.
- Grid: minmax(240px,1fr), 20px gap; cards equal height per row.

## 6. Page frame & typography (Laurel theme tokens only)

- Base font-size 18px for member-facing pages; load Atkinson Hyperlegible via next/font as the
  Laurel body face (fallback: system-ui). Headings keep current face but heavier tracking-tight.
- Laurel tokens (align globals with the mock): navy #1C3D5F primary / sky #4A90C4 accent /
  coral reserved for small warm accents only — not every chip; bg #F4F6F3; line #DDE3DE;
  good #1F7A4D; warn #8F5600 on #FBF0DC.
- "Shop Products" header row: title left; search + category select + button grouped right in one
  42px-high row, select and input same height and radius (currently mismatched).
- Content column max-w-6xl, 24px gutters.

## 7. Acceptance

Screenshot /products and /build at 1280w next to `mockups/benefit-wallet-vision.html`. Pass when:
no limit text in any product name; no duplicate image on adjacent cards; no broken-image glyphs;
wallet chip matches the mock pill; banner matches §4; badges are purse-language; new logo renders
in header + favicon. Then run the §3 acceptance walk from CURSOR_DEMO_SPRINT.md once to confirm
nothing functional regressed.
