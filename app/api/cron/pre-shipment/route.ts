import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptionShipments } from "@/db/schema";
import { and, eq, lte } from "drizzle-orm";
import { sendPreShipmentNotification } from "@/lib/notifications";

/**
 * Run daily via Vercel Cron or external scheduler (GET with Authorization: Bearer CRON_SECRET).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await db
    .select()
    .from(subscriptionShipments)
    .where(
      and(
        eq(subscriptionShipments.status, "pending_notify"),
        lte(subscriptionShipments.notifyAt, now)
      )
    );

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  let notificationsSent = 0;

  for (const row of due) {
    const email = row.memberEmail;
    const snapshot = row.bundleSnapshot as { bundleSku?: string } | null;

    if (email && baseUrl) {
      const manageUrl = `${baseUrl}/api/shipments/${row.id}/respond?token=${encodeURIComponent(row.responseToken)}&action=approve`;
      await sendPreShipmentNotification({
        to: email,
        shipmentId: row.id,
        scheduledShipAt: row.scheduledShipAt,
        bundleSku: snapshot?.bundleSku ?? "bundle",
        manageUrl,
      });
      notificationsSent++;
    }

    await db
      .update(subscriptionShipments)
      .set({ status: "pending_member", notifiedAt: now })
      .where(eq(subscriptionShipments.id, row.id));
  }

  return NextResponse.json({
    ok: true,
    dueCount: due.length,
    notificationsSent,
  });
}
