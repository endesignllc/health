import type { PlanConfig } from "../types";

/** Default HealthBenefits.Shop configuration */
export const defaultPlanConfig: PlanConfig = {
  slug: "healthbenefits-shop",
  name: "HealthBenefits.Shop",
  logoUrl: "/branding/logo.svg",
  logoAlt: "HealthBenefits.Shop",
  colors: {
    // Clinical blue palette (current site)
    primary: "203 83% 31%",
    primaryForeground: "0 0% 100%",
    accent: "206 48% 94%",
    accentForeground: "203 83% 26%",
    secondary: "206 45% 93%",
    secondaryForeground: "203 88% 22%",
  },
  wallet: {
    purses: [
      {
        id: "otc",
        label: "OTC Benefit",
        allowanceCents: 30000,
        cadence: "quarterly",
      },
    ],
    hideDemoBadge: false,
  },
  budgetTiers: [2500, 5000, 10000, 15000, 30000],
  defaultCadence: "quarterly",
};
