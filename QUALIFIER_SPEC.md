# Qualifier System Specification

**HealthBenefits.Shop · Needs-based shopping layer**
Status: Draft for review · June 2026 · Owner: Mike

---

## 1. Purpose

The OTC shopping flow starts when a member selects a high-level **Need** (e.g. *Blood-sugar support*, *Continence care*). A single need maps to many candidate SKUs, and the right cart depends on facts the member alone knows — do they use insulin, what absorbency they need, what size they wear. **Qualifiers** are the closed-choice follow-up questions that turn a broad need into a precise, budget-fit cart.

This document defines the canonical qualifier model, resolves the two qualifier subsystems already in the codebase into one layered contract, specifies *Continence care* as the second pilot category, and sets the persistence and privacy rules so the no-PHI posture in the partner pitch stays literally true.

This is a design spec, not a code change. Nothing here modifies the running app.

---

## 2. The two subsystems — and why we keep both

The codebase has two qualifier mechanisms. They look redundant but are doing different jobs, and `lib/bundle-builder.ts` already consumes **both** in the same scoring pass (`needQualifierBonus(p.id)` and `classQualifierBonus(p.productClassId)`). The fix is not to delete one — it is to formalize the contract between them.

| | **Need-tier qualifiers** | **Class-tier qualifiers** |
|---|---|---|
| Tables | `need_qualifier_questions / _options / _rules` | `qualifier_questions / _options / _rules` |
| Scoped to | a **Need** (`need_id`) | a **product class** (`product_class_id`) |
| Question kind | implicit single-choice | `single_choice` / `multi_choice` (explicit) |
| Rule effects | `include`, `skip`, `boost` | `hide`, `boost`, `penalty` |
| Eval entry point | `evaluateNeedQualifiers(optionIds)` | `evaluateQualifiers({ productClassIds, answers, … })` |
| API | `GET /api/need-qualifiers?needSlugs=` | `GET /api/qualifiers?productClassId=` |
| Answer shape | array of option IDs | `{ questionSlug, optionSlugs[] }` |

### Canonical model: need-tier decides *whether*, class-tier decides *which*

> **Need-tier qualifiers shape the set of product classes that enter the cart. Class-tier qualifiers pick the right variant within a class.**

- **Need-tier** answers the structural questions: *Do you use insulin? Do you already own a glucose meter?* Their `include`/`skip` effects add or remove whole product classes/SKUs from the cart skeleton. This is the layer that branches the catalog.
- **Class-tier** answers the fit questions for a class that's already in: *For your briefs — what absorbency? what size?* Their `hide`/`penalty`/`boost` effects narrow the candidates within that class to the variant the member actually needs.

Read top-down: the member picks a need → need-tier questions assemble the cart skeleton (which classes, which devices) → class-tier questions resolve each class to a specific SKU → the budget solver spends the allowance across the result.

This mapping is already true in practice (diabetes uses need-tier to add/skip the glucose meter and BP monitor classes). The spec just makes it the rule rather than an accident, so every new category is built the same way.

### The cross-tier exception (allergies / sensitivities)

Most qualifiers belong cleanly to one tier. A **color** preference, for instance, is purely class-tier — it picks a variant within a class but never changes *which* classes enter the cart, so it is not an exception.

The legitimate exception is a qualifier whose single answer affects **both** tiers at once. The canonical case is a **sensitivity or allergy** — e.g. *latex-free* or *fragrance-free*:

- **Skeleton effect (need-tier):** removes whole classes the member can't use (e.g. drop latex glove classes entirely).
- **Variant effect (class-tier):** down-ranks or hides matching variants *across every remaining class* (any SKU tagged `contains-latex`).

For these, do **not** force the split. Model them as a **global constraint** evaluated before both tiers: a small set of member-level "exclusion tags" (`exclude:latex`, `exclude:fragrance`) that filter the candidate pool up front, then the normal two-tier flow runs on what remains. Note each such qualifier explicitly in its need definition so it's clear it's intentionally cross-cutting, not a modeling mistake.

### Effect-name cleanup (low-risk, do alongside continence build)

The two subsystems use different verbs for the same intent. Standardize the *meaning*, keep the columns:

- `include` (need) ≈ force a class/SKU into the skeleton — no class-tier equivalent, correct.
- `skip` (need) ≈ `hide` (class) — both remove. Treat as synonyms; document `skip` = "remove at need tier," `hide` = "remove at class tier."
- `boost` — same meaning in both. Keep.
- `penalty` (class) — soft down-rank, no need-tier equivalent. Correct; need-tier should not need penalties because it deals in whole-class include/skip.

No migration required. This is a documentation + lint-rule cleanup, not a schema change.

---

## 3. Data model (as built — no changes proposed)

The existing schema already supports the canonical model. For reference:

```
needs
  └─ need_qualifier_questions (need_id)
       └─ need_qualifier_options (question_id)
            └─ need_qualifier_rules (option_id → effect, matchTag | matchProductId | matchProductClassId, weight)

product_classes (need_id, optional)
  └─ qualifier_questions (product_class_id, kind, active)
       └─ qualifier_options (question_id)
            └─ qualifier_rules (option_id → effect, matchTag | matchProductId, weight)

products (product_class_id, tags[], unitsPerPackage, estimatedDailyUse, supplyDays, …)
```

Two facts worth calling out, because the continence example leans on them:

1. **Rules match on `tags[]`, `matchProductId`, or `matchProductClassId`.** Attribute-driven categories (continence) should match on **tags** (e.g. `absorbency-heavy`, `size-l`) rather than enumerating product IDs. Tag-based rules survive catalog churn; product-ID rules don't.
2. **`product_classes` carries `need_id`.** That's the join that lets a need-tier `include` rule reference a whole class (via `matchProductClassId`) rather than a single SKU — exactly what we want for "add briefs to the cart" vs. "add *this* brief."

---

## 4. Worked example — Continence care (pilot #2)

Diabetes was a good first pilot but a narrow test: it's **device/treatment-driven** (own a meter or not; insulin or not). Continence care is **attribute/size-driven**, which stresses the class-tier layer that diabetes barely touched. If the model handles both cleanly, it generalizes to the rest of the catalog.

### 4.0 Product classes (finalized slugs + member-facing names)

Slugs are stable internal keys; **display names are written plainly and without clinical or stigmatizing language**, since continence is a sensitive category and the member sees these.

| Slug | Member-facing display name | Source section |
|---|---|---|
| `bladder-pads` | Bladder Control Pads & Liners | Incontinence (pads, liners, guards) |
| `protective-underwear` | Protective Underwear | Protective Underwear |
| `underpads` | Bed & Chair Pads | Underpads |
| `skin-barrier-cream` | Skin Barrier Cream | (skin care) |
| `cleansing-wipes` | Cleansing Wipes | (skin care) |

> "Protective underwear" is kept deliberately — it's the dignified industry-standard term members and brands use, never "diapers."

### 4.1 Need

```
need: continence-care
  name: "Continence care"
  priorityTier: 1   # Essential
```

### 4.2 Need-tier qualifiers (assemble the skeleton)

**Q1 — Type of support needed** (single-choice)

| Option | Effect |
|---|---|
| Bladder (light) | include class `bladder-pads`; boost tag `bladder` |
| Bladder (moderate–heavy) | include class `protective-underwear`; boost tag `bladder` |
| Bowel / dual | include class `protective-underwear`; boost tag `dual-incontinence` |
| Overnight protection | boost tag `overnight`; include class `underpads` |

**Q2 — Skin protection** (single-choice)

| Option | Effect |
|---|---|
| Yes, add skin care | include class `skin-barrier-cream`; include class `cleansing-wipes` |
| No | skip class `skin-barrier-cream` |

These decide *which classes* land in the cart. They never ask for a measurement or a diagnosis.

### 4.3 Class-tier qualifiers (resolve the variant)

Attached to each protective class (`protective-underwear`, `bladder-pads`, `underpads`):

**Absorbency** (single-choice) — matches product tags

| Option | Tag | Rule |
|---|---|---|
| Light | `absorbency-light` | hide non-matching, boost matching |
| Moderate | `absorbency-moderate` | hide non-matching, boost matching |
| Heavy | `absorbency-heavy` | hide non-matching, boost matching |
| Overnight / maximum | `absorbency-overnight` | hide non-matching, boost matching |

**Size** (single-choice) — matches product tags

| Option | Tag |
|---|---|
| Small | `size-s` |
| Medium | `size-m` |
| Large | `size-l` |
| X-Large | `size-xl` |

**Key privacy point:** the size option stores `size-l` — a **product attribute**, the same kind of fact as a shirt size. It does **not** store the member's waist measurement in inches, and it never records *why* (incontinence). See §5.

### 4.4 What the member experiences

1. Picks **Continence care**.
2. Two need-tier taps (type of support, skin care yes/no) → cart skeleton built.
3. Two class-tier taps (absorbency, size) → each brief/pad class resolves to one SKU.
4. Budget solver fills remaining allowance with compatible essentials.
5. Quarterly hold-and-ship reorders the same configuration.

Five taps, no free-text, no measurements, no diagnosis.

### 4.5 Catalog prerequisite — tagging pass (verified June 2026)

Checked against `product-catalog/pdf-catalog-merged-all-normalized-unique.csv`. The tags don't exist yet — they live inside the product **name/description text** and must be parsed out. Good news: the data is consistent enough to auto-tag, with one curated decision.

**~32 continence SKUs**, already classed for free by the `section` column:

| Section | Count | → Product class |
|---|---|---|
| Incontinence | 8 | `bladder-pads` |
| Protective Underwear | 17 | `protective-underwear` |
| Underpads | 7 | `underpads` |

**Size — clean parse.** Pattern `S / M / L / XL / 2XL (NN"–NN" waist)` is fully regex-extractable. Caveat: waist ranges **overlap across product lines** (an "L" is `44"–56"` in one line, `40"–56"` in another), so tag on the **letter size** (`size-l`) as the key; treat the waist range as a display tooltip only, not a matching key.

**Gender — bonus attribute, free.** "for Men" / "for Women" / "Unisex" appears in descriptions → tag `gender-mens` / `gender-womens` / `gender-unisex`. Useful as a class-tier filter.

**Absorbency — the one judgment call.** Descriptions use **8 different marketing words** that do *not* form a clean scale:

```
Ultra (16)   Max (10)   Extra (10)   Moderate (6)
Heavy (6)    Maximum (4)   Light (6)   Ultimate (2)
```

These must be collapsed into a normalized scale via a **curated lookup** (parser alone can't rank them). Proposed 4-tier mapping — **needs Mike / clinical sign-off on the ordering**, since "Max vs Maximum vs Extra vs Ultra" is a marketing distinction, not a standard:

| Normalized tag | Maps from |
|---|---|
| `absorbency-light` | Light |
| `absorbency-moderate` | Moderate |
| `absorbency-heavy` | Heavy, Max, Maximum, Extra |
| `absorbency-maximum` | Ultra, Ultimate |

Bottom line: the tagging pass is a small, mostly-automated script (class from `section`, size + gender by regex) plus **one approved absorbency map**. That map is the only blocker before the seed can be built.

---

## 5. Persistence & privacy

### 5.1 The principle: it's *what* you store, not *whether*

The exposure in qualifier answers is not the act of storing — it's storing **health-status facts** about an identifiable person. The protective distinction:

- **Product filter attributes** — `absorbency-heavy`, `size-l`, `insulin` — are catalog facets. Storing "this cart is configured for size L, heavy absorbency" is the same class of data as a clothing size. Low risk.
- **Personal health measurements / conditions** — "member's waist is 44 inches," "member has incontinence," "member is a Type-2 diabetic" — are health-status data. **This is the line we do not cross**, regardless of HIPAA, because consumer-health laws (notably Washington's *My Health My Data Act*) regulate health data *inferred from shopping behavior*, and California's CMIA and similar state laws reach the same territory.

Design rule: **capture the product attribute, never the body metric or the condition.** Store `size-l`, not `44in`. Store `absorbency-heavy`, not "severe incontinence."

> Not legal advice — before any server-side persistence ships, the privacy policy and a privacy-counsel review should bless the model below.

### 5.2 Pilot decision: device-local, re-confirmable

For the pilot, **do not persist qualifier answers server-side.** The current architecture already enforces this — `evaluateNeedQualifiers()` takes option IDs in-session and forgets them. Keep that, and add only a **device-local** convenience layer:

- Store the last cart's qualifier selections in the browser (localStorage / cookie) so the member sees "Same as last time?" and can one-tap re-confirm each quarter.
- Nothing leaves the device; HealthBenefits.Shop servers store no member preferences.
- This keeps the **"no PHI ever requested or stored"** promise in the partner pitch literally true — removing it as a deal blocker with Amazon and Medline.

Continence selections rarely change quarter to quarter, so the UX cost of re-confirming is roughly one tap.

### 5.3 Upgrade path (post-pilot, gated on counsel)

Architect persistence as a **pluggable interface** (`PreferenceStore`) with one method pair (`load(memberToken)` / `save(memberToken, selections)`). Pilot wires the device-local implementation. Later, if a server-side store is wanted for cross-device continuity, swap the implementation to:

- store **only** product-attribute option slugs (never measurements/conditions),
- keyed to a **token decoupled from member identity** (not the plan member ID),
- behind **explicit opt-in** consent framed as "remember my product preferences,"
- covered by the privacy policy and a counsel review.

The interface means this is a later swap, not a rebuild.

---

## 6. Recommended build order

1. **Adopt the canonical model + effect-verb documentation** (§2). Doc + lint rule, no schema change.
2. **Confirm continence catalog tagging** (§4.5) — verify `absorbency-*` / `size-*` tags and class assignments exist in `product-catalog/`.
3. **Seed Continence care** (§4) in `scripts/seed.ts`, modeled on the diabetes block — need-tier first, then class-tier.
4. **Add the `PreferenceStore` device-local layer** (§5.2) to `BuildWizardForm.tsx`.
5. **Then** map the full OTC catalog: for each need/class, decide whether it needs need-tier branching, class-tier variants, or both (the big taxonomy buildout — separate effort).

---

## 7. Resolved decisions (June 2026)

1. **Catalog tagging** — tags don't exist yet; they're parsed from description text. Class comes free from `section`; size + gender parse by regex; **absorbency needs one curated normalization map** (§4.5) with clinical sign-off. That map is the only blocker before the seed.
2. **Cross-device continuity** — deferred. Pilot stores preferences device-local (§5.2); server-side cross-device sync waits for the consented upgrade path.
3. **Cross-tier qualifiers** — handled as the allergy/sensitivity exception via global exclusion tags (§2). Color and similar are *not* cross-tier — they stay class-tier.

### Remaining for Mike

- ~~Approve the absorbency normalization map~~ — **approved** (§4.5).
- ~~Confirm product-class slugs~~ — **finalized** (§4.0): `bladder-pads`, `protective-underwear`, `underpads`, `skin-barrier-cream`, `cleansing-wipes`.

Both blockers are now cleared — the spec is ready to drive implementation (tagging script + continence seed block).
