"use client";

import { useEffect, useMemo, useState } from "react";
import { AddBundleButton } from "@/app/(store)/bundles/AddBundleButton";
import { CustomizeButton } from "@/app/(store)/bundles/CustomizeButton";
import { formatPrice } from "@/lib/utils";
import type { BundleSufficiencySummary } from "@/lib/sufficiency";
import type { QualifierAnswer } from "@/lib/qualifiers";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { QualifierPanel } from "@/components/QualifierPanel";
import { extractVariantListingAttribute } from "@/lib/variant-label";

type BundleItemSection = "core" | "support" | "maintenance";

type BundleLine = {
  productId: string;
  productSku: string;
  productName: string;
  productDescription: string | null;
  productImageUrl: string | null;
  productClassId: string | null;
  categoryId: string;
  categorySlug: string;
  priceCents: number;
  quantity: number;
  lineTotalCents: number;
  section: BundleItemSection;
  bundleSection: string;
  priorityTier: 1 | 2 | 3 | null;
  sufficiency?: {
    label: string;
    coverageDays: number | null;
  };
};

type BuiltBundle = {
  bundleSku: string;
  needSlug: string;
  needName: string;
  needSlugs: string[];
  needNames: string[];
  includeEveryday: boolean;
  cadence: "monthly" | "quarterly";
  budgetCents: number;
  tier: "optimized";
  subtotalCents: number;
  remainingCents: number;
  needSubtotalCents: number;
  coreSubtotalCents: number;
  supportSubtotalCents: number;
  maintenanceSubtotalCents: number;
  items: BundleLine[];
  budgetUtilizationPercent: number;
  sufficiency: BundleSufficiencySummary;
};

const SECTION_ORDER: BundleItemSection[] = ["core", "support", "maintenance"];

const SECTION_HEADINGS: Record<BundleItemSection, string> = {
  core: "Core picks",
  support: "Support — helpful additions",
  maintenance: "Maintenance & balance",
};

function bundleSupplyNote(summary: BundleSufficiencySummary): string | null {
  switch (summary.worstLabel) {
    case "rightsized":
      return `Estimates look aligned with your ${summary.targetDays}-day benefit window for typical use.`;
    case "undersupplied":
      return `Some items may run out sooner than a full ${summary.targetDays}-day window depending on how you use them—you can change quantities anytime below.`;
    case "oversupplied":
      return "Some items may last beyond this window (common for durable or as-needed products).";
    default:
      return null;
  }
}

function lineSupplyHint(label: string, coverageDays: number | null): string | null {
  if (label === "unknown") return null;
  if (coverageDays != null && Number.isFinite(coverageDays)) {
    const days = Math.round(coverageDays);
    if (label === "undersupplied") {
      return `May run out sooner depending on use (~${days}d at typical use)`;
    }
    if (label === "oversupplied") {
      return `~${days}d supply at typical use`;
    }
    return `~${days}d at typical use`;
  }
  if (label === "undersupplied") return "May run out sooner depending on use";
  if (label === "rightsized") return "Fits the period for typical use";
  return null;
}

function orderedBundleSections(bundle: BuiltBundle): string[] {
  const tierBySection = new Map<string, number | null>();
  for (const it of bundle.items) {
    if (!tierBySection.has(it.bundleSection)) {
      tierBySection.set(it.bundleSection, it.priorityTier);
    }
  }
  const keys = [...tierBySection.keys()].filter((k) => k !== "everyday");
  keys.sort((a, b) => {
    const ta = tierBySection.get(a) ?? 999;
    const tb = tierBySection.get(b) ?? 999;
    if (ta !== tb) return ta - tb;
    const ia = bundle.needSlugs.indexOf(a);
    const ib = bundle.needSlugs.indexOf(b);
    const ea = ia === -1 ? 999 : ia;
    const eb = ib === -1 ? 999 : ib;
    return ea - eb;
  });
  if (tierBySection.has("everyday")) keys.push("everyday");
  return keys;
}

function sectionHeading(bundle: BuiltBundle, slug: string): string {
  if (slug === "everyday") return "Everyday essentials";
  const idx = bundle.needSlugs.indexOf(slug);
  const nm = idx >= 0 ? bundle.needNames[idx] : slug.replace(/-/g, " ");
  const titled = nm.replace(/\b\w/g, (c) => c.toUpperCase());
  return `Your ${titled}`;
}

export function BundlesList({
  initialBundles,
  params,
}: {
  initialBundles: BuiltBundle[];
  params: {
    budgetCents: number;
    cadence: "monthly" | "quarterly";
    needSlugs: string[];
    includeEveryday: boolean;
    goals: string[];
    usageIntensity: "daily" | "occasional";
    needQualifierAnswers: string[];
  };
}) {
  const [bundles, setBundles] = useState<BuiltBundle[]>(initialBundles);
  const [loading, setLoading] = useState(false);
  const [qualifierAnswersByClass, setQualifierAnswersByClass] = useState<
    Record<string, QualifierAnswer[]>
  >({});

  const flatQualifierAnswers = useMemo(
    () => Object.values(qualifierAnswersByClass).flat(),
    [qualifierAnswersByClass]
  );

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      const res = await fetch("/api/bundles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetCents: params.budgetCents,
          cadence: params.cadence,
          needSlugs: params.needSlugs,
          includeEveryday: params.includeEveryday,
          goals: params.goals,
          usageIntensity: params.usageIntensity,
          needQualifierAnswers: params.needQualifierAnswers,
          qualifierAnswers: flatQualifierAnswers,
        }),
      });
      const payload = (await res.json()) as { bundles?: BuiltBundle[] };
      if (res.ok && payload.bundles) {
        setBundles(payload.bundles);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [flatQualifierAnswers, params]);

  const bundle = bundles[0];
  if (!bundle) {
    return (
      <p className="text-muted-foreground text-sm">
        No bundle could be built for this need. Try a higher budget or another category.
      </p>
    );
  }

  const supplyNote = bundleSupplyNote(bundle.sufficiency);

  // Detect needs that were requested but yielded no items
  const sectionsWithItems = new Set(bundle.items.map((i) => i.bundleSection));
  const emptyNeeds = bundle.needSlugs
    .map((slug, idx) => ({ slug, name: bundle.needNames[idx] ?? slug }))
    .filter(({ slug }) => !sectionsWithItems.has(slug));

  return (
    <Card className={`flex flex-col transition-opacity ${loading ? "opacity-70" : "opacity-100"}`}>
      <CardHeader className="pb-2">
        <h2 className="text-xl font-semibold">Optimized for your needs & budget</h2>
        <p className="text-2xl font-bold text-primary mt-2">
          {formatPrice(bundle.subtotalCents)}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatPrice(bundle.remainingCents)} left in your benefit ·{" "}
          <span className="font-medium text-foreground">
            {bundle.budgetUtilizationPercent}% of your benefit used
          </span>
          {bundle.coreSubtotalCents > 0 && <> · core {formatPrice(bundle.coreSubtotalCents)}</>}
          {bundle.supportSubtotalCents > 0 && (
            <> · support {formatPrice(bundle.supportSubtotalCents)}</>
          )}
          {bundle.maintenanceSubtotalCents > 0 && (
            <> · everyday {formatPrice(bundle.maintenanceSubtotalCents)}</>
          )}
        </p>
        {emptyNeeds.length > 0 && (
          <p className="text-sm mt-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            We couldn&apos;t find products for{" "}
            <span className="font-medium">
              {emptyNeeds.map((n) => n.name).join(", ")}
            </span>{" "}
            in the current catalog. Try a different need or check back later as we add more products.
          </p>
        )}
        {supplyNote && <p className="text-sm mt-2 text-muted-foreground">{supplyNote}</p>}
        {loading && (
          <p className="text-xs text-muted-foreground mt-2">Updating recommendations…</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-10">
        {orderedBundleSections(bundle).map((bundleSectionSlug) => (
            <section key={bundleSectionSlug} className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">
                {sectionHeading(bundle, bundleSectionSlug)}
              </h3>

              {SECTION_ORDER.map((section) => {
                const sectionItems = bundle.items.filter(
                  (i) => i.bundleSection === bundleSectionSlug && i.section === section
                );
                if (!sectionItems.length) return null;
                const seenClassIds = new Set<string>();
                return (
                  <div key={`${bundleSectionSlug}-${section}`}>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      {SECTION_HEADINGS[section]}
                    </h4>
                    <ul className="space-y-2">
                      {sectionItems.map((item) => {
                        const classId = item.productClassId;
                        const variantDetail = extractVariantListingAttribute(
                          item.productName,
                          item.productDescription
                        );
                        const shouldRenderPanel =
                          Boolean(classId) && !seenClassIds.has(classId as string);
                        if (classId) seenClassIds.add(classId);
                        return (
                          <li
                            key={`${bundleSectionSlug}-${item.section}-${item.productId}`}
                            className="text-sm border-b border-border/40 pb-2 last:border-0"
                          >
                            <div className="flex justify-between gap-2">
                              <span>
                                {item.productName}{" "}
                                {item.quantity > 1 && `×${item.quantity}`}
                                {variantDetail && (
                                  <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                                    {variantDetail}
                                  </span>
                                )}
                                {item.sufficiency && (
                                  <span className="block text-xs text-muted-foreground mt-0.5">
                                    {lineSupplyHint(
                                      item.sufficiency.label,
                                      item.sufficiency.coverageDays
                                    )}
                                  </span>
                                )}
                              </span>
                              <span className="text-muted-foreground shrink-0">
                                {formatPrice(item.lineTotalCents)}
                              </span>
                            </div>
                            {shouldRenderPanel && classId && (
                              <QualifierPanel
                                productClassId={classId}
                                answers={qualifierAnswersByClass[classId] ?? []}
                                onChange={(nextAnswers) =>
                                  setQualifierAnswersByClass((prev) => ({
                                    ...prev,
                                    [classId]: nextAnswers,
                                  }))
                                }
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </section>
        ))}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <AddBundleButton
            bundleSku={bundle.bundleSku}
            items={bundle.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              lineTotalCents: i.lineTotalCents,
            }))}
            budgetCents={bundle.budgetCents}
            cadence={bundle.cadence}
            needSlug={bundle.needSlug}
          />
          <CustomizeButton
            bundleSku={bundle.bundleSku}
            items={bundle.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              lineTotalCents: i.lineTotalCents,
            }))}
            budgetCents={bundle.budgetCents}
            cadence={bundle.cadence}
            needSlug={bundle.needSlug}
            tier={bundle.tier}
          />
        </div>
      </CardContent>
    </Card>
  );
}
