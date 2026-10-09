"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { BenefitWalletSnapshot, PurseSnapshot } from "@/lib/benefit-wallet/types";
import type { PlanConfig } from "@/lib/plan-config/types";

interface WalletChipPopoverProps {
  wallet: BenefitWalletSnapshot;
  planConfig: PlanConfig;
  className?: string;
}

/** Purse color from plan config (fallback to grey) */
function getPurseColor(purseId: string, planConfig: PlanConfig): string {
  const purse = planConfig.wallet.purses.find((p) => p.id === purseId);
  return purse?.color ?? "#6B7280";
}

/** Get month name from period label or use "This Month" */
function getPeriodLabel(wallet: BenefitWalletSnapshot): string {
  if (wallet.periodLabel) {
    return wallet.periodLabel.toUpperCase();
  }
  return "THIS MONTH";
}

/**
 * WalletChipPopover - Header mini-wallet disclosure
 * 
 * Shows the wallet chip with a chevron, opens popover on click/hover
 * displaying purse breakdown with mini-meters and CTAs.
 */
export function WalletChipPopover({ wallet, planConfig, className }: WalletChipPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const daysLeft = wallet.expiresInDays;
  const expiresOn = planConfig.wallet.expiresOn;
  const periodLabel = getPeriodLabel(wallet);

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        chipRef.current &&
        !chipRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        chipRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Focus management - move focus into popover when opened
  useEffect(() => {
    if (isOpen && popoverRef.current) {
      const firstFocusable = popoverRef.current.querySelector<HTMLElement>(
        'a, button, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  // Hover handlers (desktop only, 150ms delay)
  const handleMouseEnter = useCallback(() => {
    if (isMobile) return;
    hoverTimeoutRef.current = setTimeout(() => setIsOpen(true), 150);
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handlePopoverMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handlePopoverMouseLeave = useCallback(() => {
    // Don't auto-close on mouse leave - only close on click-away
  }, []);

  const handleClick = () => {
    setIsOpen((prev) => !prev);
  };

  const handleAction = () => {
    setIsOpen(false);
  };

  // Build purses list - use wallet.purses if available, otherwise synthesize from plan config
  const purses: Array<{ id: string; label: string; availableCents: number; allowanceCents: number }> =
    wallet.purses.length > 0
      ? wallet.purses.map((p) => ({
          id: p.id,
          label: p.label,
          availableCents: p.availableCents,
          allowanceCents: p.allowanceCents,
        }))
      : planConfig.wallet.purses.map((p) => ({
          id: p.id,
          label: p.label,
          availableCents: p.allowanceCents - (p.usedCents ?? 0),
          allowanceCents: p.allowanceCents,
        }));

  return (
    <div
      className="relative hidden sm:block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Chip Button */}
      <button
        ref={chipRef}
        onClick={handleClick}
        className={`
          flex items-center gap-2 rounded-full px-4 py-2
          bg-[#1C3D5F] text-white hover:bg-[#234a70] transition-colors
          focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#1C3D5F]
          ${className ?? ""}
        `}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`${formatPrice(Math.max(0, wallet.availableCents))} available${daysLeft != null ? `, ${daysLeft} days left` : ""}. Open wallet details.`}
      >
        {/* Wallet icon */}
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" className="flex-none">
          <rect x="1.5" y="4" width="17" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M13 10h4" stroke="currentColor" strokeWidth="1.8"/>
        </svg>
        <span className="font-bold tabular-nums">
          {formatPrice(Math.max(0, wallet.availableCents))}
        </span>
        {daysLeft != null && (
          <span className="font-normal opacity-85 text-sm">
            · {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
          </span>
        )}
        {/* Chevron */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={`flex-none transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Wallet details"
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          className={`
            absolute top-full right-0 mt-2 z-[60]
            bg-white rounded-xl shadow-lg border border-[#DDE3DE]
            ${isMobile ? "left-0 right-0 -mx-4 rounded-t-none border-t-0" : "w-80"}
          `}
        >
          <div className="p-5">
            {/* Header */}
            <div className="mb-4">
              <p className="text-[11px] font-bold tracking-wider text-muted-foreground">
                YOUR BENEFIT DOLLARS · {periodLabel}
              </p>
              <p className="text-lg font-bold text-foreground mt-1">
                <span className="tabular-nums">{formatPrice(wallet.availableCents)}</span>
                <span className="font-normal text-muted-foreground">
                  {" "}left of {formatPrice(wallet.allowanceCents)}
                </span>
              </p>
              {expiresOn && (
                <p className="text-sm text-[#8F5600] mt-1">
                  expires {expiresOn}
                </p>
              )}
            </div>

            {/* Purse Rows */}
            <div className="space-y-3">
              {purses.map((purse) => {
                const color = getPurseColor(purse.id, planConfig);
                const usedPercent = Math.max(0, Math.min(100, 
                  ((purse.allowanceCents - purse.availableCents) / purse.allowanceCents) * 100
                ));
                const remainingPercent = 100 - usedPercent;

                return (
                  <div key={purse.id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Color dot */}
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-none"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-foreground truncate">
                          {purse.label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-foreground flex-none">
                        {formatPrice(purse.availableCents)}
                      </span>
                    </div>
                    {/* Mini meter */}
                    <div className="mt-1.5 h-1.5 bg-[#EDF2EE] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${remainingPercent}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <Link
                href="/build"
                onClick={handleAction}
                className="flex-1 inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-lg bg-[#1C3D5F] text-white text-base font-semibold hover:bg-[#234a70] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1C3D5F] focus:ring-offset-2"
              >
                Put my {formatPrice(wallet.availableCents)} to work
              </Link>
              <Link
                href="/"
                onClick={handleAction}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                My wallet →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
