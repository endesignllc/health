import { getBuildWizardNeeds } from "@/lib/products";
import { BuildWizardForm } from "./BuildWizardForm";

export const dynamic = "force-dynamic";

const BUDGET_OPTIONS = [
  { value: 2500, label: "$25" },
  { value: 5000, label: "$50" },
  { value: 10000, label: "$100" },
  { value: 15000, label: "$150" },
  { value: 30000, label: "$300" },
];

export default async function BuildPage() {
  const needsList = await getBuildWizardNeeds();
  const needsForForm = needsList.map((n) => ({
    id: n.id,
    slug: n.slug,
    name: n.name,
  }));

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Build Your Bundle</h1>
      <p className="text-muted-foreground mb-8">
        Tell us your benefit budget and needs—we build one optimized bundle per period. We never ask for a diagnosis.
      </p>

      <BuildWizardForm budgetOptions={BUDGET_OPTIONS} needs={needsForForm} />
    </div>
  );
}
