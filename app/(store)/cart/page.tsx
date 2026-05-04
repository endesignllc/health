import Link from "next/link";
import { getCart } from "@/lib/cart";
import { formatPrice } from "@/lib/utils";
import { CartItemActions } from "./CartItemActions";
import { CheckoutSection } from "./CheckoutSection";
import { CartOptionFlow } from "./CartOptionFlow";

export default async function CartPage() {
  const cart = await getCart();
  const isEmpty = !cart || cart.items.length === 0;

  if (isEmpty) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">Build a bundle to get started.</p>
        <Link
          href="/build"
          className="inline-flex items-center justify-center min-h-[56px] px-8 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90"
        >
          Build My Bundle
        </Link>
      </div>
    );
  }

  const groups = cart.items.reduce(
    (acc, item) => {
      const key = item.groupKey ?? "default";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, typeof cart.items>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <CartOptionFlow
            unresolvedItems={cart.items.filter(
              (i) => i.requiresOptionSelection && !i.optionSelectionConfirmed
            )}
            totalRequired={cart.totalOptionRequiredCount}
          />
          {Object.entries(groups).map(([groupKey, items]) => (
            <div key={groupKey} className="border rounded-lg overflow-hidden">
              {groupKey !== "default" && (
                <div className="px-4 py-2 bg-muted/50 text-sm font-medium">
                  Bundle: {groupKey}
                </div>
              )}
              <div className="divide-y">
                {[...items]
                  .sort((a, b) => {
                    const aNeeds = a.requiresOptionSelection && !a.optionSelectionConfirmed;
                    const bNeeds = b.requiresOptionSelection && !b.optionSelectionConfirmed;
                    if (aNeeds === bNeeds) return 0;
                    return aNeeds ? -1 : 1;
                  })
                  .map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 items-center"
                  >
                    <div className="w-16 h-16 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.lineTotalCents / item.quantity)} × {item.quantity}
                      </p>
                      {item.requiresOptionSelection && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.optionSelectionConfirmed
                            ? `Options selected: ${item.optionSelectionLabel ?? "Selected"}`
                            : "Select options"}
                        </p>
                      )}
                      <CartItemActions
                        cartItemId={item.id}
                        quantity={item.quantity}
                        productId={item.productId}
                      />
                    </div>
                    <div className="text-right flex-shrink-0 font-semibold">
                      {formatPrice(item.lineTotalCents)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <CheckoutSection
            cart={cart}
            budgetCents={cart.budgetCents}
            cadence={cart.cadence}
            unresolvedOptionCount={cart.unresolvedOptionCount}
          />
        </div>
      </div>
    </div>
  );
}
