"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AddBundleButtonProps {
  bundleSku: string;
  items: { productId: string; quantity: number; lineTotalCents: number }[];
  budgetCents: number;
  cadence: string;
  needSlug: string;
}

export function AddBundleButton({
  bundleSku,
  items,
  budgetCents,
  cadence,
  needSlug,
}: AddBundleButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart/bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundleSku,
          items,
          budgetCents,
          cadence,
          needSlug,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add bundle");
      }
      router.refresh();
      router.push("/cart");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to add bundle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="min-h-[48px] w-full"
    >
      {loading ? "Adding…" : "Add Bundle to Cart"}
    </Button>
  );
}
