import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptionShipments } from "@/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Pre-shipment member action from email link (approve = proceed; skip = defer this cycle).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");
  const action = req.nextUrl.searchParams.get("action");

  if (!token || !action) {
    return NextResponse.json({ error: "Missing token or action" }, { status: 400 });
  }

  if (!["approve", "skip"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const row = await db.query.subscriptionShipments.findFirst({
    where: and(
      eq(subscriptionShipments.id, id),
      eq(subscriptionShipments.responseToken, token)
    ),
  });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.status === "skipped" || row.status === "approved") {
    const origin =
      process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
    return NextResponse.redirect(new URL("/", origin));
  }

  const nextStatus = action === "approve" ? "approved" : "skipped";

  await db
    .update(subscriptionShipments)
    .set({ status: nextStatus })
    .where(eq(subscriptionShipments.id, id));

  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
  return NextResponse.redirect(
    new URL(`/?shipmentNotice=${nextStatus}`, origin)
  );
}
