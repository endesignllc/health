import type { BenefitCadence, BenefitWalletCapabilityConfig, BenefitWalletStaticProfile } from "./types";
import type { IntegrationMode } from "@/lib/capabilities/registry";

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parseCadence(raw: string | undefined): BenefitCadence {
  const v = (raw ?? "quarterly").trim().toLowerCase();
  if (v === "monthly" || v === "quarterly" || v === "yearly") return v;
  return "quarterly";
}

function parseMode(raw: string | undefined): IntegrationMode {
  const v = (raw ?? "member_input").trim().toLowerCase();
  if (v === "static" || v === "member_input") return v;
  return "member_input";
}

/** v1: env-backed program config. Replace with DB `program_capabilities` when multi-tenant admin ships. */
export function getBenefitWalletCapabilityConfig(): BenefitWalletCapabilityConfig {
  const enabled = parseBool(process.env.BENEFIT_WALLET_ENABLED, false);
  const mode = parseMode(process.env.BENEFIT_WALLET_MODE);

  const staticProfile: BenefitWalletStaticProfile | null =
    mode === "static"
      ? {
          walletLabel: process.env.BENEFIT_WALLET_STATIC_LABEL?.trim() || "OTC Benefit",
          allowanceCents: parsePositiveInt(
            process.env.BENEFIT_WALLET_STATIC_ALLOWANCE_CENTS,
            30_000
          ),
          cadence: parseCadence(process.env.BENEFIT_WALLET_STATIC_CADENCE),
          priorUsedCents: parsePositiveInt(
            process.env.BENEFIT_WALLET_STATIC_PRIOR_USED_CENTS,
            0
          ),
          periodLabel: process.env.BENEFIT_WALLET_STATIC_PERIOD_LABEL?.trim() || undefined,
          showDemoBadge: parseBool(process.env.BENEFIT_WALLET_STATIC_SHOW_DEMO_BADGE, true),
        }
      : null;

  return { enabled, mode, staticProfile };
}
