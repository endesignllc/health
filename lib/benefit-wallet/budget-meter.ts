import type { BenefitWalletSnapshot } from "./types";

/** Props for BudgetMeter derived from a wallet snapshot */
export function budgetMeterFromWallet(wallet: BenefitWalletSnapshot) {
  return {
    budgetCents: wallet.allowanceCents,
    usedCents: wallet.usedCents,
    cadence: wallet.cadence,
    walletLabel: wallet.walletLabel,
  };
}
