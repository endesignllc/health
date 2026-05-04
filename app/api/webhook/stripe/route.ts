import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  stripeEvents,
  orders,
  subscriptions,
  subscriptionShipments,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Stripe from "stripe";
import { firstScheduledShipDate } from "@/lib/subscription-schedule";
import type { Cadence } from "@/lib/sufficiency";
import {
  buildBundleSnapshotFromCartId,
  insertSubscriptionShipmentRow,
  updateSubscriptionNextShip,
} from "@/lib/subscription-shipments";
import type { BundleSnapshot } from "@/lib/subscription-schedule";

function invoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  const o = inv as unknown as {
    subscription?: string | { id?: string } | null;
    parent?: { subscription_details?: { subscription?: string | null } };
  };
  if (typeof o.subscription === "string") return o.subscription;
  if (o.subscription && typeof o.subscription === "object" && o.subscription.id)
    return o.subscription.id;
  const sid = o.parent?.subscription_details?.subscription;
  return typeof sid === "string" ? sid : null;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = Buffer.from(await req.arrayBuffer());
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const existing = await db.query.stripeEvents.findFirst({
    where: eq(stripeEvents.eventId, event.id),
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await db.insert(stripeEvents).values({
    eventId: event.id,
    type: event.type,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata ?? {};
        const isSubscription = metadata.type === "subscription";

        if (isSubscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id;

          if (subId && customerId && metadata.bundleSku && metadata.cadence) {
            const cadence = metadata.cadence as Cadence;
            const email = session.customer_details?.email ?? null;
            const firstShip = firstScheduledShipDate(cadence);

            const [subRow] = await db
              .insert(subscriptions)
              .values({
                stripeCustomerId: customerId,
                stripeSubscriptionId: subId,
                bundleSku: metadata.bundleSku,
                cadence: metadata.cadence,
                status: "active",
                nextShipDate: firstShip,
                memberEmail: email,
              })
              .returning();

            let bundleSnapshot: BundleSnapshot = {
              bundleSku: metadata.bundleSku,
              cadence,
              items: [],
              capturedAt: new Date().toISOString(),
            };

            if (metadata.cartId && subRow) {
              const built = await buildBundleSnapshotFromCartId(
                metadata.cartId,
                metadata.bundleSku,
                cadence
              );
              if (built) bundleSnapshot = built;
            }

            if (subRow) {
              await insertSubscriptionShipmentRow({
                subscriptionId: subRow.id,
                scheduledShipAt: firstShip,
                memberEmail: email,
                bundleSnapshot,
              });
            }
          }
        } else {
          await db
            .update(orders)
            .set({
              email: session.customer_details?.email ?? undefined,
            })
            .where(eq(orders.stripeSessionId, session.id));
        }
        break;
      }

      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.billing_reason !== "subscription_cycle") break;

        const stripeSubId = invoiceSubscriptionId(inv);
        if (!stripeSubId || !inv.id) break;

        const dup = await db.query.subscriptionShipments.findFirst({
          where: eq(subscriptionShipments.stripeInvoiceId, inv.id),
        });
        if (dup) break;

        const subRow = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeSubscriptionId, stripeSubId),
        });
        if (!subRow || subRow.status !== "active") break;

        const scheduledShipAt = new Date(inv.period_end * 1000);
        const cadence = subRow.cadence as Cadence;

        const lastShip = await db.query.subscriptionShipments.findFirst({
          where: eq(subscriptionShipments.subscriptionId, subRow.id),
          orderBy: [desc(subscriptionShipments.createdAt)],
        });

        const bundleSnapshot: BundleSnapshot =
          lastShip?.bundleSnapshot != null
            ? (lastShip.bundleSnapshot as BundleSnapshot)
            : {
                bundleSku: subRow.bundleSku,
                cadence,
                items: [],
                capturedAt: new Date().toISOString(),
              };

        await insertSubscriptionShipmentRow({
          subscriptionId: subRow.id,
          scheduledShipAt,
          memberEmail: subRow.memberEmail ?? lastShip?.memberEmail ?? null,
          bundleSnapshot,
          stripeInvoiceId: inv.id,
        });

        await updateSubscriptionNextShip(subRow.id, scheduledShipAt);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .update(subscriptions)
          .set({
            status:
              sub.status === "active"
                ? "active"
                : sub.status === "canceled" || sub.status === "unpaid"
                  ? "canceled"
                  : "paused",
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }

      default:
        break;
    }
  } catch {
    // Event stored; idempotency prevents re-processing
  }

  return NextResponse.json({ received: true });
}
