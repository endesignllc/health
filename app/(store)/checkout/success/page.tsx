import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  if (!sessionId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>
        <p className="text-muted-foreground">No session found.</p>
        <Button asChild className="mt-6">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.stripeSessionId, sessionId),
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <h1 className="text-3xl font-bold mb-4">Thank You!</h1>
      <p className="text-muted-foreground mb-6">
        Your order has been received. You will receive a confirmation email shortly.
      </p>
      {order && (
        <p className="text-sm text-muted-foreground mb-6">
          Order total: ${((order.totalCents ?? 0) / 100).toFixed(2)}
        </p>
      )}
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  );
}
