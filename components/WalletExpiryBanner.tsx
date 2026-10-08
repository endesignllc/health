"use client";

import { useState } from "react";
import { cn, formatPrice } from "@/lib/utils";
import type { BenefitWalletSnapshot } from "@/lib/benefit-wallet/types";

interface WalletExpiryBannerProps {
  wallet: BenefitWalletSnapshot;
  className?: string;
}

/**
 * Displays an expiry warning banner when wallet period is ending soon.
 * Shows when expiresInDays <= 14 and there's remaining balance.
 */
export function WalletExpiryBanner({ wallet, className }: WalletExpiryBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Only show if we have expiry info and days remaining
  if (dismissed || wallet.expiresInDays == null || wallet.expiresInDays > 14) {
    return null;
  }

  // Don't show if no remaining balance
  if (wallet.availableCents <= 0) {
    return null;
  }

  const isUrgent = wallet.expiresInDays <= 3;
  const daysText =
    wallet.expiresInDays === 0
      ? "expires today"
      : wallet.expiresInDays === 1
        ? "expires tomorrow"
        : `expires in ${wallet.expiresInDays} days`;

  return (
    <div
      role="alert"
      className={cn(
        "relative px-4 py-3 rounded-lg",
        isUrgent
          ? "bg-red-50 border border-red-200 text-red-800"
          : "bg-amber-50 border border-amber-200 text-amber-800",
        className
      )}
    >
      <div className="flex items-start gap-3 max-w-6xl mx-auto">
        {/* Warning icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn(
            "w-5 h-5 shrink-0 mt-0.5",
            isUrgent ? "text-red-500" : "text-amber-500"
          )}
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>

        <div className="flex-1">
          <p className="font-semibold text-sm">
            {wallet.periodLabel ? `${wallet.periodLabel} benefit ` : "Your benefit "}
            {daysText}
          </p>
          <p className="text-sm mt-0.5 opacity-90">
            You have{" "}
            <span className="font-semibold">{formatPrice(wallet.availableCents)}</span>{" "}
            remaining. Benefits don't roll over — use them before the period ends.
          </p>
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className={cn(
            "p-1 rounded hover:bg-black/10 transition-colors",
            isUrgent ? "text-red-600" : "text-amber-600"
          )}
          aria-label="Dismiss banner"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
