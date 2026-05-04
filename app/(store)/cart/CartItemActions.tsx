"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface CartItemActionsProps {
  cartItemId: string;
  quantity: number;
  productId: string;
}

export function CartItemActions({
  cartItemId,
  quantity,
}: CartItemActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const updateQty = async (newQty: number) => {
    if (newQty < 1) return;
    setLoading(true);
    try {
      const res = await fetch("/api/cart/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId, quantity: newQty }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex items-center border rounded-md">
        <button
          type="button"
          onClick={() => updateQty(quantity - 1)}
          disabled={loading || quantity <= 1}
          className="px-3 py-1 text-sm hover:bg-muted disabled:opacity-50 min-h-[36px] min-w-[36px]"
        >
          −
        </button>
        <span className="px-3 py-1 text-sm min-w-[2ch] text-center">{quantity}</span>
        <button
          type="button"
          onClick={() => updateQty(quantity + 1)}
          disabled={loading}
          className="px-3 py-1 text-sm hover:bg-muted disabled:opacity-50 min-h-[36px] min-w-[36px]"
        >
          +
        </button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={remove}
        disabled={loading}
        className="text-destructive hover:text-destructive"
      >
        Remove
      </Button>
    </div>
  );
}
