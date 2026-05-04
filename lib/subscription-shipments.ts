import { db } from "@/lib/db";
import { carts, subscriptionShipments, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Cadence } from "@/lib/sufficiency";
import {
  addDays,
  generateShipmentResponseToken,
  preShipmentLeadDays,
  type BundleSnapshot,
} from "@/lib/subscription-schedule";

export async function buildBundleSnapshotFromCartId(
  cartId: string,
  bundleSku: string,
  cadence: Cadence
): Promise<BundleSnapshot | null> {
  const cart = await db.query.carts.findFirst({
    where: eq(carts.id, cartId),
    with: {
      items: {
        with: { product: true },
      },
    },
  });
  if (!cart) return null;

  const items = cart.items
    .filter((i) => i.product && i.groupKey === bundleSku)
    .map((i) => ({
      productId: i.productId,
      sku: i.product!.sku,
      name: i.product!.name,
      quantity: i.quantity,
      lineTotalCents: i.lineTotalCents,
    }));

  return {
    bundleSku,
    cadence,
    items,
    capturedAt: new Date().toISOString(),
  };
}

export async function insertSubscriptionShipmentRow(input: {
  subscriptionId: string;
  scheduledShipAt: Date;
  memberEmail: string | null;
  bundleSnapshot: BundleSnapshot;
  stripeInvoiceId?: string | null;
}) {
  const lead = preShipmentLeadDays();
  const notifyAt = addDays(input.scheduledShipAt, -lead);
  const responseToken = generateShipmentResponseToken();

  const [row] = await db
    .insert(subscriptionShipments)
    .values({
      subscriptionId: input.subscriptionId,
      scheduledShipAt: input.scheduledShipAt,
      notifyAt,
      memberEmail: input.memberEmail,
      bundleSnapshot: input.bundleSnapshot,
      stripeInvoiceId: input.stripeInvoiceId ?? null,
      responseToken,
      status: "pending_notify",
    })
    .returning();

  return row;
}

export async function updateSubscriptionNextShip(
  subscriptionId: string,
  nextShipDate: Date
) {
  await db
    .update(subscriptions)
    .set({ nextShipDate })
    .where(eq(subscriptions.id, subscriptionId));
}
