import { db } from "@/lib/db";
import { productCategories } from "@/db/schema";
import { NewProductForm } from "./NewProductForm";

export default async function AdminNewProductPage() {
  const categories = await db.select().from(productCategories);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Add Product</h1>
      <NewProductForm categories={categories} />
    </div>
  );
}
