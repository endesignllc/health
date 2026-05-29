"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { BudgetMeter } from "@/components/BudgetMeter";

interface CartWithItems {
  subtotalCents: number;
  budgetCents: number | null;
  cadence: string | null;
}

interface CheckoutSectionProps {
  cart: CartWithItems;
  budgetCents: number | null;
  cadence: string | null;
  unresolvedOptionCount: number;
}

export function CheckoutSection({
  cart,
  budgetCents,
  cadence,
  unresolvedOptionCount,
}: CheckoutSectionProps) {
  const [subscribe, setSubscribe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscribe,
          cadence: cadence ?? "monthly",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 sticky top-24">
      <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

      {budgetCents != null && (
        <BudgetMeter
          className="mb-4"
          budgetCents={budgetCents}
          usedCents={cart.subtotalCents}
          cadence={cadence}
          compact
        />
      )}

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatPrice(cart.subtotalCents)}</span>
        </div>
      </div>

      <div className="border-t pt-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={subscribe}
            onChange={(e) => setSubscribe(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Subscribe to this bundle ({cadence ?? "monthly"})</span>
        </label>
      </div>

      <Button
        size="lg"
        className="w-full min-h-[56px]"
        onClick={handleCheckout}
        disabled={loading || unresolvedOptionCount > 0}
      >
        {loading ? "Processing…" : "Checkout"}
      </Button>
      {unresolvedOptionCount > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Select options for {unresolvedOptionCount} item
          {unresolvedOptionCount === 1 ? "" : "s"} to continue.
        </p>
      )}

      <Link
        href="/build"
        className="block text-center text-sm text-muted-foreground mt-4 hover:text-foreground"
      >
        ← Build another bundle
      </Link>
    </div>
  );
}
