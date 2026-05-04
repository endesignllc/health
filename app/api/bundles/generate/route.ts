import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildBundles } from "@/lib/bundle-builder";
import type { QualifierAnswer } from "@/lib/qualifiers";
import { db } from "@/lib/db";
import { products } from "@/db/schema";
import { inArray } from "drizzle-orm";

const QualifierAnswerSchema = z.object({
  questionSlug: z.string().min(1),
  optionSlugs: z.array(z.string().min(1)),
});

const GenerateSchema = z.object({
  needSlug: z.string().min(1),
  budgetCents: z.number().int().min(2500).max(500_000),
  cadence: z.enum(["monthly", "quarterly"]),
  goals: z.array(z.string()).optional().default([]),
  usageIntensity: z.enum(["daily", "occasional"]).optional().default("daily"),
  bufferCents: z.number().int().min(0).optional(),
  includeAlternateSummaries: z.boolean().optional().default(false),
  qualifierAnswers: z.array(QualifierAnswerSchema).optional().default([]),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const d = parsed.data;
  try {
    const bundles = await buildBundles({
      needSlug: d.needSlug,
      budgetCents: d.budgetCents,
      cadence: d.cadence,
      goals: d.goals,
      usageIntensity: d.usageIntensity,
      bufferCents: d.bufferCents,
      qualifierAnswers: d.qualifierAnswers as QualifierAnswer[],
    });

    let alternateMap: Record<
      string,
      Array<{ sku: string; name: string; priceCents: number; active: boolean }>
    > = {};

    if (d.includeAlternateSummaries) {
      const productIds = [
        ...new Set(bundles.flatMap((b) => b.items.map((i) => i.productId))),
      ];
      if (productIds.length > 0) {
        const primaries = await db
          .select({
            sku: products.sku,
            alternateSkus: products.alternateSkus,
          })
          .from(products)
          .where(inArray(products.id, productIds));
        const allAlt = new Set<string>();
        for (const p of primaries) {
          (p.alternateSkus ?? []).forEach((s) => allAlt.add(s));
        }
        const altRows =
          allAlt.size > 0
            ? await db
                .select({
                  sku: products.sku,
                  name: products.name,
                  priceCents: products.priceCents,
                  active: products.active,
                })
                .from(products)
                .where(inArray(products.sku, [...allAlt]))
            : [];
        const bySku = Object.fromEntries(altRows.map((r) => [r.sku, r]));
        for (const p of primaries) {
          if (p.alternateSkus?.length) {
            alternateMap[p.sku] = p.alternateSkus
              .map((sku) => bySku[sku])
              .filter((x): x is (typeof altRows)[number] => Boolean(x));
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      bundles,
      ...(d.includeAlternateSummaries && Object.keys(alternateMap).length
        ? { alternatesByPrimarySku: alternateMap }
        : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bundle generation failed";
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
