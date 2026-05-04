import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/db/schema";

type VisibilityMode = "showOnlyVendor" | "showAll";

interface VisibilityPayload {
  mode?: VisibilityMode;
  vendor?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as VisibilityPayload;

  if (body.mode !== "showOnlyVendor" && body.mode !== "showAll") {
    return NextResponse.json({ error: "Invalid visibility mode" }, { status: 400 });
  }

  if (body.mode === "showOnlyVendor") {
    const vendor = body.vendor?.trim();
    if (!vendor) {
      return NextResponse.json({ error: "Vendor is required" }, { status: 400 });
    }

    await db.update(products).set({ active: false });
    await db
      .update(products)
      .set({ active: true, eligible: true })
      .where(eq(products.vendor, vendor));

    const activeCount = await db.$count(
      products,
      and(eq(products.vendor, vendor), eq(products.active, true))
    );

    return NextResponse.json({
      mode: body.mode,
      vendor,
      updated: activeCount,
    });
  }

  await db.update(products).set({ active: true, eligible: true });
  const activeCount = await db.$count(products, eq(products.active, true));

  return NextResponse.json({
    mode: body.mode,
    updated: activeCount,
  });
}
