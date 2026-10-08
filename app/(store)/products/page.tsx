import Link from "next/link";
import { listProducts, getProductCategories } from "@/lib/products";
import { formatPrice } from "@/lib/utils";
import { ProductsSearchForm } from "./ProductsSearchForm";
import { Card, CardContent } from "@/components/ui/card";
import { extractVariantListingAttribute } from "@/lib/variant-label";
import { EligibilityBadges, getEligibilityBadges } from "@/components/EligibilityBadge";
import { ProductImagePlaceholder } from "@/components/ProductImagePlaceholder";
import { getPlanConfig } from "@/lib/plan-config";

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
  const planConfig = getPlanConfig();

  const { products: productList, total } = result;
  const totalPages = Math.ceil(total / limit);
  const isLaurel = planConfig.slug === "laurel-complete-care";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header row: title left, search/filter right */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className={isLaurel ? "text-2xl font-bold tracking-tight" : "text-3xl font-bold"}>
          Shop Products
        </h1>
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
          {/* Product grid: minmax(240px, 1fr), 20px gap */}
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {productList.map((product) => {
              const variantDetail = extractVariantListingAttribute(product.name, product.description);
              const eligibilityTypes = getEligibilityBadges(product.tags, product.category?.slug ?? "");
              // Extract quantity limit from tags
              const limitTag = product.tags?.find((t: string) => t.startsWith("limit:"));
              const quantityLimit = limitTag ? limitTag.replace("limit:", "") : null;
              
              return (
              <Link key={product.id} href={`/products/${product.id}`}>
                <Card className="h-full overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
                  {/* Image area: 4:3, object-contain, white bg, 12px radius */}
                  <div className="aspect-[4/3] bg-white flex items-center justify-center overflow-hidden rounded-t-xl">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <ProductImagePlaceholder categorySlug={product.category?.slug} />
                    )}
                  </div>
                  <CardContent className="p-4 flex flex-col gap-2">
                    {/* Badge row: eligibility badges, max 2 + overflow */}
                    <EligibilityBadges types={eligibilityTypes.slice(0, 2)} compact />
                    
                    {/* Name: 2-line clamp, 17px semibold */}
                    <h2 className="font-semibold text-[17px] leading-snug line-clamp-2">
                      {product.name}
                    </h2>
                    
                    {/* Variant detail if present */}
                    {variantDetail && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{variantDetail}</p>
                    )}
                    
                    {/* Quantity limit chip if present */}
                    {quantityLimit && (
                      <span className="inline-flex self-start items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                        Limit: {quantityLimit}
                      </span>
                    )}
                    
                    {/* Price: bottom-aligned, tabular-nums */}
                    <p className="text-lg font-bold text-primary tabular-nums mt-auto">
                      {formatPrice(product.priceCents)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
            })}
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
