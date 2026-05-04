import Link from "next/link";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import { formatPrice } from "@/lib/utils";
import { desc } from "drizzle-orm";

export default async function AdminOrdersPage() {
  const orderList = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Orders</h1>

      {orderList.length === 0 ? (
        <div className="bg-white border rounded-lg px-6 py-12 text-center text-muted-foreground">
          No orders yet.
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orderList.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium hover:underline"
                      >
                        {order.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {order.email ?? <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatPrice(order.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
