import assert from "node:assert/strict";

type Candidate = {
  sku: string;
  name: string;
  tags: string[];
  basePriority: number;
};

function legacyCoreScore(params: {
  basePriority: number;
  tags: string[];
  goalTags: string[];
}): number {
  let score = params.basePriority;
  if (params.goalTags.length > 0) {
    const goalMatches = params.goalTags.filter((g) =>
      params.tags.some((t) => t.toLowerCase().includes(g.toLowerCase()))
    );
    score += goalMatches.length * 2;
  }
  if (params.tags.includes("core") || params.tags.includes("preferred")) score += 3;
  if (params.tags.includes("value")) score += 2;
  return score;
}

function rankSkus(candidates: Candidate[], goalTags: string[]): string[] {
  return [...candidates]
    .map((c) => ({
      sku: c.sku,
      score: legacyCoreScore({
        basePriority: c.basePriority,
        tags: c.tags,
        goalTags,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.sku);
}

function run() {
  const incontinenceNeed = rankSkus(
    [
      {
        sku: "MED-BRIEF-MAX",
        name: "Medline Maximum Absorbency Brief",
        tags: ["core", "value", "incontinence", "preferred"],
        basePriority: 4,
      },
      {
        sku: "GEN-BRIEF-REG",
        name: "Generic Absorbency Brief",
        tags: ["core", "incontinence"],
        basePriority: 4,
      },
      {
        sku: "MED-SKIN-WIPES",
        name: "Skin Cleansing Wipes",
        tags: ["maintenance", "value"],
        basePriority: 2,
      },
    ],
    ["incontinence"]
  );
  assert.deepEqual(incontinenceNeed, [
    "MED-BRIEF-MAX",
    "GEN-BRIEF-REG",
    "MED-SKIN-WIPES",
  ]);

  const mobilityNeed = rankSkus(
    [
      {
        sku: "MOB-GRABBER",
        name: "Reacher Grabber",
        tags: ["mobility", "safety", "core", "value"],
        basePriority: 3,
      },
      {
        sku: "MOB-RAIL",
        name: "Bedside Rail",
        tags: ["mobility", "safety", "preferred"],
        basePriority: 3,
      },
      {
        sku: "MOB-NONSLIP",
        name: "Non-Slip Mat",
        tags: ["mobility", "safety"],
        basePriority: 3,
      },
    ],
    ["mobility"]
  );
  assert.deepEqual(mobilityNeed, ["MOB-GRABBER", "MOB-RAIL", "MOB-NONSLIP"]);

  const diabetesNeed = rankSkus(
    [
      {
        sku: "MON-GLUCOSE",
        name: "Blood Glucose Meter",
        tags: ["blood-sugar", "monitoring", "preferred"],
        basePriority: 4,
      },
      {
        sku: "MON-STRIP-50",
        name: "Test Strips 50ct",
        tags: ["blood-sugar", "consumable", "value", "core"],
        basePriority: 4,
      },
      {
        sku: "SUP-BERBERINE",
        name: "Berberine 500mg",
        tags: ["blood-sugar"],
        basePriority: 3,
      },
    ],
    ["blood-sugar", "diabetes"]
  );
  assert.deepEqual(diabetesNeed, ["MON-STRIP-50", "MON-GLUCOSE", "SUP-BERBERINE"]);
}

run();
process.stdout.write("test:optimizer-baseline passed\n");

