import Link from "next/link";
import { cn, formatPrice } from "@/lib/utils";
import type { BenefitCadence, BenefitWalletSnapshot } from "@/lib/benefit-wallet/types";
import { expiryTier } from "@/lib/benefit-period";

function cadenceShort(cadence: BenefitCadence): string {
  if (cadence === "monthly") return "month";
  if (cadence === "yearly") return "year";
  return "quarter";
}

interface BenefitWalletChipProps {
  wallet: BenefitWalletSnapshot;
  className?: string;
  /** Use navy pill style (Laurel theme) */
  variant?: "default" | "pill";
}

/** Compact header wallet: label + available + cadence */
export function BenefitWalletChip({ wallet, className, variant = "default" }: BenefitWalletChipProps) {
  const isOver = wallet.availableCents < 0;
  const isLow = !isOver && wallet.allowanceCents > 0 && wallet.availableCents / wallet.allowanceCents < 0.1;
  const daysLeft = wallet.expiresInDays;
  const showDayCount = daysLeft != null && expiryTier(daysLeft) !== "quiet";
  const chipText =
    !showDayCount || daysLeft == null
      ? null
      : daysLeft <= 0
        ? "· today"
        : `· ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;

  // Navy pill variant (Laurel style per mockup)
  if (variant === "pill") {
    return (
      <Link
        href="/build"
        className={cn(
          "hidden sm:flex items-center gap-2 rounded-full px-4 py-2",
          "bg-[#1C3D5F] text-white hover:bg-[#234a70] transition-colors",
          className
        )}
        aria-label={`${formatPrice(Math.max(0, wallet.availableCents))} available${chipText ? `, ${chipText.replace(/^· /, "")}` : ""}`}
      >
        {/* Wallet icon */}
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" className="flex-none">
          <rect x="1.5" y="4" width="17" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M13 10h4" stroke="currentColor" strokeWidth="1.8"/>
        </svg>
        <span className="font-bold tabular-nums">
          {formatPrice(Math.max(0, wallet.availableCents))}
        </span>
        {chipText && (
          <span className="font-normal opacity-85 text-sm">
            {chipText}
          </span>
        )}
      </Link>
    );
  }

  // Default boxy variant
  return (
    <div
      className={cn(
        "hidden sm:flex flex-col items-end rounded-md border bg-card px-3 py-1.5 shadow-sm min-w-[9rem]",
        className
      )}
      aria-label={`${wallet.walletLabel}: ${formatPrice(Math.max(0, wallet.availableCents))} available per ${cadenceShort(wallet.cadence)}`}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight">
        {wallet.walletLabel}
      </p>
      <p
        className={cn(
          "text-sm font-bold tabular-nums leading-tight",
          isOver ? "text-destructive" : isLow ? "text-amber-700" : "text-primary"
        )}
      >
        {isOver
          ? `${formatPrice(Math.abs(wallet.availableCents))} over`
          : `${formatPrice(Math.max(0, wallet.availableCents))} left`}
      </p>
      <p className="text-[10px] text-muted-foreground leading-tight">
        per {cadenceShort(wallet.cadence)}
      </p>
    </div>
  );
}
