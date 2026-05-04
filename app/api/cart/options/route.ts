import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateCartItemOptionSelection } from "@/lib/cart";

const UpdateOptionSchema = z.object({
  cartItemId: z.string().uuid(),
  selectedProductId: z.string().uuid(),
});

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = UpdateOptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await updateCartItemOptionSelection(
      parsed.data.cartItemId,
      parsed.data.selectedProductId
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update options" }, { status: 500 });
  }
}
