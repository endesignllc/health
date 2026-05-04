import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const categoryId = req.nextUrl.searchParams.get("categoryId");
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId required" }, { status: 400 });
  }

  const list = await db.query.products.findMany({
    where: and(
      eq(products.categoryId, categoryId),
      eq(products.active, true),
      eq(products.eligible, true)
    ),
    columns: { id: true, sku: true, name: true, priceCents: true },
  });

  return NextResponse.json(list);
}
