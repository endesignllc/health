"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { extractVariantListingAttribute } from "@/lib/variant-label";

interface BundleItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  productDescription: string | null;
  categoryId: string;
  categorySlug: string;
  priceCents: number;
  quantity: number;
  lineTotalCents: number;
  requiresOptionSelection: boolean;
  optionSelectionConfirmed: boolean;
  optionSelectionLabel: string | null;
  familyOptions: {
    productId: string;
    sku: string;
    label: string;
    priceCents: number;
    description: string | null;
  }[];
}

interface BundleEditorProps {
  bundleId: string;
  bundleSku: string;
  items: BundleItem[];
  budgetCents: number;
  cadence: string;
  needSlug: string;
  needId: string;
}

export function BundleEditor({
  bundleId,
  bundleSku,
  items: initialItems,
  budgetCents,
  cadence,
  needSlug,
  needId,
}: BundleEditorProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [swapProductId, setSwapProductId] = useState<string | null>(null);

  const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0);
  const bufferCents = 500;
  const capCents = budgetCents - bufferCents;
  const remainingCents = budgetCents - subtotalCents;
  const isOverBudget = remainingCents < 0;
  const unresolvedOptionItems = items.filter(
    (i) => i.requiresOptionSelection && !i.optionSelectionConfirmed
  );
  const totalOptionRequiredCount = items.filter((i) => i.requiresOptionSelection).length;
  const currentOptionItem = unresolvedOptionItems[0] ?? null;
  const currentOptionDetail = currentOptionItem
    ? extractVariantListingAttribute(
        currentOptionItem.productName,
        currentOptionItem.productDescription
      )
    : null;
  const [selectedByItemId, setSelectedByItemId] = useState<Record<string, string>>({});

  const handleSave = async () => {
    if (isOverBudget) {
      alert("Please reduce your bundle to stay within budget.");
      return;
    }
    if (unresolvedOptionItems.length > 0) {
      alert(
        `Select options for ${unresolvedOptionItems.length} item${
          unresolvedOptionItems.length === 1 ? "" : "s"
        } before continuing.`
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/cart/bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundleSku,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            lineTotalCents: i.lineTotalCents,
            optionSelectionConfirmed: i.optionSelectionConfirmed,
            optionSelectionLabel: i.optionSelectionLabel,
          })),
          budgetCents,
          cadence,
          needSlug,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.refresh();
      router.push("/cart");
    } catch (e) {
      alert("Failed to save bundle");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndNext = () => {
    if (!currentOptionItem) return;
    const selectedProductId =
      selectedByItemId[currentOptionItem.id] ?? currentOptionItem.productId;
    const selected = currentOptionItem.familyOptions.find(
      (opt) => opt.productId === selectedProductId
    );
    if (!selected) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === currentOptionItem.id
          ? {
              ...item,
              productId: selected.productId,
              productSku: selected.sku,
              productName: item.productName,
              productDescription: selected.description ?? item.productDescription,
              priceCents: selected.priceCents,
              lineTotalCents: selected.priceCents * item.quantity,
              optionSelectionConfirmed: true,
              optionSelectionLabel: selected.label,
            }
          : item
      )
    );
  };

  return (
    <div className="space-y-6">
      {currentOptionItem && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium mb-1">Finish your selections</p>
            <p className="text-xs text-muted-foreground mb-3">
              Selections completed: {totalOptionRequiredCount - unresolvedOptionItems.length} of{" "}
              {totalOptionRequiredCount}
            </p>
            <p className="font-medium mb-1">{currentOptionItem.productName}</p>
            {currentOptionDetail ? (
              <p className="text-xs text-muted-foreground mb-3">{currentOptionDetail}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 mb-3">
              {currentOptionItem.familyOptions.map((option) => {
                const selectedProductId =
                  selectedByItemId[currentOptionItem.id] ?? currentOptionItem.productId;
                const selected = selectedProductId === option.productId;
                return (
                  <Button
                    key={option.productId}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    aria-pressed={selected}
                    onClick={() =>
                      setSelectedByItemId((prev) => ({
                        ...prev,
                        [currentOptionItem.id]: option.productId,
                      }))
                    }
                  >
                    {option.label} · {formatPrice(option.priceCents)}
                  </Button>
                );
              })}
            </div>
            <Button type="button" onClick={handleSaveAndNext}>
              Save & Next
            </Button>
          </CardContent>
        </Card>
      )}

      {items.map((item) => {
        const itemVariantDetail = extractVariantListingAttribute(
          item.productName,
          item.productDescription
        );
        return (
        <Card key={item.id}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="font-medium">{item.productName}</p>
                {itemVariantDetail ? (
                  <p className="text-xs text-muted-foreground mt-0.5">{itemVariantDetail}</p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {item.quantity} × {formatPrice(item.priceCents)} = {formatPrice(item.lineTotalCents)}
                </p>
                {item.requiresOptionSelection && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.optionSelectionConfirmed
                      ? `Options selected: ${item.optionSelectionLabel ?? "Selected"}`
                      : "Select options"}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSwapProductId(swapProductId === item.productId ? null : item.productId)}
              >
                Swap
              </Button>
            </div>
            {swapProductId === item.productId && (
              <SwapProductForm
                categoryId={item.categoryId}
                currentProductId={item.productId}
                budgetRemaining={capCents - (subtotalCents - item.lineTotalCents)}
                onSelect={(newProduct) => {
                  setItems((prev) =>
                    prev.map((p) =>
                      p.productId === item.productId
                        ? {
                            ...p,
                            productId: newProduct.id,
                            productSku: newProduct.sku,
                            productName: newProduct.name,
                            productDescription: newProduct.description ?? null,
                            priceCents: newProduct.priceCents,
                            lineTotalCents: newProduct.priceCents * p.quantity,
                          }
                        : p
                    )
                  );
                  setSwapProductId(null);
                }}
                onCancel={() => setSwapProductId(null)}
              />
            )}
          </CardContent>
        </Card>
        );
      })}

      <div className="flex flex-col gap-4">
        <div className="text-lg font-semibold">
          Total: {formatPrice(subtotalCents)}
          {isOverBudget && (
            <span className="text-destructive ml-2">(Over budget)</span>
          )}
        </div>
        <Button
          size="lg"
          className="min-h-[56px] w-full"
          onClick={handleSave}
          disabled={loading || isOverBudget || unresolvedOptionItems.length > 0}
        >
          {loading ? "Saving…" : "Save Bundle to Cart"}
        </Button>
        {unresolvedOptionItems.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Select options for {unresolvedOptionItems.length} item
            {unresolvedOptionItems.length === 1 ? "" : "s"} to continue.
          </p>
        )}
      </div>
    </div>
  );
}

type SwapProductPick = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  description: string | null;
};

function SwapProductForm({
  categoryId,
  currentProductId,
  budgetRemaining,
  onSelect,
  onCancel,
}: {
  categoryId: string;
  currentProductId: string;
  budgetRemaining: number;
  onSelect: (p: SwapProductPick) => void;
  onCancel: () => void;
}) {
  const [products, setProducts] = useState<SwapProductPick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products?categoryId=${categoryId}`)
      .then((r) => r.json())
      .then((data) => setProducts((data ?? []).filter((p: { id: string }) => p.id !== currentProductId)))
      .finally(() => setLoading(false));
  }, [categoryId, currentProductId]);

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/30">
      <p className="text-sm font-medium mb-2">Choose a replacement (same category):</p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {products
            .filter((p) => p.priceCents <= budgetRemaining)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p)}
                className="block w-full text-left px-3 py-2 rounded border hover:bg-muted text-sm"
              >
                {p.name} — {formatPrice(p.priceCents)}
              </button>
            ))}
          {products.filter((p) => p.priceCents <= budgetRemaining).length === 0 && (
            <p className="text-sm text-muted-foreground">No alternatives within budget.</p>
          )}
        </div>
      )}
      <Button variant="ghost" size="sm" className="mt-2" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
