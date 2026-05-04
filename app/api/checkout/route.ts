import { NextRequest, NextResponse } from "next/server";
import { getCartToken, getCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { orders, cartItems } from "@/db/schema";
import { stripe } from "@/lib/stripe";
import { getProductById } from "@/lib/products";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const token = await getCartToken();
    if (!token) {
      return NextResponse.json({ error: "No cart found" }, { status: 400 });
    }

    const cart = await getCart();
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }
    if (cart.unresolvedOptionCount > 0) {
      return NextResponse.json(
        {
          error: `Select options for ${cart.unresolvedOptionCount} item${cart.unresolvedOptionCount === 1 ? "" : "s"} to continue.`,
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const subscribe = body.subscribe === true;
    const cadence = body.cadence ?? "monthly";

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get("host")}`;

    let sessionUrl: string;

    if (subscribe && cart.items.some((i) => i.groupKey)) {
      const groupKey = cart.items.find((i) => i.groupKey)?.groupKey!;
      const bundleTotalCents = cart.items
        .filter((i) => i.groupKey === groupKey)
        .reduce((s, i) => s + i.lineTotalCents, 0);

      const priceId = await getOrCreateSubscriptionPrice(
        groupKey,
        cadence,
        bundleTotalCents
      );

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/cart`,
        metadata: {
          cartId: cart.id,
          bundleSku: groupKey,
          cadence,
          type: "subscription",
        },
      });

      sessionUrl = session.url!;
    } else {
      const lineItems: { price_data: { currency: string; product_data: { name: string }; unit_amount: number }; quantity: number }[] = [];

      for (const item of cart.items) {
        const product = await getProductById(item.productId);
        if (!product || !product.active) {
          return NextResponse.json(
            { error: `Product "${item.productName}" is no longer available.` },
            { status: 400 }
          );
        }
        const unitCents = Math.round(item.lineTotalCents / item.quantity);
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: item.productName },
            unit_amount: unitCents,
          },
          quantity: item.quantity,
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/cart`,
        metadata: { cartId: cart.id, type: "payment" },
      });

      const [order] = await db
        .insert(orders)
        .values({
          stripeSessionId: session.id,
          cartId: cart.id,
          totalCents: cart.subtotalCents,
        })
        .returning();

      sessionUrl = session.url!;
    }

    return NextResponse.json({ url: sessionUrl });
  } catch (error) {
    return NextResponse.json(
      { error: "Checkout failed. Please try again." },
      { status: 500 }
    );
  }
}

async function getOrCreateSubscriptionPrice(
  bundleSku: string,
  cadence: "monthly" | "quarterly",
  amountCents: number
): Promise<string> {
  const interval = cadence === "quarterly" ? "month" : "month";
  const intervalCount = cadence === "quarterly" ? 3 : 1;

  const products = await stripe.products.list({
    limit: 100,
  });

  const existingProduct = products.data.find(
    (p) => p.metadata?.bundleSku === bundleSku
  );

  let productId: string;
  if (existingProduct) {
    productId = existingProduct.id;
  } else {
    const product = await stripe.products.create({
      name: `Bundle: ${bundleSku}`,
      metadata: { bundleSku },
    });
    productId = product.id;
  }

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
  });

  const existingPrice = prices.data.find(
    (p) =>
      p.recurring?.interval === interval &&
      p.recurring?.interval_count === intervalCount
  );

  if (existingPrice) return existingPrice.id;

  const price = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: amountCents,
    recurring: { interval, interval_count: intervalCount },
  });

  return price.id;
}
