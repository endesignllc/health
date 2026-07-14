import { cn, formatPrice } from "@/lib/utils";
import type { BenefitCadence, BenefitWalletSnapshot } from "@/lib/benefit-wallet/types";

function cadenceShort(cadence: BenefitCadence): string {
  if (cadence === "monthly") return "month";
  if (cadence === "yearly") return "year";
  return "quarter";
}

interface BenefitWalletChipProps {
  wallet: BenefitWalletSnapshot;
  className?: string;
}

/** Compact header wallet: label + available + cadence */
export function BenefitWalletChip({ wallet, className }: BenefitWalletChipProps) {
  const isOver = wallet.availableCents < 0;
  const isLow = !isOver && wallet.allowanceCents > 0 && wallet.availableCents / wallet.allowanceCents < 0.1;

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
