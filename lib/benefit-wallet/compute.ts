import type { BenefitWalletSnapshot, PurseSnapshot } from "./types";
import type { IntegrationMode } from "@/lib/capabilities/registry";
import type { BenefitCadence, BenefitWalletProvenance } from "./types";

export interface PurseInput {
  id: string;
  label: string;
  allowanceCents: number;
  priorUsedCents: number;
  cartCents: number;
  cadence: BenefitCadence;
}

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
  /** Multi-purse inputs (optional) */
  purses?: PurseInput[];
  /** Days until period expires */
  expiresInDays?: number;
}

function computePurse(input: PurseInput): PurseSnapshot {
  const priorUsedCents = Math.max(0, input.priorUsedCents);
  const cartCents = Math.max(0, input.cartCents);
  const usedCents = priorUsedCents + cartCents;
  const allowanceCents = Math.max(0, input.allowanceCents);
  const availableCents = allowanceCents - usedCents;

  return {
    id: input.id,
    label: input.label,
    allowanceCents,
    priorUsedCents,
    cartCents,
    usedCents,
    availableCents,
    cadence: input.cadence,
  };
}

export function computeBenefitWalletSnapshot(
  input: ComputeWalletInput
): BenefitWalletSnapshot {
  const cartCents = Math.max(0, input.cartSubtotalCents);
  const priorUsedCents = Math.max(0, input.priorUsedCents);
  const usedCents = priorUsedCents + cartCents;
  const allowanceCents = Math.max(0, input.allowanceCents);
  const availableCents = allowanceCents - usedCents;

  const purses = (input.purses ?? []).map(computePurse);

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
    purses,
    expiresInDays: input.expiresInDays,
  };
}
