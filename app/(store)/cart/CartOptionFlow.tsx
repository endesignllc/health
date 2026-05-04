"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

type CartLine = {
  id: string;
  productName: string;
  productId: string;
  optionSelectionConfirmed: boolean;
  optionSelectionLabel: string | null;
  requiresOptionSelection: boolean;
  familyOptions: {
    productId: string;
    sku: string;
    label: string;
    priceCents: number;
  }[];
};

export function CartOptionFlow({
  unresolvedItems,
  totalRequired,
}: {
  unresolvedItems: CartLine[];
  totalRequired: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [selectedByItem, setSelectedByItem] = useState<Record<string, string>>({});

  if (!unresolvedItems.length) return null;

  const current = unresolvedItems[0]!;
  const selectedProductId =
    selectedByItem[current.id] ??
    current.familyOptions.find((o) => o.productId === current.productId)?.productId ??
    "";

  const completedCount = totalRequired - unresolvedItems.length;

  const saveAndNext = async () => {
    if (!selectedProductId) return;
    setPending(true);
    try {
      const res = await fetch("/api/cart/options", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItemId: current.id,
          selectedProductId,
        }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Could not save selection");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="text-base font-semibold">Finish your selections</h2>
          <p className="text-sm text-muted-foreground">
            Selections completed: {completedCount} of {totalRequired}
          </p>
        </div>
      </div>

      <p className="text-sm font-medium mb-3">{current.productName}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {current.familyOptions.map((option) => (
          <Button
            key={option.productId}
            type="button"
            variant={selectedProductId === option.productId ? "default" : "outline"}
            size="sm"
            aria-pressed={selectedProductId === option.productId}
            onClick={() =>
              setSelectedByItem((prev) => ({
                ...prev,
                [current.id]: option.productId,
              }))
            }
          >
            {option.label} · {formatPrice(option.priceCents)}
          </Button>
        ))}
      </div>

      <Button
        type="button"
        onClick={saveAndNext}
        disabled={!selectedProductId || pending}
      >
        {pending ? "Saving…" : "Save & Next"}
      </Button>
    </div>
  );
}
