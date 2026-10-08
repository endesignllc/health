import type { PlanConfig } from "../types";

/**
 * Laurel Complete Care (HMO D-SNP) — fictional plan for PayForward demo
 * Modeled on Highmark Wholecare Medicare Assured (PA) 2026 benefit design
 * 
 * Reference: $300/month SSBCI combined purse, no rollover, Medline fulfillment
 */
export const laurelCompleteCare: PlanConfig = {
  slug: "laurel-complete-care",
  name: "Laurel Complete Care",
  logoUrl: "/branding/laurel-logo.svg",
  logoAlt: "Laurel Complete Care",
  colors: {
    // Navy/sky/coral palette per Highmark brand voice (not marks)
    primary: "220 60% 20%",           // Deep navy
    primaryForeground: "0 0% 100%",
    accent: "199 89% 48%",            // Sky blue
    accentForeground: "220 60% 15%",
    secondary: "12 76% 85%",          // Soft coral/salmon
    secondaryForeground: "220 60% 20%",
  },
  wallet: {
    purses: [
      {
        id: "otc",
        label: "OTC & Everyday Essentials",
        allowanceCents: 10000,
        cadence: "monthly",
      },
      {
        id: "home_safety",
        label: "Home & Bathroom Safety",
        allowanceCents: 10000,
        cadence: "monthly",
      },
      {
        id: "food",
        label: "Food & Groceries",
        allowanceCents: 5000,
        cadence: "monthly",
      },
      {
        id: "utilities",
        label: "Utilities",
        allowanceCents: 5000,
        cadence: "monthly",
      },
    ],
    expiresInDays: 9,
    periodLabel: "October 2026",
    hideDemoBadge: true,
  },
  // Total $300/month across purses
  budgetTiers: [10000, 15000, 20000, 25000, 30000],
  defaultCadence: "monthly",
  needDisplayNames: {
    "joint-comfort-mobility": "Staying Steady at Home",
  },
  // Only show audited needs in wizard
  visibleNeeds: ["bladder-support", "joint-comfort-mobility"],
  hideCheckout: true, // Demo stops at cart, no payment flow
};
