"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { BudgetMeter } from "@/components/BudgetMeter";
import { BenefitWalletCard } from "@/components/BenefitWalletCard";
import type { BenefitWalletSnapshot } from "@/lib/benefit-wallet/types";

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
  wallet?: BenefitWalletSnapshot | null;
  /** Hide checkout button and show "Covered by your benefit" summary */
  hideCheckout?: boolean;
}

export function CheckoutSection({
  cart,
  budgetCents,
  cadence,
  unresolvedOptionCount,
  wallet,
  hideCheckout = false,
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

      {wallet ? (
        <BenefitWalletCard className="mb-4" wallet={wallet} compact />
      ) : (
        budgetCents != null && (
          <BudgetMeter
            className="mb-4"
            budgetCents={budgetCents}
            usedCents={cart.subtotalCents}
            cadence={cadence}
            compact
          />
        )
      )}

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatPrice(cart.subtotalCents)}</span>
        </div>
      </div>

      {hideCheckout ? (
        <>
          {/* Benefit coverage summary for demo */}
          <div className="border-t pt-4 mb-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Your cost</span>
              <span className="font-bold text-lg text-green-600">$0.00</span>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-green-700 font-medium text-sm">
                ✓ Covered by your benefit
              </p>
              <p className="text-green-600 text-xs mt-1">
                {formatPrice(cart.subtotalCents)} applied from your monthly allowance
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Your order will be submitted for fulfillment through your plan.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Demo mode — checkout disabled
            </p>
          </div>
        </>
      ) : (
        <>
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
        </>
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
