import { getCart } from "@/lib/cart";
import { getBenefitWalletCapabilityConfig } from "./config";
import { computeBenefitWalletSnapshot } from "./compute";
import type { BenefitCadence, BenefitWalletSnapshot } from "./types";
import type { PlanConfig } from "@/lib/plan-config/types";
import { getPlanConfig, getTotalAllowanceCents } from "@/lib/plan-config";

function cadenceFromCart(raw: string | null | undefined): BenefitCadence | null {
  if (raw === "monthly" || raw === "quarterly" || raw === "yearly") return raw;
  return null;
}

function defaultPeriodLabel(cadence: BenefitCadence): string {
  if (cadence === "monthly") return "This month";
  if (cadence === "yearly") return "This year";
  return "This quarter";
}

export interface ResolveWalletOptions {
  /** Spend to tally against allowance (cart subtotal, bundle subtotal, etc.) */
  sessionSpendCents?: number;
  /** Override member-declared allowance (e.g. bundle editor page) */
  memberAllowanceCents?: number | null;
  memberCadence?: string | null;
  /** Plan config for plan-specific wallet settings */
  planConfig?: PlanConfig;
}

/**
 * Resolves the benefit wallet snapshot for the current session.
 * Returns null when the capability is off or required inputs are not yet available.
 */
export async function resolveBenefitWallet(
  options: ResolveWalletOptions = {}
): Promise<BenefitWalletSnapshot | null> {
  const config = getBenefitWalletCapabilityConfig();
  if (!config.enabled) return null;

  const planConfig = options.planConfig ?? getPlanConfig();
  const cart = await getCart();
  const sessionSpendCents =
    options.sessionSpendCents ?? cart?.subtotalCents ?? 0;

  if (config.mode === "static" && config.staticProfile) {
    const p = config.staticProfile;
    return computeBenefitWalletSnapshot({
      enabled: true,
      mode: "static",
      provenance: "static",
      status: "active",
      walletLabel: p.walletLabel,
      allowanceCents: p.allowanceCents,
      cadence: p.cadence,
      priorUsedCents: p.priorUsedCents,
      cartSubtotalCents: sessionSpendCents,
      periodLabel: p.periodLabel ?? defaultPeriodLabel(p.cadence),
      showDemoBadge: p.showDemoBadge ?? true,
    });
  }

  // Plan-driven wallet: use plan config purses
  if (config.mode === "plan") {
    const totalAllowance = getTotalAllowanceCents(planConfig);
    const walletConfig = planConfig.wallet;
    const primaryPurse = walletConfig.purses[0];
    const defaultCadence = primaryPurse?.cadence ?? planConfig.defaultCadence;

    // Compute total prior used from all purses
    const totalPriorUsed = walletConfig.purses.reduce(
      (sum, p) => sum + (p.usedCents ?? 0),
      0
    );

    // Build purse inputs — use usedCents from config
    const purseInputs = walletConfig.purses.map((p, idx) => ({
      id: p.id,
      label: p.label,
      allowanceCents: p.allowanceCents,
      priorUsedCents: p.usedCents ?? 0,
      cartCents: idx === 0 ? sessionSpendCents : 0, // Cart spend to primary purse
      cadence: p.cadence,
    }));

    return computeBenefitWalletSnapshot({
      enabled: true,
      mode: "plan",
      provenance: "plan",
      status: "active",
      walletLabel: planConfig.name,
      allowanceCents: totalAllowance,
      cadence: defaultCadence,
      priorUsedCents: totalPriorUsed,
      cartSubtotalCents: sessionSpendCents,
      periodLabel: walletConfig.periodLabel ?? defaultPeriodLabel(defaultCadence),
      showDemoBadge: !walletConfig.hideDemoBadge,
      purses: purseInputs,
      expiresInDays: walletConfig.expiresInDays,
    });
  }

  if (config.mode === "member_input") {
    const allowanceCents =
      options.memberAllowanceCents ?? cart?.budgetCents ?? null;
    if (allowanceCents == null || allowanceCents <= 0) return null;

    const cadence =
      cadenceFromCart(options.memberCadence ?? cart?.cadence) ?? planConfig.defaultCadence;

    return computeBenefitWalletSnapshot({
      enabled: true,
      mode: "member_input",
      provenance: "member_input",
      status: "active",
      walletLabel: "Your benefit",
      allowanceCents,
      cadence,
      priorUsedCents: 0,
      cartSubtotalCents: sessionSpendCents,
      periodLabel: defaultPeriodLabel(cadence),
      showDemoBadge: false,
    });
  }

  return null;
}
