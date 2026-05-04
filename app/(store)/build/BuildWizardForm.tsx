"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface BuildWizardFormProps {
  budgetOptions: { value: number; label: string }[];
  needs: { id: string; slug: string; name: string }[];
  goals: { id: string; label: string }[];
}

export function BuildWizardForm({ budgetOptions, needs, goals }: BuildWizardFormProps) {
  const router = useRouter();
  const [budgetCents, setBudgetCents] = useState(10000);
  const [cadence, setCadence] = useState<"monthly" | "quarterly">("monthly");
  const [needSlug, setNeedSlug] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [shopper, setShopper] = useState<"self" | "caregiver">("self");

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      budgetCents: String(budgetCents),
      cadence,
      needSlug,
      shopper,
      ...(selectedGoals.length ? { goals: selectedGoals.join(",") } : {}),
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
                  onClick={() => setBudgetCents(opt.value)}
                  className={`min-h-[48px] px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    budgetCents === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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

      {/* Step 2: Need category */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Step 2: What do you need support with?</h2>
          <p className="text-sm text-muted-foreground">Select one category. We never ask for a diagnosis.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {needs.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">Loading categories…</p>
            ) : (
            needs.map((need) => (
              <button
                key={need.id}
                type="button"
                onClick={() => setNeedSlug(need.slug)}
                className={`min-h-[56px] px-4 py-3 rounded-lg border-2 text-left text-sm font-medium transition-colors ${
                  needSlug === need.slug
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted hover:border-primary/50"
                }`}
              >
                {need.name}
              </button>
            ))
            )}
          </div>
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

      {/* Step 4: Optional goals */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Step 4: Wellness priorities (optional)</h2>
          <p className="text-sm text-muted-foreground">Non-diagnostic goals—we use these to rank products in your budget.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {goals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggleGoal(goal.id)}
                className={`min-h-[48px] px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  selectedGoals.includes(goal.id)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted hover:border-primary/50"
                }`}
              >
                {goal.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        size="lg"
        className="w-full min-h-[56px] text-lg"
        disabled={!needSlug}
      >
        See my optimized bundle
      </Button>
    </form>
  );
}
