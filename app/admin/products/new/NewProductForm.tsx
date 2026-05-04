"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewProductFormProps {
  categories: { id: string; name: string }[];
}

export function NewProductForm({ categories }: NewProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    description: "",
    priceCents: 0,
    imageUrl: "",
    eligible: true,
    active: true,
    categoryId: categories[0]?.id ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) router.push(`/admin/products/${data.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <Label>SKU</Label>
        <Input
          value={form.sku}
          onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          required
          placeholder="VIT-D3-1000"
          className="mt-1"
        />
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
        <Label>Image URL</Label>
        <Input
          value={form.imageUrl}
          onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          placeholder="https://..."
          className="mt-1"
        />
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.eligible}
            onChange={(e) => setForm((f) => ({ ...f, eligible: e.target.checked }))}
          />
          <span className="text-sm">Eligible</span>
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
        {loading ? "Creating…" : "Create Product"}
      </Button>
    </form>
  );
}
