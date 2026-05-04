import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductById, listProducts } from "@/lib/products";
import { formatPrice } from "@/lib/utils";
import { AddToCartButton } from "./AddToCartButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await getProductById(id);
  if (!product || !product.active) notFound();

  const related = await listProducts({
    categorySlug: product.category?.slug ?? "",
    limit: 4,
  });

  const relatedProducts = related.products.filter((p) => p.id !== product.id);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/products" className="hover:text-foreground">
          Products
        </Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="aspect-square bg-muted rounded-xl flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              className="w-32 h-32 text-muted-foreground/50"
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

        <div>
          <Badge variant="secondary" className="mb-3">
            {product.category?.name ?? "Uncategorized"}
          </Badge>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-3xl font-bold text-primary mb-6">
            {formatPrice(product.priceCents)}
          </p>

          {product.description && (
            <div className="prose prose-sm max-w-none mb-8 text-muted-foreground">
              <p className="whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <AddToCartButton productId={product.id} />
            <Button variant="outline" asChild>
              <Link href="/build">Build My Bundle</Link>
            </Button>
          </div>

          {product.supplyDays >= 365 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Durable product — one-time purchase
            </p>
          )}
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t">
          <h2 className="text-xl font-semibold mb-6">You may also like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`}>
                <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-12 h-12 text-muted-foreground/50"
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
                  <div className="p-3">
                    <p className="font-medium line-clamp-2 text-sm">{p.name}</p>
                    <p className="text-primary font-semibold text-sm">
                      {formatPrice(p.priceCents)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
