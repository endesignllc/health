"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";
import { normalizeNeedSlugsFromUrl } from "@/lib/legacy-need-slugs";
import { Input } from "@/components/ui/input";
import type { BenefitCadence } from "@/lib/benefit-wallet/types";
import { formatPrice } from "@/lib/utils";
import {
  clampMemberSpendCents,
  joinPurseLabels,
  MEMBER_SPEND_MIN_CENTS,
  MEMBER_SPEND_STEP_CENTS,
  type ShoppableBudget,
} from "@/lib/shoppable-budget";

interface NeedQualifierQuestion {
  id: string;
  needId: string;
  needSlug: string;
  slug: string;
  prompt: string;
  sortOrder: number;
}

interface NeedQualifierOption {
  id: string;
  questionId: string;
  slug: string;
  label: string;
  sortOrder: number;
}

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
  /** When set (static wallet demo), allowance/cadence come from backend config */
  walletLockedBudget?: {
    allowanceCents: number;
    cadence: BenefitCadence;
    walletLabel: string;
  };
  /** Laurel member wallet: shoppable dollars replace the denomination grid */
  memberBudget?: ShoppableBudget;
  /** From ?budget= — shoppable amount selects "use everything" */
  initialBudgetCents?: number;
}

function bundleCadenceFromWallet(cadence: BenefitCadence): "monthly" | "quarterly" {
  if (cadence === "monthly") return "monthly";
  return "quarterly";
}

export function BuildWizardForm({
  budgetOptions,
  needs,
  walletLockedBudget,
  memberBudget,
  initialBudgetCents,
}: BuildWizardFormProps) {
  const router = useRouter();
  const [budgetCents, setBudgetCents] = useState(
    walletLockedBudget?.allowanceCents ?? 10000
  );
  const [budgetSource, setBudgetSource] = useState<"preset" | "custom">("preset");
  const [customDollarsText, setCustomDollarsText] = useState("");
  const [cadence, setCadence] = useState<"monthly" | "quarterly">(
    walletLockedBudget ? bundleCadenceFromWallet(walletLockedBudget.cadence) : "monthly"
  );
  const shoppableCents = memberBudget?.shoppableCents ?? 0;
  const partialInitial =
    memberBudget &&
    initialBudgetCents != null &&
    initialBudgetCents !== shoppableCents &&
    initialBudgetCents >= MEMBER_SPEND_MIN_CENTS &&
    initialBudgetCents <= shoppableCents;
  const [spendChoice, setSpendChoice] = useState<"all" | "save">(partialInitial ? "save" : "all");
  const [saveCents, setSaveCents] = useState(
    partialInitial
      ? initialBudgetCents!
      : clampMemberSpendCents(shoppableCents - MEMBER_SPEND_STEP_CENTS, shoppableCents)
  );
  const [saveDollarsText, setSaveDollarsText] = useState("");
  const [needSlugs, setNeedSlugs] = useState<string[]>([]);
  const [includeEveryday, setIncludeEveryday] = useState(true);

  // Need qualifier state
  const [qualifierQuestions, setQualifierQuestions] = useState<NeedQualifierQuestion[]>([]);
  const [qualifierOptions, setQualifierOptions] = useState<NeedQualifierOption[]>([]);
  const [qualifierAnswers, setQualifierAnswers] = useState<Record<string, string>>({});
  const [loadingQualifiers, setLoadingQualifiers] = useState(false);

  // Fetch need qualifiers when selected needs change
  useEffect(() => {
    if (needSlugs.length === 0) {
      setQualifierQuestions([]);
      setQualifierOptions([]);
      setQualifierAnswers({});
      return;
    }

    const fetchQualifiers = async () => {
      setLoadingQualifiers(true);
      try {
        const res = await fetch(`/api/need-qualifiers?needSlugs=${needSlugs.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          setQualifierQuestions(data.questions || []);
          setQualifierOptions(data.options || []);
        }
      } catch (err) {
        console.error("Failed to fetch need qualifiers:", err);
      } finally {
        setLoadingQualifiers(false);
      }
    };

    fetchQualifiers();
  }, [needSlugs]);

  const toggleNeed = (slug: string) => {
    setNeedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleQualifierAnswer = (questionId: string, optionId: string) => {
    setQualifierAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const submitDisabled = needSlugs.length === 0 && !includeEveryday;

  const typedSaveCents = Number.parseFloat(saveDollarsText);
  const memberSpendCents =
    spendChoice === "all"
      ? shoppableCents
      : clampMemberSpendCents(
          saveDollarsText.trim() === "" || !Number.isFinite(typedSaveCents)
            ? saveCents
            : Math.round(typedSaveCents * 100),
          shoppableCents
        );

  const resolvedBudget = memberBudget
    ? ({ ok: true as const, cents: memberSpendCents })
    : walletLockedBudget
    ? ({ ok: true as const, cents: walletLockedBudget.allowanceCents })
    : budgetSource === "preset"
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
      includeEveryday: String(includeEveryday),
      ...(canonical.length ? { needSlugs: canonical.join(",") } : {}),
    });
    // Add qualifier answers as comma-separated optionIds
    const answerIds = Object.values(qualifierAnswers).filter(Boolean);
    if (answerIds.length > 0) {
      params.set("needQualifierAnswers", answerIds.join(","));
    }
    router.push(`/bundles?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Step 1: Budget + Cadence */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">
            {memberBudget ? "Your budget" : "Step 1: Your Allowance"}
          </h2>
          {!memberBudget && (
            <p className="text-sm text-muted-foreground">
              {walletLockedBudget
                ? "Your benefit allowance is set from your account."
                : "Choose your budget and how often you receive it."}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {memberBudget ? (
            <MemberBudgetFields
              budget={memberBudget}
              spendChoice={spendChoice}
              saveCents={saveCents}
              saveDollarsText={saveDollarsText}
              onChooseAll={() => {
                setSpendChoice("all");
                setSaveDollarsText("");
              }}
              onChooseSave={() => {
                setSpendChoice("save");
                setSaveDollarsText("");
              }}
              onStep={(delta) => {
                setSaveDollarsText("");
                setSaveCents(
                  clampMemberSpendCents(memberSpendCents + delta, memberBudget.shoppableCents)
                );
              }}
              onTypeDollars={setSaveDollarsText}
            />
          ) : walletLockedBudget ? (
            <p className="text-sm rounded-lg border bg-muted/40 px-4 py-3">
              <span className="font-medium text-foreground">{walletLockedBudget.walletLabel}</span>
              {": "}
              {formatUsdWholeFromCents(walletLockedBudget.allowanceCents)}
              {walletLockedBudget.cadence === "monthly"
                ? " per month"
                : walletLockedBudget.cadence === "yearly"
                  ? " per year"
                  : " per quarter"}
            </p>
          ) : (
            <>
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
            </>
          )}
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

          {/* Need-specific qualifier questions */}
          {qualifierQuestions.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-border">
              <p className="text-sm font-medium text-foreground">
                Help us personalize your bundle:
              </p>
              {loadingQualifiers ? (
                <p className="text-sm text-muted-foreground">Loading questions...</p>
              ) : (
                qualifierQuestions.map((question) => {
                  const options = qualifierOptions.filter(
                    (opt) => opt.questionId === question.id
                  );
                  const selectedOptionId = qualifierAnswers[question.id];
                  return (
                    <div key={question.id} className="space-y-2">
                      <Label className="text-sm">{question.prompt}</Label>
                      <div className="flex flex-wrap gap-2">
                        {options.map((option) => {
                          const isSelected = selectedOptionId === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleQualifierAnswer(question.id, option.id)}
                              className={`min-h-[40px] px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-muted hover:border-primary/50"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

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

      <Button
        type="submit"
        size="lg"
        className="w-full min-h-[56px] text-lg"
        disabled={submitDisabled || submitBudgetBlocked}
      >
        {memberBudget
          ? memberSpendCents === shoppableCents
            ? "See my bundle"
            : `Continue with ${formatPrice(memberSpendCents)}`
          : "See my optimized bundle"}
      </Button>
    </form>
  );
}

function MemberBudgetFields({
  budget,
  spendChoice,
  saveCents,
  saveDollarsText,
  onChooseAll,
  onChooseSave,
  onStep,
  onTypeDollars,
}: {
  budget: ShoppableBudget;
  spendChoice: "all" | "save";
  saveCents: number;
  saveDollarsText: string;
  onChooseAll: () => void;
  onChooseSave: () => void;
  onStep: (deltaCents: number) => void;
  onTypeDollars: (value: string) => void;
}) {
  const infoNames = joinPurseLabels(budget.infoOnlyLabels);
  const optionClass = (selected: boolean) =>
    `w-full min-h-[56px] px-4 py-3 rounded-lg border-2 text-left text-base font-medium transition-colors ${
      selected ? "border-primary bg-primary/10 text-primary" : "border-muted hover:border-primary/50"
    }`;

  return (
    <div className="space-y-4">
      <p className="text-base leading-relaxed">
        {budget.wizardExcludedCents > 0 ? (
          <>
            Your bundle: up to{" "}
            <span className="font-semibold tabular-nums">{formatPrice(budget.shoppableCents)}</span>
            {" · "}
            Your groceries:{" "}
            <span className="font-semibold tabular-nums">{formatPrice(budget.wizardExcludedCents)}</span>
            {" — we'll handle both."}
          </>
        ) : (
          <>
            <span className="font-semibold tabular-nums">{formatPrice(budget.shoppableCents)}</span>
            {" of your "}
            <span className="font-semibold tabular-nums">{formatPrice(budget.totalAvailableCents)}</span>
            {" can be spent here."}
          </>
        )}
        {budget.infoOnlyCents > 0 && infoNames ? (
          <>
            {" "}
            Your {infoNames} dollars ({formatPrice(budget.infoOnlyCents)}) are used at participating stores.
          </>
        ) : null}
      </p>

      <div className="space-y-3">
        <button type="button" className={optionClass(spendChoice === "all")} onClick={onChooseAll}>
          Use everything I have left
        </button>
        <button type="button" className={optionClass(spendChoice === "save")} onClick={onChooseSave}>
          Save some for later
        </button>
      </div>

      {spendChoice === "save" && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] px-3 rounded-lg border-2 border-muted text-base font-semibold hover:border-primary/50"
            onClick={() => onStep(-MEMBER_SPEND_STEP_CENTS)}
            aria-label="Decrease budget by $20"
          >
            −$20
          </button>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>
              $
            </span>
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={saveDollarsText === "" ? String(saveCents / 100) : saveDollarsText}
              onChange={(e) => onTypeDollars(e.target.value)}
              className="pl-7 min-h-[44px] text-base tabular-nums"
              aria-label="Amount to spend now"
            />
          </div>
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] px-3 rounded-lg border-2 border-muted text-base font-semibold hover:border-primary/50"
            onClick={() => onStep(MEMBER_SPEND_STEP_CENTS)}
            aria-label="Increase budget by $20"
          >
            +$20
          </button>
        </div>
      )}

      {budget.renewsOn && (
        <p className="text-base text-muted-foreground">Your benefit renews {budget.renewsOn}.</p>
      )}
    </div>
  );
}
