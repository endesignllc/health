import { cn, formatPrice } from "@/lib/utils";

type Cadence = "monthly" | "quarterly" | "yearly";

interface BudgetMeterProps {
  budgetCents: number;
  usedCents: number;
  cadence?: Cadence | string | null;
  walletLabel?: string;
  className?: string;
  /** Smaller layout for cart sidebar */
  compact?: boolean;
}

function cadenceLabel(cadence: Cadence | string | null | undefined): string | null {
  if (cadence === "quarterly") return "per quarter";
  if (cadence === "monthly") return "per month";
  if (cadence === "yearly") return "per year";
  return null;
}

export function BudgetMeter({
  budgetCents,
  usedCents,
  cadence,
  walletLabel = "Your benefit",
  className,
  compact = false,
}: BudgetMeterProps) {
  const remainingCents = budgetCents - usedCents;
  const percentUsed =
    budgetCents > 0 ? Math.min(100, Math.round((usedCents / budgetCents) * 100)) : 0;
  const barWidth =
    budgetCents > 0 ? Math.min(100, (usedCents / budgetCents) * 100) : 0;
  const isOverBudget = remainingCents < 0;
  const isNearlyMaxed = !isOverBudget && percentUsed >= 90;
  const period = cadenceLabel(cadence);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card shadow-sm",
        compact ? "p-3" : "p-5",
        className
      )}
    >
      <div className="flex justify-between items-start gap-4 mb-3">
        <div>
          <p className={cn("font-medium text-foreground", compact ? "text-sm" : "text-base")}>
            {walletLabel}
          </p>
          {period && (
            <p className="text-xs text-muted-foreground mt-0.5">{period}</p>
          )}
        </div>
        <p className={cn("text-muted-foreground shrink-0", compact ? "text-sm" : "text-base")}>
          {formatPrice(budgetCents)}
        </p>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
        <p
          className={cn(
            "font-bold tabular-nums",
            compact ? "text-xl" : "text-2xl",
            isOverBudget
              ? "text-destructive"
              : isNearlyMaxed
                ? "text-amber-700"
                : "text-primary"
          )}
        >
          {isOverBudget
            ? `${formatPrice(Math.abs(remainingCents))} over`
            : `${formatPrice(Math.max(0, remainingCents))} remaining`}
        </p>
        <p className={cn("text-muted-foreground tabular-nums", compact ? "text-xs" : "text-sm")}>
          <span className="font-medium text-foreground">{percentUsed}%</span> used
        </p>
      </div>

      <div
        className={cn(
          "w-full bg-white rounded-full overflow-hidden border border-border/70",
          compact ? "h-2.5" : "h-4"
        )}
        role="progressbar"
        aria-valuenow={percentUsed}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percentUsed}% of benefit used`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isOverBudget ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <div
        className={cn(
          "grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border/60",
          compact ? "text-xs" : "text-sm"
        )}
      >
        <div>
          <p className="text-muted-foreground">Used</p>
          <p className="font-semibold tabular-nums">{formatPrice(usedCents)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Remaining</p>
          <p
            className={cn(
              "font-semibold tabular-nums",
              isOverBudget && "text-destructive",
              isNearlyMaxed && !isOverBudget && "text-amber-700"
            )}
          >
            {formatPrice(Math.max(0, remainingCents))}
          </p>
        </div>
      </div>
    </div>
  );
}
