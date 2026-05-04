import Link from "next/link";
import { db } from "@/lib/db";
import { orders, products } from "@/db/schema";
import { formatPrice } from "@/lib/utils";
import { desc, eq, sql } from "drizzle-orm";

export default async function AdminDashboardPage() {
  const [orderStats, recentOrders, productCount] = await Promise.all([
    db.select({
      total: sql<number>`coalesce(sum(${orders.totalCents}), 0)`,
      count: sql<number>`count(*)`,
    }).from(orders),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5),
    db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.active, true)),
  ]);

  const totalRevenue = Number(orderStats[0]?.total ?? 0);
  const totalOrders = Number(orderStats[0]?.count ?? 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-2xl font-semibold mt-1">{formatPrice(totalRevenue)}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-2xl font-semibold mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active Products</p>
          <p className="text-2xl font-semibold mt-1">{productCount[0]?.count ?? 0}</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
            View all →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground text-center">No orders yet.</p>
        ) : (
          <div className="divide-y">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{order.id.slice(0, 8)}…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <p className="text-sm font-semibold">{formatPrice(order.totalCents)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
