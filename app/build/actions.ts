"use server";

import { redirect } from "next/navigation";
import { buildBundles } from "@/lib/bundle-builder";
import { BuildWizardSchema } from "@/lib/validators";

export async function submitBuildWizard(formData: FormData) {
  const budgetCents = parseInt(formData.get("budgetCents") as string, 10);
  const cadence = formData.get("cadence") as "monthly" | "quarterly";
  const needSlug = formData.get("needSlug") as string;
  const goalsRaw = formData.get("goals") as string;
  const goals = goalsRaw ? goalsRaw.split(",").filter(Boolean) : [];

  const parsed = BuildWizardSchema.safeParse({
    budgetCents,
    cadence,
    needSlug,
    goals,
  });

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const params = new URLSearchParams({
    budgetCents: String(parsed.data.budgetCents),
    cadence: parsed.data.cadence,
    needSlug: parsed.data.needSlug,
    ...(parsed.data.goals.length ? { goals: parsed.data.goals.join(",") } : {}),
  });

  redirect(`/bundles?${params.toString()}`);
}
