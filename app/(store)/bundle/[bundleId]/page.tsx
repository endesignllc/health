import { db } from "@/lib/db";
import { bundles, bundleItems, products } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BundleEditor } from "./BundleEditor";
import { formatPrice } from "@/lib/utils";
import { extractVariantOptionLabel, variantFamilyKey } from "@/lib/variant-label";

export const dynamic = "force-dynamic";

export default async function BundleEditorPage({
  params,
}: {
  params: Promise<{ bundleId: string }>;
}) {
  const { bundleId } = await params;

  const bundle = await db.query.bundles.findFirst({
    where: eq(bundles.id, bundleId),
    with: {
      items: {
        with: { product: { with: { category: true } } },
      },
      need: true,
    },
  });

  if (!bundle) notFound();

  const budgetCents = bundle.budgetCents ?? 0;
  const bufferCents = 500;
  const capCents = budgetCents - bufferCents;
  const subtotalCents = bundle.items.reduce((s, i) => s + i.lineTotalCents, 0);
  const remainingCents = budgetCents - subtotalCents;

  const items = bundle.items
    .filter((i) => i.product && i.product.category)
    .map((i) => ({
      id: i.id,
      productId: i.productId,
      productSku: i.product!.sku,
      productName: i.product!.name,
      productDescription: i.product!.description ?? null,
      categoryId: i.product!.categoryId,
      categorySlug: i.product!.category!.slug,
      priceCents: i.product!.priceCents,
      quantity: i.quantity,
      lineTotalCents: i.lineTotalCents,
    }));

  const familyNames = [...new Set(items.map((i) => i.productName))];
  const familyCandidates =
    familyNames.length > 0
      ? await db
          .select({
            id: products.id,
            sku: products.sku,
            name: products.name,
            description: products.description,
            priceCents: products.priceCents,
            active: products.active,
            eligible: products.eligible,
          })
          .from(products)
          .where(inArray(products.name, familyNames))
      : [];

  const familyMap = new Map<
    string,
    {
      productId: string;
      sku: string;
      label: string;
      priceCents: number;
      description: string | null;
    }[]
  >();
  for (const c of familyCandidates) {
    if (!c.active || !c.eligible) continue;
    const label = extractVariantOptionLabel(c.description);
    if (!label) continue;
    const key = variantFamilyKey(c.name);
    const list = familyMap.get(key) ?? [];
    list.push({
      productId: c.id,
      sku: c.sku,
      label,
      priceCents: c.priceCents,
      description: c.description ?? null,
    });
    familyMap.set(key, list);
  }

  const itemsWithOptions = items.map((item) => {
    const key = variantFamilyKey(item.productName);
    const familyOptions = (familyMap.get(key) ?? [])
      .sort((a, b) => a.priceCents - b.priceCents || a.label.localeCompare(b.label));
    const requiresOptionSelection = familyOptions.length > 1;
    return {
      ...item,
      requiresOptionSelection,
      optionSelectionConfirmed: !requiresOptionSelection,
      optionSelectionLabel: extractVariantOptionLabel(item.productDescription),
      familyOptions: requiresOptionSelection ? familyOptions : [],
    };
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Manage Your Bundle</h1>
      <p className="text-muted-foreground mb-6">
        Select options for configurable items and swap products within the same category.
      </p>

      <div className="mb-6 p-4 rounded-lg border bg-muted/50">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">Budget</span>
          <span>{formatPrice(budgetCents)}</span>
        </div>
        <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${Math.min(100, (subtotalCents / capCents) * 100)}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>Used: {formatPrice(subtotalCents)}</span>
          <span>Remaining: {formatPrice(remainingCents)}</span>
        </div>
      </div>

      <BundleEditor
        bundleId={bundleId}
        bundleSku={bundle.bundleSku}
        items={itemsWithOptions}
        budgetCents={budgetCents}
        cadence={bundle.cadence}
        needSlug={bundle.need?.slug ?? ""}
        needId={bundle.needId ?? ""}
      />
    </div>
  );
}
