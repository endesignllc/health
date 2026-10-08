"use client";

import type { BenefitWalletSnapshot, PurseSnapshot } from "@/lib/benefit-wallet/types";
import { cn, formatPrice } from "@/lib/utils";

interface MultiPurseWalletProps {
  wallet: BenefitWalletSnapshot;
  className?: string;
}

function PurseRow({ purse }: { purse: PurseSnapshot }) {
  const percentUsed =
    purse.allowanceCents > 0
      ? Math.min(100, (purse.usedCents / purse.allowanceCents) * 100)
      : 0;
  const isOverBudget = purse.availableCents < 0;
  const isNearLimit = percentUsed >= 80 && !isOverBudget;

  return (
    <div className="py-3 first:pt-0 last:pb-0 border-b last:border-b-0 border-border/50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground">{purse.label}</span>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            isOverBudget && "text-destructive",
            isNearLimit && "text-amber-600",
            !isOverBudget && !isNearLimit && "text-emerald-600"
          )}
        >
          {formatPrice(purse.availableCents)} left
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-secondary/60 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            isOverBudget && "bg-destructive",
            isNearLimit && "bg-amber-500",
            !isOverBudget && !isNearLimit && "bg-emerald-500"
          )}
          style={{ width: `${Math.min(100, percentUsed)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>{formatPrice(purse.usedCents)} used</span>
        <span>{formatPrice(purse.allowanceCents)} total</span>
      </div>
    </div>
  );
}

export function MultiPurseWallet({ wallet, className }: MultiPurseWalletProps) {
  if (!wallet.purses || wallet.purses.length === 0) {
    return null;
  }

  const totalAvailable = wallet.purses.reduce((sum, p) => sum + p.availableCents, 0);
  const totalAllowance = wallet.purses.reduce((sum, p) => sum + p.allowanceCents, 0);
  const totalUsed = wallet.purses.reduce((sum, p) => sum + p.usedCents, 0);

  return (
    <div
      className={cn(
        "bg-card border-2 border-primary/15 rounded-xl shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-primary/5 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{wallet.walletLabel}</h3>
            {wallet.periodLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {wallet.periodLabel}
                {wallet.expiresInDays != null && wallet.expiresInDays > 0 && (
                  <span className="ml-1.5 text-amber-600 font-medium">
                    · {wallet.expiresInDays} days left
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-foreground tabular-nums">
              {formatPrice(totalAvailable)}
            </p>
            <p className="text-xs text-muted-foreground">available</p>
          </div>
        </div>
      </div>

      {/* Purses */}
      <div className="px-4 py-3 space-y-0">
        {wallet.purses.map((purse) => (
          <PurseRow key={purse.id} purse={purse} />
        ))}
      </div>

      {/* Footer totals */}
      <div className="px-4 py-3 border-t border-border bg-muted/30 rounded-b-xl">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Monthly Benefit</span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatPrice(totalAllowance)}
          </span>
        </div>
        {totalUsed > 0 && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Used this period</span>
            <span className="font-medium text-foreground tabular-nums">
              {formatPrice(totalUsed)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
