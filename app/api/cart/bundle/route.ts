import { NextRequest, NextResponse } from "next/server";
import { addBundleToCart } from "@/lib/cart";
import { getNeedBySlug } from "@/lib/products";
import { z } from "zod";

const AddBundleSchema = z.object({
  bundleSku: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
    lineTotalCents: z.number().int().min(0),
    optionSelectionConfirmed: z.boolean().optional(),
    optionSelectionLabel: z.string().nullable().optional(),
  })),
  budgetCents: z.number().int().min(0),
  cadence: z.enum(["monthly", "quarterly"]),
  needSlug: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AddBundleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const need = await getNeedBySlug(parsed.data.needSlug);
    const result = await addBundleToCart(
      parsed.data.items,
      parsed.data.bundleSku,
      parsed.data.budgetCents,
      parsed.data.cadence,
      need?.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to add bundle" }, { status: 500 });
  }
}
