import Link from "next/link";
import { AddToCartButton } from "@/app/(store)/products/[id]/AddToCartButton";
import { EligibilityBadges } from "@/components/EligibilityBadge";
import { deriveBenefitBadges } from "@/lib/benefit-badges";
import { getPlanConfig } from "@/lib/plan-config";
import { formatPrice } from "@/lib/utils";

interface GroceryProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  priceCents: number;
  tags?: string[] | null;
  productClass?: {
    benefitRails: string[] | null;
    dualPurpose: boolean | null;
  } | null;
}

export function GroceryOffer({
  products,
  foodCents,
  catalogPath,
}: {
  products: GroceryProduct[];
  foodCents: number;
  catalogPath: string;
}) {
  if (foodCents <= 0 || products.length === 0) return null;
  const planConfig = getPlanConfig();

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="text-xl font-bold">
        Your groceries — {formatPrice(foodCents)} in Food dollars
      </h2>
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((product) => {
          const { badges } = deriveBenefitBadges(product, planConfig);
          return (
            <li
              key={product.id}
              className="flex gap-3 rounded-xl border border-[#DDE3DE] bg-white p-3"
            >
              <div className="h-20 w-20 shrink-0 rounded-lg bg-[#EDF2EE] flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" className="h-full w-full object-contain p-1" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 flex flex-col gap-2">
                <span className="font-semibold leading-snug line-clamp-2">{product.name}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <EligibilityBadges types={badges} maxBadges={2} compact />
                  <span className="text-sm font-semibold tabular-nums">{formatPrice(product.priceCents)}</span>
                </div>
                <AddToCartButton productId={product.id} compact />
              </div>
            </li>
          );
        })}
      </ul>
      <Link href={catalogPath} className="inline-block mt-4 text-base font-semibold hover:underline">
        See all groceries.
      </Link>
    </section>
  );
}
