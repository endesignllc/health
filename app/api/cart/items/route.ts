import { NextRequest, NextResponse } from "next/server";
import { updateCartItemQuantity, removeCartItem } from "@/lib/cart";
import { z } from "zod";

const UpdateSchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.number().int().min(0),
});

const DeleteSchema = z.object({
  cartItemId: z.string().uuid(),
});

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await updateCartItemQuantity(
      parsed.data.cartItemId,
      parsed.data.quantity
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await removeCartItem(parsed.data.cartItemId);

    if (!result.success) {
      return NextResponse.json({ error: "Item not found" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }
}
