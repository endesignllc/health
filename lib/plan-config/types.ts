import type { BenefitCadence } from "@/lib/benefit-wallet/types";

/** A single benefit purse on a flex card */
export interface PurseDef {
  id: string;
  label: string;
  allowanceCents: number;
  cadence: BenefitCadence;
  /** Demo: cents already used this period */
  usedCents?: number;
  /** What this purse covers (displayed under label) */
  what?: string;
  /** Fixed purse color (hex) */
  color?: string;
  /** Info-only purse: displays but doesn't link to shopping */
  infoOnly?: boolean;
}

/** Demo member state (no real auth) */
export interface DemoMember {
  firstName: string;
  goals: string[];
}

/** Demo order state */
export interface DemoOrder {
  shipsOn: string;
  amountCents: number;
}

/** Color tokens for plan theming (HSL values without hsl() wrapper) */
export interface PlanColors {
  /** Primary brand color - buttons, links, active states */
  primary: string;
  /** Primary foreground - text on primary backgrounds */
  primaryForeground: string;
  /** Accent - hover states, secondary surfaces */
  accent: string;
  /** Accent foreground */
  accentForeground: string;
  /** Secondary - muted backgrounds */
  secondary: string;
  /** Secondary foreground */
  secondaryForeground: string;
}

/** Wallet configuration for a plan */
export interface PlanWalletConfig {
  /** Visible purses on the flex card */
  purses: PurseDef[];
  /** Days until current period expires (static for demo) */
  expiresInDays?: number;
  /** Period label (e.g., "October 2026") */
  periodLabel?: string;
  /** Expiry display string (e.g., "Oct 31") */
  expiresOn?: string;
  /** Hide the "demo allowance" badge */
  hideDemoBadge?: boolean;
}

/** Plan-level configuration */
export interface PlanConfig {
  /** Unique identifier */
  slug: string;
  /** Display name (e.g., "Laurel Complete Care") */
  name: string;
  /** Path to logo asset (relative to /public) */
  logoUrl: string;
  /** Logo alt text */
  logoAlt: string;
  /** Logo presentation style: "lockup" = icon tile + stacked text */
  logoStyle?: "default" | "lockup";
  /** Subtitle under logo name in lockup mode (e.g., "HMO D-SNP") */
  logoSubtitle?: string;
  /** Theme colors */
  colors: PlanColors;
  /** Wallet/benefit configuration */
  wallet: PlanWalletConfig;
  /** Budget tier options for wizard (cents) */
  budgetTiers: number[];
  /** Default cadence */
  defaultCadence: BenefitCadence;
  /** Need slug → display name overrides */
  needDisplayNames?: Record<string, string>;
  /** Category slugs to exclude from bundles */
  categoryExclusions?: string[];
  /** Needs to show in wizard (if set, filters to only these) */
  visibleNeeds?: string[];
  /** Hide checkout button (demo mode) */
  hideCheckout?: boolean;
  /** Wallet chip style in header: "pill" = navy rounded pill */
  walletChipVariant?: "default" | "pill";
  /** Expiry banner style: "calm" = amber, never red */
  expiryBannerVariant?: "default" | "calm";
  /** Demo member state (for member home page) */
  demoMember?: DemoMember;
  /** Demo order state (for order status strip) */
  demoOrder?: DemoOrder;
  /** Show member home instead of marketing home */
  memberHome?: boolean;
}
