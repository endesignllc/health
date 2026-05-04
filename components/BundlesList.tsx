"use client";

import { useEffect, useMemo, useState } from "react";
import { AddBundleButton } from "@/app/(store)/bundles/AddBundleButton";
import { CustomizeButton } from "@/app/(store)/bundles/CustomizeButton";
import { formatPrice } from "@/lib/utils";
import type { BundleSufficiencySummary } from "@/lib/sufficiency";
import type { QualifierAnswer } from "@/lib/qualifiers";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QualifierPanel } from "@/components/QualifierPanel";

type BundleItemSection = "core" | "support" | "maintenance";

type BundleLine = {
  productId: string;
  productSku: string;
  productName: string;
  productImageUrl: string | null;
  productClassId: string | null;
  categoryId: string;
  categorySlug: string;
  priceCents: number;
  quantity: number;
  lineTotalCents: number;
  section: BundleItemSection;
  sufficiency?: {
    label: string;
    coverageDays: number | null;
  };
};

type BuiltBundle = {
  bundleSku: string;
  needSlug: string;
  needName: string;
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
  core: "Core — everyday essentials",
  support: "Support — helpful additions based on your needs",
  maintenance: "Everyday maintenance & balance",
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

export function BundlesList({
  initialBundles,
  params,
}: {
  initialBundles: BuiltBundle[];
  params: {
    budgetCents: number;
    cadence: "monthly" | "quarterly";
    needSlug: string;
    goals: string[];
    usageIntensity: "daily" | "occasional";
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
          ...params,
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

  const bySection = (s: BundleItemSection) => bundle.items.filter((i) => i.section === s);
  const supplyNote = bundleSupplyNote(bundle.sufficiency);

  return (
    <Card className={`flex flex-col transition-opacity ${loading ? "opacity-70" : "opacity-100"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-semibold">Optimized for your needs & budget</h2>
          <Badge variant="secondary">{bundle.needName}</Badge>
        </div>
        <p className="text-2xl font-bold text-primary mt-2">
          {formatPrice(bundle.subtotalCents)}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatPrice(bundle.remainingCents)} left in your benefit ·{" "}
          <span className="font-medium text-foreground">
            {bundle.budgetUtilizationPercent}% of your benefit used efficiently
          </span>
          {bundle.coreSubtotalCents > 0 && <> · core {formatPrice(bundle.coreSubtotalCents)}</>}
          {bundle.supportSubtotalCents > 0 && (
            <> · support {formatPrice(bundle.supportSubtotalCents)}</>
          )}
          {bundle.maintenanceSubtotalCents > 0 && (
            <> · everyday {formatPrice(bundle.maintenanceSubtotalCents)}</>
          )}
        </p>
        {supplyNote && <p className="text-sm mt-2 text-muted-foreground">{supplyNote}</p>}
        {loading && (
          <p className="text-xs text-muted-foreground mt-2">Updating recommendations…</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-8">
        {SECTION_ORDER.map((section) => {
          const sectionItems = bySection(section);
          if (!sectionItems.length) return null;
          const seenClassIds = new Set<string>();
          return (
            <section key={section}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {SECTION_HEADINGS[section]}
              </h3>
              <ul className="space-y-2">
                {sectionItems.map((item) => {
                  const classId = item.productClassId;
                  const shouldRenderPanel =
                    Boolean(classId) && !seenClassIds.has(classId as string);
                  if (classId) seenClassIds.add(classId);
                  return (
                    <li
                      key={`${item.section}-${item.productId}`}
                      className="text-sm border-b border-border/40 pb-2 last:border-0"
                    >
                      <div className="flex justify-between gap-2">
                        <span>
                          {item.productName} {item.quantity > 1 && `×${item.quantity}`}
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
            </section>
          );
        })}
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
