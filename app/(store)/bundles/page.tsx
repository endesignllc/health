export const dynamic = "force-dynamic";
import { buildBundles, formatPrice } from "@/lib/bundle-builder";
import { BundlesList } from "@/components/BundlesList";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { normalizeNeedSlugsFromUrl } from "@/lib/legacy-need-slugs";

interface PageProps {
  searchParams: Promise<{
    budgetCents?: string;
    cadence?: string;
    needSlug?: string;
    needSlugs?: string;
    goals?: string;
    usageIntensity?: string;
    shopper?: string;
    includeEveryday?: string;
  }>;
}

export default async function BundlesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const budgetCents = parseInt(params.budgetCents ?? "10000", 10);
  const cadence = (params.cadence ?? "monthly") as "monthly" | "quarterly";

  const fromListParam = params.needSlugs
    ? params.needSlugs.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const fromLegacySingular = params.needSlug?.trim() ? [params.needSlug.trim()] : [];
  const mergedSlugs = [...fromListParam, ...fromLegacySingular];
  const needSlugs = normalizeNeedSlugsFromUrl(mergedSlugs);

  const includeEveryday = params.includeEveryday !== "false";

  const goals = params.goals ? params.goals.split(",").filter(Boolean) : [];
  const usageIntensity =
    params.usageIntensity === "occasional" ? "occasional" : "daily";

  if (needSlugs.length === 0 && !includeEveryday) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Pick at least one need or include everyday essentials</h1>
        <p className="text-muted-foreground mb-6">
          Complete the build wizard with a category selected, or turn on everyday essentials.
        </p>
        <Button asChild>
          <Link href="/build">Build My Bundle</Link>
        </Button>
      </div>
    );
  }

  const bundles = await buildBundles({
    budgetCents,
    cadence,
    needSlugs,
    includeEveryday,
    goals,
    usageIntensity,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Your optimized bundle</h1>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        We help you shop for everyday health essentials based on your preferences
        and budget—no medical information required.
      </p>
      <p className="text-muted-foreground mb-2">
        Budget: {formatPrice(budgetCents)}{" "}
        {cadence === "quarterly" ? "per quarter" : "per month"}. We shape this
        set to use your allowance up to a small buffer so you stay within benefit.
      </p>
      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
        Items are grouped by what you asked for—needs show tier-guided picks first,
        then everyday essentials when selected.
      </p>
      <p className="text-xs text-muted-foreground mb-8 leading-relaxed border-l-2 border-muted pl-3">
        This is not medical advice. Products are for general wellness and convenient
        shopping only.
      </p>

      <BundlesList
        initialBundles={bundles}
        params={{
          budgetCents,
          cadence,
          needSlugs,
          includeEveryday,
          goals,
          usageIntensity,
        }}
      />
    </div>
  );
}
