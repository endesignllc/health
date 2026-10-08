"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn, formatPrice } from "@/lib/utils";
import type { BenefitWalletSnapshot } from "@/lib/benefit-wallet/types";
import type { PlanConfig } from "@/lib/plan-config/types";

interface WalletExpiryBannerProps {
  wallet: BenefitWalletSnapshot;
  className?: string;
  /** Use calm amber style (Laurel theme) — never red, never all-caps */
  variant?: "default" | "calm";
  /** Plan config for member home check */
  planConfig?: PlanConfig;
}

/**
 * Displays an expiry warning banner when wallet period is ending soon.
 * Shows when expiresInDays <= 14 and there's remaining balance.
 */
export function WalletExpiryBanner({ wallet, className, variant = "default", planConfig }: WalletExpiryBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  // For member home, hide banner on home page (wallet is already shown there)
  if (planConfig?.memberHome && pathname === "/") {
    return null;
  }

  // Only show if we have expiry info and days remaining
  if (dismissed || wallet.expiresInDays == null || wallet.expiresInDays > 14) {
    return null;
  }

  // Don't show if no remaining balance
  if (wallet.availableCents <= 0) {
    return null;
  }

  const isUrgent = wallet.expiresInDays <= 3;
  const periodName = wallet.periodLabel?.split(" ")[0] ?? "Your"; // "October" from "October 2026"

  // Calm variant (Laurel style per mockup) — never red, never urgent
  if (variant === "calm") {
    return (
      <div
        role="alert"
        className={cn(
          "rounded-xl px-4 py-3",
          "bg-[#FBF0DC] text-[#8F5600]",
          className
        )}
      >
        <div className="flex items-start gap-3 max-w-6xl mx-auto px-4 sm:px-6">
          {/* Clock icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="w-5 h-5 shrink-0 mt-0.5 text-[#8F5600]"
          >
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px]">
              Your {periodName} benefit expires in {wallet.expiresInDays} day{wallet.expiresInDays !== 1 ? "s" : ""}.
            </p>
            <p className="text-[15px] mt-0.5 opacity-90">
              You have{" "}
              <span className="font-semibold">{formatPrice(wallet.availableCents)}</span>{" "}
              ready to use. It doesn't carry over — let's put it to work.
            </p>
          </div>

          {/* Build bundle CTA */}
          <Link
            href="/build"
            className="hidden sm:inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-[#1C3D5F] text-white text-sm font-semibold hover:bg-[#234a70] transition-colors whitespace-nowrap"
          >
            Build my bundle
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="ml-0.5">
              <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors text-[#8F5600] shrink-0"
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

  // Default variant
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
      <div className="flex items-start gap-3 max-w-6xl mx-auto px-4 sm:px-6">
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
