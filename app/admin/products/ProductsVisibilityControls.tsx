"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type VisibilityMode = "showOnlyVendor" | "showAll";

interface ProductsVisibilityControlsProps {
  vendors: string[];
  defaultVendor: string;
}

export function ProductsVisibilityControls({
  vendors,
  defaultVendor,
}: ProductsVisibilityControlsProps) {
  const router = useRouter();
  const [selectedVendor, setSelectedVendor] = useState(defaultVendor);
  const [busyMode, setBusyMode] = useState<VisibilityMode | null>(null);
  const [message, setMessage] = useState<string>("");

  const canShowOnlyVendor = useMemo(
    () => selectedVendor.trim().length > 0,
    [selectedVendor]
  );

  async function applyVisibility(mode: VisibilityMode) {
    if (mode === "showOnlyVendor" && !canShowOnlyVendor) return;
    setBusyMode(mode);
    setMessage("");
    try {
      const res = await fetch("/api/admin/products/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          vendor: selectedVendor,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update visibility");
      }

      const payload = (await res.json()) as {
        mode: VisibilityMode;
        updated: number;
        vendor?: string;
      };

      if (payload.mode === "showOnlyVendor") {
        setMessage(
          `Now showing only ${payload.vendor} products (${payload.updated} active).`
        );
      } else {
        setMessage(`Now showing all products (${payload.updated} active).`);
      }
      router.refresh();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not update visibility";
      setMessage(msg);
    } finally {
      setBusyMode(null);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium">Storefront visibility</p>
          <label className="text-xs text-muted-foreground">
            Vendor to show
          </label>
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="block min-w-72 rounded-md border px-3 py-2 text-sm"
          >
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyVisibility("showOnlyVendor")}
            disabled={!canShowOnlyVendor || busyMode !== null}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyMode === "showOnlyVendor"
              ? "Applying..."
              : "Show only selected vendor"}
          </button>
          <button
            type="button"
            onClick={() => applyVisibility("showAll")}
            disabled={busyMode !== null}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyMode === "showAll" ? "Applying..." : "Show all products"}
          </button>
        </div>
      </div>
      {message ? <p className="mt-3 text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
