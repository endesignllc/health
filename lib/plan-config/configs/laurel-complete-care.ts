import type { PlanConfig } from "../types";

/**
 * Laurel Complete Care (HMO D-SNP) — fictional plan for PayForward demo
 * Modeled on Highmark Wholecare Medicare Assured (PA) 2026 benefit design
 * 
 * Reference: $300/month SSBCI combined purse, no rollover, Medline fulfillment
 * 
 * Demo state: three purses, $270 allowance, $98 used, $172 remaining.
 * Food is in the catalog. The bundle wizard still spends OTC + home safety only.
 */
export const laurelCompleteCare: PlanConfig = {
  slug: "laurel-complete-care",
  name: "Laurel Complete Care",
  logoUrl: "/branding/laurel-logo.svg",
  logoAlt: "Laurel Complete Care",
  logoStyle: "lockup",
  logoSubtitle: "HMO D-SNP",
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
        label: "Everyday health & OTC",
        allowanceCents: 15000,
        usedCents: 5800,
        cadence: "monthly",
        what: "Pain relief, vitamins, bladder care, first aid",
        color: "#2B6CB0",
      },
      {
        id: "home_safety",
        label: "Home & bathroom safety",
        allowanceCents: 7000,
        usedCents: 1800,
        cadence: "monthly",
        what: "Grab bars, night lights, non-slip mats",
        color: "#0D9470",
      },
      {
        id: "food",
        label: "Healthy food",
        allowanceCents: 5000,
        usedCents: 2200,
        cadence: "monthly",
        what: "Groceries in Shop Products",
        color: "#A14FB5",
        excludeFromWizard: true,
        catalogPath: "/products?category=healthy-food",
      },
    ],
    periodLabel: "October",
    hideDemoBadge: true,
  },
  // Total $270/month across purses (150 + 70 + 50)
  budgetTiers: [10000, 15000, 20000, 25000, 30000],
  defaultCadence: "monthly",
  needDisplayNames: {
    "joint-comfort-mobility": "Staying Steady at Home",
  },
  // Only show audited needs in wizard
  visibleNeeds: ["bladder-support", "joint-comfort-mobility"],
  hideCheckout: true, // Demo stops at cart, no payment flow
  walletChipVariant: "pill", // Navy rounded pill per mockup
  expiryBannerVariant: "calm", // Amber, never red, per mockup
  // Member home state
  memberHome: true,
  demoMember: {
    firstName: "Margaret",
    goals: ["bladder-support", "joint-comfort-mobility"],
  },
  demoOrder: {
    shipsOn: "Friday",
    amountCents: 7600,
  },
  // Bathroom / fall-prevention wins. Images verified on disk. Order is the widget order.
  goalSkus: ["FTX-10007", "FTX-10744", "FTX-10832"],
};
