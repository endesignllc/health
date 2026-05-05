"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";
import { normalizeNeedSlugsFromUrl } from "@/lib/legacy-need-slugs";
import { Input } from "@/components/ui/input";

/** Matches POST /api/bundles/generate so custom wizard budgets stay valid when BundlesList refetches. */
const DEMO_CUSTOM_BUDGET_MIN_CENTS = 2500;
const DEMO_CUSTOM_BUDGET_MAX_CENTS = 500_000;

function parseDemoCustomBudgetCents(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (trimmed === "") return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n * 100);
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

function formatUsdWholeFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

interface BuildWizardFormProps {
  budgetOptions: { value: number; label: string }[];
  needs: { id: string; slug: string; name: string }[];
}

export function BuildWizardForm({ budgetOptions, needs }: BuildWizardFormProps) {
  const router = useRouter();
  const [budgetCents, setBudgetCents] = useState(10000);
  const [budgetSource, setBudgetSource] = useState<"preset" | "custom">("preset");
  const [customDollarsText, setCustomDollarsText] = useState("");
  const [cadence, setCadence] = useState<"monthly" | "quarterly">("monthly");
  const [needSlugs, setNeedSlugs] = useState<string[]>([]);
  const [includeEveryday, setIncludeEveryday] = useState(true);
  const [shopper, setShopper] = useState<"self" | "caregiver">("self");

  const toggleNeed = (slug: string) => {
    setNeedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const submitDisabled = needSlugs.length === 0 && !includeEveryday;

  const resolvedBudget =
    budgetSource === "preset"
      ? ({ ok: true as const, cents: budgetCents })
      : (() => {
          const cents = parseDemoCustomBudgetCents(customDollarsText);
          if (cents === null) return { ok: false as const };
          if (cents < DEMO_CUSTOM_BUDGET_MIN_CENTS || cents > DEMO_CUSTOM_BUDGET_MAX_CENTS) {
            return { ok: false as const };
          }
          return { ok: true as const, cents };
        })();

  const customBudgetInvalid = budgetSource === "custom" && !resolvedBudget.ok;
  const submitBudgetBlocked = customBudgetInvalid;

  const customBudgetHint = `${formatUsdWholeFromCents(DEMO_CUSTOM_BUDGET_MIN_CENTS)}–${formatUsdWholeFromCents(DEMO_CUSTOM_BUDGET_MAX_CENTS)}`;

  const customBudgetErrorMessage = (): string | null => {
    if (budgetSource !== "custom") return null;
    const trimmed = customDollarsText.trim();
    if (trimmed === "") return "Enter a dollar amount.";
    const cents = parseDemoCustomBudgetCents(customDollarsText);
    if (cents === null) return "Enter a valid dollar amount.";
    if (cents < DEMO_CUSTOM_BUDGET_MIN_CENTS || cents > DEMO_CUSTOM_BUDGET_MAX_CENTS) {
      return `Enter between ${customBudgetHint} for this demo.`;
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedBudget.ok) return;
    const canonical = normalizeNeedSlugsFromUrl(needSlugs);
    const params = new URLSearchParams({
      budgetCents: String(resolvedBudget.cents),
      cadence,
      shopper,
      includeEveryday: String(includeEveryday),
      ...(canonical.length ? { needSlugs: canonical.join(",") } : {}),
    });
    router.push(`/bundles?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Step 1: Budget + Cadence */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Step 1: Your Allowance</h2>
          <p className="text-sm text-muted-foreground">Choose your budget and how often you receive it.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base">Budget amount</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              {budgetOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setBudgetSource("preset");
                    setBudgetCents(opt.value);
                  }}
                  className={`min-h-[48px] px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    budgetSource === "preset" && budgetCents === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setBudgetSource("custom");
                  setCustomDollarsText((prev) =>
                    prev.trim() === "" ? String(budgetCents / 100) : prev
                  );
                }}
                className={`min-h-[48px] px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  budgetSource === "custom"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted hover:border-primary/50"
                }`}
              >
                Custom amount
              </button>
            </div>
            {budgetSource === "custom" ? (
              <div className="mt-3 space-y-2">
                <Label htmlFor="custom-budget-dollars" className="text-sm text-muted-foreground">
                  Enter budget (USD)
                </Label>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
                    aria-hidden
                  >
                    $
                  </span>
                  <Input
                    id="custom-budget-dollars"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="e.g. 175"
                    value={customDollarsText}
                    onChange={(e) => setCustomDollarsText(e.target.value)}
                    className="pl-7 min-h-[48px] text-base md:text-sm"
                    aria-invalid={customBudgetInvalid}
                    aria-describedby="custom-budget-help"
                  />
                </div>
                <p id="custom-budget-help" className="text-xs text-muted-foreground">
                  Demo range: {customBudgetHint}.
                </p>
                {customBudgetInvalid ? (
                  <p className="text-sm text-destructive">{customBudgetErrorMessage()}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div>
            <Label className="text-base">Cadence</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 min-h-[48px] cursor-pointer">
                <input
                  type="radio"
                  name="cadence"
                  value="monthly"
                  checked={cadence === "monthly"}
                  onChange={() => setCadence("monthly")}
                  className="w-5 h-5"
                />
                <span>Monthly</span>
              </label>
              <label className="flex items-center gap-2 min-h-[48px] cursor-pointer">
                <input
                  type="radio"
                  name="cadence"
                  value="quarterly"
                  checked={cadence === "quarterly"}
                  onChange={() => setCadence("quarterly")}
                  className="w-5 h-5"
                />
                <span>Quarterly</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Needs + everyday essentials */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Step 2: What do you need support with?</h2>
          <p className="text-sm text-muted-foreground">
            Pick any that apply. We never ask for a diagnosis.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {needs.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">Loading categories…</p>
            ) : (
              needs.map((need) => {
                const selected = needSlugs.includes(need.slug);
                return (
                  <button
                    key={need.id}
                    type="button"
                    onClick={() => toggleNeed(need.slug)}
                    className={`relative min-h-[56px] px-4 py-3 rounded-lg border-2 text-left text-sm font-medium transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-muted"
                        }`}
                      >
                        {selected ? <Check className="h-3 w-3" aria-hidden /> : null}
                      </span>
                      <span>{need.name}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border bg-muted/40 px-4 py-3">
            <input
              type="checkbox"
              checked={includeEveryday}
              onChange={(e) => setIncludeEveryday(e.target.checked)}
              className="mt-1 w-5 h-5 shrink-0"
            />
            <span>
              <span className="font-medium text-foreground block">
                Also include everyday essentials (tissues, hand sanitizer, lip balm, etc.)
              </span>
              <span className="text-sm text-muted-foreground">
                Universal staples we can tuck into your bundle alongside your selected needs.
              </span>
            </span>
          </label>

          {submitDisabled && (
            <p className="text-sm text-destructive">
              Pick at least one need or include everyday essentials.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Shopping for */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Step 3: Shopping for</h2>
          <p className="text-sm text-muted-foreground">
            Tell us who you're shopping for.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base">Shopping for</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              <label className="flex items-center gap-2 min-h-[48px] cursor-pointer">
                <input
                  type="radio"
                  name="shopper"
                  checked={shopper === "self"}
                  onChange={() => setShopper("self")}
                  className="w-5 h-5"
                />
                <span>Myself</span>
              </label>
              <label className="flex items-center gap-2 min-h-[48px] cursor-pointer">
                <input
                  type="radio"
                  name="shopper"
                  checked={shopper === "caregiver"}
                  onChange={() => setShopper("caregiver")}
                  className="w-5 h-5"
                />
                <span>Someone I care for</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        size="lg"
        className="w-full min-h-[56px] text-lg"
        disabled={submitDisabled || submitBudgetBlocked}
      >
        See my optimized bundle
      </Button>
    </form>
  );
}
