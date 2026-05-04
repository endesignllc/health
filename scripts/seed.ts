import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "../lib/db";
import {
  needs,
  productCategories,
  products,
  needProductRules,
  productClasses,
  productClassAliases,
  productPriceObservations,
  qualifierQuestions,
  qualifierOptions,
  qualifierRules,
  optimizerPolicies,
  partnerPromotionRules,
  optimizerPolicyAuditLog,
} from "../db/schema";
import { eq, inArray, ne } from "drizzle-orm";
import { computeAndPersistProductClassStats } from "../lib/product-class-stats";
import { z } from "zod";

const QualifierRuleSeedSchema = z
  .object({
    optionId: z.string().uuid(),
    effect: z.enum(["hide", "boost", "penalty"]),
    matchTag: z.string().nullable(),
    matchProductId: z.string().uuid().nullable(),
    weight: z.number().int(),
  })
  .refine((v) => Boolean(v.matchTag || v.matchProductId), {
    message: "Qualifier rule requires matchTag or matchProductId",
  });
async function seed() {
  console.log("Seeding database...");

  const cats = await db
    .insert(productCategories)
    .values([
      { slug: "vitamins", name: "Vitamins" },
      { slug: "supplements", name: "Supplements" },
      { slug: "monitoring", name: "Monitoring Devices" },
      { slug: "pain-relief", name: "Pain Relief" },
      { slug: "respiratory", name: "Respiratory Support" },
      { slug: "sleep-mood", name: "Sleep & Mood" },
      { slug: "cognitive", name: "Cognitive Support" },
      { slug: "mobility", name: "Mobility & Safety" },
    ])
    .onConflictDoNothing({ target: productCategories.slug })
    .returning();

  const existingCats = await db.select().from(productCategories);
  const catMap = Object.fromEntries(existingCats.map((c) => [c.slug, c.id]));

  await db
    .insert(needs)
    .values([
      { slug: "blood-sugar", name: "Blood Sugar Support", description: "Products to support healthy blood sugar levels" },
      { slug: "heart-health", name: "Heart Health", description: "Supports cardiovascular wellness" },
      { slug: "mobility-fall", name: "Mobility & Fall Prevention", description: "Safety and mobility aids" },
      { slug: "pain-inflammation", name: "Pain & Inflammation", description: "Pain relief and anti-inflammatory support" },
      { slug: "respiratory", name: "Respiratory Support", description: "Breathing and respiratory wellness" },
      {
        slug: "medication-adherence",
        name: "Daily routines & organization",
        description: "Pill organizers, reminders, and helpers for day-to-day routines",
      },
      { slug: "sleep-mood", name: "Sleep & Mood Support", description: "Rest and emotional wellness" },
      { slug: "cognitive", name: "Cognitive Support", description: "Brain health and mental clarity" },
      { slug: "vision-hearing", name: "Vision & Hearing Support", description: "Sensory support products" },
    ])
    .onConflictDoNothing({ target: needs.slug });

  await db
    .update(needs)
    .set({
      name: "Daily routines & organization",
      description:
        "Pill organizers, reminders, and helpers for day-to-day routines",
    })
    .where(eq(needs.slug, "medication-adherence"));

  const needsData = await db.select().from(needs);
  const needMap = Object.fromEntries(needsData.map((n) => [n.slug, n.id]));

  const [defaultOptimizerPolicy] = await db
    .insert(optimizerPolicies)
    .values({
      name: "default-mvp-policy",
      active: true,
      outcomeWeight: 70,
      partnerWeight: 30,
      requirePriceCompetitiveness: true,
      maxPriceDeltaPct: 20,
      enforceLockedQualifierFit: true,
    })
    .onConflictDoUpdate({
      target: optimizerPolicies.name,
      set: {
        active: true,
        outcomeWeight: 70,
        partnerWeight: 30,
        requirePriceCompetitiveness: true,
        maxPriceDeltaPct: 20,
        enforceLockedQualifierFit: true,
      },
    })
    .returning({ id: optimizerPolicies.id });

  if (defaultOptimizerPolicy) {
    await db
      .update(optimizerPolicies)
      .set({ active: false })
      .where(ne(optimizerPolicies.id, defaultOptimizerPolicy.id));

    await db
      .delete(partnerPromotionRules)
      .where(eq(partnerPromotionRules.policyId, defaultOptimizerPolicy.id));

    await db.insert(partnerPromotionRules).values({
      policyId: defaultOptimizerPolicy.id,
      ruleType: "contains_text",
      priority: 100,
      enabled: true,
      payload: {
        terms: ["medline"],
        fields: ["name", "description", "vendor"],
        boostWeight: 6,
      },
    });

    await db.insert(optimizerPolicyAuditLog).values({
      policyId: defaultOptimizerPolicy.id,
      actor: "seed-script",
      changeSummary: {
        event: "seed_default_policy",
        outcomeWeight: 70,
        partnerWeight: 30,
      },
    });
  }

  const productList: Array<{
    sku: string;
    name: string;
    categorySlug: string;
    priceCents: number;
    tags: string[];
    supplyDays: number;
    unitsPerPackage?: number;
    estimatedDailyUse?: number | null;
    alternateSkus?: string[];
  }> = [
    {
      sku: "VIT-D3-1000",
      name: "Vitamin D3 1000 IU",
      categorySlug: "vitamins",
      priceCents: 899,
      tags: ["core", "value"],
      supplyDays: 30,
      unitsPerPackage: 30,
      estimatedDailyUse: 1,
    },
    { sku: "VIT-B12-500", name: "Vitamin B12 500mcg", categorySlug: "vitamins", priceCents: 699, tags: ["core"], supplyDays: 30 },
    { sku: "VIT-C-1000", name: "Vitamin C 1000mg", categorySlug: "vitamins", priceCents: 799, tags: ["core", "value", "maintenance"], supplyDays: 30 },
    { sku: "VIT-MULTI-SR", name: "Senior Multivitamin", categorySlug: "vitamins", priceCents: 1999, tags: ["preferred", "core", "maintenance", "staple"], supplyDays: 30 },
    { sku: "VIT-OMEGA3", name: "Omega-3 Fish Oil", categorySlug: "supplements", priceCents: 1499, tags: ["heart", "core"], supplyDays: 30 },
    { sku: "SUP-MAGNESIUM", name: "Magnesium 400mg", categorySlug: "supplements", priceCents: 999, tags: ["sleep", "value"], supplyDays: 30 },
    { sku: "SUP-CINNAMON", name: "Cinnamon Extract", categorySlug: "supplements", priceCents: 1299, tags: ["blood-sugar"], supplyDays: 30 },
    { sku: "SUP-COQ10", name: "CoQ10 100mg", categorySlug: "supplements", priceCents: 2499, tags: ["heart", "preferred"], supplyDays: 30 },
    { sku: "SUP-TURMERIC", name: "Turmeric Curcumin", categorySlug: "supplements", priceCents: 1599, tags: ["pain", "inflammation"], supplyDays: 30 },
    { sku: "SUP-GLUCO", name: "Glucosamine Chondroitin", categorySlug: "supplements", priceCents: 1899, tags: ["mobility", "joint"], supplyDays: 30 },
    { sku: "MON-GLUCOSE", name: "Blood Glucose Meter", categorySlug: "monitoring", priceCents: 2499, tags: ["blood-sugar", "monitoring"], supplyDays: 365 },
    {
      sku: "MON-STRIP-50",
      name: "Test Strips 50ct",
      categorySlug: "monitoring",
      priceCents: 3499,
      tags: ["blood-sugar", "consumable"],
      supplyDays: 50,
      unitsPerPackage: 50,
      estimatedDailyUse: 1,
    },
    { sku: "MON-BP-CUFF", name: "Blood Pressure Monitor", categorySlug: "monitoring", priceCents: 3999, tags: ["heart", "monitoring"], supplyDays: 365 },
    {
      sku: "PAIN-ACET-500",
      name: "Acetaminophen 500mg",
      categorySlug: "pain-relief",
      priceCents: 499,
      tags: ["pain", "value", "maintenance", "staple"],
      supplyDays: 30,
      unitsPerPackage: 100,
      estimatedDailyUse: 2,
      alternateSkus: ["PAIN-IBU-200"],
    },
    { sku: "PAIN-IBU-200", name: "Ibuprofen 200mg", categorySlug: "pain-relief", priceCents: 599, tags: ["pain", "inflammation", "value", "maintenance"], supplyDays: 30 },
    { sku: "PAIN-TOPICAL", name: "Pain Relief Cream", categorySlug: "pain-relief", priceCents: 1299, tags: ["pain", "topical"], supplyDays: 30 },
    { sku: "RESP-NASAL", name: "Nasal Spray", categorySlug: "respiratory", priceCents: 899, tags: ["respiratory", "consumable"], supplyDays: 30 },
    { sku: "RESP-HUMID", name: "Humidifier Tablets", categorySlug: "respiratory", priceCents: 699, tags: ["respiratory", "value"], supplyDays: 30 },
    { sku: "SLEEP-MELATONIN", name: "Melatonin 3mg", categorySlug: "sleep-mood", priceCents: 799, tags: ["sleep", "value"], supplyDays: 30 },
    { sku: "SLEEP-L-THEANINE", name: "L-Theanine 200mg", categorySlug: "sleep-mood", priceCents: 1199, tags: ["sleep", "mood"], supplyDays: 30 },
    { sku: "COG-GINKGO", name: "Ginkgo Biloba", categorySlug: "cognitive", priceCents: 1399, tags: ["cognitive"], supplyDays: 30 },
    { sku: "COG-B-COMPLEX", name: "B Complex", categorySlug: "cognitive", priceCents: 999, tags: ["cognitive", "value"], supplyDays: 30 },
    { sku: "MOB-GRABBER", name: "Reacher Grabber", categorySlug: "mobility", priceCents: 1999, tags: ["mobility", "safety"], supplyDays: 365 },
    { sku: "MOB-NONSLIP", name: "Non-Slip Mat", categorySlug: "mobility", priceCents: 1499, tags: ["mobility", "safety"], supplyDays: 365 },
    { sku: "MED-PILLBOX", name: "7-Day Pill Organizer", categorySlug: "mobility", priceCents: 899, tags: ["adherence", "value", "maintenance", "staple"], supplyDays: 365 },
    { sku: "MED-REMINDER", name: "Medication Reminder", categorySlug: "monitoring", priceCents: 2499, tags: ["adherence"], supplyDays: 365 },
    { sku: "VIT-LUTEIN", name: "Lutein & Zeaxanthin", categorySlug: "vitamins", priceCents: 1599, tags: ["vision"], supplyDays: 30 },
    { sku: "MOB-BATTERY", name: "Hearing Aid Batteries 8pk", categorySlug: "mobility", priceCents: 599, tags: ["hearing", "consumable"], supplyDays: 30 },
    { sku: "VIT-D3-2000", name: "Vitamin D3 2000 IU", categorySlug: "vitamins", priceCents: 1299, tags: ["preferred"], supplyDays: 30 },
    { sku: "SUP-PROBIOTIC", name: "Probiotic 50B CFU", categorySlug: "supplements", priceCents: 2299, tags: ["digestive"], supplyDays: 30 },
    { sku: "PAIN-ASPIRIN", name: "Low Dose Aspirin 81mg", categorySlug: "pain-relief", priceCents: 699, tags: ["heart", "value"], supplyDays: 30 },
    { sku: "RESP-VAPOR", name: "Vapor Rub", categorySlug: "respiratory", priceCents: 599, tags: ["respiratory", "value", "maintenance", "staple"], supplyDays: 30 },
    { sku: "SLEEP-VALERIAN", name: "Valerian Root", categorySlug: "sleep-mood", priceCents: 999, tags: ["sleep"], supplyDays: 30 },
    { sku: "COG-ASHWAGANDHA", name: "Ashwagandha", categorySlug: "cognitive", priceCents: 1499, tags: ["cognitive", "mood"], supplyDays: 30 },
    { sku: "MOB-SHOWER", name: "Shower Chair", categorySlug: "mobility", priceCents: 4999, tags: ["mobility", "safety"], supplyDays: 365 },
    { sku: "MON-OXYGEN", name: "Pulse Oximeter", categorySlug: "monitoring", priceCents: 2999, tags: ["respiratory", "monitoring"], supplyDays: 365 },
    { sku: "SUP-BERBERINE", name: "Berberine 500mg", categorySlug: "supplements", priceCents: 1999, tags: ["blood-sugar"], supplyDays: 30 },
    { sku: "SUP-HAWTHORN", name: "Hawthorn Extract", categorySlug: "supplements", priceCents: 1699, tags: ["heart"], supplyDays: 30 },
    { sku: "VIT-K2", name: "Vitamin K2", categorySlug: "vitamins", priceCents: 1499, tags: ["heart", "bone"], supplyDays: 30 },
    { sku: "PAIN-CAPSAICIN", name: "Capsaicin Cream", categorySlug: "pain-relief", priceCents: 1199, tags: ["pain", "topical"], supplyDays: 30 },
    { sku: "SLEEP-MAG-TEA", name: "Magnesium Tea", categorySlug: "sleep-mood", priceCents: 1299, tags: ["sleep", "relaxation"], supplyDays: 30 },
    { sku: "COG-LION-MANE", name: "Lion's Mane", categorySlug: "cognitive", priceCents: 2299, tags: ["cognitive", "preferred"], supplyDays: 30 },
    { sku: "MED-AUTO", name: "Auto-Dispense Pill Box", categorySlug: "monitoring", priceCents: 3999, tags: ["adherence", "preferred"], supplyDays: 365 },
    { sku: "VIT-EYE", name: "Eye Health Formula", categorySlug: "vitamins", priceCents: 1899, tags: ["vision", "preferred"], supplyDays: 30 },
    { sku: "MOB-WALKER", name: "Rolling Walker Bag", categorySlug: "mobility", priceCents: 2499, tags: ["mobility"], supplyDays: 365 },
    { sku: "RESP-NETI", name: "Neti Pot Kit", categorySlug: "respiratory", priceCents: 999, tags: ["respiratory"], supplyDays: 365 },
    { sku: "SUP-NAC", name: "N-Acetyl Cysteine", categorySlug: "supplements", priceCents: 1599, tags: ["respiratory", "cognitive"], supplyDays: 30 },
    { sku: "MON-THERM", name: "Digital Thermometer", categorySlug: "monitoring", priceCents: 999, tags: ["monitoring", "value"], supplyDays: 365 },
    { sku: "PAIN-BENGAY", name: "Pain Relief Gel", categorySlug: "pain-relief", priceCents: 899, tags: ["pain", "value"], supplyDays: 30 },
    { sku: "SLEEP-CHAMOMILE", name: "Chamomile Extract", categorySlug: "sleep-mood", priceCents: 899, tags: ["sleep", "value"], supplyDays: 30 },
    { sku: "COG-BACOPA", name: "Bacopa Monnieri", categorySlug: "cognitive", priceCents: 1799, tags: ["cognitive"], supplyDays: 30 },
    { sku: "MOB-LIGHT", name: "Motion Night Light", categorySlug: "mobility", priceCents: 1299, tags: ["mobility", "safety"], supplyDays: 365 },
    { sku: "VIT-ZINC", name: "Zinc 50mg", categorySlug: "vitamins", priceCents: 699, tags: ["immune", "value", "maintenance"], supplyDays: 30 },
    { sku: "SUP-ALA", name: "Alpha-Lipoic Acid", categorySlug: "supplements", priceCents: 1999, tags: ["blood-sugar", "cognitive"], supplyDays: 30 },
    { sku: "MON-SCALE", name: "Digital Scale", categorySlug: "monitoring", priceCents: 2499, tags: ["monitoring"], supplyDays: 365 },
    { sku: "PAIN-ARTHRITIS", name: "Arthritis Gloves", categorySlug: "pain-relief", priceCents: 1999, tags: ["pain", "mobility"], supplyDays: 365 },
    { sku: "RESP-CHEST", name: "Chest Congestion Relief", categorySlug: "respiratory", priceCents: 799, tags: ["respiratory", "value"], supplyDays: 30 },
    { sku: "SLEEP-GLYCINE", name: "Glycine 3g", categorySlug: "sleep-mood", priceCents: 1199, tags: ["sleep"], supplyDays: 30 },
    { sku: "COG-PHOSPHATIDYL", name: "Phosphatidylserine", categorySlug: "cognitive", priceCents: 2499, tags: ["cognitive", "preferred"], supplyDays: 30 },
    { sku: "MOB-RAIL", name: "Bedside Rail", categorySlug: "mobility", priceCents: 3499, tags: ["mobility", "safety"], supplyDays: 365 },
    { sku: "VIT-B6", name: "Vitamin B6 100mg", categorySlug: "vitamins", priceCents: 599, tags: ["value"], supplyDays: 30 },
    { sku: "SUP-GARLIC", name: "Garlic Extract", categorySlug: "supplements", priceCents: 999, tags: ["heart", "value"], supplyDays: 30 },
    { sku: "MED-LABELS", name: "Medication Labels", categorySlug: "mobility", priceCents: 499, tags: ["adherence", "value"], supplyDays: 365 },
    {
      sku: "HEAR-AMP-A",
      name: "Medline ClearTone In-Ear Hearing Amplifier Rechargeable",
      categorySlug: "mobility",
      priceCents: 5999,
      tags: ["form:ite", "power:rechargeable", "usability:easy_controls"],
      supplyDays: 365,
    },
    {
      sku: "HEAR-AMP-B",
      name: "Medline SoundLift Behind-the-Ear Hearing Amplifier Rechargeable",
      categorySlug: "mobility",
      priceCents: 5499,
      tags: ["form:bte", "power:rechargeable"],
      supplyDays: 365,
    },
    {
      sku: "HEAR-AMP-C",
      name: "Medline QuietFit In-Ear Hearing Amplifier Battery",
      categorySlug: "mobility",
      priceCents: 4299,
      tags: ["form:ite", "power:disposable"],
      supplyDays: 365,
    },
    {
      sku: "HEAR-AMP-D",
      name: "Medline AssistTone Behind-the-Ear Hearing Amplifier Battery",
      categorySlug: "mobility",
      priceCents: 4699,
      tags: ["form:bte", "power:disposable", "usability:easy_controls"],
      supplyDays: 365,
    },
  ];

  for (const p of productList) {
    await db
      .insert(products)
      .values({
        sku: p.sku,
        name: p.name,
        categoryId: catMap[p.categorySlug]!,
        priceCents: p.priceCents,
        tags: p.tags,
        supplyDays: p.supplyDays,
        unitsPerPackage: p.unitsPerPackage ?? 1,
        estimatedDailyUse: p.estimatedDailyUse ?? null,
        alternateSkus: p.alternateSkus ?? null,
        eligible: true,
        active: true,
      })
      .onConflictDoUpdate({
        target: products.sku,
        set: {
          supplyDays: p.supplyDays,
          unitsPerPackage: p.unitsPerPackage ?? 1,
          estimatedDailyUse: p.estimatedDailyUse ?? null,
          alternateSkus: p.alternateSkus ?? null,
        },
      });
  }

  await db
    .insert(productClasses)
    .values([
      {
        slug: "hearing-amplifier",
        canonicalName: "Hearing Amplifier",
        description: "Non-prescription hearing amplification devices.",
        needId: needMap["vision-hearing"] ?? null,
      },
      {
        slug: "digital-arm-bp-monitor",
        canonicalName: "Digital upper-arm blood pressure monitor",
        description: "At-home heart health tracking with an upper-arm cuff.",
        needId: needMap["heart-health"]!,
      },
      {
        slug: "blood-glucose-meter",
        canonicalName: "Blood glucose meter",
        description: "Device for checking blood sugar levels.",
        needId: needMap["blood-sugar"]!,
      },
      {
        slug: "pulse-oximeter",
        canonicalName: "Finger pulse oximeter",
        description: "Portable oxygen saturation reader.",
        needId: needMap["respiratory"]!,
      },
      {
        slug: "digital-thermometer",
        canonicalName: "Digital thermometer",
        description: "Fast-read digital thermometer.",
        needId: null,
      },
      {
        slug: "digital-body-scale",
        canonicalName: "Digital bathroom scale",
        description: "Step-on weight scale.",
        needId: null,
      },
    ])
    .onConflictDoNothing({ target: productClasses.slug });

  const classRows = await db.select().from(productClasses);
  const classMap = Object.fromEntries(classRows.map((c) => [c.slug, c.id])) as Record<
    string,
    string
  >;

  const aliasTuples: [string, string][] = [
    ["digital-arm-bp-monitor", "blood pressure monitor"],
    ["digital-arm-bp-monitor", "bp monitor"],
    ["digital-arm-bp-monitor", "bp cuff"],
    ["digital-arm-bp-monitor", "upper arm blood pressure monitor"],
    ["digital-arm-bp-monitor", "automatic blood pressure monitor"],
    ["blood-glucose-meter", "blood glucose meter"],
    ["blood-glucose-meter", "glucose meter"],
    ["blood-glucose-meter", "blood sugar monitor"],
    ["pulse-oximeter", "pulse oximeter"],
    ["pulse-oximeter", "pulse ox"],
    ["pulse-oximeter", "finger oximeter"],
    ["digital-thermometer", "digital thermometer"],
    ["digital-body-scale", "digital scale"],
    ["digital-body-scale", "bathroom scale"],
  ];

  const aliasValues = aliasTuples
    .map(([slug, alias]) => {
      const productClassId = classMap[slug];
      if (!productClassId) return null;
      return { productClassId, alias: alias.toLowerCase() };
    })
    .filter((v): v is { productClassId: string; alias: string } => v !== null);

  if (aliasValues.length > 0) {
    await db.insert(productClassAliases).values(aliasValues).onConflictDoNothing();
  }

  const skuToClassSlug: Record<string, string> = {
    "HEAR-AMP-A": "hearing-amplifier",
    "HEAR-AMP-B": "hearing-amplifier",
    "HEAR-AMP-C": "hearing-amplifier",
    "HEAR-AMP-D": "hearing-amplifier",
    "MON-BP-CUFF": "digital-arm-bp-monitor",
    "MON-GLUCOSE": "blood-glucose-meter",
    "MON-OXYGEN": "pulse-oximeter",
    "MON-THERM": "digital-thermometer",
    "MON-SCALE": "digital-body-scale",
  };

  for (const [sku, slug] of Object.entries(skuToClassSlug)) {
    const cid = classMap[slug];
    if (!cid) continue;
    await db
      .update(products)
      .set({ productClassId: cid })
      .where(eq(products.sku, sku));
  }

  const expectedHearingTags: Record<string, string[]> = {
    "HEAR-AMP-A": ["form:ite", "power:rechargeable", "usability:easy_controls"],
    "HEAR-AMP-B": ["form:bte", "power:rechargeable"],
    "HEAR-AMP-C": ["form:ite", "power:disposable"],
    "HEAR-AMP-D": ["form:bte", "power:disposable", "usability:easy_controls"],
  };
  const hearingRows = await db
    .select({ sku: products.sku, tags: products.tags })
    .from(products)
    .where(inArray(products.sku, Object.keys(expectedHearingTags)));
  if (hearingRows.length !== 4) {
    throw new Error("Expected exactly four hearing amplifier seed products");
  }
  for (const row of hearingRows) {
    const expected = expectedHearingTags[row.sku];
    if (!expected) continue;
    const actual = row.tags ?? [];
    const exact =
      actual.length === expected.length &&
      actual.every((tag, idx) => tag === expected[idx]);
    if (!exact) {
      throw new Error(`Hearing tag mismatch for ${row.sku}`);
    }
  }

  const hearingClassId = classMap["hearing-amplifier"];
  if (hearingClassId) {
    const questionSeeds = [
      {
        slug: "style-preference",
        prompt: "What style do you prefer?",
        helpText: null,
        kind: "single_choice",
        sortOrder: 1,
      },
      {
        slug: "battery-type",
        prompt: "Which do you prefer for power?",
        helpText: null,
        kind: "single_choice",
        sortOrder: 2,
      },
      {
        slug: "easy-controls",
        prompt: "Do you prefer larger, simpler controls?",
        helpText: null,
        kind: "single_choice",
        sortOrder: 3,
      },
    ] as const;

    for (const q of questionSeeds) {
      await db
        .insert(qualifierQuestions)
        .values({
          productClassId: hearingClassId,
          slug: q.slug,
          prompt: q.prompt,
          helpText: q.helpText,
          kind: q.kind,
          sortOrder: q.sortOrder,
          active: true,
        })
        .onConflictDoNothing();
    }

    const hearingQuestions = await db
      .select()
      .from(qualifierQuestions)
      .where(eq(qualifierQuestions.productClassId, hearingClassId));
    const questionBySlug = new Map(hearingQuestions.map((q) => [q.slug, q]));

    const optionSeeds = [
      { questionSlug: "style-preference", slug: "in_ear", label: "In-ear", sortOrder: 1 },
      {
        questionSlug: "style-preference",
        slug: "behind_ear",
        label: "Behind-the-ear",
        sortOrder: 2,
      },
      { questionSlug: "style-preference", slug: "no_pref", label: "No preference", sortOrder: 3 },
      { questionSlug: "battery-type", slug: "rechargeable", label: "Rechargeable", sortOrder: 1 },
      {
        questionSlug: "battery-type",
        slug: "replaceable",
        label: "Replaceable batteries",
        sortOrder: 2,
      },
      { questionSlug: "battery-type", slug: "no_pref", label: "No preference", sortOrder: 3 },
      { questionSlug: "easy-controls", slug: "yes", label: "Yes", sortOrder: 1 },
      { questionSlug: "easy-controls", slug: "no_pref", label: "No preference", sortOrder: 2 },
    ] as const;

    for (const o of optionSeeds) {
      const q = questionBySlug.get(o.questionSlug);
      if (!q) continue;
      await db
        .insert(qualifierOptions)
        .values({
          questionId: q.id,
          slug: o.slug,
          label: o.label,
          sortOrder: o.sortOrder,
        })
        .onConflictDoNothing();
    }

    const optionsByQuestion = await Promise.all(
      hearingQuestions.map(async (q) => {
        const list = await db
          .select()
          .from(qualifierOptions)
          .where(eq(qualifierOptions.questionId, q.id));
        return list;
      })
    );
    const allOptions = optionsByQuestion.flat();
    const optionByKey = new Map<string, (typeof allOptions)[number]>(
      allOptions.map((o) => {
        const q = hearingQuestions.find((hq) => hq.id === o.questionId);
        return [`${q?.slug ?? ""}:${o.slug}`, o];
      })
    );

    const ruleSeeds = [
      {
        optionKey: "style-preference:in_ear",
        effect: "hide" as const,
        matchTag: "form:bte",
        matchProductId: null,
        weight: 0,
      },
      {
        optionKey: "style-preference:behind_ear",
        effect: "hide" as const,
        matchTag: "form:ite",
        matchProductId: null,
        weight: 0,
      },
      {
        optionKey: "battery-type:rechargeable",
        effect: "boost" as const,
        matchTag: "power:rechargeable",
        matchProductId: null,
        weight: 10,
      },
      {
        optionKey: "battery-type:replaceable",
        effect: "boost" as const,
        matchTag: "power:disposable",
        matchProductId: null,
        weight: 10,
      },
      {
        optionKey: "easy-controls:yes",
        effect: "boost" as const,
        matchTag: "usability:easy_controls",
        matchProductId: null,
        weight: 15,
      },
    ];

    const optionIds = allOptions.map((o) => o.id);
    if (optionIds.length) {
      await db.delete(qualifierRules).where(inArray(qualifierRules.optionId, optionIds));
    }

    for (const rule of ruleSeeds) {
      const option = optionByKey.get(rule.optionKey);
      if (!option) continue;
      const parsedRule = QualifierRuleSeedSchema.safeParse({
        optionId: option.id,
        effect: rule.effect,
        matchTag: rule.matchTag,
        matchProductId: rule.matchProductId,
        weight: rule.weight,
      });
      if (!parsedRule.success) continue;
      await db.insert(qualifierRules).values(parsedRule.data);
    }
  }

  await db.delete(productPriceObservations).where(eq(productPriceObservations.retailer, "demo-seed"));

  const demoObs: Array<{
    slug: string;
    title: string;
    cents: number;
  }> = [
    { slug: "digital-arm-bp-monitor", title: "BP monitor listing A", cents: 2799 },
    { slug: "digital-arm-bp-monitor", title: "BP monitor listing B", cents: 3299 },
    { slug: "digital-arm-bp-monitor", title: "BP monitor listing C", cents: 3999 },
    { slug: "digital-arm-bp-monitor", title: "BP monitor listing D", cents: 4499 },
    { slug: "digital-arm-bp-monitor", title: "BP monitor listing E", cents: 5499 },
    { slug: "blood-glucose-meter", title: "Meter listing A", cents: 1899 },
    { slug: "blood-glucose-meter", title: "Meter listing B", cents: 2299 },
    { slug: "blood-glucose-meter", title: "Meter listing C", cents: 2499 },
    { slug: "blood-glucose-meter", title: "Meter listing D", cents: 3199 },
    { slug: "pulse-oximeter", title: "Oximeter A", cents: 1499 },
    { slug: "pulse-oximeter", title: "Oximeter B", cents: 1999 },
    { slug: "pulse-oximeter", title: "Oximeter C", cents: 2799 },
    { slug: "digital-thermometer", title: "Thermometer A", cents: 799 },
    { slug: "digital-thermometer", title: "Thermometer B", cents: 999 },
    { slug: "digital-thermometer", title: "Thermometer C", cents: 1299 },
    { slug: "digital-body-scale", title: "Scale A", cents: 1999 },
    { slug: "digital-body-scale", title: "Scale B", cents: 2499 },
    { slug: "digital-body-scale", title: "Scale C", cents: 2999 },
    { slug: "digital-body-scale", title: "Scale D", cents: 3299 },
  ];

  await db.insert(productPriceObservations).values(
    demoObs
      .map((row) => {
        const productClassId = classMap[row.slug];
        if (!productClassId) return null;
        return {
          productClassId,
          retailer: "demo-seed",
          normalizedTitle: row.title,
          priceCents: row.cents,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
  );

  await computeAndPersistProductClassStats();

  const existingRules = await db.select().from(needProductRules).limit(1);
  const hasRules = existingRules.length > 0;

  if (!hasRules) {
  for (const need of needsData) {
    const slug = need.slug;
    if (slug === "blood-sugar") {
      await db.insert(needProductRules).values([
        { needId: need.id, requiredCategoryId: catMap["vitamins"]!, minItems: 1, maxItems: 2, priorityWeight: 3 },
        { needId: need.id, requiredCategoryId: catMap["supplements"]!, minItems: 1, maxItems: 2, priorityWeight: 3 },
        { needId: need.id, requiredCategoryId: catMap["monitoring"]!, minItems: 0, maxItems: 1, priorityWeight: 2 },
      ]);
    } else if (slug === "heart-health") {
      await db.insert(needProductRules).values([
        { needId: need.id, requiredCategoryId: catMap["vitamins"]!, minItems: 1, maxItems: 2, priorityWeight: 3 },
        { needId: need.id, requiredCategoryId: catMap["supplements"]!, minItems: 1, maxItems: 2, priorityWeight: 3 },
        { needId: need.id, requiredCategoryId: catMap["pain-relief"]!, minItems: 0, maxItems: 1, priorityWeight: 1 },
      ]);
    } else if (slug === "mobility-fall") {
      await db.insert(needProductRules).values([
        { needId: need.id, requiredCategoryId: catMap["mobility"]!, minItems: 2, maxItems: 4, priorityWeight: 3 },
        { needId: need.id, requiredCategoryId: catMap["supplements"]!, minItems: 0, maxItems: 1, priorityWeight: 2 },
      ]);
    } else if (slug === "pain-inflammation") {
      await db.insert(needProductRules).values([
        { needId: need.id, requiredCategoryId: catMap["pain-relief"]!, minItems: 1, maxItems: 3, priorityWeight: 3 },
        { needId: need.id, requiredCategoryId: catMap["supplements"]!, minItems: 1, maxItems: 2, priorityWeight: 2 },
      ]);
    } else if (slug === "respiratory") {
      await db.insert(needProductRules).values([
        { needId: need.id, requiredCategoryId: catMap["respiratory"]!, minItems: 1, maxItems: 3, priorityWeight: 3 },
        { needId: need.id, requiredCategoryId: catMap["supplements"]!, minItems: 0, maxItems: 1, priorityWeight: 2 },
        { needId: need.id, requiredCategoryId: catMap["monitoring"]!, minItems: 0, maxItems: 1, priorityWeight: 1 },
      ]);
    } else if (slug === "medication-adherence") {
      await db.insert(needProductRules).values([
        { needId: need.id, requiredCategoryId: catMap["mobility"]!, minItems: 1, maxItems: 2, priorityWeight: 3 },
        { needId: need.id, requiredCategoryId: catMap["monitoring"]!, minItems: 0, maxItems: 2, priorityWeight: 2 },
      ]);
    } else if (slug === "sleep-mood") {
      await db.insert(needProductRules).values([
        { needId: need.id, requiredCategoryId: catMap["sleep-mood"]!, minItems: 1, maxItems: 3, priorityWeight: 3 },
        { needId: need.id, requiredCategoryId: catMap["supplements"]!, minItems: 0, maxItems: 1, priorityWeight: 2 },
      ]);
    } else if (slug === "cognitive") {
      await db.insert(needProductRules).values([
        { needId: need.id, requiredCategoryId: catMap["cognitive"]!, minItems: 1, maxItems: 6, priorityWeight: 3 },
        { needId: need.id, requiredCategoryId: catMap["vitamins"]!, minItems: 0, maxItems: 3, priorityWeight: 2 },
        { needId: need.id, requiredCategoryId: catMap["supplements"]!, minItems: 0, maxItems: 4, priorityWeight: 1 },
        { needId: need.id, requiredCategoryId: catMap["sleep-mood"]!, minItems: 0, maxItems: 2, priorityWeight: 1 },
      ]);
    } else if (slug === "vision-hearing") {
      await db.insert(needProductRules).values([
        { needId: need.id, requiredCategoryId: catMap["vitamins"]!, minItems: 1, maxItems: 2, priorityWeight: 3 },
        { needId: need.id, requiredCategoryId: catMap["mobility"]!, minItems: 0, maxItems: 2, priorityWeight: 2 },
      ]);
    }
  }
  } else {
    // Refresh cognitive rules when rules exist (expanded for budget-fill)
    const cognitiveNeed = needsData.find((n) => n.slug === "cognitive");
    if (cognitiveNeed) {
      await db.delete(needProductRules).where(eq(needProductRules.needId, cognitiveNeed.id));
      await db.insert(needProductRules).values([
        { needId: cognitiveNeed.id, requiredCategoryId: catMap["cognitive"]!, minItems: 1, maxItems: 6, priorityWeight: 3 },
        { needId: cognitiveNeed.id, requiredCategoryId: catMap["vitamins"]!, minItems: 0, maxItems: 3, priorityWeight: 2 },
        { needId: cognitiveNeed.id, requiredCategoryId: catMap["supplements"]!, minItems: 0, maxItems: 4, priorityWeight: 1 },
        { needId: cognitiveNeed.id, requiredCategoryId: catMap["sleep-mood"]!, minItems: 0, maxItems: 2, priorityWeight: 1 },
      ]);
    }
  }

  console.log("Seed complete.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
