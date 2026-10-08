import { resolveBenefitWallet } from "@/lib/benefit-wallet/resolve";
import { WalletExpiryBanner } from "@/components/WalletExpiryBanner";
import type { PlanConfig } from "@/lib/plan-config/types";

interface WalletExpiryBannerServerProps {
  planConfig: PlanConfig;
}

/**
 * Server component that resolves the wallet and renders the expiry banner.
 */
export async function WalletExpiryBannerServer({
  planConfig,
}: WalletExpiryBannerServerProps) {
  const wallet = await resolveBenefitWallet({ planConfig });

  if (!wallet) {
    return null;
  }

  return <WalletExpiryBanner wallet={wallet} variant={planConfig.expiryBannerVariant} />;
}
