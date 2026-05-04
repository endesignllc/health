"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface CustomizeButtonProps {
  bundleSku: string;
  items: { productId: string; quantity: number; lineTotalCents: number }[];
  budgetCents: number;
  cadence: string;
  needSlug: string;
  tier: string;
}

export function CustomizeButton(props: CustomizeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bundle/create-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      router.push(`/bundle/${data.bundleId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className="w-full min-h-[44px]"
      >
        {loading ? "Opening…" : "Customize"}
      </Button>
      <p className="text-xs text-muted-foreground text-center leading-snug">
        You can adjust items or quantities anytime
      </p>
    </div>
  );
}
