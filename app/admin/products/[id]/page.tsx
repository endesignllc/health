import { db } from "@/lib/db";
import { products, productCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProductEditForm } from "./ProductEditForm";

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: { category: true },
  });

  if (!product) notFound();

  const categories = await db.select().from(productCategories);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Edit Product: {product.name}</h1>
      <ProductEditForm product={product} categories={categories} />
    </div>
  );
}
