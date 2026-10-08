import type { IntegrationMode } from "@/lib/capabilities/registry";

export type BenefitCadence = "monthly" | "quarterly" | "yearly";

export type BenefitWalletProvenance = "static" | "member_input" | "plan" | "api" | "file" | "edi";

export type BenefitWalletStatus = "active" | "pending" | "unavailable";

/** Admin / env static profile — life form 2 */
export interface BenefitWalletStaticProfile {
  walletLabel: string;
  allowanceCents: number;
  cadence: BenefitCadence;
  /** Spend already used this period before this session (demo scenarios) */
  priorUsedCents: number;
  periodLabel?: string;
  showDemoBadge?: boolean;
}

/** Snapshot of a single purse within a multi-purse wallet */
export interface PurseSnapshot {
  id: string;
  label: string;
  allowanceCents: number;
  priorUsedCents: number;
  cartCents: number;
  usedCents: number;
  availableCents: number;
  cadence: BenefitCadence;
}

/** Resolved snapshot consumed by all wallet UI */
export interface BenefitWalletSnapshot {
  enabled: boolean;
  mode: IntegrationMode;
  status: BenefitWalletStatus;
  provenance: BenefitWalletProvenance;

  walletLabel: string;
  allowanceCents: number;
  priorUsedCents: number;
  cartCents: number;
  usedCents: number;
  availableCents: number;
  cadence: BenefitCadence;

  periodLabel: string | null;
  showDemoBadge: boolean;

  /** Multi-purse breakdown (empty for single-purse wallets) */
  purses: PurseSnapshot[];
  /** Days until benefit period expires (optional) */
  expiresInDays?: number;
}

export interface BenefitWalletCapabilityConfig {
  enabled: boolean;
  mode: IntegrationMode;
  staticProfile: BenefitWalletStaticProfile | null;
}
