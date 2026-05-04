import Link from "next/link";
import { db } from "@/lib/db";
import { products } from "@/db/schema";
import { formatPrice } from "@/lib/utils";
import { ProductsVisibilityControls } from "./ProductsVisibilityControls";

type FilterValue = "all" | "true" | "false";

interface AdminProductsPageProps {
  searchParams: Promise<{
    vendor?: string;
    active?: FilterValue;
    eligible?: FilterValue;
  }>;
}

function matchesBooleanFilter(
  value: boolean,
  filter: FilterValue | undefined
): boolean {
  if (!filter || filter === "all") return true;
  return filter === "true" ? value : !value;
}

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const params = await searchParams;
  const productList = await db.query.products.findMany({
    with: { category: true },
  });
  const vendors = [
    ...new Set(
      productList
        .map((p) => p.vendor)
        .filter((vendor): vendor is string => Boolean(vendor))
    ),
  ].sort();
  const selectedVendor = params.vendor && params.vendor !== "all" ? params.vendor : "all";
  const activeFilter = params.active ?? "all";
  const eligibleFilter = params.eligible ?? "all";

  const filteredProducts = productList.filter((p) => {
    if (selectedVendor !== "all" && p.vendor !== selectedVendor) return false;
    if (!matchesBooleanFilter(p.active, activeFilter)) return false;
    if (!matchesBooleanFilter(p.eligible, eligibleFilter)) return false;
    return true;
  });
  const visibilityDefaultVendor =
    vendors.includes("medline-catalog")
      ? "medline-catalog"
      : vendors[0] ?? "";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
        >
          Add Product
        </Link>
      </div>

      <div className="mb-4">
        <ProductsVisibilityControls
          vendors={vendors}
          defaultVendor={visibilityDefaultVendor}
        />
      </div>

      <form className="mb-4 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Vendor</span>
            <select
              name="vendor"
              defaultValue={selectedVendor}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor} value={vendor}>
                  {vendor}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Active</span>
            <select
              name="active"
              defaultValue={activeFilter}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              Eligible
            </span>
            <select
              name="eligible"
              defaultValue={eligibleFilter}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>

          <button
            type="submit"
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/40"
          >
            Apply filters
          </button>
          <Link
            href="/admin/products"
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/40"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">SKU</th>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Vendor</th>
              <th className="text-left px-4 py-3 font-medium">Category</th>
              <th className="text-left px-4 py-3 font-medium">Price</th>
              <th className="text-left px-4 py-3 font-medium">Eligible</th>
              <th className="text-left px-4 py-3 font-medium">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredProducts.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${p.id}`} className="hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.vendor ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.category?.name ?? "—"}</td>
                <td className="px-4 py-3">{formatPrice(p.priceCents)}</td>
                <td className="px-4 py-3">{p.eligible ? "Yes" : "No"}</td>
                <td className="px-4 py-3">{p.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
