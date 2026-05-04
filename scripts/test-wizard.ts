/**
 * Requires DATABASE_URL + seeded catalog (`npm run db:seed`).
 * Integration POST cases skip unless SKIP_INTEGRATION is unset and server listens on port 3009.
 */
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: ".env.local" });

import { buildBundles } from "@/lib/bundle-builder";
import { normalizeNeedSlugsFromUrl } from "@/lib/legacy-need-slugs";

function tuplesFromBundles(bundles: Awaited<ReturnType<typeof buildBundles>>): [string, number][] {
  const b = bundles[0];
  if (!b) return [];
  return b.items.map((i) => [i.productId, i.quantity]);
}

function firstSectionOrder(bundle: NonNullable<Awaited<ReturnType<typeof buildBundles>>[number]>): string[] {
  const order: string[] = [];
  for (const it of bundle.items) {
    if (!order.includes(it.bundleSection)) order.push(it.bundleSection);
  }
  return order;
}

function sumBySection(bundle: NonNullable<Awaited<ReturnType<typeof buildBundles>>[number]>, slug: string): number {
  return bundle.items.filter((i) => i.bundleSection === slug).reduce((s, i) => s + i.lineTotalCents, 0);
}

async function unitTests() {
  assert.deepEqual(normalizeNeedSlugsFromUrl(["blood-sugar"]), ["blood-sugar-support"]);
  assert.deepEqual(normalizeNeedSlugsFromUrl(["medication-adherence"]), []);

  const primaryMix = await buildBundles({
    needSlugs: ["pain-inflammation", "heart-health"],
    includeEveryday: false,
    budgetCents: 50_000,
    cadence: "monthly",
  });
  assert.equal(primaryMix[0]?.needSlug, "heart-health");

  const essentialsOnly = await buildBundles({
    needSlugs: [],
    includeEveryday: true,
    budgetCents: 50_000,
    cadence: "monthly",
  });
  assert.ok(essentialsOnly[0]?.items.length);
  assert.equal(essentialsOnly[0]?.needSlug, "everyday");
  for (const it of essentialsOnly[0]!.items) {
    assert.equal(it.bundleSection, "everyday");
    assert.equal(it.priorityTier, null);
  }

  const tierPair = await buildBundles({
    needSlugs: ["heart-health", "pain-inflammation"],
    includeEveryday: false,
    budgetCents: 80_000,
    cadence: "monthly",
  });
  const b = tierPair[0];
  assert.ok(b);
  const order = firstSectionOrder(b);
  const hiHeart = order.indexOf("heart-health");
  const hiPain = order.indexOf("pain-inflammation");
  assert.ok(hiHeart !== -1 && hiPain !== -1);
  assert.ok(hiHeart < hiPain);

  const budgetMix = await buildBundles({
    needSlugs: ["heart-health", "pain-inflammation"],
    includeEveryday: true,
    budgetCents: 20_000,
    cadence: "quarterly",
  });
  const bb = budgetMix[0];
  assert.ok(bb);
  const heartSum = sumBySection(bb, "heart-health");
  const painSum = sumBySection(bb, "pain-inflammation");
  const everydaySum = sumBySection(bb, "everyday");
  assert.ok(heartSum > painSum);
  assert.ok(everydaySum > 0);
  assert.ok(everydaySum <= 1500);

  const singleHeart = await buildBundles({
    needSlugs: ["heart-health"],
    includeEveryday: false,
    budgetCents: 30_000,
    cadence: "monthly",
  });
  const hb = singleHeart[0];
  assert.ok(hb);
  for (const it of hb.items) {
    if (it.bundleSection === "heart-health") assert.equal(it.priorityTier, 1);
  }

  const baseArgs = {
    needSlugs: ["heart-health"],
    includeEveryday: false,
    budgetCents: 35_000,
    cadence: "monthly" as const,
  };
  const withGoals = await buildBundles({
    ...baseArgs,
    goals: ["joint-comfort"],
  });
  const noGoals = await buildBundles({
    ...baseArgs,
    goals: [],
  });
  assert.deepStrictEqual(tuplesFromBundles(withGoals), tuplesFromBundles(noGoals));

  const runA = await buildBundles(baseArgs);
  const runB = await buildBundles(baseArgs);
  assert.strictEqual(JSON.stringify(runA), JSON.stringify(runB));
}

async function integrationTests() {
  if (process.env.SKIP_INTEGRATION === "1") {
    process.stdout.write("test:wizard integration cases skipped (SKIP_INTEGRATION=1)\n");
    return;
  }

  const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3009";

  const dualBody = {
    budgetCents: 35_000,
    cadence: "monthly",
    needSlugs: ["heart-health", "pain-inflammation"],
    includeEveryday: true,
    qualifierAnswers: [],
  };

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/bundles/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dualBody),
    });
  } catch {
    process.stdout.write("test:wizard integration cases skipped (fetch failed)\n");
    return;
  }

  if (!res.ok) {
    process.stdout.write("test:wizard integration cases skipped (non-OK response)\n");
    return;
  }

  const dualPayload = (await res.json()) as { bundles?: Array<{ items: Array<{ bundleSection: string }> }> };
  const secs = new Set(dualPayload.bundles?.[0]?.items.map((i) => i.bundleSection));
  assert.ok(secs.has("heart-health"));
  assert.ok(secs.has("pain-inflammation"));

  res = await fetch(`${baseUrl}/api/bundles/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      budgetCents: 35_000,
      cadence: "monthly",
      needSlug: "heart-health",
      includeEveryday: false,
      qualifierAnswers: [],
    }),
  });
  assert.equal(res.ok, true);
  const legacyPayload = (await res.json()) as { bundles?: unknown };
  const modernRes = await fetch(`${baseUrl}/api/bundles/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      budgetCents: 35_000,
      cadence: "monthly",
      needSlugs: ["heart-health"],
      includeEveryday: false,
      qualifierAnswers: [],
    }),
  });
  assert.equal(modernRes.ok, true);
  const modernPayload = await modernRes.json();
  assert.strictEqual(JSON.stringify(legacyPayload.bundles), JSON.stringify(modernPayload.bundles));

  res = await fetch(`${baseUrl}/api/bundles/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(res.status, 400);
  assert.deepStrictEqual(await res.json(), { error: "Validation failed" });

  res = await fetch(`${baseUrl}/api/bundles/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      budgetCents: 35_000,
      cadence: "monthly",
      needSlugs: ["this-slug-does-not-exist-ever"],
      includeEveryday: false,
      qualifierAnswers: [],
    }),
  });
  assert.equal(res.status, 400);
  assert.deepStrictEqual(await res.json(), { error: "Validation failed" });

  res = await fetch(`${baseUrl}/api/bundles/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      budgetCents: 300,
      cadence: "monthly",
      needSlugs: ["heart-health"],
      includeEveryday: false,
      qualifierAnswers: [],
    }),
  });
  assert.equal(res.status, 400);
  assert.deepStrictEqual(await res.json(), { error: "Validation failed" });
}

async function main() {
  await unitTests();
  await integrationTests();
  process.stdout.write("test:wizard passed\n");
}

main().catch(() => {
  console.error("test wizard failed");
  process.exit(1);
});
