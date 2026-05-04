import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const [product] = await db
    .insert(products)
    .values({
      sku: body.sku,
      name: body.name,
      description: body.description || null,
      categoryId: body.categoryId,
      priceCents: body.priceCents,
      imageUrl: body.imageUrl || null,
      eligible: body.eligible ?? true,
      active: body.active ?? true,
    })
    .returning();

  return NextResponse.json({ id: product.id });
}
