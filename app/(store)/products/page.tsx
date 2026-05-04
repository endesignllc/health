import Link from "next/link";
import { listProducts, getProductCategories } from "@/lib/products";
import { formatPrice } from "@/lib/utils";
import { ProductsSearchForm } from "./ProductsSearchForm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.q ?? "";
  const categorySlug = params.category ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 24;
  const offset = (page - 1) * limit;

  const [result, categories] = await Promise.all([
    listProducts({ categorySlug, search, limit, offset }),
    getProductCategories(),
  ]);

  const { products: productList, total } = result;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Shop Products</h1>
        <ProductsSearchForm
          initialSearch={search}
          initialCategory={categorySlug}
          categories={categories}
        />
      </div>

      {search && (
        <p className="text-muted-foreground mb-4">
          {total} result{total !== 1 ? "s" : ""} for &quot;{search}&quot;
          {categorySlug && ` in ${categories.find((c) => c.slug === categorySlug)?.name ?? categorySlug}`}
        </p>
      )}

      {productList.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg mb-4">No products found.</p>
          <Link
            href="/products"
            className="text-primary font-medium hover:underline"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productList.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-16 h-16 text-muted-foreground/50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                        />
                      </svg>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="secondary" className="mb-2 text-xs">
                      {product.category?.name ?? "Uncategorized"}
                    </Badge>
                    <h2 className="font-semibold line-clamp-2 mb-2">
                      {product.name}
                    </h2>
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(product.priceCents)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex justify-center gap-2 mt-10">
              {page > 1 && (
                <Link
                  href={`/products?${new URLSearchParams({
                    ...(search && { q: search }),
                    ...(categorySlug && { category: categorySlug }),
                    page: String(page - 1),
                  }).toString()}`}
                  className="px-4 py-2 rounded-md border hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              <span className="px-4 py-2 text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/products?${new URLSearchParams({
                    ...(search && { q: search }),
                    ...(categorySlug && { category: categorySlug }),
                    page: String(page + 1),
                  }).toString()}`}
                  className="px-4 py-2 rounded-md border hover:bg-muted"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
