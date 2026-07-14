import { cn, formatPrice } from "@/lib/utils";
import { BudgetMeter } from "@/components/BudgetMeter";
import { budgetMeterFromWallet } from "@/lib/benefit-wallet/budget-meter";
import type { BenefitWalletSnapshot } from "@/lib/benefit-wallet/types";

interface BenefitWalletCardProps {
  wallet: BenefitWalletSnapshot;
  className?: string;
  compact?: boolean;
}

/** Full benefit wallet card with spend tally and progress meter */
export function BenefitWalletCard({
  wallet,
  className,
  compact = false,
}: BenefitWalletCardProps) {
  const meter = budgetMeterFromWallet(wallet);

  return (
    <div className={cn(className)}>
      {wallet.showDemoBadge && (
        <p className="text-xs text-muted-foreground mb-2">
          Demo allowance — configured for preview
        </p>
      )}
      {wallet.provenance === "member_input" && (
        <p className="text-xs text-muted-foreground mb-2">
          Self-entered allowance — not linked to a plan account
        </p>
      )}
      <BudgetMeter
        budgetCents={meter.budgetCents}
        usedCents={meter.usedCents}
        cadence={meter.cadence}
        walletLabel={meter.walletLabel}
        compact={compact}
      />
      {(wallet.priorUsedCents > 0 || wallet.cartCents > 0) && (
        <div
          className={cn(
            "grid grid-cols-2 gap-3 mt-3 text-muted-foreground",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {wallet.priorUsedCents > 0 && (
            <div>
              <p>Prior spend</p>
              <p className="font-medium text-foreground tabular-nums">
                {formatPrice(wallet.priorUsedCents)}
              </p>
            </div>
          )}
          {wallet.cartCents > 0 && (
            <div className={wallet.priorUsedCents > 0 ? "text-right" : ""}>
              <p>In this cart</p>
              <p className="font-medium text-foreground tabular-nums">
                {formatPrice(wallet.cartCents)}
              </p>
            </div>
          )}
        </div>
      )}
      {wallet.periodLabel && (
        <p className={cn("text-muted-foreground mt-2", compact ? "text-xs" : "text-sm")}>
          Period: {wallet.periodLabel}
        </p>
      )}
    </div>
  );
}
