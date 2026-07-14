import { getCart } from "@/lib/cart";
import { getBenefitWalletCapabilityConfig } from "./config";
import { computeBenefitWalletSnapshot } from "./compute";
import type { BenefitCadence, BenefitWalletSnapshot } from "./types";

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

  if (config.mode === "member_input") {
    const allowanceCents =
      options.memberAllowanceCents ?? cart?.budgetCents ?? null;
    if (allowanceCents == null || allowanceCents <= 0) return null;

    const cadence =
      cadenceFromCart(options.memberCadence ?? cart?.cadence) ?? "quarterly";

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
