import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const alternateSkus =
    typeof body.alternateSkusCsv === "string"
      ? body.alternateSkusCsv
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : Array.isArray(body.alternateSkus)
        ? body.alternateSkus
        : null;

  await db
    .update(products)
    .set({
      name: body.name,
      description: body.description || null,
      priceCents: body.priceCents,
      imageUrl: body.imageUrl || null,
      eligible: body.eligible ?? true,
      active: body.active ?? true,
      categoryId: body.categoryId,
      supplyDays: Number(body.supplyDays) || 30,
      unitsPerPackage: Math.max(1, Number(body.unitsPerPackage) || 1),
      estimatedDailyUse:
        body.estimatedDailyUse === "" ||
        body.estimatedDailyUse === null ||
        body.estimatedDailyUse === undefined
          ? null
          : Math.max(1, Number(body.estimatedDailyUse)),
      vendor: body.vendor?.trim() || null,
      alternateSkus: alternateSkus?.length ? alternateSkus : null,
      inStock: body.inStock !== false,
      restockEtaHours:
        body.restockEtaHours === "" || body.restockEtaHours == null
          ? null
          : Math.max(0, Number(body.restockEtaHours)),
    })
    .where(eq(products.id, id));

  return NextResponse.json({ success: true });
}
