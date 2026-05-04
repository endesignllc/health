"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string;
  priceCents: number;
  imageUrl: string | null;
  eligible: boolean;
  tags: string[] | null;
  active: boolean;
  supplyDays: number;
  unitsPerPackage: number;
  estimatedDailyUse: number | null;
  vendor: string | null;
  alternateSkus: string[] | null;
  inStock: boolean;
  restockEtaHours: number | null;
}

interface ProductEditFormProps {
  product: Product;
  categories: { id: string; name: string }[];
}

export function ProductEditForm({ product, categories }: ProductEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: product.name,
    description: product.description ?? "",
    priceCents: product.priceCents,
    imageUrl: product.imageUrl ?? "",
    eligible: product.eligible,
    active: product.active,
    categoryId: product.categoryId,
    supplyDays: product.supplyDays,
    unitsPerPackage: product.unitsPerPackage ?? 1,
    estimatedDailyUse:
      product.estimatedDailyUse != null ? String(product.estimatedDailyUse) : "",
    vendor: product.vendor ?? "",
    alternateSkusCsv: (product.alternateSkus ?? []).join(", "),
    inStock: product.inStock !== false,
    restockEtaHours:
      product.restockEtaHours != null ? String(product.restockEtaHours) : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          alternateSkusCsv: form.alternateSkusCsv,
          inStock: form.inStock,
          restockEtaHours: form.restockEtaHours,
        }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <Label>SKU (read-only)</Label>
        <Input value={product.sku} disabled className="mt-1" />
      </div>
      <div>
        <Label>Name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label>Category</Label>
        <select
          value={form.categoryId}
          onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          className="w-full mt-1 px-3 py-2 border rounded-md"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Price (cents)</Label>
        <Input
          type="number"
          value={form.priceCents}
          onChange={(e) => setForm((f) => ({ ...f, priceCents: parseInt(e.target.value, 10) || 0 }))}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Supply days (per purchased unit)</Label>
        <Input
          type="number"
          min={1}
          value={form.supplyDays}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              supplyDays: parseInt(e.target.value, 10) || 30,
            }))
          }
          className="mt-1"
        />
      </div>
      <div>
        <Label>Units per package (e.g. tablets, test strips)</Label>
        <Input
          type="number"
          min={1}
          value={form.unitsPerPackage}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              unitsPerPackage: parseInt(e.target.value, 10) || 1,
            }))
          }
          className="mt-1"
        />
      </div>
      <div>
        <Label>Estimated daily use (units/day, optional)</Label>
        <Input
          type="number"
          min={1}
          placeholder="Leave blank to derive from supply"
          value={form.estimatedDailyUse}
          onChange={(e) =>
            setForm((f) => ({ ...f, estimatedDailyUse: e.target.value }))
          }
          className="mt-1"
        />
      </div>
      <div>
        <Label>Vendor</Label>
        <Input
          value={form.vendor}
          onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
          placeholder="walmart, medline…"
          className="mt-1"
        />
      </div>
      <div>
        <Label>Alternate SKUs (comma-separated)</Label>
        <Input
          value={form.alternateSkusCsv}
          onChange={(e) =>
            setForm((f) => ({ ...f, alternateSkusCsv: e.target.value }))
          }
          placeholder="SKU-A, SKU-B"
          className="mt-1"
        />
      </div>
      <div>
        <Label>Image URL</Label>
        <Input
          value={form.imageUrl}
          onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          placeholder="https://..."
          className="mt-1"
        />
      </div>
      <div>
        <Label>Restock ETA (hours, if out of stock)</Label>
        <Input
          type="number"
          min={0}
          placeholder="e.g. 48"
          value={form.restockEtaHours}
          onChange={(e) =>
            setForm((f) => ({ ...f, restockEtaHours: e.target.value }))
          }
          className="mt-1"
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.inStock}
            onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))}
          />
          <span className="text-sm">In stock (MVP marination)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.eligible}
            onChange={(e) => setForm((f) => ({ ...f, eligible: e.target.checked }))}
          />
          <span className="text-sm">Eligible for bundles</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />
          <span className="text-sm">Active</span>
        </label>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
