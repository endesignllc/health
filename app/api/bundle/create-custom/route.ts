import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bundles, bundleItems } from "@/db/schema";
import { getNeedBySlug } from "@/lib/products";
import { z } from "zod";

const CreateCustomSchema = z.object({
  bundleSku: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
    lineTotalCents: z.number().int().min(0),
  })),
  budgetCents: z.number().int().min(0),
  cadence: z.enum(["monthly", "quarterly"]),
  needSlug: z.string().min(1),
  tier: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateCustomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const need = await getNeedBySlug(parsed.data.needSlug);
    if (!need) {
      return NextResponse.json({ error: "Need not found" }, { status: 400 });
    }

    const customSku = `BNDL-CUSTOM-${Date.now()}`;
    const subtotalCents = parsed.data.items.reduce((s, i) => s + i.lineTotalCents, 0);

    const [bundle] = await db
      .insert(bundles)
      .values({
        bundleSku: customSku,
        needId: need.id,
        cadence: parsed.data.cadence,
        budgetCents: parsed.data.budgetCents,
        tier: parsed.data.tier ?? "custom",
        subtotalCents,
      })
      .returning();

    for (const item of parsed.data.items) {
      await db.insert(bundleItems).values({
        bundleId: bundle.id,
        productId: item.productId,
        quantity: item.quantity,
        lineTotalCents: item.lineTotalCents,
      });
    }

    return NextResponse.json({ bundleId: bundle.id });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create bundle" }, { status: 500 });
  }
}
