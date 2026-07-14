import { getBuildWizardNeeds } from "@/lib/products";
import { BuildWizardForm } from "./BuildWizardForm";
import { BenefitWalletCard } from "@/components/BenefitWalletCard";
import { resolveBenefitWallet } from "@/lib/benefit-wallet/resolve";
import { getBenefitWalletCapabilityConfig } from "@/lib/benefit-wallet/config";

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

  const walletConfig = getBenefitWalletCapabilityConfig();
  const staticWallet =
    walletConfig.enabled && walletConfig.mode === "static"
      ? await resolveBenefitWallet({ sessionSpendCents: 0 })
      : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Build Your Bundle</h1>
      <p className="text-muted-foreground mb-8">
        {staticWallet
          ? "Your benefit allowance is shown below. Pick your needs—we build one optimized bundle per period. We never ask for a diagnosis."
          : "Tell us your benefit budget and needs—we build one optimized bundle per period. We never ask for a diagnosis."}
      </p>

      {staticWallet && <BenefitWalletCard className="mb-8" wallet={staticWallet} />}

      <BuildWizardForm
        budgetOptions={BUDGET_OPTIONS}
        needs={needsForForm}
        walletLockedBudget={
          staticWallet
            ? {
                allowanceCents: staticWallet.allowanceCents,
                cadence: staticWallet.cadence,
                walletLabel: staticWallet.walletLabel,
              }
            : undefined
        }
      />
    </div>
  );
}
