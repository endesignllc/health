import type { BenefitWalletSnapshot } from "./types";
import type { IntegrationMode } from "@/lib/capabilities/registry";
import type { BenefitCadence, BenefitWalletProvenance } from "./types";

export interface ComputeWalletInput {
  enabled: boolean;
  mode: IntegrationMode;
  provenance: BenefitWalletProvenance;
  status: BenefitWalletSnapshot["status"];
  walletLabel: string;
  allowanceCents: number;
  cadence: BenefitCadence;
  priorUsedCents: number;
  cartSubtotalCents: number;
  periodLabel?: string | null;
  showDemoBadge?: boolean;
}

export function computeBenefitWalletSnapshot(
  input: ComputeWalletInput
): BenefitWalletSnapshot {
  const cartCents = Math.max(0, input.cartSubtotalCents);
  const priorUsedCents = Math.max(0, input.priorUsedCents);
  const usedCents = priorUsedCents + cartCents;
  const allowanceCents = Math.max(0, input.allowanceCents);
  const availableCents = allowanceCents - usedCents;

  return {
    enabled: input.enabled,
    mode: input.mode,
    status: input.status,
    provenance: input.provenance,
    walletLabel: input.walletLabel,
    allowanceCents,
    priorUsedCents,
    cartCents,
    usedCents,
    availableCents,
    cadence: input.cadence,
    periodLabel: input.periodLabel ?? null,
    showDemoBadge: input.showDemoBadge ?? false,
  };
}
