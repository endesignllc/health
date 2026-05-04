import { db } from "@/lib/db";
import { orders, cartItems, carts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
  });

  if (!order) notFound();

  let items: { productName: string; quantity: number; lineTotalCents: number }[] = [];

  if (order.cartId) {
    const cartItemsList = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, order.cartId),
      with: { product: true },
    });
    items = cartItemsList
      .filter((i) => i.product)
      .map((i) => ({
        productName: i.product!.name,
        quantity: i.quantity,
        lineTotalCents: i.lineTotalCents,
      }));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Order {order.id.slice(0, 8)}…</h1>

      <div className="space-y-4">
        <div className="bg-white border rounded-lg p-6">
          <p><strong>Email:</strong> {order.email ?? "—"}</p>
          <p><strong>Total:</strong> {formatPrice(order.totalCents)}</p>
          <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
        </div>

        {items.length > 0 && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <h2 className="px-6 py-4 border-b font-semibold">Items</h2>
            <ul className="divide-y">
              {items.map((item, i) => (
                <li key={i} className="px-6 py-3 flex justify-between">
                  <span>{item.productName} × {item.quantity}</span>
                  <span>{formatPrice(item.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
