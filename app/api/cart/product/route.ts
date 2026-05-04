import { NextRequest, NextResponse } from "next/server";
import { addProductToCart } from "@/lib/cart";
import { z } from "zod";

const schema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await addProductToCart(
      parsed.data.productId,
      parsed.data.quantity
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to add product" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
